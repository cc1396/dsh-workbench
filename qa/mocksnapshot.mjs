/**
 * A demo snapshot shaped like the Host's `GET /api/workbench/status` body.
 * Mirrored from PRD UI-01…UI-08 so screenshots can be compared with the design.
 *   node qa/mocksnapshot.mjs > qa/scenarios/home.json
 */
const FIXED = Date.UTC(2026, 10, 6, 7, 28, 9) // 2026-11-06 15:28:09 +08:00
const minute = 60_000
const now = FIXED
const project = (name, cwd) => ({ projectId: cwd, projectName: name })
const api = project('api-gateway', '/work/api-gateway')
const site = project('storefront', '/work/storefront')
const dev = project('devtools', '/work/devtools')

const running = [
  {
    sessionId: 's_7c2f', title: '修复登录回调重试', ...api, state: 'waiting', running: true,
    turnStartedAt: now - 12 * minute - 40_000, lastAt: now - 2 * minute, endedAt: 0,
    lastAction: { name: 'bash', at: now - 2 * minute },
    waiting: [{ kind: 'approval', detail: 'bash', at: now - 2 * minute }],
    model: 'deepseek-v4-flash', provider: 'deepseek', toolCalls: 18, turn: 3,
    tokens: { uncachedInput: 412_000, cacheReadInput: 1_204_000, cacheWriteInput: 0, output: 84_000 },
    usage: { amount: 1.84, quality: 'partial', coverage: 0.75, day: '2026-11-06' },
    alerts: [{ key: 'k2', type: 'waiting', state: 'open', severity: 'medium' }],
    evidence: [{ kind: 'pending', at: now - 2 * minute }, { kind: 'turn', at: now - 12 * minute }],
  },
  {
    sessionId: 's_17f0', title: '整理发布流程脚本', ...dev, state: 'running', running: true,
    turnStartedAt: now - 6 * minute - 18_000, lastAt: now - 42_000, endedAt: 0,
    lastAction: { name: 'bash', at: now - 42_000 },
    model: 'deepseek-v4-flash', provider: 'deepseek', toolCalls: 9, turn: 2,
    tokens: { uncachedInput: 180_000, cacheReadInput: 900_000, cacheWriteInput: 0, output: 41_000 },
    usage: { amount: 0.92, quality: 'priced', coverage: 1, day: '2026-11-06' },
    alerts: [],
  },
  {
    sessionId: 's_55a1', title: '补齐订单筛选测试', ...site, state: 'running', running: true,
    turnStartedAt: now - 4 * minute - 9_000, lastAt: now - 18_000, endedAt: 0,
    lastAction: { name: 'read', at: now - 18_000 },
    model: 'deepseek-v4-flash', provider: 'deepseek', toolCalls: 6, turn: 1, children: 1,
    usage: { amount: 0.61, quality: 'priced', coverage: 1, day: '2026-11-06' },
    alerts: [],
  },
]

const recent = [
  {
    sessionId: 's_2b90', title: '重建预览环境镜像', ...dev, state: 'failed', running: false,
    endedAt: now - 4 * minute, lastAt: now - 4 * minute, turnStartedAt: now - 21 * minute,
    lastEnd: { turn: 1, startedAt: now - 21 * minute, endedAt: now - 4 * minute, reason: 'error', message: '镜像构建退出码 1', failed: true },
    model: 'deepseek-v4-flash', usage: { amount: 0.3, quality: 'priced', coverage: 1 }, alerts: [],
  },
  {
    sessionId: 's_91cd', title: '验证订单筛选条件', ...site, state: 'ended', running: false,
    endedAt: now - 46 * minute, lastAt: now - 46 * minute, turnStartedAt: now - 58 * minute,
    lastEnd: { turn: 1, startedAt: now - 58 * minute, endedAt: now - 46 * minute, reason: 'restart', message: '', failed: false },
    model: 'deepseek-v4-flash', usage: { amount: 0.44, quality: 'priced', coverage: 1 }, alerts: [],
  },
]

const alerts = [
  {
    key: 'local|s_2b90|failure|1:' + (now - 4 * minute), type: 'failure', state: 'open', severity: 'high',
    sessionId: 's_2b90', ...dev, title: '重建预览环境镜像', reason: '镜像构建退出码 1', triggeredAt: now - 4 * minute,
    currentState: 'failed', updatedAt: now - 4 * minute,
  },
  {
    key: 'local|s_7c2f|waiting|' + (now - 2 * minute), type: 'waiting', state: 'open', severity: 'medium',
    sessionId: 's_7c2f', ...api, title: '修复登录回调重试', reason: 'bash', triggeredAt: now - 2 * minute,
    currentState: 'waiting', updatedAt: now - 2 * minute,
  },
]

