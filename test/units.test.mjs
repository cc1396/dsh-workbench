import assert from 'node:assert/strict'
import test from 'node:test'
import { closingTurnOf, factsOf, localDayStart, tokensFromEvents, tokensOf, totalTokens } from '../src/facts.js'
import { splitByDay, rollup } from '../src/ledger.js'
import { pricingOf, priceSessionDay, amountOf } from '../src/pricing.js'
import { alertsOf, pendingCount } from '../src/alerts.js'
import { projectNameOf } from '../src/snapshot.js'
import { DAY, TODAY } from './fixtures.mjs'

test('tokens accept both naming styles and never zero a total', () => {
  const host = { uncachedInputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 0, outputTokens: 30 }
  const internal = { uncachedInput: 10, cacheReadInput: 20, cacheWriteInput: 0, output: 30 }
  assert.deepEqual(tokensOf(host), tokensOf(internal))
  // A real `outputTokens: 0` must not hide an internal `output`.
  assert.deepEqual(tokensOf({ outputTokens: 0, output: 7 }), { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 7 })
  assert.equal(totalTokens(tokensOf(host)), 60)
})

test('the day split always lands the whole amount somewhere', () => {
  const days = [TODAY, TODAY - DAY]
  const step = (time, input) => ({ type: 'assistant/message', time, data: { usage: { inputTokens: input } } })
  // No timeline at all: the cut's own day.
  const none = splitByDay({ totals: { uncachedInputTokens: 100 }, events: [], dayStart: TODAY, days, tzOffsetSeconds: 28_800, fallbackAt: TODAY + 1000 })
  assert.deepEqual(none.map((row) => row.day), [TODAY])
  assert.equal(totalTokens(none[0].tokens), 100)
  // Two days: each step on its own day, total preserved.
  const both = splitByDay({ totals: { uncachedInputTokens: 100 }, events: [step(TODAY - DAY + 3600_000, 40), step(TODAY + 3600_000, 60)], dayStart: TODAY, days, tzOffsetSeconds: 28_800 })
  assert.equal(both.length, 2)
  assert.equal(both.reduce((sum, row) => sum + totalTokens(row.tokens), 0), 100)
  // Steps that over-report cannot inflate the total.
  const over = splitByDay({ totals: { uncachedInputTokens: 100 }, events: [step(TODAY + 1000, 300)], dayStart: TODAY, days, tzOffsetSeconds: 28_800 })
  assert.equal(over.reduce((sum, row) => sum + totalTokens(row.tokens), 0), 100)
})

test('pricing falls back to the default row and rounds without inventing precision', () => {
  const pricing = pricingOf({ default: { input: 2, output: 8 }, models: { m: { input: 1, output: 4 } } })
  assert.equal(amountOf({ uncachedInput: 1_000_000, output: 0 }, pricing.default), 2)
  assert.equal(priceSessionDay({ uncachedInput: 1_000_000 }, 'unlisted', pricing).quality, 'priced')
  assert.equal(priceSessionDay({ uncachedInput: 1_000_000 }, 'm', pricing).amount, 1)
  assert.equal(priceSessionDay({}, 'm', pricing).quality, 'empty')
})

test('the roll-up keeps today, projects and the trend consistent', () => {
  const pricing = pricingOf({ default: { input: 1, output: 1 } })
  const price = priceSessionDay({ uncachedInput: 1_000_000 }, 'x', pricing)
  const rolled = rollup({
    rows: [
      { sessionId: 'a', project: '/w/one', name: 'one', day: TODAY, tokens: { uncachedInput: 1_000_000 }, price },
      { sessionId: 'b', project: '/w/two', name: 'two', day: TODAY - DAY, tokens: { uncachedInput: 1_000_000 }, price },
    ],
    days: [TODAY, TODAY - DAY],
    currency: 'CNY',
  })
  assert.equal(rolled.today.amount, 1)
  assert.equal(rolled.trend[0].amount, 1)
  assert.equal(rolled.trend[1].amount, 1)
  assert.equal(rolled.projects.length, 2)
})

test('attention keys are stable and a dismissal holds', () => {
  const rows = [{ sessionId: 'a', title: 't', state: 'failed', endedAt: 100, turn: 1, lastAt: 100 }]
  const store = { entries: {} }
  const first = alertsOf(rows, store, 200)
  const replay = alertsOf(rows, store, 200)
  assert.equal(first.items.length, 1)
  assert.equal(first.items[0].key, replay.items[0].key)
  store.entries[first.items[0].key].dismissedAt = 300
  assert.equal(pendingCount(alertsOf(rows, store, 400).items), 0)
  // A different failing turn is a different key.
  assert.notEqual(alertsOf([{ ...rows[0], turn: 2, endedAt: 500 }], store, 600).items[0].key, first.items[0].key)
})

