/**
 * The Workbench Host entry point.
 *
 * One snapshot route answers the panel and one action route records an attention
 * acknowledgement. Every Host service is reached through `host.js`, every number is
 * produced by `snapshot.js`, and nothing here reads a log directly.
 */

import { pricingOf } from './pricing.js'
import { buildSnapshot, SCHEMA_VERSION } from './snapshot.js'
import { json } from './json.js'
import { openAttention, registerActions } from './actions.js'

export const ROUTE_PATH = '/api/workbench/status'
export const SCHEMA = SCHEMA_VERSION

/**
 * Only the authenticated Fetch transport is required. The Session catalog is resolved
 * per call, so a Host that lacks one service still mounts the rest.
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
  const attention = createAttention()

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => status(ctx, settings, attention, request),
      }),
    'dsh-workbench: snapshot',
  )

  registerActions(ctx, attention)
}

/**
 * The attention store, exposed as one mutable object the snapshot reads and the
 * action route writes; `save()` persists it without blocking either.
 */
function createAttention() {
  const store = openAttention()
  const attention = { entries: {}, ready: store.read().then((state) => {
    for (const [key, value] of Object.entries(state.entries ?? {})) {
      if (value !== null && typeof value === 'object') attention.entries[key] = value
    }
    return attention.entries
  }) }
  attention.save = () =>
    store.update((state) => {
      state.entries = { ...attention.entries }
    })
  return attention
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
async function status(ctx, settings, attention, request) {
  const url = new URL(request.url)
  const raw = Number(url.searchParams.get('tzOffset'))
  const tzOffsetSeconds = Number.isFinite(raw) ? Math.min(86_400, Math.max(-86_400, Math.round(raw))) : 0
  const now = Date.now()
  try {
    await attention.ready
    const body = await buildSnapshot(ctx, settings, { now, tzOffsetSeconds, signal: request.signal }, attention)
    return json(200, body)
  } catch (error) {
    // A failed read still answers a well-formed, empty snapshot the client understands.
    return json(200, empty(now, tzOffsetSeconds, settings, error))
  }
}

/** The snapshot the client renders when the Host cannot read anything. */
function empty(now, tzOffsetSeconds, settings, error) {
  return {
    schema: SCHEMA_VERSION,
    generatedAt: now,
    tzOffset: tzOffsetSeconds,
    currency: settings.pricing.currency,
    capabilities: { catalog: 'unavailable', log: 'unavailable', projections: 'unavailable', agents: 'unavailable', error: messageOf(error) },
    overview: { todayStart: now, dayKey: '', amount: 0, coverage: undefined, unpricedTokens: 0, tokens: 0, sessions: 0, running: 0, waiting: 0, failed: 0, attention: 0 },
    running: [],
    recent: [],
    alerts: [],
    ledger: { currency: settings.pricing.currency, today: { amount: 0, tokens: 0, sessions: [] }, projects: [], trend: [], days: [] },
    search: { rows: [] },
  }
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}
