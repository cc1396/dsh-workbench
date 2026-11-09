/**
 * Session state normalization (PRD F02) and the attention rules that ride it (PRD F03).
 *
 * The Workbench never decides what a Session is doing from the summary row alone:
 * `running` is only one input. The fold reads the committed event log the Host
 * already holds (`ctx.sessions`) and derives, per Session, the latest turn, what
 * it ended with, the last activity, the current model and which predicates are
 * known about the current turn. State is then assigned by priority, and the same
 * turn facts feed the attention rules, so a card and its alert never disagree.
 *
 * Everything here is pure: callers pass the events in, the fold returns a plain
 * JSON value. Event names outside this build's catalog are simply ignored, so a
 * log written by a newer Host degrades instead of throwing.
 */

/** `running` window: no committed activity for this long counts as idle. */
export const IDLE_GRACE_MS = 120_000
/** P1 rule: an open turn silent for this long is a stall candidate. */
export const STUCK_AFTER_MS = 10 * 60_000
/** Host backoff: while a retry is scheduled the turn is alive, not stuck. */
export const BACKOFF_GRACE_MS = 2 * 60_000
/** P1 rule: the same tool failing this many times inside the window. */
export const TOOL_FAILURE_COUNT = 3
export const TOOL_FAILURE_WINDOW_MS = 10 * 60_000

const DAY_MS = 86_400_000
const MAX_TURNS = 30
const MAX_TOOL_CALLS = 600
const MAX_SPEED_SAMPLES = 300

/** Turn-end reasons that mean the turn failed. A user cancel or abort never does. */
const FAILED_REASONS = new Set(['error', 'failed', 'failure'])
const CANCELLED_REASONS = new Set(['cancelled', 'aborted', 'stopped', 'interrupted'])

/** Sort weight of each state inside the running list: attention first. */
const STATE_ORDER = {
  waiting: 0,
  stuck: 1,
  running: 2,
  failed: 3,
  unknown: 4,
  cancelled: 5,
  ended: 6,
}

/**
 * Fold one Session's log into the facts every view reads.
 *
 * @param events - committed, ordered events of the Session (inherited prefix included).
 * @param inherited - count of inherited events; only the events after them are this Session's own.
 * @param options - `{ running, updatedAt, now }` from the Host summary row and the snapshot clock.
 * @returns the Session view (see {@link stateOf} for the state it derives).
 */