test('a closing turn decides failed versus cancelled', () => {
  const end = (kind, extra = {}) => ({ type: 'turn/end', time: 100, data: { reason: { kind, ...extra } } })
  assert.equal(closingTurnOf([end('error', { error: { message: 'boom' } })]).message, 'boom')
  assert.equal(closingTurnOf([end('error')]).state, 'failed')
  assert.equal(closingTurnOf([end('cancelled')]).state, 'cancelled')
  assert.equal(closingTurnOf([end('error', { reason: { kind: 'user' } })]).state, 'cancelled')
  assert.equal(closingTurnOf([end('stop')]).state, undefined)
})

test('facts read the projection and never assume a missing service', () => {
  const record = { id: 's', cwd: '/work/x', origin: 'user', createdAt: 1 }
  const facts = factsOf(record, { title: 'T', tokenUsage: { totals: { uncachedInputTokens: 5 } }, modelSelection: { lastUsed: { model: 'm' } } }, { running: true }, 1000)
  assert.equal(facts.state, 'running')
  assert.equal(facts.title, 'T')
  assert.equal(facts.tokens.uncachedInput, 5)
  const bare = factsOf(record, undefined, undefined, 1000)
  assert.equal(bare.state, 'ended')
  assert.equal(bare.title, undefined)
})

test('project names survive both path styles', () => {
  assert.equal(projectNameOf('/Users/a/project/dsh'), 'dsh')
  assert.equal(projectNameOf('--Users-a-project-x--'), 'x')
  assert.equal(projectNameOf('repo'), 'repo')
  assert.equal(projectNameOf(''), '')
})

test('token totals from a log match a projection that could not be read', () => {
  const events = [
    { type: 'assistant/message', time: TODAY + 1000, data: { usage: { inputTokens: 10, outputTokens: 5 } } },
    { type: 'assistant/message', time: TODAY + 2000, data: { usage: { inputTokens: 20, outputTokens: 5 } } },
  ]
  const { totals, byDay } = tokensFromEvents(events, 28_800)
  assert.equal(totalTokens(totals), 40)
  assert.equal(totalTokens(byDay.get(localDayStart(TODAY + 1000, 28_800))), 40)
})

test('a cost page row carries its title and its token buckets', async () => {
  const { host, session, turn, projections, isolateHome, snapshot, TODAY } = await import('./fixtures.mjs')
  isolateHome()
  const { routes } = host([
    session({ id: 's1', cwd: '/w/alpha', events: turn({ start: TODAY + 3_600_000, input: 1_000_000 }), values: projections({ title: '有名字' }) }),
  ], { prices: { default: { input: 2, output: 8 } } })
  const body = await snapshot(routes)
  const entry = body.ledger.today.sessions[0]
  assert.equal(entry.title, '有名字', 'a finished Session still exposes its projected title')
  // 1M input × ¥2/M plus the fixture turn's 100 output tokens × ¥8/M.
  assert.ok(Math.abs(entry.amount - 2.0008) < 1e-9, String(entry.amount))
  // The wire carries buckets, not a leaked price row.
  assert.deepEqual(Object.keys(entry.tokens).sort(), ['cacheReadInput', 'cacheWriteInput', 'output', 'uncachedInput'])
  assert.equal('price' in entry, false)
  assert.equal(entry.quality, 'priced')
})

test('a running Session with recent activity is never a stall, whatever its turn seq', () => {
  // The defect this guards: `openTurnStartSeq` is an event sequence number, and comparing
  // it with `Date.now()` made every running Session read as stuck.
  const start = TODAY + 3_600_000
  const now = start + 60_000
  const facts = factsOf(
    { id: 'a', cwd: '/w', origin: 'user', createdAt: start },
    {
      title: 'T',
      turnBoundary: { openTurnStartSeq: 3146, lastTurn: 5 },
      sessionStats: { turns: 5, lastTurn: 5 },
      userQuestions: { questions: { active: [] } },
    },
    { running: true },
    now,
  )
  assert.equal(facts.state, 'running', 'recent activity is not a stall')
})

test('a running Session silent past the threshold is a stall candidate', () => {
  const start = TODAY + 3_600_000
  const facts = factsOf(
    { id: 'a', cwd: '/w', origin: 'user', createdAt: start },
    {
      title: 'T',
      turnBoundary: { openTurnStartSeq: 9, lastTurn: 1 },
      // The last prompt was far more than ten minutes before the cut.
      sessionListMetadata: { lastPromptAt: start },
      userQuestions: { questions: { active: [] } },
    },
    { running: true },
    start + 11 * 60_000,
  )
  assert.equal(facts.state, 'stuck')
})
