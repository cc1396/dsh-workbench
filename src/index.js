/**
 * The Workbench Host entry point.
 *
 * One snapshot route answers the panel; the remaining routes are explicit actions
 * (attention acknowledgement, local tasks, the daily report, request detail). Every
 * Host service is reached through `host.js`, every number is produced by `snapshot.js`,
 * and nothing here reads a log directly.
 */

import { pricingOf } from './pricing.js'
import { buildSnapshot, SCHEMA_VERSION } from './snapshot.js'
import { registerActions } from './actions.js'
import { json } from './json.js'

export const ROUTE_PATH = '/api/workbench/status'
export const SCHEMA = SCHEMA_VERSION

/**
 * Only the authenticated Fetch transport is required. The Session catalog is resolved
 * per call, so a Host that lacks one service still mounts the others.
 */
export const inject = ['connection']

/**
 * Install the routes.
 *
 * @param ctx - Host context carrying Connection and the Session services.
 * @param config - the bundle's `cordis.patch.yml` configuration.
 */
export function apply(ctx, config) {
  const settings = resolveSettings(config)
  const cache = { snapshots: new Map(), lastAt: 0 }

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => status(ctx, settings, cache, request),
      }),
    'dsh-workbench: snapshot',
  )

  registerActions(ctx, settings)
}

/** The bundle configuration, resolved once. */
function resolveSettings(config) {
  const source = config !== null && typeof config === 'object' ? config : {}
  const integer = (value, fallback, min, max) => {
    const number = Math.round(Number(value))
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
  }
  return {
    pricing: pricingOf(source.prices),
    maxScanSessions: integer(source.maxScanSessions, 120, 1, 500),
    maxRecentTasks: integer(source.maxRecentTasks, 8, 1, 50),
    scanBudgetMs: integer(source.scanBudgetMs, 2500, 250, 20_000),
  }
}

/** `GET /api/workbench/status` — the snapshot. */
async function status(ctx, settings, cache, request) {
  const url = new URL(request.url)
  const raw = Number(url.searchParams.get('tzOffset'))
  const tzOffsetSeconds = Number.isFinite(raw) ? Math.min(86_400, Math.max(-86_400, Math.round(raw))) : 0
  const now = Date.now()
  try {
    const body = await buildSnapshot(ctx, settings, { now, tzOffsetSeconds, signal: request.signal })
    return json(200, body)
  } catch (error) {
    // A failed read still answers a well-formed, empty snapshot the client understands.
    return json(200, {
      schema: SCHEMA_VERSION,
      generatedAt: now,
      tzOffset: tzOffsetSeconds,
      currency: settings.pricing.currency,
      capabilities: { catalog: 'unavailable', log: 'unavailable', projections: 'unavailable', agents: 'unavailable', error: messageOf(error) },
      overview: { todayStart: now, dayKey: '', amount: 0, coverage: undefined, unpricedTokens: 0, tokens: 0, sessions: 0, running: 0, waiting: 0, failed: 0 },
      running: [],
      recent: [],
      ledger: { currency: settings.pricing.currency, today: { amount: 0, tokens: 0, sessions: [] }, projects: [], trend: [], days: [] },
      search: { rows: [] },
    })
  }
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}
