/**
 * Global metadata search (PRD F07) and the read-only Git evidence behind the
 * project progress view (PRD F04 / F08).
 *
 * Two kinds of work live here, both pure:
 *
 *  - `searchSessions` ranks the Sessions the Workbench may already read by title,
 *    project, model, state, model route and Session ID. Chinese matches by
 *    substring, Latin letters case-insensitively, and the outer sort is exact,
 *    prefix, contains, recent activity, then ID as the stable tie-break.
 *  - `readGitEvidence` asks the local `git` binary for the commits one day of one
 *    project produced. It is read-only (`log`, `show --name-only`), it never reads
 *    diff content, and a directory that is not a repository simply yields no
 *    evidence instead of an error.
 *
 * Anything crossing back to the browser is a label, a count or a relative path:
 * no commit bodies, no tool arguments, no absolute paths.
 */

const DAY_MS = 86_400_000

/** Latin lowercasing; Han and other scripts compare as written. */
export function foldText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
}

/**
 * Rank the searchable Sessions against one query.
 *
 * @param rows - `[{ sessionId, title, projectId, projectName, model, provider, state, endedAt, lastAt }]`.
 * @param query - `{ text, projects, models, states, from, to, limit, offset }`; empty
 *   dimensions are ignored and several values inside one dimension widen it (union).
 * @returns `{ total, items, hasMore }` with the total matching count before paging.
 */
export function searchSessions(rows, query = {}) {
  const text = foldText(query.text).trim()
  const projects = toSet(query.projects)
  const models = toSet(query.models)
  const states = toSet(query.states)
  const from = Number.isFinite(Number(query.from)) ? Number(query.from) : undefined
  const to = Number.isFinite(Number(query.to)) ? Number(query.to) : undefined
  const limit = Math.max(1, Math.min(100, Math.round(Number(query.limit) || 20)))
  const offset = Math.max(0, Math.round(Number(query.offset) || 0))
  const matched = []

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row === null || typeof row !== 'object') continue
    if (projects.size > 0 && !projects.has(String(row.projectName ?? row.projectId ?? ''))) continue
    if (models.size > 0 && !models.has(String(row.model ?? ''))) continue
    if (states.size > 0 && !states.has(String(row.state ?? 'unknown'))) continue
    const at = Number(row.endedAt) || Number(row.lastAt) || 0
    if (from !== undefined && at < from) continue
    if (to !== undefined && at >= to) continue
    const rank = text === '' ? 4 : rankOf(row, text)
    if (rank === undefined) continue
    matched.push({ row, rank })
  }

  matched.sort(
    (left, right) => left.rank - right.rank || recentOf(right.row) - recentOf(left.row) || String(left.row.sessionId).localeCompare(String(right.row.sessionId)),
  )
  const items = matched.slice(offset, offset + limit).map((entry, index) => ({ ...entry.row, rank: entry.rank, order: offset + index }))
  return { total: matched.length, items, hasMore: offset + items.length < matched.length }
}

/** 0 exact text, 0.5 prefix, 1 contains, 2 an ID match only; `undefined` misses. */
function rankOf(row, text) {
  const title = foldText(row.title)
  if (title !== '' && title === text) return 0
  if (title !== '' && title.startsWith(text)) return 0.5
  if (title.includes(text)) return 1
  const project = foldText(row.projectName ?? '')
  const projectId = foldText(row.projectId ?? '')
  if (project.startsWith(text) || projectId.endsWith(`/${text}`) || projectId.startsWith(text)) return 1
  if (foldText(row.model).includes(text) || foldText(row.provider).includes(text)) return 1.5
  if (foldText(row.sessionId).includes(text)) return 2
  return undefined
}

function recentOf(row) {
  return Number(row.endedAt) || Number(row.lastAt) || 0
}

function toSet(values) {
  return new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value !== ''))
}

/** The read-only `git log` invocation for one day of one repository (no diff, no bodies). */
export function gitLogArgs(cwd, since, until) {
  return (
    `cd ${shellQuote(cwd)} && git log --since=${shellQuote(iso(since))} --until=${shellQuote(iso(until))} ` +
    `--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s --name-only -z --no-renames 2>/dev/null`
  )
}

function iso(ms) {
  return new Date(Number(ms) || 0).toISOString()
}

