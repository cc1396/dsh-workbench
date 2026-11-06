/**
 * Project progress (PRD F04) and the evidence daily report (PRD F08).
 *
 * One fold turns a day of committed Session facts — turns, file writes and test
 * commands — plus one day of read-only Git commits into:
 *
 *  - project cards: Sessions with activity, the latest action, task-state counts,
 *    the number of verifiable evidence items and the last update;
 *  - a timeline of Session, file, commit and test evidence, each tagged with its
 *    link level (direct or project activity) and a source reference;
 *  - a report draft grouped into done, in progress, blocked and to confirm, where
 *    every generated line keeps its evidence reference and everything a person
 *    changed is marked as edited.
 *
 * The classification is deliberately conservative (PRD F04 table): a green test or
 * a single commit is activity, never completion. A task is "done" only when the
 * user confirms it or when a confirmation exists; it is "blocked" only when the
 * user marked it or a Session ended in an explicit failure; it is "in progress"
 * while its Session runs and nothing closed it; anything else that has activity but
 * no verifiable outcome is "to confirm".
 */

/** A task title is at most this long; it is a label, never a summary. */
const MAX_TITLE = 60
const MAX_ITEMS = 40

/** Which state a Session's latest turn ended in. */
function sessionPhase(row) {
  const state = String(row.state ?? row.lastEnd?.reason ?? 'unknown')
  if (state === 'failed') return 'failed'
  if (state === 'ended' || state === 'cancelled') return 'closed'
  if (state === 'waiting' || state === 'running' || state === 'stuck') return 'running'
  return row.lastEnd === undefined && row.endedAt === undefined ? 'running' : 'inactive'
}

/** Test commands: what the user asked the workspace to prove, not what it proved. */
const TEST_HINT = /(?:\b(?:pnpm|npm|yarn|bun|npx|vitest|jest|mocha|pytest|go)\b[^\n]*(?:\btest\b|\bcheck\b|\blint\b|\bbuild\b)|\b(?:vitest|jest|pytest)\b)/iu

function isTestCommand(text) {
  return typeof text === 'string' && TEST_HINT.test(text)
}

/**
 * Fold one project's day.
 *
 * @param project - `{ projectId, name, cwd, root }` (root is the repository root or the workspace).
 * @param day - `{ dayStart, dayEnd }`.
 * @param sessions - rows `{ sessionId, title, state, lastEnd, lastAt, turnStartedAt, endedAt, pending }`.
 * @param writes - `[{ path, count, reads, first, last, sessionId, title }]` inside the day.
 * @param commands - `[{ text, count, first, last, sessionId }]` inside the day.
 * @param commits - commits of the day (`{ sha, short, author, at, subject, files }`).
 * @param tasks - local tasks `[{ taskId, title, state, sessionId, projectId, source, by, at }]`.
 * @returns `{ card, timeline, report }` for this project.
 */
