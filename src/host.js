/**
 * The only place this plugin touches DSH.
 *
 * Every earlier defect came from guessing the Host's surface: a `sessionController`
 * service that does not exist, a `list({}, signal)` signature that was invented, and
 * a live-only read that hid every finished Session. This module names the real
 * services once, in one file with one adapter per capability, and each adapter says
 * what it does when its service is absent instead of throwing at a call site.
 *
 * Services used (all resolved by `ctx.get`, never injected):
 *   - `sessionQuery.listSessions(signal?)`   → `[{ header, live, persisted }]`
 *   - `sessionQuery.readSession(id)`         → `{ session, events }`
 *   - `sessionProjections.snapshot(session)` → `{ asOfSeq, values }`
 *   - `sessions.get(id)` / `sessions.list()` → live `Session` objects
 *   - `agents.list()`                        → live agents (`id`, `status`)
 */

/** Read a service without throwing when the Host does not compose it. */
export function serviceOf(ctx, name) {
  try {
    return typeof ctx?.get === 'function' ? ctx.get(name) : undefined
  } catch {
    return undefined
  }
}

/**
 * One catalog record, normalized.
 *
 * `SessionHeader` is the only thing the Host promises: `{ version, id, createdAt,
 * cwd?, parentSession?, seedLength?, delegationDepth? }` — it carries **no title,
 * no updatedAt and no running bit**. Title comes from the `title` projection,
 * running from `agents`, and recency from the log's own events.
 */
export function normalizeRecord(record) {
  const header = record?.header ?? record ?? {}
  const id = typeof header.id === 'string' ? header.id : typeof header.sessionId === 'string' ? header.sessionId : ''
  const parent = header.parentSession ?? header.parentId
  return {
    id,
    cwd: typeof header.cwd === 'string' ? header.cwd : undefined,
    createdAt: Number(header.createdAt) || 0,
    seedLength: Number(header.seedLength) || 0,
    parentId: typeof parent === 'string' ? parent : parent?.id,
    origin: typeof header.origin === 'string' ? header.origin : 'user',
    live: record?.live === true,
    persisted: record?.persisted === true,
  }
}

/**
 * The Session catalog.
 *
 * `sessionQuery` merges persisted and live records with live precedence; without it
 * the live store alone still answers. A broken persistence backend is swallowed only
 * when it can fall back to the live store, so a corrupt log never empties a healthy
 * Host.
 */
export async function listSessions(ctx, signal) {
  const query = serviceOf(ctx, 'sessionQuery')
  if (typeof query?.listSessions === 'function') {
    try {
      const records = await query.listSessions(signal)
      return { records: (Array.isArray(records) ? records : []).map(normalizeRecord), source: 'sessionQuery' }
    } catch (error) {
      if (signal?.aborted === true) throw error
      // Fall through to the live store.
    }
  }
  const store = serviceOf(ctx, 'sessions')
  if (typeof store?.list === 'function') {
    try {
      const live = store.list()
      return {
        records: (Array.isArray(live) ? live : []).map((session) => normalizeRecord({ header: session?.header ?? session, live: true })),
        source: 'sessions',
      }
    } catch {
      return { records: [], source: 'unavailable' }
    }
  }
  return { records: [], source: 'unavailable' }
}

/** The committed event log of one Session, live-preferred. */
export async function readEvents(ctx, id, signal) {
  const live = liveSession(ctx, id)
  if (live !== undefined && Array.isArray(live.events) && live.events.length > 0) {
    return { events: live.events, source: 'live' }
  }
  const query = serviceOf(ctx, 'sessionQuery')
  if (typeof query?.readSession === 'function') {
    try {
      const loaded = await query.readSession(id)
      const events = Array.isArray(loaded?.events) ? loaded.events : []
      if (events.length > 0) return { events, source: 'sessionQuery' }
    } catch {
      // Fall through to the live store below.
    }
  }
  return { events: [], source: 'empty' }
}

/** One live `Session` object (it also carries projection values for conveniences). */
export function liveSession(ctx, id) {
  const store = serviceOf(ctx, 'sessions')
  if (typeof store?.get !== 'function') return undefined
  try {
    return store.get(id)
  } catch {
    return undefined
  }
}

/**
 * The projection values of one Session: `{ tokenUsage, sessionStats, title,
 * modelSelection, turnBoundary, userQuestions, ... }`.
 *
 * The registry only snapshots Session objects it can see, so it is asked for a live
 * one and nothing else — the persisted rows for a cold Session arrive through the
 * fold cache instead (see `cache.js`).
 */
export function projectionsOf(ctx, id) {
  const registry = serviceOf(ctx, 'sessionProjections')
  if (typeof registry?.snapshot !== 'function') return undefined
  const session = liveSession(ctx, id)
  if (session === undefined) return undefined
  try {
    const values = registry.snapshot(session)?.values
    return values === null || values === undefined ? {} : values
  } catch {
    return undefined
  }
}

/** Session ids the Host is running right now, with the wait kind when it has one. */
export function liveAgents(ctx) {
  const map = new Map()
  const registry = serviceOf(ctx, 'agents')
  if (typeof registry?.list !== 'function') return map
  let agents = []
  try {
    agents = registry.list()
  } catch {
    return map
  }
  for (const agent of Array.isArray(agents) ? agents : []) {
    const id = agent?.id ?? agent?.session?.id
    if (typeof id !== 'string') continue
    // `agent/status` is `running` | `idle`; a registry that omits it still means live.
    const status = agent?.status ?? agent?.state
    map.set(id, {
      running: status === undefined || status === 'running',
      pendingInteraction: typeof agent?.pendingInteraction === 'string' ? agent.pendingInteraction : undefined,
    })
  }
  return map
}

/** What the Host can and cannot answer, for the UI to show instead of a silent zero. */
export function capabilitiesOf(ctx) {
  const query = serviceOf(ctx, 'sessionQuery')
  const registry = serviceOf(ctx, 'sessionProjections')
  return {
    catalog: typeof query?.listSessions === 'function' ? 'sessionQuery' : typeof serviceOf(ctx, 'sessions')?.list === 'function' ? 'sessions' : 'unavailable',
    log: typeof query?.readSession === 'function' ? 'sessionQuery' : 'unavailable',
    projections: typeof registry?.snapshot === 'function' ? 'ready' : 'unavailable',
    agents: typeof serviceOf(ctx, 'agents')?.list === 'function' ? 'ready' : 'unavailable',
  }
}
