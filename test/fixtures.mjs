/**
 * A scripted Host: the services the workbench reads, with the shapes DSH documents.
 *
 * The previous suite invented a `sessionController` service and a `list({}, signal)`
 * signature, so it passed while the real plugin read nothing. These fixtures mirror the
 * documented contracts (`sessionQuery.listSessions`, `readSession`, `sessionProjections`,
 * `agents`) and nothing else, so a test can only pass if the plugin speaks them.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.js'

/** A fresh `$DSH_HOME` so stores never leak between tests. */
export function isolateHome() {
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-workbench-'))
  return process.env.DSH_HOME
}

export const DAY = 86_400_000
export const TZ = 28_800
export const NOW = Date.UTC(2026, 10, 11, 3, 0) // 2026-11-11 11:00 +08:00
export const TODAY = Math.floor((NOW + TZ * 1000) / DAY) * DAY - TZ * 1000

/**
 * One Session description:
 * `{ id, cwd, createdAt, running, pending, events, values }`.
 */
export function session({ id = 's1', cwd = '/work/proj', createdAt = TODAY, running = false, pending, events = [], values = {} } = {}) {
  return { id, cwd, createdAt, running, pending, events, values }
}

/** A closed turn with one billed step. */
export function turn({ start, turn: index = 1, model = 'test-model', input = 1000, output = 100, reason = 'stop' } = {}) {
  return [
    { type: 'turn/start', seq: 0, time: start, data: { turn: index } },
    { type: 'assistant/message', seq: 1, time: start + 5_000, data: { turn: index, step: 1, usage: { inputTokens: input, outputTokens: output }, message: { source: { provider: 'p', model } } } },
    { type: 'turn/end', seq: 2, time: start + 10_000, data: { turn: index, reason: { kind: reason } } },
  ]
}

/** Projection values for one Session, as the registry produces them. */
export function projections({ title, model = 'test-model', uncachedInput = 0, cacheRead = 0, output = 0, turns = 1, open = false, pending = 0 } = {}) {
  return {
    title,
    tokenUsage: { totals: { uncachedInputTokens: uncachedInput, cacheReadTokens: cacheRead, cacheWriteTokens: 0, outputTokens: output }, last: null },
    sessionStats: { turns, steps: turns, lastTurn: turns },
    turnBoundary: { openTurnStartSeq: open ? null : null, lastTurn: turns },
    userQuestions: { questions: { active: Array.from({ length: pending }, (_, index) => ({ id: `q${index}` })), settled: [] } },
    modelSelection: { lastUsed: { provider: 'p', model } },
  }
}

/**
 * Build a Host context and apply the plugin to it.
 *
 * @returns `{ routes, ctx }`; `routes` is a Map of path → registered route.
 */
export function host(sessions, config = {}) {
  const routes = new Map()
  const byId = new Map(sessions.map((entry) => [entry.id, entry]))
  const ctx = {
    effect: (fn) => fn(),
    get: (name) => {
      if (name === 'sessionQuery') {
        return {
          listSessions: async () => sessions.map((entry) => ({
            header: { version: 4, id: entry.id, cwd: entry.cwd, createdAt: entry.createdAt, origin: entry.parent === undefined ? 'user' : 'subagent', parentSession: entry.parent, seedLength: 0 },
            live: entry.running === true,
            persisted: true,
          })),
          readSession: async (id) => {
            const entry = byId.get(id)
            if (entry === undefined) throw new Error('not found')
            return { session: { id }, events: entry.events }
          },
        }
      }
      if (name === 'sessionProjections') {
        // The registry keys by session id, so a cold Session (no live object) still answers.
        return { snapshot: (session) => ({ asOfSeq: 0, values: byId.get(session?.id)?.values ?? {} }) }
      }
      if (name === 'sessions') {
        return {
          list: () => sessions.filter((entry) => entry.running === true).map((entry) => ({ id: entry.id, header: { id: entry.id, cwd: entry.cwd, createdAt: entry.createdAt }, events: entry.events })),
          get: (id) => {
            const entry = byId.get(id)
            return entry?.running === true ? { id, header: { id, cwd: entry.cwd, createdAt: entry.createdAt }, events: entry.events } : undefined
          },
        }
      }
      if (name === 'agents') {
        return {
          list: () => sessions.filter((entry) => entry.running === true).map((entry) => ({ id: entry.id, status: 'running', pendingInteraction: entry.pending })),
        }
      }
      return undefined
    },
    connection: { fetch: { register: (route) => routes.set(route.path, route) } },
  }
  apply(ctx, config)
  return { routes, ctx }
}

/** Read the snapshot at a frozen clock. */
export async function snapshot(routes, { now = NOW, tzOffset = TZ } = {}) {
  const route = routes.get('/api/workbench/status')
  const real = Date.now
  Date.now = () => now
  let pending
  try {
    pending = route.fetch(new Request(`http://local/api/workbench/status?tzOffset=${tzOffset}`))
  } finally {
    Date.now = real
  }
  return (await pending).json()
}

/** POST one attention action. */
export async function alert(routes, body) {
  const route = routes.get('/api/workbench/alerts')
  const response = await route.fetch(new Request('http://local/api/workbench/alerts', { method: 'POST', body: JSON.stringify(body) }))
  return { status: response.status, body: await response.json() }
}