const sessionCost = (row) => ({
  sessionId: row.sessionId, projectId: row.projectId, projectName: row.projectName, title: row.title,
  model: row.model, amount: row.usage.amount, tokens: row.tokens, parts: [], quality: row.usage.quality, coverage: row.usage.coverage,
})

const body = {
  generatedAt: now,
  account: { status: 'unavailable' },
  usage: {
    total: { inputTokens: 1_800_000, outputTokens: 240_000, cacheReadTokens: 2_100_000, tokens: 4_140_000, costCny: 8.42 },
    previousAverageCny: 5.1, today: { inputTokens: 1_800_000, outputTokens: 240_000, cacheReadTokens: 2_100_000, tokens: 4_140_000, costCny: 8.42 },
  },
  speed: {
    current: { time: now - 18_000, model: 'deepseek-v4-flash', tokensPerSecond: 74 },
    models: [{ model: 'deepseek-v4-flash', requests: 138, outputTokens: 96_000, durationMs: 1_300_000, tokensPerSecond: 73.8, p50TokensPerSecond: 74, p90TokensPerSecond: 112, samples: 138 }],
    samples: 138,
    week: { requests: 138, outputTokens: 96_000, durationMs: 1_300_000, models: [] },
    today: { requests: 3, outputTokens: 2_000, durationMs: 30_000, models: [] },
    recent: [],
  },
  worklog: { days: [], generatedAt: undefined },
  capabilities: { live: 'poll', pollMs: 15000, alertsWait: 'ready', alertsInfer: 'ready', rules: 'ready', states: 'ready', ledger: 'ready', performance: 'ready', account: 'unavailable', openSession: 'host' },
  freshness: { at: now, tzOffset: 28800, state: 'fresh' },
  overview: {
    todayStart: Date.UTC(2026, 10, 5, 16), amount: 8.42, amountPartial: 9.1, currency: 'USD', coverage: 0.96, unpricedTokens: 12_000,
    running: 3, runningByState: 1, failed: 1, ended: 1, attention: 2, attentionByType: { failure: 1, waiting: 1 },
    speedP50: 74, speedSamples: 138, models: 1, scanned: 12, sessions: 12,
  },
  states: { total: 12, running: 3, runningByState: 1, failed: 1, ended: 6, cancelled: 1, unknown: 1, counts: {} },
  running,
  recent,
  alerts,
  ledger: {
    today: sessionCost({ sessionId: 's_total', ...api, title: '今日合计', usage: { amount: 8.42, quality: 'partial', coverage: 0.96 } }),
    projects: [
      { projectId: api.projectId, name: 'api-gateway', sessions: 2, amount: 4.86, todayAmount: 4.86, coverage: 0.75, unpricedTokens: 8_000 },
      { projectId: site.projectId, name: 'storefront', sessions: 2, amount: 2.31, todayAmount: 2.31, coverage: 1, unpricedTokens: 0 },
      { projectId: dev.projectId, name: 'devtools', sessions: 2, amount: 1.25, todayAmount: 1.25, coverage: 1, unpricedTokens: 0 },
    ],
    trend: [3.2, 4.1, 2.8, 5.6, 6.4, 5.9, 8.42].map((amount, index) => ({ day: Date.UTC(2026, 9, 31, 16) + index * 86_400_000, amount, priced: 1 })),
    trendMax: 8.42,
    sessions: running.concat(recent).map(sessionCost),
    daySessions: [],
    currency: 'USD',
    coverage: 0.96,
    days: [0, 1, 2, 3, 4, 5, 6].map((index) => Date.UTC(2026, 9, 31, 16) + index * 86_400_000),
  },
  tasks: { total: 12, running: 3, recent: 2 },
}

