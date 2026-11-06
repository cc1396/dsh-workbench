import assert from 'node:assert/strict'
import test from 'node:test'
import { foldText, parseGitLog, projectKeyOf, repoRootOf, searchSessions } from '../search.js'

const NOW = Date.UTC(2026, 10, 5, 8, 0)
const rows = [
  { sessionId: 's_7c2f', title: '修复登录回调重试', projectId: '/work/api-gateway', projectName: 'api-gateway', model: 'deepseek-v4-flash', state: 'waiting', lastAt: NOW },
  { sessionId: 's_7c01', title: '收敛登录回调日志', projectId: '/work/api-gateway', projectName: 'api-gateway', model: 'deepseek-v4-flash', state: 'ended', endedAt: NOW - 86_400_000 },
  { sessionId: 's_55a1', title: '补齐订单筛选测试', projectId: '/work/storefront', projectName: 'storefront', model: 'deepseek-chat', state: 'running', lastAt: NOW - 3600_000 },
  { sessionId: 's_9100', title: 'Fix LOGIN callback', projectId: '/work/storefront', projectName: 'storefront', model: 'deepseek-chat', state: 'failed', endedAt: NOW - 2 * 86_400_000 },
]

test('F07: Chinese matches by substring, Latin case-insensitively', () => {
  const zh = searchSessions(rows, { text: '登录回调' })
  assert.deepEqual(zh.items.map((row) => row.sessionId).sort(), ['s_7c01', 's_7c2f'])
  const latin = searchSessions(rows, { text: 'login' })
  assert.deepEqual(latin.items.map((row) => row.sessionId), ['s_9100'])
})

test('F07: exact, then prefix, then contains, then recent activity, ID breaks ties', () => {
  const pool = [
    { ...rows[1], sessionId: 'a', title: '回调日志' },
    { ...rows[1], sessionId: 'b', title: '回调日志排查' },
    { ...rows[1], sessionId: 'c', title: '复核回调日志', lastAt: NOW + 10 },
    { ...rows[1], sessionId: 'd', title: '回调日志' },
  ]
  const result = searchSessions(pool, { text: '回调日志' })
  // a and d tie on rank and time → ID decides; c is a pure contains.
  assert.deepEqual(result.items.map((row) => row.sessionId), ['a', 'd', 'b', 'c'])
})

test('F07: filters intersect, values inside one filter union, paging is stable', () => {
  const result = searchSessions(rows, { projects: ['api-gateway', 'storefront'], states: ['ended', 'failed'], limit: 1 })
  assert.equal(result.total, 2)
  assert.equal(result.items.length, 1)
  assert.equal(result.hasMore, true)
  const page = searchSessions(rows, { projects: ['api-gateway', 'storefront'], states: ['ended', 'failed'], limit: 1, offset: 1 })
  assert.equal(page.items[0].sessionId !== result.items[0].sessionId, true)
  const byDay = searchSessions(rows, { from: NOW - 86_400_000 - 1, to: NOW - 86_400_000 + 1 })
  assert.deepEqual(byDay.items.map((row) => row.sessionId), ['s_7c01'])
})

test('F07: an ID search finds the Session by its ID', () => {
  const result = searchSessions(rows, { text: 's_55a1' })
  assert.deepEqual(result.items.map((row) => row.sessionId), ['s_55a1'])
  assert.equal(result.items[0].rank, 2)
})

test('foldText normalizes and lowercases Latin only', () => {
  assert.equal(foldText('ÄBC'), 'äbc')
  assert.equal(foldText('登录回调'), '登录回调')
})

test('git evidence: parse the NUL-separated log without diff content', () => {
  const output =
    'a'.repeat(40) + '\u001fabc1234\u001fAlice\u001f2026-11-06T07:20:00+08:00\u001f筛选条件修复\u001f\u0000src/a.js\u0000src/b.js\n' +
    'b'.repeat(40) + '\u001fdef5678\u001fBob\u001f2026-11-06T06:00:00+08:00\u001fdocs\u001f\u0000README.md\n'
  const commits = parseGitLog(output)
  assert.equal(commits.length, 2)
  assert.deepEqual(commits[0].files, ['src/a.js', 'src/b.js'])
  assert.equal(commits[0].subject, '筛选条件修复')
  assert.equal(commits[1].short, 'def5678')
})

test('git evidence: the repository root is the nearest ancestor with .git', () => {
  const present = new Set(['/work/repo/.git'])
  const exists = (path) => present.has(path)
  assert.equal(repoRootOf('/work/repo/packages/app', exists), '/work/repo')
  assert.equal(repoRootOf('/work/plain', exists), undefined)
  assert.equal(projectKeyOf('/work/repo/packages/app', (cwd) => repoRootOf(cwd, exists)), '/work/repo')
  assert.equal(projectKeyOf('/work/plain', (cwd) => repoRootOf(cwd, exists)), '/work/plain')
})