export function foldProject({ project, day, sessions, writes, commands, commits, tasks }) {
  const sessionRows = (Array.isArray(sessions) ? sessions : []).filter(
    (row) => (Number(row.lastAt) >= day.dayStart || Number(row.endedAt) >= day.dayStart) && Number(row.lastAt) < day.dayEnd,
  )
  const bySession = new Map(sessionRows.map((row) => [row.sessionId, row]))
  const writeRows = (Array.isArray(writes) ? writes : []).filter((row) => row.last >= day.dayStart && row.first < day.dayEnd)
  // Writes of a Session outside the day still name the files a commit may share with it.
  const sessionPathsOf = (sessionId) =>
    [...new Set((Array.isArray(writes) ? writes : []).filter((row) => row.sessionId === sessionId).map((row) => row.path))]
  const testRows = (Array.isArray(commands) ? commands : [])
    .filter((row) => isTestCommand(row.text) && row.last >= day.dayStart && row.first < day.dayEnd)
    // A structured result on a normally ended turn is verified; a bare command is not.
    .map((row) => ({ ...row, verified: row.verified === true }))

  const timeline = []
  const sessionItems = []
  for (const row of sessionRows) {
    const phase = sessionPhase(row)
    const waiting = phase === 'running' && (row.state === 'waiting' || (Array.isArray(row.pending) && row.pending.length > 0))
    const item = {
      kind: 'session',
      sessionId: row.sessionId,
      title: labelOf(row.title),
      state: String(row.state ?? 'unknown'),
      at: Number(row.endedAt) || Number(row.lastAt) || day.dayStart,
      startedAt: Number(row.turnStartedAt) || undefined,
      attribution: 'direct',
      reference: { sourceType: 'session', sourceRef: row.sessionId },
    }
    item.status = (() => {
      if (waiting) return 'blocked'
      if (phase === 'failed') return 'blocked'
      if (phase === 'running') return 'active'
      if (phase === 'closed') return 'confirm'
      return 'confirm'
    })()
    item.verification = waiting ? { kind: 'pending', label: 'waiting' } : phase === 'failed' ? { kind: 'failure', label: 'error' } : phase === 'closed' ? { kind: 'turn-end', label: String(row.lastEnd?.reason ?? 'ended') } : undefined
    item.blockedBy = waiting ? 'waiting' : phase === 'failed' ? 'failure' : undefined
    sessionItems.push(item)
    timeline.push({ ...item, kind: 'session', at: item.at })
  }
  for (const row of writeRows) {
    const owner = bySession.get(row.sessionId)
    timeline.push({
      kind: 'file',
      path: row.path,
      count: row.count,
      at: row.last,
      sessionId: row.sessionId,
      title: labelOf(row.title ?? owner?.title),
      attribution: 'direct',
      reference: { sourceType: 'file', sourceRef: `${row.sessionId}:${row.path}` },
    })
  }
  for (const commit of Array.isArray(commits) ? commits : []) {
    const paths = (Array.isArray(writes) ? writes : []).map((row) => row.path)
    const touches = paths.length === 0 ? [] : [...bySession.keys()].filter((sessionId) => {
      const own = sessionPathsOf(sessionId)
      return own.length > 0 && sharedFilesOf(commit, own) > 0
    })
    timeline.push({
      kind: 'commit',
      sha: commit.short,
      fullSha: commit.sha,
      subject: commit.subject,
      author: commit.author,
      files: commit.files,
      touchesSessionFile: commit.touchesSessionFile === true || touches.length > 0,
      relatedSessions: touches.slice(0, 5),
      at: commit.at,
      attribution: 'activity',
      reference: { sourceType: 'commit', sourceRef: `${project.root ?? project.cwd}:${commit.sha}` },
    })
  }
  for (const test of testRows) {
    timeline.push({
      kind: 'test',
      text: test.text,
      count: test.count,
      at: test.last,
      sessionId: test.sessionId,
      verified: test.verified,
      attribution: 'direct',
      reference: { sourceType: 'test', sourceRef: `${test.sessionId}:${test.text}` },
    })
  }
  timeline.sort((left, right) => (Number(right.at) || 0) - (Number(left.at) || 0) || String(referenceKey(left)).localeCompare(String(referenceKey(right))))

  const mine = (Array.isArray(tasks) ? tasks : []).filter((task) => task.projectId === project.projectId && task.title !== '')
  const taskItems = mine.map((task) => ({
    kind: 'task',
    taskId: task.taskId,
    title: clip(task.title),
    state: task.state,
    sessionId: task.sessionId,
    projectId: task.projectId,
    attribution: task.sessionId === undefined ? 'activity' : 'direct',
    confirmation: task.state === 'done' ? { by: task.by, at: task.at } : undefined,
    source: task.source ?? 'local',
    reference: { sourceType: 'task', sourceRef: `${project.projectId}:${task.taskId}` },
  }))

  // Tasks the Host proved: a Session the user confirmed, or a local task row.
  const confirmed = taskItems.filter((task) => task.state === 'done')
  const inProgress = taskItems.filter((task) => task.state === 'active').concat(sessionItems.filter((item) => item.status === 'active' && !coveredBy(confirmed, item)))
  const blocked = taskItems.filter((task) => task.state === 'blocked').concat(sessionItems.filter((item) => item.status === 'blocked' && !coveredBy([...confirmed, ...taskItems], item)))
  const confirm = taskItems.filter((task) => task.state === 'confirm').concat(
    sessionItems.filter((item) => item.status === 'confirm' && !coveredBy([...confirmed, ...inProgress, ...blocked], item)),
  )
  const counts = {
    done: confirmed.length,
    active: inProgress.length,
    blocked: blocked.length,
    confirm: confirm.length,
  }

  const lastAction = timeline[0]
  const card = {
    projectId: project.projectId,
    name: project.name,
    cwd: project.cwd,
    root: project.root,
    day: day.dayStart,
    sessions: sessionRows.length,
    commits: Array.isArray(commits) ? commits.length : 0,
    files: writeRows.length,
    tests: testRows.length,
    evidence: timeline.filter((entry) => entry.kind !== 'session' || entry.attribution === 'direct').length,
    counts,
    unfinished: counts.active + counts.blocked + counts.confirm,
    lastAction: lastAction === undefined ? undefined : { kind: lastAction.kind, at: lastAction.at, label: lastAction.title ?? lastAction.path ?? lastAction.subject ?? lastAction.text },
    lastAt: lastAction === undefined ? 0 : Number(lastAction.at) || 0,
  }

  const report = {
    projectId: project.projectId,
    name: project.name,
    won: confirmed.map((task) => reportItem(task, 'done')),
    doing: inProgress.map((task) => reportItem(task, 'active')),
    blocked: blocked.map((task) => reportItem(task, 'blocked')),
    confirm: confirm.map((task) => reportItem(task, 'confirm')),
  }
  return { card, timeline: timeline.slice(0, MAX_ITEMS), report }
}

