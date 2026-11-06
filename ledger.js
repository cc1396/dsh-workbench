/**
 * The request ledger (PRD F05): one priced row per Session per day, plus the
 * project roll-up, the per-model speed summary and the seven-day trend.
 *
 * Tokens come from the Host's `tokenUsage` projection, which keeps billed totals
 * in four exclusive buckets. Day attribution follows the request's settlement
 * time, so the fold splits each Session's totals by when the Session was active:
 *
 *  1. the last step's buckets are dated to the last exchange (the live tail);
 *  2. the rest is dated by the Session's last event per day — a Session that only
 *     worked today puts every remaining token there;
 *  3. a Session that crossed midnight is reconciled with its step-boundary turns:
 *     each day gets the tokens of the turns that ended inside it, an unknown
 *     remainder goes to the last day, and the sum is kept exact. The date comes
 *     from the timeline, the token total never does — a day total can never
 *     exceed the Session's own total.
 *
 * Prices come from the bundle configuration, per model with a default row. Tokens
 * with no price row are reported as unpriced and lower coverage instead of being
 * guessed; only tokens that were observable (actually landed) enter the coverage
 * denominator, so historical Sessions outside the sessionStats window do not
 * masquerade as missing usage.
 */

import { addTokens, DAY_MS, localDayStart, tokensOf } from './sessions.js'

const MAX_MODELS = 8
const MAX_DAYS = 7