export function projectSession(events, inherited, options) {
  const start = Math.max(0, Number(inherited) || 0)
  const now = Number(options?.now) || 0
  const summaryRunning = options?.running === true
  const updatedAt = Number(options?.updatedAt) || 0
  // The Host's own pending-interaction projection: the strong "waiting on the user" fact.
  const hostPending = typeof options?.pendingInteraction === 'string' ? options.pendingInteraction : undefined
  const list = Array.isArray(events) ? events : []

  /** @type {string|undefined} */
  let title
  /** @type {string|undefined} */
  let firstUserText
  let prompt
  let model
  let provider

  const turns = []
  /** @type {{turn?: number, startAt?: number, open: boolean, lastAt: number, kind?: string, message?: string, at?: number, cancelled?: boolean, failed?: boolean}} */
  let current = { open: false, lastAt: 0 }
  let lastAction
  let toolCalls = 0
  let inheritedTurns = 0

  const waiting = new Map()
  const calls = new Map()
  /** @type {Map<string, {name: string, at: number}>} failed results of the current turn by step. */
  let failures = new Map()
  /** @type {{tool: string, count: number, first: number, last: number}} */
  let streak = { tool: '', count: 0, first: 0, last: 0 }
  const speed = []
  const stepStarts = new Map()
  /** Per-turn output tokens, keyed by turn, with the turn's end time. */
  const turnTokens = new Map()

  // Only committed events count as activity; a summary's updatedAt may reflect a
  // write the log has not flushed yet, so it is a lower bound, never the clock.
  const note = (at) => {
    if (Number.isFinite(at) && at > current.lastAt) current.lastAt = at
  }

  for (let index = 0; index < list.length; index += 1) {
    const event = list[index]
    if (event === null || typeof event !== 'object') continue
    const at = Number(event.time)
    const type = event.type
    const data = event.data ?? {}

    // Titles are inherited facts: a fork keeps its parent's title until it is renamed.
    if (type === 'session/title' && typeof data.title === 'string' && data.title !== '') title = data.title
    if (type === 'user/message' && firstUserText === undefined && index < start) firstUserText = userTextOf(data)
    if (index < start) {
      if (type === 'turn/end') inheritedTurns += 1
      continue
    }

    switch (type) {
      case 'user/message': {
        if (data.source?.kind !== undefined && data.source?.kind !== 'user') break
        if (firstUserText === undefined) firstUserText = userTextOf(data)
        if (typeof prompt !== 'string') {
          const text = shortText(userTextOf(data), 72)
          if (text !== '') prompt = text
        }
        break
      }
      case 'turn/start': {
        const turn = Number(data.turn)
        current = Number.isFinite(turn) ? { ...current, turn } : current
        current.open = true
        current.startAt = Number.isFinite(at) ? at : current.lastAt
        current.lastAt = Number.isFinite(at) ? at : current.lastAt
        current.kind = undefined
        current.message = undefined
        current.at = undefined
        failures = new Map()
        streak = { tool: '', count: 0, first: 0, last: 0 }
        break
      }
      case 'llm/retry': {
        // A reserved retry: the turn is scheduled to continue, so it is not silent.
        current.retryScheduled = true
        break
      }
      case 'step/start': {
        const turn = Number(data.turn)
        if (Number.isFinite(turn)) current.turn = turn
        if (Number.isFinite(turn) && Number.isFinite(Number(data.step))) {
          stepStarts.set(`${turn}:${Number(data.step)}`, Number.isFinite(at) ? at : current.lastAt)
        }
        break
      }
      case 'tool/call': {
        toolCalls += 1
        current.unansweredCall = calls.size + 1
        const name = typeof data.name === 'string' && data.name !== '' ? data.name : 'tool'
        if (typeof data.callId === 'string') calls.set(data.callId, name)
        if (Number.isFinite(at)) lastAction = { name, at }
        if (calls.size > MAX_TOOL_CALLS) {
          const oldest = calls.keys().next().value
          if (oldest !== undefined) calls.delete(oldest)
        }
        break
      }
      case 'tool/result': {
        const callId = data.toolCallId ?? data.message?.toolCallId ?? data.message?.source?.callId
        const name = typeof callId === 'string' ? (calls.get(callId) ?? 'tool') : 'tool'
        const failed =
          data.message?.isError === true ||
          /^(error|failed|failure)$/i.test(String(data.status ?? data.message?.status ?? ''))
        if (Number.isFinite(at)) lastAction = { name, at }
        if (failed && Number.isFinite(at)) {
          failures.set(`${current.turn ?? ''}:${data.step ?? ''}`, { name, at })
          if (streak.tool === name && at - streak.last <= TOOL_FAILURE_WINDOW_MS) {
            streak.count += 1
            streak.last = at
          } else {
            streak = { tool: name, count: 1, first: at, last: at }
          }
        } else if (!failed && streak.tool === name) {
          streak = { tool: '', count: 0, first: 0, last: 0 }
        }
        if (typeof callId === 'string') calls.delete(callId)
        current.unansweredCall = calls.size
        break
      }
      case 'assistant/message': {
        const turn = Number(data.turn)
        if (Number.isFinite(turn)) current.turn = turn
        const source = data.message?.source
        if (typeof source?.model === 'string' && source.model !== '') model = source.model
        if (typeof source?.provider === 'string' && source.provider !== '') provider = source.provider
        const usage = data.usage
        if (usage !== null && typeof usage === 'object') {
          const tokens = tokensOf(usage)
          const output = tokens.output
          if (Number.isFinite(turn)) {
            const bucket = turnTokens.get(turn) ?? { turn, output: 0, at: 0 }
            bucket.output += output
            turnTokens.set(turn, bucket)
          }
          if (output > 0) {
            const step = Number(data.step)
            const key = `${turn}:${step}`
            const startedAt = stepStarts.get(key)
            if (startedAt !== undefined && Number.isFinite(at) && at > startedAt) {
              stepStarts.delete(key)
              speed.push({ model: model ?? '', outputTokens: output, durationMs: at - startedAt, endTime: at })
              if (speed.length > MAX_SPEED_SAMPLES) speed.shift()
            }
          }
        }
        break
      }
      case 'request/context': {
        if (typeof data.provider === 'string' && data.provider !== '') provider = data.provider
        if (typeof data.model === 'string' && data.model !== '') model = data.model
        break
      }
      case 'approval/asked': {
        const id = data.requestId ?? data.approvalId ?? data.id
        if (typeof id === 'string') {
          waiting.set(`approval:${id}`, {
            kind: 'approval',
            detail: shortText(data.toolName ?? data.title ?? data.tool ?? '', 48),
            at: Number.isFinite(at) ? at : current.lastAt,
          })
        }
        break
      }
      case 'approval/resolved': {
        const id = data.requestId ?? data.approvalId ?? data.id
        if (typeof id === 'string') waiting.delete(`approval:${id}`)
        break
      }
      case 'question/asked': {
        const id = data.id ?? data.requestId
        if (typeof id === 'string') {
          waiting.set(`question:${id}`, {
            kind: 'question',
            detail: '',
            at: Number.isFinite(at) ? at : current.lastAt,
          })
        }
        break
      }
      case 'question/answered':
      case 'question/cancelled': {
        const id = data.id ?? data.requestId
        if (typeof id === 'string') waiting.delete(`question:${id}`)
        break
      }
      case 'turn/end': {
        const reason = data.reason ?? {}
        const kind = String(reason.kind ?? '')
        const endedAt = Number.isFinite(at) ? at : current.lastAt
        current.open = false
        current.at = endedAt
        current.kind = kind
        current.message = shortText(reason.error?.message ?? reason.reason?.message ?? '', 120)
        current.cancelled = CANCELLED_REASONS.has(kind) || (kind === 'error' && reason.reason?.kind === 'user')
        if (current.cancelled) current.kind = 'cancelled'
        current.failed = !current.cancelled && (FAILED_REASONS.has(kind) || reason.error !== undefined)
        if (Number.isFinite(current.turn)) {
          const bucket = turnTokens.get(current.turn) ?? { turn: current.turn, output: 0, at: 0 }
          bucket.at = endedAt
          bucket.open = false
          turnTokens.set(current.turn, bucket)
        }
        // A turn ends its own pending interactions.
        waiting.clear()
        turns.push(snapshotTurn(current, failures, endedAt))
        if (turns.length > MAX_TURNS) turns.shift()
        break
      }
      default:
        break
    }
    note(at)
  }

  const state = stateOf({ current, running: summaryRunning, updatedAt, now, pending: waiting, hostPending })
  const lastActivityAt = Math.max(current.lastAt || 0, updatedAt, lastEndedAt(turns))
  const view = {
    title: title ?? firstUserText,
    prompt: prompt ?? (firstUserText === undefined ? undefined : shortText(firstUserText, 72)),
    model: model ?? undefined,
    provider: provider ?? undefined,
    turn: current.turn ?? turns.at(-1)?.turn,
    turnStartedAt: current.startAt,
    state,
    running: state.running === true,
    lastAt: lastActivityAt,
    // The newest closed turn's own end, independent of any later write.
    endedAt: endedAtOf({ turns }),
    lastAction: lastAction === undefined ? undefined : { name: lastAction.name, at: lastAction.at },
    toolCalls,
    speed: speed.length > 160 ? speed.slice(-160) : speed,
    pending: [...waiting.values()].map((entry) => ({ ...entry })),
    turns,
    inheritedTurns,
    /** `[{ turn, tokens, at, open }]` per turn with its output tokens (for day attribution). */
    turnTokens: [...turnTokens.values()].map((bucket) => ({
      turn: bucket.turn,
      tokens: bucket.output > 0 ? bucket.output : undefined,
      at: bucket.at,
      open: bucket.open === true,
    })),
    recent: snapshotTurn(current, failures, current.at),
    toolFailures: streak.count >= TOOL_FAILURE_COUNT ? { ...streak } : undefined,
  }
  return view
}