function coveredBy(tasks, item) {
  return tasks.some((task) => task.taskId !== undefined && item.sessionId !== undefined && task.sessionId === item.sessionId)
}

function reportItem(task, status) {
  return {
    kind: task.kind,
    taskId: task.taskId,
    sessionId: task.sessionId,
    projectId: task.projectId,
    title: task.title,
    status,
    attribution: task.attribution,
    confirmation: task.confirmation,
    blockedBy: task.blockedBy,
    evidence: task.reference === undefined ? [] : [task.reference],
    references: task.reference === undefined ? [] : [task.reference],
    verification: task.verification,
    edited: false,
    source: task.source,
  }
}

function sharedFilesOf(commit, paths) {
  return (Array.isArray(commit.files) ? commit.files : []).filter((file) => paths.includes(file)).length
}

function referenceKey(entry) {
  if (entry === null || typeof entry !== 'object') return ''
  return entry.reference?.sourceRef ?? entry.sessionId ?? entry.path ?? entry.sha ?? ''
}

function labelOf(title) {
  if (typeof title === 'string' && title.trim() !== '') return clip(title)
  return ''
}

function clip(text) {
  const value = String(text ?? '').replace(/\s+/gu, ' ').trim()
  return value.length > MAX_TITLE ? `${value.slice(0, MAX_TITLE)}…` : value
}

/**
 * Turn a report draft into Markdown (the copy action and the preview both read it).
 *
 * @param dayLabel - the day as the reader sees it.
 * @param groups - `[{ name, won, doing, blocked, confirm }]` per project.
 * @param words - localized headings and notes `{ title, empty, edited, activity, confirm, ... }`.
 */
export function reportMarkdown(dayLabel, groups, words) {
  const lines = [words.title.replace('{date}', dayLabel), '']
  const sections = [
    { key: 'won', heading: words.done },
    { key: 'doing', heading: words.doing },
    { key: 'blocked', heading: words.blocked },
    { key: 'confirm', heading: words.confirm },
  ]
  let any = false
  for (const group of Array.isArray(groups) ? groups : []) {
    const rows = sections.map((section) => [section, group[section.key] ?? []]).filter(([, items]) => items.length > 0)
    if (rows.length === 0) continue
    any = true
    lines.push(`## ${group.name}`, '')
    for (const [section, items] of rows) {
      lines.push(`### ${section.heading}`, '')
      for (const item of items) lines.push(`- ${lineOf(item, words)}`)
      lines.push('')
    }
  }
  if (!any) lines.push(words.empty, '')
  return lines.join('\n')
}

function lineOf(item, words) {
  const marks = []
  if (item.edited === true) marks.push(words.editMark)
  if (item.attribution === 'activity') marks.push(words.activityMark)
  if (item.blockedBy !== undefined && item.blockedBy !== '') marks.push(words.blockMark)
  if (item.verification !== undefined && item.verification !== null && !['pending', 'failure'].includes(String(item.verification.kind ?? ''))) {
    marks.push(words.evidenceMark)
  }
  if (marks.length === 0) return item.title
  return `${item.title}（${marks.join('，')}）`
}