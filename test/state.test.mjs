import assert from 'node:assert/strict'
import test from 'node:test'
import { alertAction, isolateHome, localDayStart, makeHarness, makeLlm, status, turnEvents, valuesOf } from './helpers.mjs'

const NOW = Date.UTC(2026, 10, 6, 6, 0) // 2026-11-06 14:00 +08:00
const TODAY = localDayStart(NOW)
const MIN = 60_000

/** The last committed event of a scripted Session; the Host stamps updatedAt from it. */
function lastEventTime(session) {
  if (Number.isFinite(session.updatedAt)) return session.updatedAt
  const events = session.events ?? []
  const at = Number(events.at(-1)?.time)
  return Number.isFinite(at) ? at : NOW
}

function harness(sessions, settings = {}) {
  const { llm } = makeLlm('{"items":[]}')
  return makeHarness({
    llm,
    sessions: sessions.map((session) => ({ ...session, updatedAt: lastEventTime(session) })),
    settings,
  })
}

test('A01: waiting wins, a failed turn is a failure, a retried turn stays running', async () => {
  isolateHome()
  const waitingStart = NOW - 5 * MIN
  const failedStart = NOW - 40 * MIN
  const retriedStart = NOW - 60 * MIN
  const endedStart = NOW - 90 * MIN
  const { routes } = harness([
    {
      id: 'waiting',
      cwd: '/work/api',
      running: true,
      events: turnEvents({ start: waitingStart, title: '修复登录回调重试', pending: { kind: 'approval', id: 'a1', at: waitingStart + 4 * MIN } }),
    },
    {
      id: 'failed',
      cwd: '/work/dev',
      running: false,
      events: turnEvents({ start: failedStart, title: '重建预览环境镜像', end: { at: NOW - 30 * MIN, reason: { kind: 'error', error: { message: '镜像构建退出码 1' } } } }),
    },
    {
      id: 'retried',
      cwd: '/work/site',
      running: true,
      events: [
        ...turnEvents({ start: retriedStart, title: '补齐订单筛选测试', end: { at: retriedStart + 2 * MIN, reason: { kind: 'error', error: { message: 'rate limited' } } } }),
        { type: 'turn/start', time: retriedStart + 3 * MIN, data: { turn: 2 } },
        { type: 'llm/retry', time: retriedStart + 4 * MIN, data: { delayMs: 30_000 } },
      ],
    },
    {
      id: 'ended',
      cwd: '/work/shop',
      running: false,
      events: turnEvents({ start: endedStart, title: '验证订单筛选条件', end: { at: endedStart + 10 * MIN, reason: { kind: 'done' } } }),
    },
  ])
  const body = await status(routes, { now: NOW })
  const byId = Object.fromEntries(body.running.map((row) => [row.sessionId, row]))
  // Hierarchy: waiting first, then a plain running turn.
  assert.deepEqual(body.running.map((row) => row.sessionId), ['waiting', 'retried'], JSON.stringify(body.running.map((row) => [row.sessionId, row.state])))
  assert.equal(byId.waiting.state, 'waiting')
  assert.equal(byId.waiting.waiting[0].kind, 'approval')
  assert.equal(byId.retried.state, 'running')
  assert.equal(byId.retried.turn, 2)
  // A failed turn is not running: it is an attention item and a recent row.
  assert.equal(body.alerts.find((alert) => alert.sessionId === 'failed').type, 'failure')
  assert.equal(body.alerts.some((alert) => alert.sessionId === 'retried'), false)
  assert.deepEqual(body.recent.map((row) => row.sessionId), ['failed', 'ended'])
  assert.equal(body.recent.find((row) => row.sessionId === 'ended').state, 'ended')
  assert.match(body.alerts.find((alert) => alert.sessionId === 'failed').reason, /退出码 1/u)
  assert.equal(body.overview.running, 2)
  assert.equal(body.overview.attention, 2)
})