// The request-level detail behind one Session (UI-06): the ledger rows the Host can
// prove from the projected Token usage and the price table in effect.
body.ledger.detail = {
  's_7c2f': [
    { requestId: 'req_7f2a', at: now - 3 * minute - 6_000, status: 'ok', amount: 0.88, quality: 'priced', provider: 'deepseek', model: 'deepseek-v4-flash', tokens: { uncachedInput: 400_000, cacheReadInput: 200_000, cacheWriteInput: 0, output: 300_000 }, priceRef: 'demo-usd-1106', attribution: 'workspace' },
    { requestId: 'req_7c41', at: now - 7 * minute - 30_000, status: 'ok', amount: 0.66, quality: 'priced', provider: 'deepseek', model: 'deepseek-v4-flash', tokens: { uncachedInput: 120_000, cacheReadInput: 80_000, cacheWriteInput: 0, output: 220_000 }, priceRef: 'demo-usd-1106', attribution: 'workspace' },
    { requestId: 'req_7b26', at: now - 9 * minute - 11_000, status: 'error', amount: 0.3, quality: 'priced', provider: 'deepseek', model: 'deepseek-v4-flash', tokens: { uncachedInput: 60_000, cacheReadInput: 40_000, cacheWriteInput: 0, output: 90_000 }, priceRef: 'demo-usd-1106', attribution: 'workspace' },
    { requestId: 'req_7a10', at: now - 10 * minute - 30_000, status: 'error', amount: undefined, quality: 'missing-usage', provider: 'deepseek', model: 'deepseek-v4-flash', tokens: { uncachedInput: 0, cacheReadInput: 0, cacheWriteInput: 0, output: 0 }, priceRef: 'demo-usd-1106', attribution: 'workspace' },
  ],
}
body.ledger.prices = { 'deepseek-v4-flash': { model: 'deepseek-v4-flash', ref: 'demo-usd-1106', input: 0.6, cacheRead: 0.2, cacheWrite: 0.6, output: 2 } }


// P1 fixtures: the metadata index, one request ledger and one evidence report.
// They mirror UI-05 / UI-06 / UI-07 so screenshots can be compared with the design.
body.search = {
  rows: [
    ...body.running.map((row) => ({
      sessionId: row.sessionId, title: row.title, projectId: row.projectId, projectName: row.projectName,
      model: row.model, provider: row.provider, state: row.state, endedAt: undefined, lastAt: row.lastAt,
    })),
    ...body.recent.map((row) => ({
      sessionId: row.sessionId, title: row.title, projectId: row.projectId, projectName: row.projectName,
      model: row.model, provider: row.provider, state: row.state, endedAt: row.endedAt, lastAt: row.lastAt,
    })),
    { sessionId: 's_40b1', title: '收敛登录回调日志', projectId: '/work/api-gateway', projectName: 'api-gateway', model: 'deepseek-v4-flash', provider: 'deepseek', state: 'ended', endedAt: now - 20 * 3600_000, lastAt: now - 20 * 3600_000 },
    { sessionId: 's_83de', title: '验证登录回调异常场景', projectId: '/work/api-gateway', projectName: 'api-gateway', model: 'deepseek-v4-flash', provider: 'deepseek', state: 'ended', endedAt: now - 3 * 24 * 3600_000, lastAt: now - 3 * 24 * 3600_000 },
  ],
  total: 7,
}

body.__requests = {
  s_7c2f: {
    rows: body.ledger.detail['s_7c2f'].map((row) => ({
      requestId: row.requestId,
      at: row.at,
      status: row.status === 'ok' ? 'settled' : 'aggregate',
      provider: row.provider,
      model: row.model,
      tokens: row.tokens,
      amount: row.amount,
      quality: row.quality === 'missing-usage' ? 'unpriced' : row.quality,
      priceRef: row.priceRef,
      attribution: row.attribution,
    })),
    prices: [body.ledger.prices['deepseek-v4-flash']],
  },
}

const reportItem = (title, status, projectId, sessionId, extras = {}) => ({
  kind: sessionId === undefined ? 'task' : 'session',
  sessionId,
  projectId,
  title,
  status,
  attribution: 'direct',
  evidence: [{ sourceType: 'session', sourceRef: sessionId ?? 'local' }],
  references: [{ sourceType: 'session', sourceRef: sessionId ?? 'local' }],
  verification: { kind: 'turn-end', label: 'done' },
  edited: false,
  ...extras,
})

const timeline = [
  { kind: 'session', sessionId: 's_91cd', title: '验证订单筛选条件', state: 'ended', at: now - 46 * minute, attribution: 'direct', reference: { sourceType: 'session', sourceRef: 's_91cd' }, status: 'done', confirmation: { by: 'local-user', at: now - 45 * minute } },
  { kind: 'commit', sha: '7b3a29e', short: '7b3a29e', fullSha: '7b3a29e' + '0'.repeat(33), subject: '订单筛选条件与边界用例', author: 'local', at: now - 44 * minute, files: 3, attribution: 'activity', reference: { sourceType: 'commit', sourceRef: '/work/storefront:7b3a29e' }, touchesSessionFile: true, relatedSessions: ['s_91cd'] },
  { kind: 'test', text: 'pnpm test', count: 1, at: now - 43 * minute, sessionId: 's_91cd', verified: true, passed: 12, failed: 0, exitCode: 0, attribution: 'direct', reference: { sourceType: 'test', sourceRef: 's_91cd:pnpm test' } },
  { kind: 'file', path: 'src/orders/filter.ts', count: 2, at: now - 42 * minute, sessionId: 's_91cd', title: '验证订单筛选条件', attribution: 'direct', reference: { sourceType: 'file', sourceRef: 's_91cd:src/orders/filter.ts' } },
]

