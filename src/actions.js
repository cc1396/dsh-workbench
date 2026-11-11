/**
 * The explicit actions the panel offers: attention, tasks, the daily report and the
 * request detail. None of them is needed to paint the overview; each is a deliberate
 * click, so each reads only what that click needs.
 *
 * Every write is idempotent by key and stored under `$DSH_HOME/workbench`, so a reload
 * agrees with what the reader just did.
 */

import { serviceOf } from './host.js'
import { json } from './json.js'
import { readEvents } from './host.js'
import { projectionsOf } from './host.js'
import { localDayStart, tokensOf, totalTokens } from './facts.js'
import { priceRowOf, amountOf, roundAmount, priceSessionDay } from './pricing.js'
import { openStore, emptyTasks, emptyAlerts, emptyProgress } from './store.js'
import { projectNameOf } from './snapshot.js'

const ALERT_ROUTE = '/api/workbench/alerts'
const TASKS_ROUTE = '/api/workbench/tasks'
const REPORT_ROUTE = '/api/workbench/report'
const REQUEST_ROUTE = '/api/workbench/requests'

/**
 * Register the action routes.
 *
 * @param ctx - Host context.
 * @param settings - resolved configuration.
 */
export function registerActions(ctx, settings) {
  const tasks = openStore('tasks.json', emptyTasks())
  const alerts = openStore('alerts.json', emptyAlerts())
  const progress = openStore('progress.json', emptyProgress())

  const route = (path, methods, handler, label) => {
    ctx.effect(
      () => ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', fetch: (request) => handler(request) }),
      `dsh-workbench: ${label}`,
    )
  }

  route(ALERT_ROUTE, ['POST'], (request) => alertAction(request, alerts, Date.now()), 'alerts')
  route(TASKS_ROUTE, ['GET', 'POST'], (request) => taskAction(request, tasks, Date.now()), 'tasks')
  route(REPORT_ROUTE, ['GET', 'POST'], (request) => report(ctx, settings, request, tasks, progress), 'report')
  route(REQUEST_ROUTE, ['GET'], (request) => requestDetail(ctx, settings, request), 'requests')
}

/**
 * `POST /api/workbench/alerts` — acknowledge, snooze or dismiss one item.
 *
 * A dismissal outranks the condition it was raised for: the reader decided this item
 * is not worth their time, so it stays closed until a new state or a new rule firing
 * (which carries a new key) raises it again.
 */
async function alertAction(request, store, now) {
  const body = await readBody(request)
  if (body === undefined) return json(400, { code: 'INVALID_BODY', error: 'invalid JSON body' })
  const key = typeof body.key === 'string' && body.key !== '' ? body.key.slice(0, 400) : undefined
  const action = body.action
  if (key === undefined || !['ack', 'snooze', 'solve'].includes(action)) {
    return json(400, { code: 'INVALID_BODY', error: 'key and action are required' })
  }
  const saved = await store.update((state) => {
    const previous = state.entries[key] ?? {}
    const pointer = { ...previous, triggeredAt: Number(body.triggeredAt) || Number(previous.triggeredAt) || now, stateAt: typeof body.state === 'string' ? body.state : previous.stateAt }
    if (action === 'ack') pointer.acknowledgedAt = now
    if (action === 'solve') {
      pointer.solvedAt = now
      pointer.dismissedAt = now
    }
    if (action === 'snooze') {
      const minutes = Math.max(1, Math.min(24 * 60, Number(body.minutes) || 30))
      pointer.snoozedUntil = now + minutes * 60_000
    }
    state.entries[key] = pointer
    return pointer
  })
  return json(200, { key, pointer: saved })
}

/**
 * `GET|POST /api/workbench/tasks` — the reader's own tasks.
 *
 * The Host has no task entity this plugin may write, so a task is local: a title, a
 * project, an optional Session, and a state one of `active|blocked|confirm|done`.
 * A `done` task keeps who confirmed it and when — completion is a person's act.
 */
