/**
 * The snapshot: one consistent cut of everything the panel shows.
 *
 * This is the only shape the browser receives. It is built once per request from a
 * single catalog read, and every view reads the same facts, so a card, its alert and
 * its amount can never disagree.
 *
 * The shape is versioned (`SCHEMA_VERSION`); the client refuses a snapshot it does not
 * understand instead of rendering blanks, which is how a field rename used to become
 * "no data at all".
 */

import { capabilitiesOf, listSessions, liveAgents, projectionsOf, readEvents, serviceOf } from './host.js'
import { factsOf, localDayStart, STATE_ORDER, tokensFromEvents, totalTokens } from './facts.js'
import { rollup, splitByDay, MAX_DAYS } from './ledger.js'
import { priceSessionDay } from './pricing.js'

export const SCHEMA_VERSION = 3

const DAY_MS = 86_400_000
const SCAN_BUDGET_MS = 2500
const MAX_SCAN = 120

/**
 * Build the snapshot.
 *
 * @param ctx - Host context.
 * @param settings - `{ pricing, tzOffsetSeconds, maxScan }` from the resolved config.
 * @param input - `{ now, tzOffsetSeconds, signal }`.
 * @returns the snapshot body; see the client for the consuming shape.
 */
export async function buildSnapshot(ctx, settings, input) {
  const now = Number(input.now) || Date.now()
  const tz = Number(input.tzOffsetSeconds) || 0
  const capabilities = capabilitiesOf(ctx)
  const catalog = await listSessions(ctx, input.signal)
  const records = catalog.records.filter((record) => record.id !== '')
  const agents = liveAgents(ctx)
  const dayStart = localDayStart(now, tz)
  const days = Array.from({ length: MAX_DAYS }, (_, index) => dayStart - index * DAY_MS)

  // Read every Session once, bounded: a slow disk must not hold the panel hostage.
  const deadline = Date.now() + (Number(settings.scanBudgetMs) || SCAN_BUDGET_MS)
  const limit = Number(settings.maxScanSessions) || MAX_SCAN
  const cuts = []
  let scanned = 0
  for (const record of sortForScan(records, agents)) {
    if (Date.now() > deadline || scanned >= limit) break
    scanned += 1
    cuts.push(await cutOf(ctx, record, agents, now, tz, dayStart, days, settings))
  }

  // Children are counted under their parent and never listed on their own (PRD F02).
  const childrenByParent = new Map()
  for (const record of records) {
    if (record.parentId !== undefined) childrenByParent.set(record.parentId, (childrenByParent.get(record.parentId) ?? 0) + 1)
  }
  const primary = cuts.filter((cut) => cut.facts.parentId === undefined)

  const priced = primary.flatMap((cut) => cut.pricedRows)
  const ledger = rollup({ rows: priced, days, currency: settings.pricing.currency })

  const rows = primary.map((cut) => publicRowOf(cut, ledger, childrenByParent.get(cut.facts.id) ?? 0))
  const running = rows
    .filter((row) => row.running)
    .sort((left, right) => STATE_ORDER[left.state] - STATE_ORDER[right.state] || (right.lastAt ?? 0) - (left.lastAt ?? 0) || left.sessionId.localeCompare(right.sessionId))
  const recent = rows
    .filter((row) => row.running !== true && row.endedAt !== undefined)
    .sort((left, right) => right.endedAt - left.endedAt || left.sessionId.localeCompare(right.sessionId))
    .slice(0, Number(settings.maxRecentTasks) || 8)

  return {
    schema: SCHEMA_VERSION,
    generatedAt: now,
    tzOffset: tz,
    currency: ledger.currency,
    capabilities: {
      ...capabilities,
      prices: { ref: settings.pricing.ref, models: settings.pricing.models.size },
      scanned,
      total: records.length,
    },
    overview: {
      todayStart: dayStart,
      dayKey: dayKeyOf(dayStart, tz),
      amount: ledger.today.amount,
      coverage: ledger.today.coverage,
      unpricedTokens: ledger.today.unpricedTokens,
      tokens: ledger.today.tokens,
      sessions: records.length,
      running: running.length,
      waiting: running.filter((row) => row.state === 'waiting').length,
      failed: rows.filter((row) => row.state === 'failed').length,
      speed: speedSummaryOf(primary),
    },
    running,
    recent,
    ledger: {
      currency: ledger.currency,
      today: ledger.today,
      projects: ledger.projects,
      trend: ledger.trend,
      days,
    },
    search: {
      rows: rows.map((row) => ({
        sessionId: row.sessionId,
        title: row.title,
        project: row.project,
        projectName: row.projectName,
        model: row.model,
        state: row.state,
        at: row.endedAt ?? row.lastAt,
      })),
    },
  }
}