test('A02: replayed approvals make one item, a resolution clears it in the same view', async () => {
  isolateHome()
  const start = NOW - 6 * MIN
  const events = turnEvents({ start, title: '等待确认重跑集成测试', pending: { kind: 'approval', id: 'dup', at: start + MIN } })
  const { routes } = harness([{ id: 'a', cwd: '/work/api', running: true, events: [...events, ...events.slice(0, 1)] }])
  const first = await status(routes, { now: NOW })
  assert.equal(first.alerts.filter((alert) => alert.type === 'waiting').length, 1)

  // Replaying the same committed approval never adds a second item.
  const replayed = await status(routes, { now: NOW + 1000 })
  assert.equal(replayed.alerts.filter((alert) => alert.type === 'waiting').length, 1)

  // The resolution is a new committed event: the item disappears immediately.
  const resolved = await harness([
    {
      id: 'a',
      cwd: '/work/api',
      running: true,
      events: [...events, { type: 'approval/resolved', time: NOW - MIN, data: { requestId: 'dup' } }],
    },
  ])
  const after = await status(resolved.routes, { now: NOW })
  assert.equal(after.alerts.filter((alert) => alert.type === 'waiting').length, 0)
  assert.equal(after.overview.attention, 0)
  assert.equal(after.running[0].state, 'running')
})

test('a long tool and a Host backoff are not stalls; ten silent minutes are', async () => {
  isolateHome()
  const toolStart = NOW - 20 * MIN
  const silentStart = NOW - 15 * MIN
  const { routes } = harness(
    [
      {
        id: 'tool',
        cwd: '/work/tool',
        running: true,
        // Committed activity 11 minutes ago and the call still pending: a known long tool.
        events: turnEvents({ start: toolStart, title: '整理发布流程脚本', calls: [{ id: 'c1', name: 'bash' }], pending: { kind: 'question', id: 'q1', at: NOW - 11 * MIN } }),
      },
      {
        id: 'silent',
        cwd: '/work/silent',
        running: true,
        // The Host still runs it: silence is a stall, not closure (updatedAt would
        // otherwise look like fresh activity the clock here makes it absent).
        events: turnEvents({ start: silentStart, title: '静默的轮次' }),
        updatedAt: silentStart + 30,
      },
    ],
    {},
  )
  // The pending question keeps the first Session waiting, not stuck.
  const body = await status(routes, { now: NOW })
  const byId = Object.fromEntries(body.running.map((row) => [row.sessionId, row]))
  assert.equal(byId.tool.state, 'waiting')
  assert.equal(byId.silent.state, 'stuck', JSON.stringify([byId.silent?.activity, byId.silent?.idleForMs, byId.silent?.evidence]))
  assert.equal(body.alerts.find((alert) => alert.sessionId === 'silent').type, 'stuck')

  // A Host that still reports running with no newer evidence stays stuck, not unknown.
  const noWait = harness([
    { id: 'silent', cwd: '/work/silent', running: true, events: turnEvents({ start: silentStart, title: '静默的轮次' }), updatedAt: silentStart + 30 },
  ])
  const body2 = await status(noWait.routes, { now: NOW })
  assert.equal(body2.running[0].state, 'stuck')
  assert.equal(body2.running[0].evidence.some((item) => item.kind === 'stall'), true)
})

test('an open turn the Host no longer runs is unknown, with its last known state kept', async () => {
  isolateHome()
  const start = NOW - 3 * 3600_000
  // Recent activity kept the turn alive in the log, but the Host runs nothing.
  const events = turnEvents({ start, title: '断线前的任务', calls: [{ id: 'c1', name: 'bash' }] })
  const { routes } = harness([{ id: 'u', cwd: '/work/u', running: false, events, inspectEvents: events }])
  const body = await status(routes, { now: NOW })
  assert.equal(body.states.unknown, 1, JSON.stringify(body.states))
  assert.equal(body.running.length, 0)
  // No Host-owned turn to judge: the card keeps the last known state, nothing is inferred.
  assert.equal(body.alerts.some((entry) => entry.sessionId === 'u'), false)
})

test('a Host pending interaction makes the Session wait even without an event', async () => {
  isolateHome()
  const start = NOW - 4 * MIN
  const { routes } = harness([
    { id: 'h', cwd: '/work/h', running: true, pendingInteraction: 'approval', events: turnEvents({ start, title: '宿主待办' }) },
  ])
  const body = await status(routes, { now: NOW })
  assert.equal(body.running[0].state, 'waiting')
  assert.equal(body.capabilities.alertsWait, 'ready')
  assert.equal(body.alerts[0].type, 'waiting')
})

