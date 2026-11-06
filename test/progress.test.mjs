import assert from 'node:assert/strict'
import test from 'node:test'
import { foldProject, reportMarkdown } from '../progress.js'
import { localDayStart } from './helpers.mjs'

const TZ = 28800
const NOW = Date.UTC(2026, 10, 5, 8, 0) // 2026-11-05 16:00 +08:00
const DAY = localDayStart(NOW, TZ)
const project = { projectId: '/work/storefront', name: 'storefront', cwd: '/work/storefront', root: '/work/storefront' }
const day = { dayStart: DAY, dayEnd: DAY + 86_400_000 }

function closedSession(overrides = {}) {
  return {
    sessionId: 's1',
    title: '验证订单筛选条件',
    state: 'ended',
    lastEnd: { endedAt: DAY + 3600_000, reason: 'stop' },
    lastAt: DAY + 3600_000,
    endedAt: DAY + 3600_000,
    turnStartedAt: DAY + 600_000,
    ...overrides,
  }
}

test('A06: a normal Session, an unlinked same-repo commit and a green test stay activity or to-confirm', () => {
  const fold = foldProject({
    project,
    day,
    sessions: [closedSession({ sessionId: 's1', state: 'running', lastAt: DAY + 7_200_000, endedAt: 0, pending: [{ kind: 'approval' }] })],
    writes: [{ path: 'src/orders/filter.ts', count: 2, reads: 1, first: DAY + 700_000, last: DAY + 1_000_000, sessionId: 's1', title: '验证订单筛选条件' }],
    commands: [{ text: 'pnpm test', count: 1, first: DAY + 900_000, last: DAY + 900_000, sessionId: 's1' }],
    commits: [{ sha: 'a'.repeat(40), short: 'aaaaaaa', author: 'Alice', at: DAY + 1_800_000, subject: '订单筛选', files: ['src/orders/filter.ts', 'src/orders/query.ts'] }],
    tasks: [],
  })
  // The Session waits on an approval: blocked, never "done".
  assert.equal(fold.report.won.length, 0)
  assert.equal(fold.report.blocked.length, 1)
  assert.equal(fold.report.blocked[0].sessionId, 's1')
  // The commit is project activity even though it touched the Session's own file.
  const commit = fold.timeline.find((entry) => entry.kind === 'commit')
  assert.equal(commit.attribution, 'activity')
  assert.deepEqual(commit.relatedSessions, ['s1'])
  // A command without structured output proves nothing.
  const testRow = fold.timeline.find((entry) => entry.kind === 'test')
  assert.equal(testRow.verified, false)
  assert.equal(fold.card.counts.done, 0)
  assert.equal(fold.card.evidence >= 3, true)
})

test('A06: an ended Session with no acceptance evidence is "to confirm", not done', () => {
  const fold = foldProject({ project, day, sessions: [closedSession()], writes: [], commands: [], commits: [], tasks: [] })
  assert.equal(fold.report.confirm.length, 1)
  assert.equal(fold.report.won.length, 0)
  assert.deepEqual(fold.report.confirm[0].references, [{ sourceType: 'session', sourceRef: 's1' }])
})

test('a local task confirmed by a person is done, and keeps who and when', () => {
  const at = DAY + 2 * 3600_000
  const fold = foldProject({
    project,
    day,
    sessions: [closedSession()],
    writes: [],
    commands: [],
    commits: [],
    tasks: [{ taskId: 't1', title: '验证订单筛选条件', state: 'done', sessionId: 's1', projectId: project.projectId, source: 'local', by: 'local-user', at }],
  })
  assert.equal(fold.report.won.length, 1)
  assert.deepEqual(fold.report.won[0].confirmation, { by: 'local-user', at })
  // The Session the task covers is not repeated as "to confirm".
  assert.equal(fold.report.confirm.length, 0)
})

test('a turn that ended in failure blocks its Session', () => {
  const fold = foldProject({
    project,
    day,
    sessions: [closedSession({ state: 'failed', lastEnd: { endedAt: DAY + 3600_000, reason: 'error', message: '退出码 1', failed: true } })],
    writes: [],
    commands: [],
    commits: [],
    tasks: [],
  })
  assert.equal(fold.report.blocked.length, 1)
  assert.equal(fold.report.blocked[0].blockedBy, 'failure')
})

test('Markdown keeps every line against its evidence, and marks edited and activity lines', () => {
  const fold = foldProject({ project, day, sessions: [closedSession()], writes: [], commands: [], commits: [], tasks: [] })
  const words = { title: '日报 · {date}', done: '已完成', doing: '进行中', blocked: '阻塞', confirm: '待确认', empty: '无', editMark: '人工编辑', activityMark: '项目活动', blockMark: '阻塞', evidenceMark: '有证据' }
  const groups = [{ name: 'storefront', ...fold.report }]
  const markdown = reportMarkdown('2026-11-05', groups, words)
  assert.match(markdown, /^日报 · 2026-11-05/u)
  assert.match(markdown, /## storefront/u)
  assert.match(markdown, /### 待确认/u)
  assert.match(markdown, /- 验证订单筛选条件/u)
  const edited = reportMarkdown('2026-11-05', [{ name: 'x', won: [{ ...fold.report.confirm[0], edited: true }] }], words)
  assert.match(edited, /人工编辑/u)
})