/** Local calendar key (`YYYY-MM-DD`) of a day start. */
export function dayKey(day, tzOffsetSeconds = 0) {
  const date = new Date(Number(day) + (Number(tzOffsetSeconds) || 0) * 1000)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** Price one exclusive bucket set with one price row (per million tokens). */
export function priceOf(tokens, price) {
  const row = priceRow2(price)
  if (row === undefined) return undefined
  return (
    (Number(tokens.uncachedInput) * row.input +
      Number(tokens.cacheReadInput) * row.cacheRead +
      Number(tokens.cacheWriteInput) * row.cacheWrite +
      Number(tokens.output) * row.output) /
    1_000_000
  )
}

/** Accept the configuration's compact keys (`input`/`cacheRead`/`cacheWrite`/`output`). */
function priceRow2(price) {
  if (price === null || typeof price !== 'object') return undefined
  const pick = (a, b) => {
    const value = price[a] ?? price[b]
    if (value === undefined) return undefined
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : undefined
  }
  const row = {
    input: pick('input', 'uncachedInput'),
    cacheRead: pick('cacheRead', 'cacheReadInput'),
    cacheWrite: pick('cacheWrite', 'cacheWriteInput'),
    output: pick('output'),
  }
  if (row.input === undefined && row.cacheRead === undefined && row.output === undefined) return undefined
  return {
    input: row.input ?? 0,
    cacheRead: row.cacheRead ?? 0,
    cacheWrite: row.cacheWrite ?? row.cacheRead ?? 0,
    output: row.output ?? 0,
  }
}

/**
 * Split total input and cache hits into exclusive buckets.
 * PRD A03: 1,000 input of which 400 hits prices 600 uncached and 400 hits.
 */
export function splitCache(inputTokens, cacheReadTokens) {
  const input = Math.max(0, Number(inputTokens) || 0)
  const cacheRead = Math.max(0, Math.min(Number(cacheReadTokens) || 0, input))
  return { uncachedInput: input, cacheReadInput: cacheRead, cacheWriteInput: 0, output: 0 }
}

/** Read one bucket object into exactly the four bucket fields. */
export function bucketOf(value) {
  if (value === null || typeof value !== 'object') return emptyTokens()
  const pick = (key) => {
    const number = Number(value[key])
    return Number.isFinite(number) && number > 0 ? number : 0
  }
  return {
    uncachedInput: pick('uncachedInput') || pick('uncachedInputTokens') || pick('inputTokens'),
    cacheReadInput: pick('cacheReadInput') || pick('cacheReadTokens'),
    cacheWriteInput: pick('cacheWriteInput') || pick('cacheWriteTokens'),
    output: pick('output') || pick('outputTokens'),
  }
}

/** Sum of the four exclusive buckets (cached hits included: they are billed tokens). */
export function totalOf(tokens) {
  return (
    Math.round(Number(tokens?.uncachedInput) || 0) +
    Math.round(Number(tokens?.cacheReadInput) || 0) +
    Math.round(Number(tokens?.cacheWriteInput) || 0) +
    Math.round(Number(tokens?.output) || 0)
  )
}

function round(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function emptyTokens() {
  return { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 }
}

/**
 * Split one Session's folded tokens across the local days of the window.
 *
 * @param input - `{ totals, last, events, turns, dayStart, days, tzOffsetSeconds }`:
 *   the `tokenUsage` projection values, the Session's own events (turn boundaries
 *   and step ends), the per-turn token map, the client's local midnight, and the
 *   rolling window (newest first).
 * @returns one `{ day, windowIndex, tokens, dropped }` row per day with tokens.
 */
export function allotDays(input) {
  const days = Array.isArray(input?.days) && input.days.length > 0 ? input.days : [input?.dayStart]
  const windowIndex = new Map(days.map((day, index) => [day, index]))
  const rows = allotMap(input)
  const inside = []
  for (const [day, tokens] of rows) {
    if (totalOf(tokens) === 0) continue
    const index = windowIndex.get(day)
    if (index === undefined) continue
    inside.push({ day, windowIndex: index, tokens, dropped: 0 })
  }
  // Whatever the window cannot hold is reported (as a whole) on the newest inside row.
  const spilled = totalOf(tokensOf(input?.totals)) - inside.reduce((sum, row) => sum + totalOf(row.tokens), 0)
  if (inside.length > 0) inside[0].dropped = Math.max(0, spilled)
  return inside.sort((left, right) => right.day - left.day)
}

/**
 * One Session's tokens split by local day, without a window: every day the Session
 * touched is present, so a request row can be priced for any past day, not just the
 * seven the trend shows.
 *
 * @param input - `{ totals, last, events, turns, tzOffsetSeconds }`.
 * @returns `Map<dayStart, tokens>` with the exact totals, in oldest-first day order.
 */
export function allotByDay(input) {
  return new Map(allotMap(input))
}

/** Split the totals by day, oldest first; the sum of the rows is exactly the total. */
function allotMap(input) {
  // `tokensOf` already returns a fresh bucket set.
  const total = tokensOf(input?.totals)
  if (totalOf(total) === 0) return new Map()
  const tz = Number(input.tzOffsetSeconds) || 0
  const dayOf = (at) => {
    const number = Number(at)
    if (!Number.isFinite(number) || number <= 0) return undefined
    return localDayStart(number, tz)
  }

  // The tail is the last step's buckets, which point references carry too; read
  // them through own-property names so a projection value's other fields cannot leak in.
  const last = bucketOf(input.last)
  const tail = totalOf(last) > 0 ? last : emptyTokens()
  const rest = {
    uncachedInput: total.uncachedInput - tail.uncachedInput,
    cacheReadInput: total.cacheReadInput - tail.cacheReadInput,
    cacheWriteInput: total.cacheWriteInput - tail.cacheWriteInput,
    output: total.output - tail.output,
  }

  /** Last event per local day, and the day of the last event overall. */
  const lastByDay = new Map()
  let lastDay
  let lastAt = 0
  for (const event of Array.isArray(input.events) ? input.events : []) {
    if (event === null || typeof event !== 'object') continue
    const at = Number(event.time)
    if (!Number.isFinite(at)) continue
    const day = dayOf(at)
    if (day === undefined) continue
    lastByDay.set(day, Math.max(lastByDay.get(day) ?? 0, at))
    if (at >= lastAt) {
      lastAt = at
      lastDay = day
    }
  }

  const rows = []
  if (totalOf(rest) > 0) {
    const touched = [...lastByDay.keys()]
    if (touched.length <= 1) {
      rows.push({ day: lastDay ?? touched[0], tokens: rest })
    } else {
      const turns = Array.isArray(input.turns) ? input.turns : []
      const shares = touched
        .sort((left, right) => left - right)
        .map((day) => {
          const inside = turns.filter((turn) => {
            const at = Number(turn.at)
            return Number.isFinite(at) && at >= day && at < day + DAY_MS
          })
          const open = inside.some((turn) => turn.open === true)
          const tokens = inside.reduce((sum, turn) => sum + (Number(turn.tokens) || 0), 0)
          return { day, open, tokens: inside.some((turn) => turn.tokens !== undefined) ? tokens : undefined }
        })
      // The unknown remainder belongs to the day that is still open, else the latest one.
      const lastUnknown = shares.filter((share) => share.tokens === undefined).at(-1)
      for (const share of shares) {
        share.tokens = share.tokens ?? (share === lastUnknown ? Math.max(0, Math.round(rest.output)) : 0)
      }
      const outputSum = shares.reduce((sum, share) => sum + share.tokens, 0) || 1
      for (const share of shares) {
        const factor = share.tokens / outputSum
        rows.push({
          day: share.day,
          tokens: {
            uncachedInput: Math.round(rest.uncachedInput * factor),
            cacheReadInput: Math.round(rest.cacheReadInput * factor),
            cacheWriteInput: Math.round(rest.cacheWriteInput * factor),
            output: Math.round(share.tokens),
          },
        })
      }
      // Keep the day split exactly equal to the Session's own remaining totals.
      const spill = {
        uncachedInput: rest.uncachedInput - rows.reduce((sum, row) => sum + row.tokens.uncachedInput, 0),
        cacheReadInput: rest.cacheReadInput - rows.reduce((sum, row) => sum + row.tokens.cacheReadInput, 0),
        cacheWriteInput: rest.cacheWriteInput - rows.reduce((sum, row) => sum + row.tokens.cacheWriteInput, 0),
        output: rest.output - rows.reduce((sum, row) => sum + row.tokens.output, 0),
      }
      if (rows.length > 0) rows[0].tokens = addTokens(rows[0].tokens, spill)
    }
  }

  // The tail counts for the day it landed on, even if the window moved meanwhile.
  if (totalOf(tail) > 0) {
    const day = lastDay ?? rows[0]?.day
    const index = rows.findIndex((row) => row.day === day)
    if (index >= 0) rows[index].tokens = addTokens(rows[index].tokens, tail)
    else rows.push({ day, tokens: tail })
  }

  const map = new Map()
  for (const row of rows) {
    if (row.day === undefined) continue
    if (totalOf(row.tokens) === 0) continue
    map.set(row.day, row.tokens)
  }
  return new Map([...map.entries()].sort((left, right) => left[0] - right[0]))
}

/**
 * Price one day row against the Session's per-model split.
 *
 * @param tokens - the day's exclusive buckets.
 * @param models - the Session's `tokensByModel` rows `{ model, totals, ... }`.
 * @param priceFor - `(model) => price row | undefined`; `undefined` model means the default row.
 * @returns `{ parts, amount, quality, coverage }`, the coverage over the day's tokens.
 */
export function priceRow(tokens, models, priceFor) {
  const total = totalOf(tokens)
  const list = Array.isArray(models) ? models.filter((entry) => totalOf(entry.totals) > 0) : []
  const base = list.reduce((sum, entry) => sum + totalOf(entry.totals), 0)
  const parts = []
  let priced = 0
  let unpriced = 0
  if (list.length === 0) {
    const amount = priceOf(tokens, priceFor(undefined))
    if (total > 0) {
      if (amount === undefined) unpriced = total
      else priced = amount
      parts.push({ model: undefined, tokens, amount, quality: amount === undefined ? 'unpriced' : 'priced' })
    }
  } else {
    for (const entry of list) {
      const source = entry.totals
      const factor = base > 0 ? totalOf(source) / base : 1
      const slice = {
        uncachedInput: Math.round(tokens.uncachedInput * factor),
        cacheReadInput: Math.round(tokens.cacheReadInput * factor),
        cacheWriteInput: Math.round(tokens.cacheWriteInput * factor),
        output: Math.round(tokens.output * factor),
      }
      const price = priceFor(entry.model)
      const amount = priceOf(slice, price)
      if (amount === undefined) unpriced += totalOf(slice)
      else priced += amount
      parts.push({ model: entry.model, tokens: slice, amount, quality: amount === undefined ? 'unpriced' : 'priced' })
    }
  }
  const quality = total === 0 ? 'empty' : unpriced === 0 ? 'priced' : priced > 0 ? 'partial' : 'unpriced'
  return {
    parts,
    amount: round(priced),
    quality,
    coverage: total > 0 ? round(Math.max(0, (total - unpriced) / total), 4) : 0,
  }
}

/**
 * Roll the per-Session rows up into the cost view.
 *
 * @param input - `{ sessions, now, tzOffsetSeconds, dayStart, days, currency }`
 *   where `sessions` is `[{ sessionId, projectId, projectName, title, model, rows }]`
 *   and `days` is the rolling window, newest first.
 */
export function buildLedger(input) {
  const days = Array.isArray(input.days) && input.days.length > 0 ? input.days.slice(0, MAX_DAYS) : [input.dayStart]
  const todayStart = days[0]
  const index = new Map(days.map((day, position) => [day, position]))
  const trend = days.map((day) => ({ day, amount: 0, outputTokens: 0, unpricedTokens: 0, pricedTokens: 0, sessions: 0, partial: false }))
  const projects = new Map()
  const sessionsByDay = new Map()

  for (const session of Array.isArray(input.sessions) ? input.sessions : []) {
    for (const row of Array.isArray(session.rows) ? session.rows : []) {
      const tokens = totalOf(row.tokens)
      const point = index.get(row.day) === undefined ? undefined : trend[index.get(row.day)]
      if (point !== undefined) {
        point.amount += row.amount
        point.outputTokens += Math.round(row.tokens.output)
        point.unpricedTokens += row.quality === 'unpriced' ? tokens : 0
        point.pricedTokens += row.quality === 'priced' ? tokens : 0
        point.partial = point.partial || row.quality !== 'priced'
      }
      const project = projects.get(session.projectId) ?? {
        projectId: session.projectId,
        name: session.projectName,
        sessions: new Set(),
        amount: 0,
        tokens: emptyTokens(),
        covered: 0,
        unpriced: 0,
        byDay: new Map(),
      }
      project.sessions.add(session.sessionId)
      project.tokens = addTokens(project.tokens, row.tokens)
      project.covered += row.coverage > 0 ? tokens : 0
      project.unpriced += row.quality === 'unpriced' ? tokens : 0
      project.byDay.set(session.sessionId, (project.byDay.get(session.sessionId) ?? 0) + row.amount)
      projects.set(session.projectId, project)

      const day = sessionsByDay.get(row.day) ?? new Map()
      const entry = day.get(session.sessionId) ?? {
        sessionId: session.sessionId,
        projectId: session.projectId,
        projectName: session.projectName,
        title: session.title,
        model: session.model,
        amount: 0,
        tokens: emptyTokens(),
        parts: [],
        quality: 'empty',
        coverage: 1,
      }
      entry.amount = round(entry.amount + row.amount)
      entry.tokens = addTokens(entry.tokens, row.tokens)
      entry.parts = [...entry.parts, ...row.parts].slice(-8)
      entry.quality = entry.quality === 'priced' || row.quality === 'priced' ? 'priced' : row.quality
      entry.coverage = Math.min(entry.coverage, row.coverage)
      day.set(session.sessionId, entry)
      sessionsByDay.set(row.day, day)
    }
  }

  const todaySessions = [...(sessionsByDay.get(todayStart)?.values() ?? [])].sort(
    (left, right) => right.amount - left.amount || left.sessionId.localeCompare(right.sessionId),
  )
  const totals = todaySessions.reduce(
    (sum, entry) => {
      const tokens = totalOf(entry.tokens)
      sum.tokens = addTokens(sum.tokens, entry.tokens)
      if (entry.quality === 'priced') sum.pricedTokens += tokens
      if (entry.quality !== 'priced') sum.unpriced += tokens
      if (entry.quality === 'priced') sum.full += entry.amount
      if (entry.quality !== 'unpriced') sum.partial += entry.amount
      return sum
    },
    { tokens: emptyTokens(), pricedTokens: 0, unpriced: 0, full: 0, partial: 0 },
  )
  const observable = totals.pricedTokens + totals.unpriced

  return {
    windowStart: days[days.length - 1],
    windowEnd: todayStart,
    currency: input.currency ?? 'CNY',
    amount: round(totals.full),
    amountPartial: round(totals.partial),
    coverage: observable === 0 ? undefined : round(totals.pricedTokens / observable, 4),
    unpricedTokens: totals.unpriced,
    sessions: todaySessions,
    projects: [...projects.values()]
      .map((project) => ({
        projectId: project.projectId,
        name: project.name,
        sessions: project.sessions.size,
        amount: round([...project.byDay.values()].reduce((sum, value) => sum + value, 0)),
        todayAmount: round(
          [...(sessionsByDay.get(todayStart)?.values() ?? [])]
            .filter((entry) => entry.projectId === project.projectId)
            .reduce((sum, entry) => sum + entry.amount, 0),
        ),
        tokens: project.tokens,
        coverage: project.covered + project.unpriced === 0 ? undefined : round(project.covered / (project.covered + project.unpriced), 4),
        unpricedTokens: project.unpriced,
      }))
      .sort((left, right) => right.amount - left.amount || left.projectId.localeCompare(right.projectId)),
    trend: trend.map((point) => ({ ...point, amount: round(point.amount) })),
    trendMax: Math.max(0, ...trend.map((point) => point.amount)),
    daySessions: days.map((day) => ({
      day,
      sessions: [...(sessionsByDay.get(day)?.values() ?? [])].sort(
        (left, right) => right.amount - left.amount || left.sessionId.localeCompare(right.sessionId),
      ),
    })),
    maxModels: MAX_MODELS,
  }
}

/**
 * Summarize per-model speed from the Session speed samples.
 *
 * @param sessions - `[{ model, speed: [{ endTime, outputTokens, durationMs }] }]`.
 * @param windowStart - inclusive start of the sample window.
 * @returns `{ models, current, samples }` with nearest-rank percentiles.
 */
export function summarizeSpeed(sessions, windowStart) {
  const byModel = new Map()
  let current
  let samples = 0
  for (const session of Array.isArray(sessions) ? sessions : []) {
    for (const sample of Array.isArray(session.speed) ? session.speed : []) {
      const at = Number(sample.endTime)
      const tokens = Number(sample.outputTokens)
      const duration = Number(sample.durationMs)
      if (!Number.isFinite(at) || at < windowStart || !(tokens > 0) || !(duration > 0)) continue
      const rate = tokens / (duration / 1000)
      if (rate < 1) continue
      samples += 1
      const model = session.model ?? 'unknown'
      const bucket = byModel.get(model) ?? { model, requests: 0, outputTokens: 0, durationMs: 0, rates: [] }
      bucket.requests += 1
      bucket.outputTokens += tokens
      bucket.durationMs += duration
      bucket.rates.push(rate)
      byModel.set(model, bucket)
      if (current === undefined || at > current.time) {
        current = { time: at, model: session.model, sessionId: session.sessionId, tokensPerSecond: round(rate, 1), outputTokens: Math.round(tokens), durationMs: Math.round(duration) }
      }
    }
  }
  const models = [...byModel.values()]
    .map((bucket) => ({
      model: bucket.model,
      requests: bucket.requests,
      outputTokens: Math.round(bucket.outputTokens),
      durationMs: Math.round(bucket.durationMs),
      tokensPerSecond: round(bucket.outputTokens / (bucket.durationMs / 1000), 1),
      p50TokensPerSecond: percentile(bucket.rates, 0.5),
      p90TokensPerSecond: percentile(bucket.rates, 0.9),
      samples: bucket.rates.length,
    }))
    .sort((left, right) => right.outputTokens - left.outputTokens)
    .slice(0, MAX_MODELS)
  return { models, current, samples }
}

/** Nearest-rank percentile. */
export function percentile(values, fraction) {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values.slice().sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return round(sorted[index], 1)
}
/**
 * The cost view of one Session on the path project → Session → request (PRD F05).
 *
 * The Host commits tokens per step and bills totals per Session; nothing durable
 * carries a provider request id, so this view is honest about what it can prove:
 *
 *  - every assistant step of `events` inside one local day is one request measure,
 *    with the exact four billed buckets, the provider and model route, and the
 *    step's settlement time;
 *  - a step whose size and instant repeat (a retried attempt) keeps its tokens but
 *    is listed without an amount, so no row claims the same spend twice;
 *  - `remainder` is the tokens the steps did not account for — a retried attempt, a
 *    compacted transcript, a write the log has not flushed — priced on its own so
 *    the rows always add up to the Session's own daily total;
 *  - the currency shown is the configured one; an adapter settling in another
 *    currency must price with that currency's table instead of this estimate.
 *
 * @param input - `{ events, day, tzOffsetSeconds, models, priceFor, dayTokens, currency, priceRef }`.
 * @returns `{ rows, coverage, amount, currency, priceRef, prices }`.
 */
export function buildRequestDetail(input) {
  const tz = Number(input.tzOffsetSeconds) || 0
  const day = Number(input.day)
  const models = Array.isArray(input.models) ? input.models.filter((entry) => totalOf(entry.totals) > 0) : []
  const steps = []
  for (const event of Array.isArray(input.events) ? input.events : []) {
    if (event?.type !== 'assistant/message') continue
    const at = Number(event.time)
    if (!Number.isFinite(at) || localDayStart(at, tz) !== day) continue
    const usage = event.data?.usage
    if (usage === null || typeof usage !== 'object') continue
    const tokens = bucketOf(usage)
    const total = totalOf(tokens)
    if (total === 0) continue
    const source = event.data?.message?.source
    const seenKey = `${at}:${total}:${typeof source?.model === 'string' ? source.model : ''}`
    steps.push({
      requestId: `step_${Number(event.data?.turn) || 0}_${Number(event.data?.step) || 0}`,
      at,
      model: typeof source?.model === 'string' && source.model !== '' ? source.model : undefined,
      provider: typeof source?.provider === 'string' && source.provider !== '' ? source.provider : undefined,
      tokens,
      total,
      seenKey,
    })
  }
  steps.sort((left, right) => left.at - right.at || left.requestId.localeCompare(right.requestId))

  const counts = new Map()
  for (const step of steps) counts.set(step.seenKey, (counts.get(step.seenKey) ?? 0) + 1)
  const rows = []
  const usedModels = new Set()
  let priced = 0
  let covered = 0
  for (const step of steps) {
    // The model of the request that actually ran: the message's own, else the Session's.
    const model = step.model ?? models[0]?.model
    const price = input.priceFor?.(model)
    const amount = price === undefined ? undefined : priceOf(step.tokens, price)
    const ambiguous = counts.get(step.seenKey) > 1
    if (model !== undefined) usedModels.add(model)
    if (amount !== undefined && !ambiguous) {
      priced += amount
      covered += step.total
    }
    rows.push({
      requestId: step.requestId,
      at: step.at,
      status: 'settled',
      provider: step.provider,
      model,
      tokens: step.tokens,
      amount: amount !== undefined && !ambiguous ? round(amount) : undefined,
      quality: ambiguous ? 'duplicate' : amount === undefined ? 'unpriced' : 'priced',
      priceRef: price === undefined ? undefined : input.priceRef,
      attribution: 'workspace',
    })
  }

  // Whatever the steps did not explain stays attributed to the Session, not to a request.
  const dayTokens = totalOf(input.dayTokens)
  const explained = steps.reduce((sum, step) => sum + step.total, 0)
  const remainderTokens = bucketOf(input.dayTokens)
  const scale = dayTokens > 0 ? Math.max(0, dayTokens - explained) / Math.max(1, dayTokens) : 0
  const remainder = {
    uncachedInput: Math.round(remainderTokens.uncachedInput * scale),
    cacheReadInput: Math.round(remainderTokens.cacheReadInput * scale),
    cacheWriteInput: Math.round(remainderTokens.cacheWriteInput * scale),
    output: Math.round(remainderTokens.output * scale),
  }
  const remainderTotal = totalOf(remainder)
  const defaultModel = models[0]?.model
  const remainderPrice = input.priceFor?.(defaultModel)
  const remainderAmount = remainderTotal > 0 && remainderPrice !== undefined ? priceOf(remainder, remainderPrice) : undefined
  if (remainderTotal > 0) {
    rows.push({
      requestId: 'session-remainder',
      at: undefined,
      status: 'aggregate',
      provider: undefined,
      model: defaultModel,
      tokens: remainder,
      amount: remainderAmount === undefined ? undefined : round(remainderAmount),
      quality: remainderAmount === undefined ? 'unpriced' : 'remainder',
      priceRef: remainderAmount === undefined ? undefined : input.priceRef,
      attribution: 'session',
    })
    if (remainderAmount !== undefined) {
      priced += remainderAmount
      covered += remainderTotal
    }
  }

  const prices = [...usedModels]
    .map((model) => ({ model, ref: input.priceRef, ...input.priceFor?.(model) }))
    .filter((entry) => entry.input !== undefined || entry.output !== undefined)
  return {
    rows,
    amount: round(priced),
    coverage: explained + remainderTotal > 0 ? round(covered / (explained + remainderTotal), 4) : undefined,
    currency: input.currency,
    priceRef: input.priceRef,
    prices,
  }
}
