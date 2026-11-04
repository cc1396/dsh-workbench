import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isolateHome, localDayStart, makeHarness, makeLlm, sessionMaterial, status, summarize } from './helpers.mjs'

const NOW = Date.UTC(2026, 10, 4, 2, 0) // 2026-11-04 10:00 +08:00
const TODAY = localDayStart(NOW)

test('status exposes project names without raw material', async () => {
  isolateHome()
  const { llm } = makeLlm('{"items":[]}')
  const { routes } = makeHarness({
    llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const body = await status(routes, { now: NOW })
  const day = body.worklog.days[0]
  assert.equal(day.projects.length, 1)
  assert.equal(day.projects[0].project, 'proj')
  assert.deepEqual(Object.keys(day.projects[0]).sort(), ['cwd', 'project'])
  assert.equal(body.tasks.total, 1)
  assert.equal(body.usage.today.costCny > 0, true)
})

test('summary calls the model once per project and maps its items', async () => {
  isolateHome()
  const { llm, calls } = makeLlm((prompt) =>
    prompt.includes('"/work/proj"')
      ? '{"items":["完成构建流程","修复读取逻辑"]}'
      : '{"items":["查阅文档"]}',
  )
  const { routes } = makeHarness({
    llm,
    sessions: [
      { id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) },
      { id: 's2', cwd: '/work/mcp', events: sessionMaterial({ id: 's2', cwd: '/work/mcp', start: TODAY + 7200_000 }) },
    ],
  })
  const result = await summarize(routes, { dayStart: TODAY })
  assert.equal(result.status, 200)
  assert.equal(calls.length, 2)
  const byName = Object.fromEntries(result.body.projects.map((row) => [row.project, row.items]))
  assert.deepEqual(byName.proj, ['完成构建流程', '修复读取逻辑'])
  assert.deepEqual(byName.mcp, ['查阅文档'])
  assert.equal(calls[0].provider, 'mock')
  assert.equal(calls[0].model, 'mock-model')
})

test('a stored summary answers a restart without calling the model', async () => {
  const home = isolateHome()
  const { llm } = makeLlm('{"items":["修复登录页校验逻辑"]}')
  const first = makeHarness({
    llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const a = await summarize(first.routes, { dayStart: TODAY })
  assert.equal(a.body.projects[0].items[0], '修复登录页校验逻辑')

  const stored = JSON.parse(readFileSync(join(home, 'workbench', 'summaries.json'), 'utf8'))
  assert.equal(typeof stored.entries[String(TODAY)].hash, 'string')

  const again = makeLlm('{"items":["不应该被调用"]}')
  const second = makeHarness({
    llm: again.llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const b = await summarize(second.routes, { dayStart: TODAY })
  assert.equal(b.body.projects[0].items[0], '修复登录页校验逻辑')
  assert.equal(again.calls.length, 0)

  const forced = makeLlm('{"items":["重新归纳的结果"]}')
  const third = makeHarness({
    llm: forced.llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const c = await summarize(third.routes, { dayStart: TODAY, force: true })
  assert.equal(c.body.projects[0].items[0], '重新归纳的结果')
  assert.equal(forced.calls.length, 1)
})

test('an English answer is retried once, then refused', async () => {
  isolateHome()
  const { llm, calls } = makeLlm((prompt, index) =>
    index === 0 ? '{"items":["Fixed the login page"]}' : '{"items":["修复登录页校验逻辑"]}',
  )
  const first = makeHarness({
    llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const ok = await summarize(first.routes, { dayStart: TODAY })
  assert.equal(ok.body.projects[0].items[0], '修复登录页校验逻辑')
  assert.equal(calls.length, 2)

  isolateHome()
  const stubborn = makeLlm('{"items":["Fixed the login page"]}')
  const second = makeHarness({
    llm: stubborn.llm,
    sessions: [{ id: 's1', cwd: '/work/proj', events: sessionMaterial({ start: TODAY + 3600_000 }) }],
  })
  const refused = await summarize(second.routes, { dayStart: TODAY })
  assert.equal(refused.status, 502)
  assert.match(refused.body.error, /non-Chinese/u)
  assert.equal(stubborn.calls.length, 2)
})

test('crossing midnight moves today and shifts the cached buckets', async () => {
  isolateHome()
  const late = Date.UTC(2026, 9, 30, 15, 50) // 2026-10-30 23:50 +08:00
  const events = [
    { type: 'session/title', time: late, data: { title: 'Late task' } },
    ...sessionMaterial({ start: late - 2000 }).slice(1),
    {
      type: 'assistant/message',
      time: late,
      data: { usage: { inputTokens: 1_000_000 }, message: { source: { model: 'deepseek-chat' } } },
    },
  ]
  const { llm } = makeLlm('{"items":[]}')
  const { routes } = makeHarness({
    llm,
    sessions: [{ id: 's1', cwd: '/work/proj', updatedAt: late, events }],
  })

  const before = await status(routes, { now: Date.UTC(2026, 9, 30, 15, 59) })
  assert.ok(Math.abs(before.usage.today.costCny - 2) < 0.001)
  assert.equal(before.usage.previousAverageCny, 0)

  const after = await status(routes, { now: Date.UTC(2026, 9, 30, 16, 1) })
  assert.equal(after.usage.today.costCny, 0)
  assert.ok(Math.abs(after.usage.total.costCny - 2) < 0.001)
  assert.ok(Math.abs(after.usage.previousAverageCny - 2 / 6) < 0.0001)

  const shifted = await status(routes, { now: Date.UTC(2026, 10, 1, 16, 1) })
  assert.ok(Math.abs(shifted.usage.previousAverageCny - 2 / 6) < 0.0001)
})
