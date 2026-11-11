/**
 * The request ledger: tokens by local day, priced in RMB.
 *
 * The projections only total a Session; they carry no clock. A day split therefore has
 * to come from the event log's own timestamps, and this module is the single place that
 * does it. Its contract is strict on purpose, because every earlier "the amount is zero"
 * report came from an unclear rule here:
 *
 *   1. tokens that a step billed are dated by that step's event time;
 *   2. tokens the log cannot place (a live Session whose chunked log has not flushed,
 *      an unloggable tail) are dated to the day of the cut — never dropped;
 *   3. the sum over all days equals the Session total exactly, always.
 *
 * Rule 2 is what used to be a silent zero: an empty timeline discarded the whole amount.
 */

import { addTokens, localDayStart, tokensOf, totalTokens } from './facts.js'

const MAX_DAYS = 7

/** Record a step's billed usage from one `assistant/message` event. */
function stepUsage(event) {
  const usage = event?.data?.usage
  if (usage === null || typeof usage !== 'object') return undefined
  const tokens = tokensOf(usage)
  const total = totalTokens(tokens)
  if (total === 0) return undefined
  const source = event?.data?.message?.source
  return {
    at: Number(event?.time),
    model: typeof source?.model === 'string' ? source.model : undefined,
    tokens,
  }
}

/**
 * Split one Session's tokens across local days.
 *
 * @param input - `{ totals, events, dayStart, days, tzOffsetSeconds, fallbackAt }`.
 * @returns `[{ day, tokens, models }]` oldest first; empty only when the Session is.
 */
export function splitByDay({ totals, events, dayStart, days, tzOffsetSeconds, fallbackAt }) {
  const total = tokensOf(totals)
  const totalCount = totalTokens(total)
  if (totalCount === 0) return []
  const tz = Number(tzOffsetSeconds) || 0
  const windowStart = Math.min(...(Array.isArray(days) && days.length > 0 ? days : [dayStart])) 
  const windowEnd = Math.max(...(Array.isArray(days) && days.length > 0 ? days : [dayStart])) + 86_400_000

  const byDay = new Map()
  const touch = (day) => {
    const bucket = byDay.get(day) ?? { day, tokens: { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 }, models: new Map() }
    byDay.set(day, bucket)
    return bucket
  }

  let placed = 0
  let lastStepAt
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== 'assistant/message') continue
    const step = stepUsage(event)
    if (step === undefined) continue
    lastStepAt = step.at
    const day = localDayStart(step.at, tz)
    if (day === undefined) continue
    const bucket = touch(day)
    bucket.tokens = addTokens(bucket.tokens, step.tokens)
    placed += totalTokens(step.tokens)
    if (step.model !== undefined) {
      const entry = bucket.models.get(step.model) ?? { tokens: { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 } }
      entry.tokens = addTokens(entry.tokens, step.tokens)
      bucket.models.set(step.model, entry)
    }
  }

  // Rule 2: whatever the steps did not account for belongs to the cut's own day.
  const remainder = totalCount - placed
  if (remainder > 0) {
    const day = localDayStart(fallbackAt ?? lastStepAt ?? Date.now(), tz) ?? dayStart
    touch(day).tokens = addTokens(touch(day).tokens, scale(total, remainder / totalCount))
  } else if (remainder < 0) {
    // Steps can over-report when the projection already includes a retried attempt:
    // keep the projection's total by trimming the newest day last.
    trim(byDay, -remainder)
  }

  const rows = [...byDay.values()]
    .filter((bucket) => totalTokens(bucket.tokens) > 0)
    .map((bucket) => ({
      day: bucket.day,
      tokens: bucket.tokens,
      models: [...bucket.models.entries()].map(([model, entry]) => ({ model, tokens: entry.tokens })),
    }))
    .sort((left, right) => left.day - right.day)
  // Only the requested window is reported; the caller knows what it asked for.
  return rows.filter((row) => row.day >= windowStart && row.day < windowEnd)
}

