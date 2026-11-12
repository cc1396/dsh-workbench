/**
 * Session facts, derived from the Host's projections.
 *
 * The projection registry already folds every committed event into whole values:
 * `sessionStats` counts turns and steps, `turnBoundary` says whether a turn is open,
 * `tokenUsage` carries billed buckets, `userQuestions` carries waits, `title` and
 * `modelSelection` carry the label and the route. Replaying the log to recover the
 * same numbers was duplicated work, and every disagreement between the two folds
 * produced a defect.
 *
 * This module therefore reads those values and never a log. It answers the questions
 * the UI asks: is it running, is it waiting, what did it spend, may I show a title.
 * A Session without projections still gets neutral facts, so the panel degrades.
 */

const DAY_MS = 86_400_000

/** Local midnight of a timestamp, given the viewer's offset in seconds. */
export function localDayStart(at, tzOffsetSeconds = 0) {
  const tz = Number(tzOffsetSeconds) || 0
  const value = Number(at)
  if (!Number.isFinite(value)) return undefined
  return Math.floor((value + tz * 1000) / DAY_MS) * DAY_MS - tz * 1000
}

/** `YYYY-MM-DD` of a local midnight. */
export function dayKey(dayStart, tzOffsetSeconds = 0) {
  const tz = Number(tzOffsetSeconds) || 0
  const date = new Date(Number(dayStart) + tz * 1000)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/**
 * Billed token buckets, always the four exclusive fields.
 *
 * The Host projection uses `*Tokens` names; internal code uses the short ones. Both are
 * accepted here, once, so no downstream reader has to care — a normalizer that knew
 * only one form silently zeroed every total it was handed in the other.
 */
export function tokensOf(value) {
  const pick = (...candidates) => {
    for (const candidate of candidates) {
      const number = Number(candidate)
      if (Number.isFinite(number) && number > 0) return number
    }
    return 0
  }
  return {
    uncachedInput: pick(value?.uncachedInputTokens, value?.uncachedInput, value?.inputTokens, value?.input),
    cacheReadInput: pick(value?.cacheReadTokens, value?.cacheReadInputTokens, value?.cacheReadInput),
    cacheWriteInput: pick(value?.cacheWriteTokens, value?.cacheWriteInputTokens, value?.cacheWriteInput),
    output: pick(value?.outputTokens, value?.output),
  }
}

/** Sum of the four exclusive buckets. */
export function totalTokens(tokens) {
  return (
    Math.round(Number(tokens?.uncachedInput) || 0) +
    Math.round(Number(tokens?.cacheReadInput) || 0) +
    Math.round(Number(tokens?.cacheWriteInput) || 0) +
    Math.round(Number(tokens?.output) || 0)
  )
}

/** Add two bucket sets. */
export function addTokens(left, right) {
  return {
    uncachedInput: (Number(left?.uncachedInput) || 0) + (Number(right?.uncachedInput) || 0),
    cacheReadInput: (Number(left?.cacheReadInput) || 0) + (Number(right?.cacheReadInput) || 0),
    cacheWriteInput: (Number(left?.cacheWriteInput) || 0) + (Number(right?.cacheWriteInput) || 0),
    output: (Number(left?.output) || 0) + (Number(right?.output) || 0),
  }
}

/**
 * Everything the workbench knows about one Session, from one projection cut.
 *
 * @param record - the normalized catalog record (`host.normalizeRecord`).
 * @param values - the projection values (`host.projectionsOf`), possibly `{}`.
 * @param live - `{ running, pendingInteraction }` from `agents.list()`.
 * @param now - the snapshot clock.
 * @returns the facts object every view reads; no field is `undefined` by accident.
 */
export function factsOf(record, values, live, now) {
  const title = typeof values?.title === 'string' && values.title !== '' ? values.title : undefined
  const route = values?.modelSelection?.lastUsed
  const stats = values?.sessionStats
  const boundary = values?.turnBoundary
  const usage = values?.tokenUsage
  // What the Session is doing: the last step boundary says tool versus generation, and
  // the latest outline entry names the prompt that started this turn.
  const outline = Array.isArray(values?.turnOutline?.turns) ? values.turnOutline.turns : []
  const latestTurn = outline.length === 0 ? undefined : outline[outline.length - 1]
  const open = boundary?.openTurnStartSeq !== undefined && boundary?.openTurnStartSeq !== null
  const phase = boundary?.lastStepBoundary?.kind === 'tool' ? 'tool' : open ? 'generation' : undefined
  const questions = values?.userQuestions?.questions
  const pending = Array.isArray(questions?.active) ? questions.active : []
  const waiting = pending.length > 0 || typeof live?.pendingInteraction === 'string'
  const running = live?.running === true || open
  const lastTurn = Number(boundary?.lastTurn ?? stats?.lastTurn) || undefined
  const lastStepAt = Number(stats?.lastStepEndAt ?? stats?.updatedAt ?? values?.sessionListMetadata?.lastPromptAt) || undefined
  // `stalled()` needs a wall clock. `openTurnStartSeq` is an event seq, not a time, so the
  // idle window is measured from the last committed event instead.
  const recentAt = lastStepAt ?? Number(values?.sessionListMetadata?.lastPromptAt) ?? 0
  const state = waiting ? 'waiting' : running ? (stalled(recentAt, now) ? 'stuck' : 'running') : 'ended'
  return {
    id: record.id,
    project: record.cwd,
    title,
    route: {
      provider: typeof route?.provider === 'string' ? route.provider : undefined,
      model: typeof route?.model === 'string' ? route.model : undefined,
    },
    origin: record.origin,
    parentId: record.parentId,
    live: record.live,
    persisted: record.persisted,
    createdAt: record.createdAt,
    state,
    running: state === 'waiting' || state === 'running' || state === 'stuck',
    waiting: waiting ? { kind: typeof live?.pendingInteraction === 'string' ? live.pendingInteraction : 'question', count: pending.length } : undefined,
    open,
    turn: lastTurn,
    turns: Number(stats?.turns) || 0,
    steps: Number(stats?.steps) || 0,
    tokens: tokensOf(usage?.totals),
    lastTokens: usage?.last?.buckets === undefined ? undefined : tokensOf(usage.last.buckets),
    lastAt: lastStepAt,
    speed: speedOf(stats),
    // `phase` classifies the current action; `prompt` is the request that opened the turn.
    phase,
    prompt: typeof latestTurn?.prompt === 'string' && latestTurn.prompt !== '' ? shortPrompt(latestTurn.prompt) : undefined,
    // Turn duration runs start → now (waiting included), which is what the row shows.
    turnStartedAt: Number(stats?.turnStartedAt) || undefined,
    activeSince: Number(boundary?.openTurnStartSeq) || undefined,
    now,
  }
}

/** A silent open turn past the stall threshold is a stall candidate (PRD F03). */
/**
 * A running Session is a stall candidate only when nothing has happened for the
 * threshold. `since` must be a wall-clock time; an event seq here would compare
 * sequence numbers with milliseconds and call every running Session stuck.
 */
function stalled(since, now) {
  const at = Number(since)
  if (!Number.isFinite(at) || at <= 0) return false
  return Number(now) - at > 10 * 60_000
}

/**
 * Sum a log's billed usage per local day.
 *
 * Used when the projection registry is absent: the log is already read for the day
 * split, so the totals come from the same pass and cost nothing extra. This is the
 * fallback that keeps a composition without `sessionProjections` priced instead of
 * silently zero.
 *
 * @returns `{ totals, byDay: Map<dayStart, tokens> }` oldest day first when iterated.
 */
export function tokensFromEvents(events, tzOffsetSeconds) {
  const tz = Number(tzOffsetSeconds) || 0
  const byDay = new Map()
  let totals = { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 }
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== 'assistant/message') continue
    const usage = event?.data?.usage
    if (usage === null || typeof usage !== 'object') continue
    const tokens = tokensOf(usage)
    if (totalTokens(tokens) === 0) continue
    totals = addTokens(totals, tokens)
    const day = localDayStart(Number(event.time), tz)
    if (day === undefined) continue
    byDay.set(day, addTokens(byDay.get(day) ?? { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 }, tokens))
  }
  return { totals, byDay }
}