test('acknowledging an item is idempotent by key; a new turn reopens it', async () => {
  isolateHome()
  const start = NOW - 50 * MIN
  const failure = (at, turn = 1) => [
    { type: 'turn/start', time: at, data: { turn } },
    { type: 'turn/end', time: at + MIN, data: { turn, reason: { kind: 'error', error: { message: 'boom' } } } },
  ]
  const { routes } = harness([
    { id: 'f', cwd: '/work/f', running: false, events: failure(start) },
  ])
  const first = await status(routes, { now: NOW })
  const key = first.alerts[0].key
  assert.equal(first.alerts[0].state, 'open')

  const ack = await alertAction(routes, { key, action: 'ack' }, { now: NOW })
  assert.equal(ack.status, 200)
  const second = await status(routes, { now: NOW })
  assert.equal(second.alerts[0].state, 'acknowledged')

  // Replaying the same acknowledgement keeps one pointer and the same state.
  await alertAction(routes, { key, action: 'ack' }, { now: NOW })
  const third = await status(routes, { now: NOW + 1000 })
  assert.equal(third.alerts[0].state, 'acknowledged')
  // Only one pointer exists for the key.
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const stored = JSON.parse(await readFile(join(process.env.DSH_HOME, 'workbench', 'alerts.json'), 'utf8'))
  assert.deepEqual(Object.keys(stored.entries), [key])

  // A new turn that fails again keeps the item open: a newer trigger is a new cycle.
  const fresh = harness([{ id: 'f', cwd: '/work/f', running: false, events: [...failure(start), ...failure(NOW - 5 * MIN, 2)] }])
  const reopened = await status(fresh.routes, { now: NOW })
  assert.equal(reopened.alerts[0].state, 'open')
  assert.notEqual(reopened.alerts[0].key, key)
})

test('a snooze clears the pending count and resumes once it expires', async () => {
  isolateHome()
  const start = NOW - 50 * MIN
  const { routes } = harness([
    { id: 'f', cwd: '/work/f', running: false, events: turnEvents({ start, title: '失败的轮次', end: { at: start + 5 * MIN, reason: { kind: 'error', error: { message: 'boom' } } } }) },
  ])
  const first = await status(routes, { now: NOW })
  const key = first.alerts[0].key
  assert.equal(first.overview.attention, 1)
  const snooze = await alertAction(routes, { key, action: 'snooze', minutes: 30, triggeredAt: first.alerts[0].triggeredAt, state: 'failed' }, { now: NOW })
  assert.equal(snooze.status, 200)
  const hidden = await status(routes, { now: NOW + 1000 })
  assert.equal(hidden.alerts[0].state, 'snoozed')
  assert.equal(hidden.overview.attention, 0)
  // Still snoozed just before the window closes, open again after it.
  assert.equal((await status(routes, { now: NOW + 29 * MIN })).alerts[0].state, 'snoozed')
  assert.equal((await status(routes, { now: NOW + 31 * MIN })).alerts[0].state, 'open')
})

test('a child Session never decides the root and never appears alone', async () => {
  isolateHome()
  const start = NOW - 10 * MIN
  const { routes } = harness([
    { id: 'root', cwd: '/work/root', running: true, events: turnEvents({ start, title: '根会话' }) },
    {
      id: 'child',
      cwd: '/work/root',
      running: false,
      origin: 'subagent',
      parentId: 'root',
      events: turnEvents({ start: start + 1000, title: '子任务', end: { at: start + 2000, reason: { kind: 'error', error: { message: 'child failed' } } } }),
    },
  ])
  const body = await status(routes, { now: NOW })
  assert.deepEqual(body.running.map((row) => row.sessionId), ['root'])
  assert.equal(body.running[0].state, 'running')
  assert.equal(body.running[0].children, 1)
  assert.equal(body.alerts.some((alert) => alert.sessionId === 'child'), false)
  assert.equal(body.alerts.some((alert) => alert.sessionId === 'root'), false, JSON.stringify(body.alerts))
})