/** Live Sessions first, then the most recently created: a cold start shows the ones that matter. */
function sortForScan(records, agents) {
  return [...records].sort((left, right) => {
    const liveLeft = agents.has(left.id) ? 1 : 0
    const liveRight = agents.has(right.id) ? 1 : 0
    return liveRight - liveLeft || right.createdAt - left.createdAt
  })
}

/**
 * One Session: its facts, its day split and its priced rows.
 *
 * The event read is the only expensive step and it happens once here; the projection
 * values answer the cheap questions (tokens, turns, title, route).
 */
async function cutOf(ctx, record, agents, now, tz, dayStart, days, settings) {
  const values = projectionsOf(ctx, record.id)
  const live = agents.get(record.id)
  const facts = factsOf(record, values, live, now)
  const log = await readEvents(ctx, record.id, undefined)
  const endedAt = endsAtOf(log.events)
  // The projection totals when the registry is composed; otherwise the same log pass
  // produces them, so a composition without `sessionProjections` is still priced.
  const fromLog = totalTokens(facts.tokens) === 0 ? tokensFromEvents(log.events, tz) : undefined
  const totals = fromLog === undefined ? facts.tokens : fromLog.totals
  const pricedRows = []
  for (const day of splitByDay({ totals, events: log.events, dayStart, days, tzOffsetSeconds: tz, fallbackAt: now })) {
    pricedRows.push({
      sessionId: record.id,
      project: record.cwd ?? '',
      name: projectNameOf(record.cwd),
      title: facts.title,
      model: facts.route.model,
      day: day.day,
      tokens: day.tokens,
      price: priceSessionDay(day.tokens, facts.route.model, settings.pricing),
    })
  }
  return {
    facts: {
      ...facts,
      tokens: totals,
      model: facts.route.model,
      projectName: projectNameOf(record.cwd),
      endedAt,
      lastAt: facts.lastAt ?? endedAt,
    },
    events: log.source,
    pricedRows,
  }
}

/** The last `turn/end` in a log: when the Session stopped, whatever its state. */
function endsAtOf(events) {
  for (let index = (Array.isArray(events) ? events.length : 0) - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'turn/end') {
      const at = Number(event.time)
      if (Number.isFinite(at) && at > 0) return at
    }
  }
  return undefined
}

/** One row as the browser consumes it. */
function publicRowOf(cut, ledger, children) {
  const facts = cut.facts
  const spend = ledger.today.sessions.find((entry) => entry.sessionId === facts.id)
  return {
    sessionId: facts.id,
    title: facts.title,
    project: facts.project,
    projectName: facts.projectName,
    model: facts.model,
    state: facts.state,
    running: facts.running,
    waiting: facts.waiting,
    turn: facts.turn,
    turns: facts.turns,
    tokens: facts.tokens,
    speed: facts.speed,
    lastAt: facts.lastAt,
    endedAt: facts.endedAt,
    children,
    today: spend === undefined
      ? { amount: 0, quality: 'empty' }
      : { amount: spend.amount, quality: spend.price?.quality ?? 'empty', coverage: spend.price?.coverage },
  }
}

/** Speed summary across the Sessions that measured one. */
function speedSummaryOf(cuts) {
  const rates = cuts.map((cut) => cut.facts.speed?.tokensPerSecond).filter((rate) => Number.isFinite(rate) && rate > 0)
  if (rates.length === 0) return undefined
  const sorted = [...rates].sort((left, right) => left - right)
  const p50 = sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.5) - 1))]
  return { p50: Math.round(p50 * 10) / 10, samples: rates.length }
}

/**
 * The last path segment, the label every surface shows.
 *
 * DSH stores a workspace path verbatim, but a dash-encoded directory name
 * (`--Users-apple-project-x--`) also reaches this function in tooling, so dashes are
 * treated as separators when the string carries no slash at all.
 */
export function projectNameOf(cwd) {
  if (typeof cwd !== 'string' || cwd === '') return ''
  const trimmed = cwd.replace(/[\\/]+$/, '')
  const parts = trimmed.includes('/') || trimmed.includes('\\')
    ? trimmed.split(/[\\/]+/).filter((part) => part !== '')
    : trimmed.replace(/^-+|-+$/g, '').split('-').filter((part) => part !== '')
  return parts.length === 0 ? trimmed : parts[parts.length - 1]
}

function dayKeyOf(dayStart, tz) {
  const date = new Date(Number(dayStart) + tz * 1000)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export { totalTokens, serviceOf }