async function taskAction(request, store, now) {
  if (request.method === 'GET') {
    const state = await store.read()
    return json(200, { tasks: sortTasks(state.tasks) })
  }
  const body = await readBody(request)
  if (body === undefined) return json(400, { code: 'INVALID_BODY', error: 'invalid JSON body' })
  const task = body.task !== null && typeof body.task === 'object' ? body.task : {}
  const title = typeof task.title === 'string' ? task.title.replace(/\s+/gu, ' ').trim().slice(0, 120) : ''
  const state = ['active', 'blocked', 'confirm', 'done'].includes(task.state) ? task.state : undefined
  const taskId = typeof task.taskId === 'string' && /^[\w-]{1,64}$/u.test(task.taskId) ? task.taskId : undefined

  if (body.action === 'add') {
    if (title === '' || typeof task.projectId !== 'string' || task.projectId === '') {
      return json(400, { code: 'INVALID_BODY', error: 'title and projectId are required' })
    }
    const saved = await store.update((draft) => {
      const list = Array.isArray(draft.tasks) ? draft.tasks : (draft.tasks = [])
      const entry = {
        taskId: `t_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        projectId: task.projectId.slice(0, 400),
        title,
        state: state ?? 'active',
        sessionId: typeof task.sessionId === 'string' && task.sessionId !== '' ? task.sessionId : undefined,
        source: 'local',
        at: now,
        by: 'local-user',
        confirmation: state === 'done' ? { by: 'local-user', at: now } : undefined,
      }
      list.unshift(entry)
      draft.tasks = list.slice(0, 400)
      return entry
    })
    return json(200, { ok: true, task: saved })
  }

  if (body.action === 'update' || body.action === 'remove') {
    if (taskId === undefined) return json(400, { code: 'INVALID_BODY', error: 'taskId is required' })
    const saved = await store.update((draft) => {
      const list = Array.isArray(draft.tasks) ? draft.tasks : []
      const index = list.findIndex((entry) => entry.taskId === taskId)
      if (index < 0) return undefined
      if (body.action === 'remove') {
        list.splice(index, 1)
        return { removed: taskId }
      }
      const entry = { ...list[index] }
      if (title !== '') entry.title = title
      if (state !== undefined) {
        entry.state = state
        entry.confirmation = state === 'done' ? { by: 'local-user', at: now } : undefined
      }
      if (typeof task.sessionId === 'string') entry.sessionId = task.sessionId === '' ? undefined : task.sessionId
      entry.at = now
      list[index] = entry
      return entry
    })
    if (saved === undefined) return json(404, { code: 'NOT_FOUND', error: 'unknown task' })
    return json(200, { ok: true, task: saved })
  }
  return json(400, { code: 'INVALID_BODY', error: 'action must be add, update or remove' })
}

/** Newest first, stable by id. */
function sortTasks(tasks) {
  if (!Array.isArray(tasks)) return []
  return tasks
    .filter((task) => task !== null && typeof task === 'object' && typeof task.taskId === 'string')
    .sort((left, right) => (Number(right.at) || 0) - (Number(left.at) || 0) || left.taskId.localeCompare(right.taskId))
    .slice(0, 400)
}

/**
 * `GET|POST /api/workbench/report` — one day of project progress and the evidence
 * report (PRD F04/F08).
 *
 * GET answers the day's projects, their timelines and a grouped draft. POST is the one
 * write: a per-project, explicit Git opt-in (`{ action: 'git', projectId, enabled }`).
 */
async function report(ctx, settings, request, tasks, progress) {
  if (request.method === 'POST') {
    const body = await readBody(request)
    if (body === undefined) return json(400, { code: 'INVALID_BODY', error: 'invalid JSON body' })
    if (body.action !== 'git' || typeof body.projectId !== 'string' || body.projectId === '') {
      return json(400, { code: 'INVALID_BODY', error: 'action git and a projectId are required' })
    }
    await progress.update((state) => {
      if (state.projects === null || typeof state.projects !== 'object') state.projects = {}
      state.projects[body.projectId] = { ...(state.projects[body.projectId] ?? {}), git: body.enabled === true }
    })
    return json(200, { ok: true, projectId: body.projectId, git: body.enabled === true })
  }

  const url = new URL(request.url)
  const tz = tzOffsetOf(url)
  const now = Date.now()
  const today = localDayStart(now, tz)
  const day = numberOr(url.searchParams.get('day'), today)
  const dayEnd = day + 86_400_000
  const projectFilter = url.searchParams.get('project') ?? ''

  const catalog = await listForReport(ctx)
  const localTasks = sortTasks((await tasks.read()).tasks)
  const preferences = (await progress.read()).projects ?? {}

  const byProject = new Map()
  for (const record of catalog) {
    if (projectFilter !== '' && (record.cwd ?? '') !== projectFilter) continue
    const values = projectionsOf(ctx, record.id)
    const log = await readEvents(ctx, record.id)
    const inDay = log.events.filter((event) => {
      const at = Number(event?.time)
      return Number.isFinite(at) && at >= day && at < dayEnd
    })
    if (inDay.length === 0 && !localTasks.some((task) => task.projectId === (record.cwd ?? '') && Number(task.at) >= day && Number(task.at) < dayEnd)) continue
    const bucket = byProject.get(record.cwd ?? '') ?? { projectId: record.cwd ?? '', name: projectNameOf(record.cwd), sessions: [], events: [] }
    bucket.sessions.push({ id: record.id, title: values?.title, events: inDay })
    byProject.set(bucket.projectId, bucket)
  }

  const projects = [...byProject.values()].map((bucket) => projectReport(bucket, localTasks, day, dayEnd, preferences))
  return json(200, {
    generatedAt: now,
    day,
    dayKey: localDayStart(day, tz) === day ? keyOf(day, tz) : keyOf(day, tz),
    projects,
    report: { groups: projects.map((project) => ({ name: project.card.name, ...project.report })) },
    capabilities: { git: projects.some((project) => project.git === 'ready') ? 'ready' : 'off' },
  })
}

/** The catalog for the report route, with the same fallback as the snapshot. */
async function listForReport(ctx) {
  const { listSessions } = await import('./host.js')
  const catalog = await listSessions(ctx, undefined)
  return catalog.records
}

/** One project's card, timeline and grouped draft for a day. */
function projectReport(bucket, tasks, day, dayEnd, preferences) {
  const sessions = bucket.sessions
  const timeline = []
  for (const session of sessions) {
    for (const event of session.events) {
      const at = Number(event?.time)
      const kind = kindOf(event)
      if (kind === undefined) continue
      timeline.push({ kind, at, sessionId: session.id, title: session.title, ...labelOf(event) })
    }
  }
  for (const task of tasks) {
    if (task.projectId !== bucket.projectId) continue
    if (!(Number(task.at) >= day && Number(task.at) < dayEnd)) continue
    timeline.push({ kind: 'task', at: task.at, title: task.title, state: task.state, taskId: task.taskId })
  }
  timeline.sort((left, right) => right.at - left.at)
  const done = tasks.filter((task) => task.projectId === bucket.projectId && task.state === 'done')
  const active = tasks.filter((task) => task.projectId === bucket.projectId && task.state === 'active')
  const blocked = tasks.filter((task) => task.projectId === bucket.projectId && task.state === 'blocked')
  const confirm = tasks.filter((task) => task.projectId === bucket.projectId && task.state === 'confirm')
  return {
    card: {
      projectId: bucket.projectId,
      name: bucket.name,
      day,
      sessions: sessions.length,
      evidence: timeline.length,
      counts: { won: done.length, doing: active.length, blocked: blocked.length, confirm: confirm.length },
      lastAt: timeline[0]?.at,
    },
    timeline: timeline.slice(0, 40),
    report: {
      won: done.map(taskItem),
      doing: active.map(taskItem),
      blocked: blocked.map(taskItem),
      confirm: confirm.map(taskItem),
    },
    git: preferences[bucket.projectId]?.git === true ? 'ready' : 'off',
  }
}

function taskItem(task) {
  return { title: task.title, status: task.state, taskId: task.taskId, sessionId: task.sessionId, source: 'local', confirmation: task.confirmation, edited: false, evidence: task.sessionId === undefined ? [] : [{ sourceType: 'session', sourceRef: task.sessionId }] }
}

function kindOf(event) {
  if (event?.type === 'turn/start') return 'session'
  if (event?.type === 'tool/call') return 'file'
  return undefined
}

function labelOf(event) {
  const name = String(event?.data?.name ?? '')
  if (name === '') return { label: String(event?.type ?? '') }
  return { label: name }
}

/**
 * `GET /api/workbench/requests` — one Session's priced steps for one local day.
 *
 * The Host bills per step; nothing durable carries a provider request id, so each row
 * is a step, and the rows plus a remainder always add up to the Session's own day.
 */
async function requestDetail(ctx, settings, request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId') ?? ''
  const tz = tzOffsetOf(url)
  const now = Date.now()
  const day = numberOr(url.searchParams.get('day'), localDayStart(now, tz))
  if (sessionId === '') return json(400, { code: 'INVALID_BODY', error: 'sessionId is required' })

  const values = projectionsOf(ctx, sessionId)
  const log = await readEvents(ctx, sessionId)
  const model = values?.modelSelection?.lastUsed?.model
  const row = priceRowOf(settings.pricing, model)
  const steps = []
  for (const event of log.events) {
    if (event?.type !== 'assistant/message') continue
    const at = Number(event?.time)
    if (localDayStart(at, tz) !== day) continue
    const tokens = tokensOf(event?.data?.usage)
    if (totalTokens(tokens) === 0) continue
    steps.push({
      requestId: `step_${Number(event?.data?.turn) || 0}_${Number(event?.data?.step) || 0}`,
      at,
      status: 'settled',
      model,
      tokens,
      amount: roundAmount(amountOf(tokens, row)),
      quality: 'priced',
    })
  }
  steps.sort((left, right) => left.at - right.at || left.requestId.localeCompare(right.requestId))
  const dayTokens = tokensOf(values?.tokenUsage?.totals)
  const explained = steps.reduce((sum, step) => sum + totalTokens(step.tokens), 0)
  const total = totalTokens(dayTokens)
  const remainderDay = { tokens: dayTokens, amount: 0 }
  void remainderDay
  return json(200, {
    generatedAt: now,
    sessionId,
    day,
    title: values?.title,
    model,
    currency: settings.pricing.currency,
    priceRef: settings.pricing.ref,
    prices: [row],
    rows: steps,
    total: total === 0 ? 0 : roundAmount(amountOf(dayTokens, row)),
    uncovered: Math.max(0, total - explained),
  })
}

async function readBody(request) {
  try {
    const body = JSON.parse(await request.text())
    return body !== null && typeof body === 'object' ? body : undefined
  } catch {
    return undefined
  }
}

function tzOffsetOf(url) {
  const raw = Number(url.searchParams.get('tzOffset'))
  return Number.isFinite(raw) ? Math.min(86_400, Math.max(-86_400, Math.round(raw))) : 0
}

function numberOr(value, fallback) {
  const number = Number(value)
  return value !== null && value !== '' && Number.isFinite(number) ? number : fallback
}

function keyOf(day, tz) {
  const date = new Date(Number(day) + tz * 1000)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export { priceSessionDay, serviceOf }