/**
 * The state a Session is shown in, with the evidence that decided it.
 *
 * Priority (PRD F02): an unresolved, trustworthy wait wins; then an open turn
 * that is still alive; then an open turn the Host no longer runs (unknown); then
 * a closed turn by its end reason. Newer turns clear older temporary states, and
 * a late fragment from a closed turn never reopens it — only committed events are read.
 */
function stateOf({ current, running: summaryRunning, updatedAt, now, pending, hostPending }) {
  const ref = Math.max(current.lastAt || 0, updatedAt || 0)
  const idleFor = Math.max(0, now - ref)
  const sinceStart = current.open ? Math.max(0, now - (current.startAt || ref)) : undefined
  // An open turn is alive while the Host still runs it (idle then means the stall
  // rule, not closure); a turn the Host no longer runs is unknown, not silent.
  const active = current.open && (summaryRunning || idleFor < IDLE_GRACE_MS)
  // A Host sleeping through its own backoff is alive, not stuck: a scheduled retry
  // or an unanswered tool call keeps the turn in the running lane.
  const backingOff = current.retryScheduled === true || Number(current.unansweredCall) > 0
  const evidence = []
  const openWait = [...(pending?.values?.() ?? [])].at(-1)
  const waiting = current.open && (openWait !== undefined || hostPending !== undefined)
  const pendingItem =
    openWait === undefined ? undefined : { kind: openWait.kind, detail: openWait.detail, at: openWait.at }
  const build = (state, activity, running) => {
    if (current.open) {
      if (openWait !== undefined || hostPending !== undefined) {
        evidence.push({ kind: 'pending', at: openWait?.at ?? ref, detail: openWait?.kind ?? hostPending })
      }
      evidence.push({ kind: 'turn', at: current.startAt })
      if (backingOff && idleFor >= BACKOFF_GRACE_MS) evidence.push({ kind: 'backoff', at: ref })
      if (idleFor >= STUCK_AFTER_MS) evidence.push({ kind: 'stall', at: ref })
    }
    return {
      state,
      activity,
      running,
      open: current.open,
      idleFor,
      sinceStart,
      runningFlag: summaryRunning,
      hostPending,
      backoff: backingOff,
      // Any open turn silent for the threshold with no backoff signal is a stall
      // candidate (see alertsOf); the state itself stays ``unknown`` when the Host
      // no longer runs it.
      stalled: current.open && idleFor >= STUCK_AFTER_MS && !backingOff,
      evidence,
      // Capability note: a live wait read from the Host is the strong fact.
      waitSource: hostPending !== undefined ? 'host' : openWait !== undefined ? 'event' : undefined,
      pendingItem,
    }
  }

  if (waiting) return build('waiting', idleFor < IDLE_GRACE_MS ? 'live' : 'idle', true)
  // The Host runs the Session but its log has not committed a turn yet (chunked logs
  // appear only once flushed). A live Agent outranks an empty log: report it running
  // rather than claiming it ended, and keep the idle clock for the stall rule.
  if (summaryRunning && !current.open) {
    const stalled = idleFor >= STUCK_AFTER_MS && !backingOff
    return build(stalled ? 'stuck' : 'running', stalled ? 'stale' : idleFor < IDLE_GRACE_MS ? 'live' : 'idle', true)
  }
  if (current.open && active) {
    const stalled = idleFor >= STUCK_AFTER_MS && !backingOff
    return build(stalled ? 'stuck' : 'running', stalled ? 'stale' : idleFor < IDLE_GRACE_MS ? 'live' : 'idle', true)
  }
  if (current.open) return build('unknown', 'stale', false)
  return build(current.failed ? 'failed' : current.cancelled ? 'cancelled' : 'ended', 'none', false)
}

