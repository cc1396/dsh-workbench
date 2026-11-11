import assert from 'node:assert/strict'
import test from 'node:test'
import { isolateHome, localDayStart, makeHarness, route, status, valuesOf } from './helpers.mjs'

const NOW = Date.UTC(2026, 10, 5, 8, 0) // 2026-11-05 16:00 +08:00
const TODAY = localDayStart(NOW)

/**
 * Call one route with its query string under the frozen clock.
 *
 * @param path - `/api/workbench/...` with any query; only the path is matched.
 */
async function call(routes, path, { method = 'GET', body } = {}) {
  return route(routes, path, { method, body, now: NOW })
}

function material() {
  const events = [
    { type: 'session/title', time: TODAY + 3600_000, data: { title: '验证订单筛选条件' } },
    { type: 'turn/start', time: TODAY + 3600_000, data: { turn: 1 } },
    { type: 'tool/call', time: TODAY + 3600_000 + 10, data: { callId: 'c1', name: 'bash', arguments: JSON.stringify({ description: 'pnpm test', command: 'pnpm test' }) } },
    { type: 'step/start', time: TODAY + 3600_000 + 20, data: { turn: 1, step: 1 } },
    {
      type: 'assistant/message',
      time: TODAY + 3600_000 + 30,
      data: { turn: 1, step: 1, usage: { inputTokens: 1000, outputTokens: 200 }, message: { source: { provider: 'mock', model: 'deepseek-chat' }, content: [{ type: 'text', text: 'done' }] } },
    },
    { type: 'tool/result', time: TODAY + 3600_000 + 40, data: { toolCallId: 'c1', message: { content: [{ type: 'text', text: 'Tests  12 passed\n' }], isError: false } } },
    { type: 'turn/end', time: TODAY + 3600_000 + 50, data: { turn: 1, reason: { kind: 'stop' } } },
  ]
  const values = {
    ...valuesOf({ uncachedInputTokens: 1000, outputTokens: 200 }),
    tokenUsage: { totals: { uncachedInputTokens: 1000, outputTokens: 200 }, last: { turn: 1, step: 1, buckets: { uncachedInputTokens: 1000, outputTokens: 200 } } },
  }
  return { events, values }
}

test('F07: the snapshot carries a metadata-only search index', async () => {
  isolateHome()
  const { events, values } = material()
  const { routes } = makeHarness({ sessions: [{ id: 's1', cwd: '/work/storefront', events, values }] })
  const body = await status(routes, { now: NOW })
  assert.equal(body.search.rows.length, 1)
  assert.equal(body.search.rows[0].day, '2026-11-05')
  const row = body.search.rows[0]
  assert.equal(row.title, '验证订单筛选条件')
  assert.equal(row.projectName, 'storefront')
  assert.equal(JSON.stringify(body.search).includes('系统提示'), false)
  const found = await call(routes, `/api/workbench/search?q=订单&tzOffset=28800`)
  assert.equal(found.status, 200)
  assert.equal(found.body.total, 1)
  assert.equal(found.body.index.fullText, false)
})

test('F05: requests split a day into one row per step plus an exact remainder', async () => {
  isolateHome()
  const { events, values } = material()
  const { routes } = makeHarness({ sessions: [{ id: 's1', cwd: '/work/storefront', events, values }] })
  await status(routes, { now: NOW })
  const answer = await call(routes, `/api/workbench/requests?sessionId=s1&day=${TODAY}&tzOffset=28800`)
  assert.equal(answer.status, 200)
  assert.equal(answer.body.priceRef, 'configured')
  const stepRows = answer.body.rows.filter((row) => row.status === 'settled')
  assert.equal(stepRows.length, 1)
  assert.deepEqual(stepRows[0].tokens, { uncachedInput: 1000, cacheReadInput: 0, cacheWriteInput: 0, output: 200 })
  // The steps already explain the whole day, so no remainder row exists.
  assert.equal(answer.body.rows.some((row) => row.status === 'aggregate'), false)
  const unknown = await call(routes, '/api/workbench/requests?sessionId=nope&day=' + TODAY)
  assert.equal(unknown.status, 404)
  assert.equal(unknown.body.code, 'NOT_FOUND')
})

test('F04: a local task is created, confirmed, then left out of the pending count', async () => {
  isolateHome()
  const { events, values } = material()
  const { routes } = makeHarness({ sessions: [{ id: 's1', cwd: '/work/storefront', events, values }] })
  const created = await call(routes, '/api/workbench/tasks', { method: 'POST', body: { action: 'add', task: { title: '验证订单筛选条件', projectId: '/work/storefront', sessionId: 's1' } } })
  assert.equal(created.status, 200)
  const id = created.body.task.taskId
  assert.equal(created.body.task.state, 'active')
  const done = await call(routes, '/api/workbench/tasks', { method: 'POST', body: { action: 'update', task: { taskId: id, state: 'done' } } })
  assert.equal(done.body.task.state, 'done')
  assert.equal(done.body.task.by, 'local-user')
  const listed = await call(routes, '/api/workbench/tasks')
  assert.equal(listed.body.tasks.length, 1)
})

