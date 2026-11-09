import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.js'

/** Point the summary store at a fresh directory for one test. */
export function isolateHome() {
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-workbench-test-'))
  return process.env.DSH_HOME
}

/**
 * A scripted llm service: every call yields one text chunk, and the script may
 * answer per call or derive the answer from the prompt.
 */
export function makeLlm(answer) {
  const calls = []
  const llm = {
    listProviders: async () => [{ id: 'mock' }],
    listModels: async () => [{ id: 'mock-model' }],
    stream: async function* (options) {
      const prompt = options?.messages?.[0]?.content?.[0]?.text ?? ''
      calls.push({ prompt, provider: options?.provider, model: options?.model })
      const text = typeof answer === 'function' ? answer(prompt, calls.length - 1) : answer
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  return { llm, calls }
}

/**
 * A scripted Host: Session summaries plus, per Session, its events and the
 * projection values a real Host would expose. `settings` is passed to `apply`.
 */
export function makeHarness({ sessions, llm, account, settings } = {}) {
  const routes = []
  // The Host derives origin from lineage: a row with a parent is a child.
  const items = sessions.map((session) => ({
    sessionId: session.id,
    cwd: session.cwd,
    parentId: session.parentId,
    origin: session.parentId !== undefined || session.origin === 'subagent' ? 'subagent' : 'user',
    title: session.title,
    updatedAt: session.updatedAt ?? Date.now(),
    running: session.running === true,
    blank: false,
    pendingInteraction: session.pendingInteraction,
  }))
  // `inspect` answers with the log the fake Host has committed, like the real catalog.
  const inspectEvents = new Map(
    sessions.map((session) => [session.id, session.inspectEvents ?? session.events ?? []]),
  )
  const events = new Map(sessions.map((session) => [session.id, session.events]))
  const live = new Map(
    sessions.map((session) => [
      session.id,
      {
        id: session.id,
        events: session.events,
        projectionValues: session.values ?? {},
      },
    ]),
  )
  const ctx = {
    effect: (fn) => fn(),
    get: (name) =>
      name === 'llm'
        ? llm
        : name === 'deepseekAccount'
          ? account
          : name === 'sessions'
            ? { get: (id) => live.get(id), list: () => Array.from(live.values()) }
            : name === 'sessionProjections'
              ? { snapshot: (session) => ({ asOfSeq: 0, values: session?.projectionValues ?? {} }) }
              : undefined,
    connection: { fetch: { register: (route) => routes.push(route) } },
    // The real catalog service: `sessionQuery.listSessions(signal?)` returns cloned
    // `{ header, live, persisted }` records, and `readSession(id)` returns its log.
    sessionQuery: {
      listSessions: async (_signal) => items.map((item) => ({
        header: {
          version: 4,
          id: item.sessionId,
          cwd: item.cwd,
          createdAt: item.createdAt ?? item.updatedAt,
          parentSession: item.parentId,
          origin: item.origin,
          seedLength: 0,
        },
        live: item.running === true,
        persisted: true,
        // Test-only: the projection values and running bit the real Host reads elsewhere.
        running: item.running === true,
        pendingInteraction: item.pendingInteraction,
        updatedAt: item.updatedAt,
      })),
      readSession: async (sessionId) => {
        if (!inspectEvents.has(sessionId)) throw new Error('SESSION_QUERY_NOT_FOUND')
        return { session: { id: sessionId, seedLength: 0 }, events: inspectEvents.get(sessionId) }
      },
    },
    // Live agents carry the running state of a Session in the real Host. The wait kind
    // is a client-side SessionSummary field there, so the harness publishes it on the
    // record too and the adapter reads `pendingInteraction` from either place.
    agents: {
      list: () => items.filter((item) => item.running === true).map((item) => ({ id: item.sessionId, status: 'running', pendingInteraction: item.pendingInteraction })),
    },
  }
  // The catalog above is a service on `ctx`; `get` must resolve it by name.
  const get = ctx.get
  ctx.get = (name) => (name === 'sessionQuery' || name === 'agents' ? ctx[name] : get(name))
  apply(ctx, settings ?? {})
  return { routes }
}

/** POST one attention action to the alert route. */
export async function alertAction(routes, body, { now } = {}) {
  const route = routes.find((entry) => entry.path === '/api/workbench/alerts')
  const request = () =>
    route.fetch(
      new Request('http://local/api/workbench/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  let pending
  if (Number.isFinite(now)) {
    const realNow = Date.now
    Date.now = () => now
    try {
      pending = request()
    } finally {
      Date.now = realNow
    }
  } else {
    pending = request()
  }
  const response = await pending
  return { status: response.status, body: await response.json() }
}

/**
 * Call any Workbench route under a frozen clock, like {@link status}.
 *
 * @param path - the full route path plus its query string.
 * @param options - `{ method, body, now }`; a body is sent as JSON.
 */
export async function route(routes, path, { method = 'GET', body, now } = {}) {
  const routeEntry = routes.find((entry) => entry.path === path.split('?')[0])
  // The clock is sampled before any await: the route reads `Date.now()` first.
  const request = () =>
    routeEntry.fetch(
      new Request(`http://local${path}`, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  let pending
  if (Number.isFinite(now)) {
    const realNow = Date.now
    Date.now = () => now
    try {
      pending = request()
    } finally {
      Date.now = realNow
    }
  } else {
    pending = request()
  }
  const response = await pending
  return { status: response.status, body: await response.json() }
}

/**
 * Read the snapshot at a frozen `now`.
 *
 * Only the route call runs under the stubbed clock: the route samples its time
 * synchronously, and restoring the clock before any timer wait keeps the rest of
 * the event loop (and its scheduled deadlines) on real time.
 */
export async function status(routes, { now, tzOffset = 28800, locale = 'zh' } = {}) {
  const route = routes.find((entry) => entry.path === '/api/workbench/status')
  const url = `http://local/api/workbench/status?tzOffset=${tzOffset}&locale=${locale}`
  if (!Number.isFinite(now)) return (await route.fetch(new Request(url))).json()
  const realNow = Date.now
  Date.now = () => now
  let pending
  try {
    pending = route.fetch(new Request(url))
  } finally {
    Date.now = realNow
  }
  return (await pending).json()
}

export async function summarize(routes, body) {
  const route = routes.find((entry) => entry.path === '/api/workbench/summarize')
  const response = await route.fetch(
    new Request('http://local/api/workbench/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tzOffset: 28800, locale: 'zh', ...body }),
    }),
  )
  return { status: response.status, body: await response.json() }
}

/** A user message plus a model route, enough for the summary material. */
export function sessionMaterial({ id = 's1', cwd = '/work/proj', start, title = 'Build the thing' } = {}) {
  return [
    { type: 'session/title', time: start, data: { title } },
    {
      type: 'user/message',
      time: start + 1000,
      data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Build the thing' }] },
    },
    // The Host stamps wall-clock time; the material only needs the route.
    { type: 'request/context', time: Date.now(), data: { provider: 'mock', model: 'mock-model' } },
    {
      type: 'assistant/message',
      time: start + 2000,
      data: { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 50 }, message: { source: { model: 'mock-model' }, content: [{ type: 'text', text: 'I fixed the thing.' }] } },
    },
  ]
}

export function localDayStart(now, tzOffset = 28800) {
  return Math.floor((now + tzOffset * 1000) / 86_400_000) * 86_400_000 - tzOffset * 1000
}

/** One running turn's log: title, turn start, tool call, optional end. */
export function turnEvents({ start, title = 'Build the thing', calls = [], end, pending, output } = {}) {
  const events = [
    { type: 'session/title', time: start, data: { title } },
    { type: 'user/message', time: start + 10, data: { source: { kind: 'user' }, content: [{ type: 'text', text: title }] } },
    { type: 'turn/start', time: start + 20, data: { turn: 1 } },
  ]
  let at = start + 30
  for (const call of calls) {
    at += 10
    events.push({ type: 'tool/call', time: at, data: { callId: call.id, name: call.name ?? 'bash', arguments: '{}' } })
    if (call.doneAt !== undefined) {
      events.push({
        type: 'tool/result',
        time: call.doneAt,
        data: { message: { toolCallId: call.id, isError: call.error === true, content: [] } },
      })
    }
  }
  if (output !== undefined) {
    events.push({
      type: 'assistant/message',
      time: output,
      data: { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 50 }, message: { source: { model: 'deepseek-chat' }, content: [{ type: 'text', text: 'done' }] } },
    })
  }
  if (pending !== undefined) {
    events.push({ type: pending.kind === 'question' ? 'question/asked' : 'approval/asked', time: pending.at, data: { requestId: pending.id, toolName: 'bash' } })
  }
  if (end !== undefined) events.push({ type: 'turn/end', time: end.at, data: { turn: 1, reason: end.reason } })
  return events
}

/** Projection values as the projection cache would expose them. */
export function valuesOf({ uncachedInputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0, outputTokens = 0, last, models } = {}) {
  const totals = { uncachedInputTokens, cacheReadTokens, cacheWriteTokens, outputTokens }
  return {
    tokenUsage: { totals, last: last === undefined ? undefined : { turn: 1, step: 1, buckets: last } },
    ...(models === undefined ? {} : { byModel: models }),
    modelSelection: { lastUsed: { provider: 'mock', model: 'deepseek-chat' } },
  }
}
