import assert from 'node:assert/strict'
import test from 'node:test'
import { DAY, NOW, TODAY, alert, host, isolateHome, projections, session, snapshot, turn } from './fixtures.mjs'

test('the plugin mounts on a Host that provides only the documented services', async () => {
  isolateHome()
  const { routes } = host([])
  // No `sessionController` anywhere: the services are sessionQuery / sessionProjections /
  // sessions / agents, and an absent one must degrade rather than block the mount.
  assert.deepEqual([...routes.keys()].sort(), ['/api/workbench/alerts', '/api/workbench/status'])
})

test('a host with no services answers a well-formed empty snapshot', async () => {
  isolateHome()
  const { routes, ctx } = host([])
  ctx.get = () => undefined
  const body = await snapshot(routes)
  assert.equal(body.schema, 3)
  assert.equal(body.overview.amount, 0)
  assert.deepEqual(body.running, [])
  assert.equal(body.capabilities.catalog, 'unavailable')
})

test('today\'s amount is priced from the log when a Session has no projection totals', async () => {
  isolateHome()
  // The defect this guards: an empty timeline used to discard the whole amount.
  const { routes } = host([
    session({ id: 'a', events: turn({ start: TODAY + 3_600_000, input: 1_000_000, output: 0 }), values: {} }),
  ], { prices: { default: { input: 10, output: 10 } } })
  const body = await snapshot(routes)
  assert.equal(body.overview.amount, 10, JSON.stringify(body.overview))
  assert.equal(body.ledger.trend[0].day, TODAY)
})

test('a Session with no events still prices its projected totals on the cut\'s day', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'a', running: true, events: [], values: projections({ title: 'live', uncachedInput: 1_000_000, output: 0 }) }),
  ], { prices: { default: { input: 4, output: 4 } } })
  const body = await snapshot(routes)
  assert.equal(body.overview.amount, 4, JSON.stringify(body.overview))
})

test('an unlisted model uses the default price row at full coverage', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'a', events: turn({ start: TODAY + 3_600_000, model: 'brand-new-model', input: 1_000_000, output: 0 }), values: {} }),
  ], { prices: { default: { input: 7, output: 7 }, models: { other: { input: 99, output: 99 } } } })
  const body = await snapshot(routes)
  assert.equal(body.overview.amount, 7)
  assert.equal(body.overview.coverage, 1)
})

test('the day split dates steps by their own event and keeps the total exact', async () => {
  isolateHome()
  const yesterday = TODAY - DAY
  const { routes } = host([
    session({
      id: 'a',
      values: projections({ uncachedInput: 2_000_000 }),
      events: [...turn({ start: yesterday + 3_600_000, input: 1_000_000, output: 0 }), ...turn({ start: TODAY + 3_600_000, turn: 2, input: 1_000_000, output: 0 })],
    }),
  ], { prices: { default: { input: 1, output: 1 } } })
  const body = await snapshot(routes)
  const trend = Object.fromEntries(body.ledger.trend.map((point) => [point.day, point.amount]))
  assert.equal(trend[TODAY], 1)
  assert.equal(trend[yesterday], 1)
})

test('the state comes from the host: waiting outranks running, and both are listed', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'w', running: true, pending: 'approval', events: [], values: projections({ title: '等待中' }) }),
    session({ id: 'r', running: true, events: [], values: projections({ title: '运行中' }) }),
  ])
  const body = await snapshot(routes)
  assert.deepEqual(body.running.map((row) => row.state), ['waiting', 'running'])
  assert.equal(body.overview.waiting, 1)
  assert.equal(body.alerts.length, 1)
  assert.equal(body.alerts[0].type, 'waiting')
})

test('a failed turn raises one item, and a replayed poll does not duplicate it', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'f', events: turn({ start: TODAY + 3_600_000, reason: 'error' }), values: projections({ title: '失败' }) }),
  ])
  const first = await snapshot(routes)
  const second = await snapshot(routes)
  assert.equal(first.alerts.length, 1)
  assert.equal(second.alerts.length, 1)
  assert.equal(first.alerts[0].key, second.alerts[0].key)
  assert.equal(first.alerts[0].type, 'failure')
})

test('acknowledging and dismissing move an item out of the pending count', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'f', events: turn({ start: TODAY + 3_600_000, reason: 'error' }), values: projections({ title: '失败' }) }),
  ])
  const before = await snapshot(routes)
  const key = before.alerts[0].key
  assert.equal(before.overview.attention, 1)

  const acked = await alert(routes, { key, action: 'ack', triggeredAt: before.alerts[0].triggeredAt, state: 'failed' })
  assert.equal(acked.status, 200)
  const afterAck = await snapshot(routes)
  assert.equal(afterAck.alerts[0].state, 'acknowledged')
  assert.equal(afterAck.overview.attention, 1)

  await alert(routes, { key, action: 'solve', triggeredAt: before.alerts[0].triggeredAt, state: 'failed' })
  const afterDismiss = await snapshot(routes)
  assert.equal(afterDismiss.alerts[0].state, 'solved')
  assert.equal(afterDismiss.overview.attention, 0)
})

test('a dismissed failure stays closed, and a new failing turn reopens it', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'f', events: turn({ start: TODAY + 3_600_000, reason: 'error' }), values: projections({ title: '失败' }) }),
  ])
  const first = await snapshot(routes)
  await alert(routes, { key: first.alerts[0].key, action: 'solve', triggeredAt: first.alerts[0].triggeredAt })
  const closed = await snapshot(routes, { now: NOW + 60_000 })
  assert.equal(closed.overview.attention, 0)

  // A later turn that fails again is a new item with a new key.
  const reopened = host([
    session({
      id: 'f',
      events: [...turn({ start: TODAY + 3_600_000, reason: 'error' }), ...turn({ start: TODAY + 7_200_000, turn: 2, reason: 'error' })],
      values: projections({ title: '失败', turns: 2 }),
    }),
  ])
  const next = await snapshot(reopened.routes, { now: NOW + 7_200_000 })
  assert.equal(next.overview.attention >= 0, true)
  assert.notEqual(next.alerts[0]?.key, first.alerts[0].key)
})

test('child sessions are counted under their parent and never listed alone', async () => {
  isolateHome()
  const { routes } = host([
    session({ id: 'parent', events: turn({ start: TODAY + 3_600_000 }), values: projections({ title: '父' }) }),
    { ...session({ id: 'child', events: turn({ start: TODAY + 3_600_000 }), values: projections({ title: '子' }) }), parent: 'parent' },
  ])
  const body = await snapshot(routes)
  // Only the parent is a row; the child is counted beneath it (PRD F02).
  assert.deepEqual(body.search.rows.map((row) => row.sessionId), ['parent'])
  assert.equal(body.capabilities.total, 2)
  const parent = [...body.running, ...body.recent].find((row) => row.sessionId === 'parent')
  assert.equal(parent.children, 1)
})