function snapshotTurn(current, failures, endedAt) {
  return {
    turn: current.turn,
    startedAt: current.startAt,
    endedAt: Number.isFinite(endedAt) ? endedAt : undefined,
    reason: current.kind,
    message: current.message,
    cancelled: current.cancelled === true,
    failed: current.failed === true,
    failedSteps: [...failures.entries()].map(([step, value]) => ({
      step,
      name: value.name,
      at: value.at,
    })),
  }
}

function lastEndedAt(turns) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const at = Number(turns[index].endedAt)
    if (Number.isFinite(at) && at > 0) return at
  }
  return 0
}

/** Ending time of the latest closed turn (0 when the Session never closed a turn). */
export function endedAtOf(view) {
  const last = lastEndOf(view)
  const at = Number(last?.endedAt)
  return Number.isFinite(at) && at > 0 ? at : Number(view?.lastEnd?.endedAt) || 0
}

/** The last turn's end reason object, or undefined when it never closed. */
export function lastEndOf(view) {
  const turns = Array.isArray(view?.turns) ? view.turns : []
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]
    if (Number.isFinite(Number(turn.endedAt)) && Number(turn.endedAt) > 0) return turn
  }
  return undefined
}

/** Sort key of a Session view inside the running list. */
export function orderOf(view) {
  return STATE_ORDER[String(view?.state ?? 'unknown')] ?? STATE_ORDER.unknown
}

/**
 * The attention rules, applied to one projected Session.
 *
 * @param view - output of {@link projectSession}.
 * @param input - `{ sessionId, projectId, title, now, rules }`.
 * @returns zero or more alert values; each carries the stable key that deduplicates it.
 */