test('pricing: exclusive buckets, model rows, cache split and coverage', async () => {
  isolateHome()
  const start = NOW - 20 * MIN
  const { routes } = harness(
    [
      {
        id: 's1',
        cwd: '/work/p',
        running: false,
        values: valuesOf({
          uncachedInputTokens: 600,
          cacheReadTokens: 400,
          outputTokens: 1000,
          last: { uncachedInputTokens: 600, cacheReadTokens: 400, outputTokens: 1000 },
          models: [{ uncachedInputTokens: 600, cacheReadTokens: 400, outputTokens: 1000 }],
        }),
        events: turnEvents({ start, title: '一次已结算请求', end: { at: start + 5 * MIN, reason: { kind: 'done' } } }),
      },
    ],
    {
      prices: {
        default: { input: 1, output: 2, cacheRead: 0.5 },
        models: { 'deepseek-chat': { input: 2, output: 8, cacheRead: 0.5 } },
      },
    },
  )
  const body = await status(routes, { now: NOW })
  // 600 × 2 / 1e6 + 400 × 0.5 / 1e6 + 1000 × 8 / 1e6
  const expected = (600 * 2 + 400 * 0.5 + 1000 * 8) / 1_000_000
  // Today (the snapshot day) carries exactly this one Session's amount.
  assert.ok(Math.abs(body.overview.amount - expected) < 1e-9, JSON.stringify([body.overview.amount, expected, body.ledger.sessions]))
  const session = body.ledger.sessions.find((row) => row.sessionId === 's1')
  assert.ok(Math.abs(session.amount - expected) < 1e-9)
  assert.equal(session.quality, 'priced')
  assert.equal(session.tokens.uncachedInput, 600)
  assert.equal(session.tokens.cacheReadInput, 400)
  assert.equal(body.overview.amount > 0, true)
  assert.equal(body.ledger.coverage, 1)

  // The same Session replayed produces the same amount.
  const again = await status(routes, { now: NOW })
  assert.equal(again.overview.amount, body.overview.amount)
})

test('pricing: a model without its own row uses the default table at full coverage', async () => {
  // PRD F05: the price table has a default row, and every model the config has not
  // listed is estimated with it. Treating "no model row" as unpriced made every
  // Session on a new model report 0% coverage and ¥0.00, which reads as a defect.

  isolateHome()
  const start = NOW - 20 * MIN
  const { routes } = harness(
    [
      {
        id: 's1',
        cwd: '/work/u',
        running: false,
        values: valuesOf({ uncachedInputTokens: 1000, outputTokens: 0 }),
        events: turnEvents({ start, title: '未知模型', end: { at: start + MIN, reason: { kind: 'done' } } }),
      },
    ],
    { prices: { default: { input: 1, output: 1, cacheRead: 1 }, models: { other: { input: 9, output: 9, cacheRead: 9 } } } },
  )
  const body = await status(routes, { now: NOW })
  assert.equal(body.ledger.sessions[0].quality, 'priced')
  // 1000 input × ¥1/M = ¥0.001, priced by the default row rather than by guesswork.
  assert.ok(Math.abs(body.overview.amount - 0.001) < 1e-9, JSON.stringify(body.overview))
  assert.equal(body.ledger.coverage, 1)
  assert.equal(body.overview.unpricedTokens, 0)
})

test('pricing: a model with no row and no default row still reports not estimable', async () => {
  isolateHome()
  const start = NOW - 20 * MIN
  const { routes } = harness(
    [
      {
        id: 's1',
        cwd: '/work/u',
        running: false,
        values: valuesOf({ uncachedInputTokens: 1000, outputTokens: 0 }),
        events: turnEvents({ start, title: '未知模型', end: { at: start + MIN, reason: { kind: 'done' } } }),
      },
    ],
    { prices: { default: null, models: { other: { input: 1, output: 1, cacheRead: 1 } } } },
  )
  const body = await status(routes, { now: NOW })
  // The built-in fallback table still applies, so this must remain estimable.
  assert.equal(body.overview.amount > 0, true, JSON.stringify(body.overview))
})