/** A proportional share of a bucket set that sums exactly to `count` tokens. */
function scale(tokens, factor) {
  const scaled = {
    uncachedInput: Math.round(tokens.uncachedInput * factor),
    cacheReadInput: Math.round(tokens.cacheReadInput * factor),
    cacheWriteInput: Math.round(tokens.cacheWriteInput * factor),
    output: Math.round(tokens.output * factor),
  }
  const drift = Math.round(countOf(tokens) * factor) - countOf(scaled)
  scaled.output += drift
  return scaled
}

function countOf(tokens) {
  return totalTokens(tokens)
}

/** Remove `amount` tokens from the newest days, oldest first kept intact. */
function trim(byDay, amount) {
  const rows = [...byDay.values()].sort((left, right) => right.day - left.day)
  let left = amount
  for (const row of rows) {
    if (left <= 0) break
    const count = totalTokens(row.tokens)
    if (count === 0) continue
    const keep = Math.max(0, count - left)
    left -= count - keep
    row.tokens = scale(row.tokens, keep / count)
  }
}

/**
 * Roll the priced Session-days into the overview, projects and trend.
 *
 * @param input - `{ rows, days, pricing, projects }` where `rows` is
 *   `[{ sessionId, project, title, model, day, tokens, price }]`.
 */
export function rollup({ rows, days, currency }) {
  const index = new Map(days.map((day, position) => [day, position]))
  const trend = days.map((day) => ({ day, amount: 0, tokens: 0, sessions: 0, unpriced: 0 }))
  const projects = new Map()
  let amount = 0
  let pricedTokens = 0
  let unpricedTokens = 0
  const sessionsToday = new Map()

  for (const row of rows) {
    const tokens = totalTokens(row.tokens)
    const point = index.get(row.day)
    if (point !== undefined) {
      const cell = trend[point]
      cell.amount += row.price.amount
      cell.tokens += tokens
      cell.sessions += 1
      if (row.price.quality === 'unpriced') cell.unpriced += tokens
    }
    const project = projects.get(row.project) ?? { projectId: row.project, name: row.name ?? row.project, amount: 0, sessions: new Set(), tokens: 0, unpriced: 0 }
    project.amount += row.price.amount
    project.sessions.add(row.sessionId)
    project.tokens += tokens
    if (row.price.quality === 'unpriced') project.unpriced += tokens
    projects.set(row.project, project)

    if (row.day === days[0]) {
      const entry = sessionsToday.get(row.sessionId) ?? {
        sessionId: row.sessionId,
        project: row.project,
        name: row.name,
        title: row.title,
        model: row.model,
        amount: 0,
        tokens: { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 },
        // The row needs the verdict, not the price table it came from.
        quality: row.price.quality,
        coverage: row.price.coverage,
      }
      entry.amount += row.price.amount
      entry.tokens = addTokens(entry.tokens, row.tokens)
      sessionsToday.set(row.sessionId, entry)
      amount += row.price.amount
      if (row.price.quality === 'unpriced') unpricedTokens += tokens
      else pricedTokens += tokens
    }
  }

  const observable = pricedTokens + unpricedTokens
  return {
    currency,
    today: {
      amount: round(amount),
      coverage: observable === 0 ? undefined : round(pricedTokens / observable, 4),
      unpricedTokens,
      tokens: pricedTokens + unpricedTokens,
      sessions: [...sessionsToday.values()].sort((left, right) => right.amount - left.amount),
    },
    projects: [...projects.values()]
      .map((project) => ({
        projectId: project.projectId,
        name: project.name,
        amount: round(project.amount),
        sessions: project.sessions.size,
        tokens: project.tokens,
        coverage: project.tokens === 0 ? undefined : round((project.tokens - project.unpriced) / project.tokens, 4),
      }))
      .sort((left, right) => right.amount - left.amount || left.projectId.localeCompare(right.projectId)),
    trend: trend.map((point) => ({ ...point, amount: round(point.amount), sessions: point.sessions })),
  }
}

function round(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round((Number(value) || 0) * factor) / factor
}

export { MAX_DAYS }