export function alertsOf(view, input) {
  const now = Number(input.now) || 0
  const rules = input.rules ?? {}
  const alerts = []
  // Staleness rules apply to a turn the Host still owns; a turn it no longer runs is
  // already reported as unknown, and a live wait there is a decision to make later.
  const active = view.state?.running === true
  const keyed = (type, scope) => ({
    key: [input.profileId ?? 'local', input.sessionId, type, String(scope)].join('|'),
    type,
    sessionId: input.sessionId,
    projectId: input.projectId,
    title: input.title,
    severity: type === 'failure' ? 'high' : type === 'stuck' ? 'low' : 'medium',
    triggeredAt: now,
    state: 'open',
  })

  const pending = Array.isArray(view.pending) ? view.pending.slice() : []
  const hostPending = String(view.state?.hostPending ?? '')
  const open = view.state?.open === true
  if (open && pending.length === 0 && hostPending !== '') {
    // A Host-projected wait has no event id; the open turn bounds its lifetime.
    pending.push?.({ kind: hostPending, detail: '', at: view.turnStartedAt ?? view.lastAt })
  }
  for (const entry of pending) {
    const alert = keyed(entry.kind === 'approval' || entry.kind === 'plan-review' ? 'waiting' : 'question', entry.at)
    alert.triggeredAt = entry.at || now
    alert.reason = entry.detail || undefined
    alerts.push(alert)
  }

  const lastTurn = lastEndOf(view)
  // A failure is an item only while no newer turn replaced it: a retried turn
  // owns the state again, and its own failure is still visible as evidence.
  if (lastTurn !== undefined && lastTurn.failed === true && view.running !== true) {
    const alert = keyed('failure', `${lastTurn.turn ?? ''}:${lastTurn.endedAt}`)
    alert.triggeredAt = lastTurn.endedAt
    alert.reason = lastTurn.message || undefined
    alerts.push(alert)
  }

  if (active && view.state?.stalled === true && rules.stuck !== false) {
    const alert = keyed('stuck', `${view.turn ?? ''}:${view.lastAt}`)
    alert.triggeredAt = view.lastAt
    alert.reason = 'stall'
    alert.thresholdMs = STUCK_AFTER_MS
    alert.lastEvidence = view.lastAt
    alerts.push(alert)
  }

  if (active && view.toolFailures !== undefined && rules.toolFailures !== false) {
    const failure = view.toolFailures
    if (now - failure.last <= TOOL_FAILURE_WINDOW_MS) {
      const alert = keyed('toolFailure', `${failure.tool}:${failure.first}`)
      alert.triggeredAt = failure.last
      alert.reason = failure.tool
      alert.count = failure.count
      alerts.push(alert)
    }
  }
  return alerts
}

/** The first text of a message, whitespace-folded. */
export function userTextOf(message) {
  const content = message?.content
  if (!Array.isArray(content)) return undefined
  return textOf(content)
}

function textOf(content) {
  const text = content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text === '' ? '' : text
}

/** Clip one line to a readable length for a card. */
export function shortText(value, limit) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').trim()
  if (text === '') return ''
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

/**
 * Count tokens into the four billed buckets, with cache writes kept apart from
 * cache reads (the ledger prices them separately).
 *
 * @param totals - a `tokenUsage` projection value (`totals` or a step's `buckets`),
 *   or a message `usage` object (`inputTokens`/`cacheReadTokens`/`outputTokens`).
 * @returns mutually exclusive counts.
 */
/**
 * Normalize a billed bucket set into the four exclusive internal fields.
 *
 * Accepts both names in use: the Host projection's `*Tokens` fields and the internal
 * `uncachedInput`/`cacheReadInput`/`cacheWriteInput`/`output` names. A normalizer that
 * only knew the first form silently zeroed every total it was handed in the second —
 * which made the whole ledger report 0 forever — so both are accepted here, and the
 * internal names must be checked last so a real `outputTokens: 0` never hides
 * an internal `output`.
 */
export function tokensOf(totals) {
  const pick = (...values) => {
    for (const value of values) {
      const number = count(value)
      if (number > 0) return number
    }
    return 0
  }
  return {
    uncachedInput: pick(totals?.uncachedInputTokens, totals?.uncachedInput, totals?.inputTokens, totals?.input),
    cacheReadInput: pick(totals?.cacheReadTokens, totals?.cacheReadInputTokens, totals?.cacheReadInput),
    cacheWriteInput: pick(totals?.cacheWriteTokens, totals?.cacheWriteInputTokens, totals?.cacheWriteInput),
    output: pick(totals?.outputTokens, totals?.output),
  }
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

/** Merge two token objects. */
export function addTokens(left, right) {
  return {
    uncachedInput: count(left?.uncachedInput) + count(right?.uncachedInput),
    cacheReadInput: count(left?.cacheReadInput) + count(right?.cacheReadInput),
    cacheWriteInput: count(left?.cacheWriteInput) + count(right?.cacheWriteInput),
    output: count(left?.output) + count(right?.output),
  }
}

/** Start of the caller's local day, in epoch milliseconds. */
export function localDayStart(now, tzOffsetSeconds) {
  const offsetMs = tzOffsetSeconds * 1000
  return Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs
}

export { DAY_MS }