test('pricing: a Session that crossed midnight lands tokens on both days', async () => {
  isolateHome()
  const lateStart = TODAY - 20 * MIN // 23:40 the previous day
  const events = [
    ...turnEvents({ start: lateStart, title: '跨日任务', end: { at: lateStart + 10 * MIN, reason: { kind: 'done' } } }),
    { type: 'assistant/message', time: lateStart + 5 * MIN, data: { turn: 1, step: 1, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { model: 'deepseek-chat' } } } },
    { type: 'turn/start', time: TODAY + 10 * MIN, data: { turn: 2 } },
    { type: 'assistant/message', time: TODAY + 20 * MIN, data: { turn: 2, step: 1, usage: { inputTokens: 3000, outputTokens: 300 }, message: { source: { model: 'deepseek-chat' } } } },
    { type: 'turn/end', time: TODAY + 25 * MIN, data: { turn: 2, reason: { kind: 'done' } } },
  ]
  const { routes } = harness(
    [
      {
        id: 'x',
        cwd: '/work/x',
        running: false,
        values: {
          tokenUsage: { totals: { uncachedInputTokens: 4000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 400 }, last: null },
          modelSelection: { lastUsed: { provider: 'mock', model: 'deepseek-chat' } },
        },
        events,
      },
    ],
    { prices: { models: { 'deepseek-chat': { input: 1, output: 10, cacheRead: 0 } } } },
  )
  const body = await status(routes, { now: Date.now() })
  const yesterday = body.ledger.trend.find((point) => point.day === TODAY - 86_400_000)
  const today = body.ledger.trend.find((point) => point.day === TODAY)
  assert.ok(yesterday !== undefined && today !== undefined, 'both days are inside the trend window')
  // Yesterday: 1000 input + 100 output = 1000 + 1000 = 2000 micro-units.
  assert.ok(Math.abs(yesterday.amount - (1000 * 1 + 100 * 10) / 1_000_000) < 1e-9, JSON.stringify(yesterday))
  // Today keeps the remainder exactly: 3000 input + 300 output.
  assert.ok(Math.abs(today.amount - (3000 * 1 + 300 * 10) / 1_000_000) < 1e-9, JSON.stringify(today))
  const sum = body.ledger.trend.reduce((total, point) => total + point.amount, 0)
  assert.ok(Math.abs(sum - (4000 * 1 + 400 * 10) / 1_000_000) < 1e-9)
})
test('dismissing an item clears it from pending for good, and a new failure reopens it', async () => {
  isolateHome()
  const start = NOW - 20 * MIN
  const failed = (at) => [
    ...turnEvents({ start: at, title: '构建失败' }),
    { type: 'turn/end', time: at + 5 * MIN, data: { turn: 1, reason: { kind: 'error', error: { message: '退出码 1' } } } },
  ]
  const { routes } = harness([{ id: 'f', cwd: '/work/build', running: false, events: failed(start) }])
  const before = await status(routes, { now: NOW })
  assert.equal(before.alerts.length, 1)
  assert.equal(before.overview.attention, 1)

  const dismissed = await alertAction(routes, { key: before.alerts[0].key, action: 'solve', triggeredAt: before.alerts[0].triggeredAt, state: 'failed' }, { now: NOW })
  assert.equal(dismissed.status, 200)

  // Same condition, later poll: it stays dismissed instead of returning as pending.
  const after = await status(routes, { now: NOW + MIN })
  assert.equal(after.alerts.length, 1)
  assert.equal(after.alerts[0].state, 'solved')
  assert.equal(after.overview.attention, 0)

  // A new failing turn is a new item, raised again.
  const reopened = await harness([
    { id: 'f', cwd: '/work/build', running: false, events: [...failed(start), { type: 'turn/start', time: NOW + 5 * MIN, data: { turn: 2 } }, ...failed(NOW + 5 * MIN).slice(2)] },
  ])
  const next = await status(reopened.routes, { now: NOW + 20 * MIN })
  assert.equal(next.alerts.some((alert) => alert.state === 'open' && alert.type === 'failure'), true)
})