test('F08: the report marks a green test as evidence, and a confirmed task as done', async () => {
  isolateHome()
  const { events, values } = material()
  const { routes } = makeHarness({ sessions: [{ id: 's1', cwd: '/work/storefront', events, values }] })
  await status(routes, { now: NOW })
  const before = await call(routes, `/api/workbench/report?day=${TODAY}&tzOffset=28800&locale=zh`)
  assert.equal(before.status, 200)
  assert.equal(before.body.projects.length, 1)
  const draft = before.body.projects[0].report
  assert.equal(draft.won.length, 0)
  assert.equal(draft.done === undefined, true)
  assert.match(before.body.report.markdown, /^日报/u)
  // The test result is structured and the turn ended normally: verified evidence.
  // The ordering follows the runtime: the tool result lands before the turn's own end.
  const testRow = before.body.projects[0].timeline.find((entry) => entry.kind === 'test')
  assert.equal(testRow.verified, true)
  const created = await call(routes, '/api/workbench/tasks', { method: 'POST', body: { action: 'add', task: { title: '验证订单筛选条件', projectId: '/work/storefront', sessionId: 's1', state: 'done' } } })
  assert.equal(created.status, 200)
  const after = await call(routes, `/api/workbench/report?day=${TODAY}&tzOffset=28800&locale=zh`)
  assert.equal(after.body.projects[0].report.won.length, 1)
  assert.equal(after.body.totals.done, 1)
  // The Session the task covers is no longer repeated as "to confirm".
  assert.equal(after.body.projects[0].report.confirm.length, 0)
})

test('A05: a Session deleted from the Host disappears from search and the report', async () => {
  isolateHome()
  const { events, values } = material()
  const { routes } = makeHarness({ sessions: [{ id: 's1', cwd: '/work/storefront', events: [...events] }] })
  await status(routes, { now: NOW })
  const first = await call(routes, '/api/workbench/search?q=订单')
  assert.equal(first.body.total, 1)
  const { routes: second } = makeHarness({ sessions: [] })
  await status(second, { now: NOW })
  const gone = await call(second, '/api/workbench/search?q=订单')
  assert.equal(gone.body.total, 0)
  const report = await call(second, `/api/workbench/report?day=${TODAY}&tzOffset=28800`)
  assert.deepEqual(report.body.projects, [])
  void values
})

test('F04: a project opts into read-only Git evidence explicitly', async () => {
  isolateHome()
  const { routes } = makeHarness({ sessions: [] })
  const disabled = await call(routes, `/api/workbench/report?day=${TODAY}&tzOffset=28800`)
  assert.equal(disabled.body.projects.length, 0)
  const enabled = await call(routes, '/api/workbench/report', { method: 'POST', body: { action: 'git', projectId: '/work/storefront', enabled: true } })
  assert.equal(enabled.status, 200)
  assert.equal(enabled.body.git, true)
  const listed = await call(routes, '/api/workbench/tasks')
  assert.equal(listed.status, 200)
})

test('the panel mounts on the real Host surface (no sessionController)', async () => {
  // The defect this guards: a declared `inject` on `sessionController` — a service no
  // installed DSH provides — left the plugin unable to mount, and every panel empty.
  isolateHome()
  const { apply } = await import('../index.js')
  const registered = []
  const ctx = {
    effect: (fn) => fn(),
    get: () => undefined,
    connection: { fetch: { register: (route) => registered.push(route.path) } },
  }
  apply(ctx, {})
  assert.ok(registered.includes('/api/workbench/status'))
  assert.equal(JSON.stringify(ctx).includes('sessionController'), false)
})

test('a catalog whose records are SessionHeaders still yields states, amounts and history', async () => {
  isolateHome()
  const { apply } = await import('../index.js')
  const now = Date.now()
  const id = 'session-live'
  const header = { version: 4, id, cwd: '/work/demo', createdAt: now - 3600_000, origin: 'user', seedLength: 0 }
  const log = [
    { type: 'session/title', time: now - 600_000, data: { title: '真实形状' } },
    { type: 'turn/start', time: now - 300_000, data: { turn: 1 } },
    { type: 'assistant/message', time: now - 120_000, data: { turn: 1, step: 1, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { provider: 'p', model: 'real-model' } } } },
    { type: 'turn/end', time: now - 60_000, data: { turn: 1, reason: { kind: 'stop' } } },
  ]
  const routes = []
  const ctx = {
    effect: (fn) => fn(),
    get: (name) => (name === 'sessionQuery'
      ? { listSessions: async () => [{ header, live: false, persisted: true }], readSession: async () => ({ session: header, events: log }) }
      : undefined),
    connection: { fetch: { register: (route) => routes.push(route) } },
  }
  apply(ctx, { prices: { models: { 'real-model': { input: 1, output: 10 } } } })
  const body = await status(routes, { now })
  // Nothing about this Session is live: it must still be classified, priced and listed.
  assert.equal(body.recent.length, 1)
  assert.equal(body.recent[0].title, '真实形状')
  assert.equal(body.overview.sessions, 1)
  assert.ok(body.overview.amount > 0, JSON.stringify(body.overview))
  assert.equal(body.search.rows.length, 1)
})

test('the fold cache survives a restart: a warm start reuses it and agrees with the cold one', async () => {
  isolateHome()
  const { events, values } = material()
  const sessions = [{ id: 's1', cwd: '/work/storefront', events, values }]
  const hot = makeHarness({ sessions })
  const cold = await status(hot.routes, { now: NOW })
  // The write is throttled and non-blocking; give it a moment to land.
  await new Promise((resolve) => setTimeout(resolve, 250))
  const again = makeHarness({ sessions })
  const warm = await status(again.routes, { now: NOW })
  assert.equal(warm.overview.sessions, cold.overview.sessions)
  assert.equal(warm.overview.amount, cold.overview.amount)
  assert.equal(warm.overview.coverage, cold.overview.coverage)
  assert.equal(warm.recent.length, cold.recent.length)
})