/**
 * The outcome of the Session's last closed turn, read from the log.
 *
 * The projection says whether a turn is open, not how it closed; only the log's
 * `turn/end` carries the reason. `failed` is an explicit error — a user cancel is its
 * own state, because "the reader stopped it" is not a fault (PRD F02).
 *
 * @returns `{ state: 'failed' | 'cancelled' | undefined, message?: string, at?: number }`
 */
export function closingTurnOf(events) {
  for (let index = (Array.isArray(events) ? events.length : 0) - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'turn/end') continue
    const kind = String(event?.data?.reason?.kind ?? '')
    const at = Number(event?.time)
    const message = typeof event?.data?.reason?.error?.message === 'string' ? event.data.reason.error.message : undefined
    const cancelled = ['cancelled', 'aborted', 'stopped', 'interrupted'].includes(kind) || (kind === 'error' && event?.data?.reason?.reason?.kind === 'user')
    if (cancelled) return { state: 'cancelled', at }
    if (['error', 'failed', 'failure'].includes(kind) || event?.data?.reason?.error !== undefined) return { state: 'failed', message, at }
    return { state: undefined, at }
  }
  return { state: undefined }
}

/** The opening line of a prompt, short enough for one row. */
function shortPrompt(text) {
  const value = String(text).replace(/\s+/gu, ' ').trim()
  return value.length > 60 ? `${value.slice(0, 60)}…` : value
}

/** Generation speed from the stats projection, when the Host measured it. */
function speedOf(stats) {
  const decodeMs = Number(stats?.decodeMs) || 0
  const decodeTokens = Number(stats?.decodeTokens) || 0
  if (decodeMs <= 0 || decodeTokens <= 0) return undefined
  return { tokensPerSecond: Math.round((decodeTokens / (decodeMs / 1000)) * 10) / 10, samples: 1 }
}

/** Stable ordering: attention first, then life, then closure. */
export const STATE_ORDER = { waiting: 0, stuck: 1, running: 2, failed: 3, unknown: 4, ended: 5, cancelled: 6 }