body.__report = {
  generatedAt: now,
  day: Date.UTC(2026, 10, 5, 16),
  dayLabel: '2026-11-06',
  totals: { done: 1, active: 1, blocked: 1, confirm: 1, evidence: 9, projects: 3 },
  projects: [
    {
      card: { projectId: '/work/storefront', name: 'storefront', cwd: '/work/storefront', root: '/work/storefront', day: Date.UTC(2026, 10, 5, 16), sessions: 2, commits: 1, files: 2, tests: 1, evidence: 4, counts: { done: 1, active: 0, blocked: 0, confirm: 0 }, unfinished: 0, lastAction: { kind: 'commit', at: now - 44 * minute, label: '订单筛选条件与边界用例' }, lastAt: now - 42 * minute },
      timeline,
      report: { won: [reportItem('验证订单筛选条件', 'done', '/work/storefront', 's_91cd', { confirmation: { by: 'local-user', at: now - 45 * minute } })], doing: [], blocked: [], confirm: [] },
      git: 'ready', root: '/work/storefront',
    },
    {
      card: { projectId: '/work/devtools', name: 'devtools', cwd: '/work/devtools', root: '/work/devtools', day: Date.UTC(2026, 10, 5, 16), sessions: 2, commits: 0, files: 1, tests: 0, evidence: 2, counts: { done: 0, active: 1, blocked: 0, confirm: 1 }, unfinished: 2, lastAction: { kind: 'session', at: now - 42_000, label: '整理发布流程脚本' }, lastAt: now - 42_000 },
      timeline: [
        { kind: 'session', sessionId: 's_17f0', title: '整理发布流程脚本', state: 'running', at: now - 42_000, attribution: 'direct', reference: { sourceType: 'session', sourceRef: 's_17f0' }, status: 'active' },
        { kind: 'session', sessionId: 's_2b90', title: '检查镜像构建结果', state: 'ended', at: now - 4 * minute, attribution: 'direct', reference: { sourceType: 'session', sourceRef: 's_2b90' }, status: 'confirm' },
      ],
      report: { won: [], doing: [reportItem('整理发布流程脚本', 'active', '/work/devtools', 's_17f0')], blocked: [], confirm: [reportItem('检查镜像构建结果', 'confirm', '/work/devtools', 's_2b90')] },
      git: 'off', root: '/work/devtools',
    },
    {
      card: { projectId: '/work/api-gateway', name: 'api-gateway', cwd: '/work/api-gateway', root: '/work/api-gateway', day: Date.UTC(2026, 10, 5, 16), sessions: 2, commits: 0, files: 1, tests: 0, evidence: 2, counts: { done: 0, active: 0, blocked: 1, confirm: 0 }, unfinished: 1, lastAction: { kind: 'session', at: now - 2 * minute, label: '修复登录回调重试' }, lastAt: now - 2 * minute },
      timeline: [{ kind: 'session', sessionId: 's_7c2f', title: '修复登录回调重试', state: 'waiting', at: now - 2 * minute, attribution: 'direct', reference: { sourceType: 'session', sourceRef: 's_7c2f' }, status: 'blocked', blockedBy: 'waiting' }],
      report: { won: [], doing: [], blocked: [reportItem('修复登录回调重试', 'blocked', '/work/api-gateway', 's_7c2f', { blockedBy: 'waiting' })], confirm: [] },
      git: 'off', root: '/work/api-gateway',
    },
  ],
  report: {
    markdown: '# 日报 · 11 月 6 日\n\n## storefront\n\n### 已完成\n\n- 验证订单筛选条件\n',
    groups: [],
  },
  capabilities: { git: 'ready', tests: 'ready', tasks: 'local', verification: '轮次正常结束 + 结构化测试结果' },
}
body.__report.report.groups = body.__report.projects.map((project) => ({ name: project.card.name, ...project.report }))

process.stdout.write(JSON.stringify(body, null, 2))