function shellQuote(value) {
  return `'${String(value).replace(/'/gu, `'\\''`)}'`
}

/**
 * Parse the output of {@link gitLogArgs}.
 *
 * With `--name-only -z` a commit starts at a line beginning with the full SHA and
 * a unit separator; its six fields end at the NUL that introduces the paths, and
 * the paths run, NUL-separated, to the line that starts the next commit. Renames
 * are off, so every entry is a plain path relative to the repository root.
 *
 * @returns `[{ sha, short, author, at, subject, files }]` newest first.
 */
export function parseGitLog(output) {
  const records = []
  // The log is parsed line by line: each record starts at a line that is exactly the
  // full SHA, and the SHA's unit separator opens the next line.
  const text = String(output ?? '').replace(/^[\r\n]+|[\r\n]+$/gu, '')
  const starts = [...text.matchAll(/(?:^|\n)([0-9a-f]{40})(?:\n\u001f|\u001f)/gu)]
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]
    const sha = start[1]
    const next = starts[index + 1]
    // One record: <sha>\x1f<short>\x1f<author>\x1f<time>\x1f<subject>\x1f then NUL-separated paths.
    const fields = text
      .slice(start.index + (start[0].startsWith('\n') ? 1 : 0) + 41, next === undefined ? text.length : next.index)
      .split('\u001f')
    if (fields.length < 5) continue
    const [short, author, atIso, subject] = [fields[0], fields[1], fields[2], fields[3]].map(clean)
    const files = fields.slice(4).join('\u001f').split('\u0000').map(clean).filter((line) => line !== '').slice(0, 200)
    const at = Date.parse(atIso)
    records.push({ sha, short, author, at: Number.isFinite(at) ? at : 0, subject, files })
  }
  return records
}

function clean(value) {
  return String(value).replace(/^[\r\n]+|[\r\n]+$/gu, '').trim()
}

/**
 * Fold one project's commits in one local day into the evidence the report uses.
 *
 * A Session can be linked to a commit only through a `sessionId` the Workbench
 * proves; the log holds no Session identity, so every commit here is project
 * activity, never a Session result (PRD table "优先采用可核验的直接关联").
 *
 * @param commits - parsed commits of the whole project.
 * @param options - `{ keyOf(sha) -> dayStart, dayStart }`: which local day each commit belongs to.
 * @returns `{ commits, files, byDay }` keyed by day start.
 */
export function foldGitEvidence(commits, { dayOf, dayStart, sessionPaths }) {
  const byDay = new Map()
  const seen = new Set()
  const out = []
  for (const commit of Array.isArray(commits) ? commits : []) {
    if (typeof commit?.sha !== 'string' || seen.has(commit.sha)) continue
    seen.add(commit.sha)
    const day = dayOf(commit.at)
    if (day === undefined || day < dayStart || day >= dayStart + DAY_MS) continue
    const files = commit.files.filter((file) => !/^\.{0,2}\//u.test(file))
    const commitValue = {
      sha: commit.sha,
      short: commit.short || commit.sha.slice(0, 7),
      author: commit.author,
      at: commit.at,
      subject: commit.subject,
      files: files.length,
      // A commit that touches a file the Session wrote is still only project activity;
      // the flag is kept so the UI can say why a link was not promoted to a result.
      touchesSessionFile: Array.isArray(sessionPaths) && files.some((file) => sessionPaths.includes(file)),
    }
    out.push(commitValue)
    const bucket = byDay.get(day) ?? { day, commits: [], files: new Set() }
    bucket.commits.push(commitValue)
    for (const file of files) bucket.files.add(file)
    byDay.set(day, bucket)
  }
  return {
    commits: out,
    byDay: [...byDay.values()].map((bucket) => ({ day: bucket.day, commits: bucket.commits, files: bucket.files.size })),
  }
}

/**
 * The repository root of a workspace: the nearest ancestor holding a `.git`
 * entry, or `undefined` when the directory is not inside a working tree.
 *
 * @param cwd - the Session's workspace path.
 * @param exists - `(path) => boolean` existence probe (injected for tests).
 */
export function repoRootOf(cwd, exists) {
  if (typeof cwd !== 'string' || cwd === '') return undefined
  let current = cwd.replace(/\/+$/u, '')
  for (let depth = 0; depth < 40 && current !== ''; depth += 1) {
    if (exists(`${current}/.git`)) return current
    const cut = current.lastIndexOf('/')
    if (cut <= 0) break
    current = current.slice(0, cut)
  }
  return undefined
}

/** Stable project identity: the repository root, else the workspace path itself. */
export function projectKeyOf(cwd, rootOf) {
  if (typeof cwd !== 'string' || cwd === '') return undefined
  return rootOf(cwd) ?? cwd
}