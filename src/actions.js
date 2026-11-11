/**
 * The one action this version of the workbench offers: acknowledging an attention
 * item. Everything else the panel shows is read-only, so a single write keeps the
 * Host half small enough to reason about.
 *
 * The write is idempotent by key and stored under `$DSH_HOME/workbench`, so a reload
 * agrees with what the reader just did.
 */

import { json } from './json.js'
import { openStore, emptyAlerts } from './store.js'

const ALERT_ROUTE = '/api/workbench/alerts'

/**
 * Register the attention route.
 *
 * @param ctx - Host context.
 * @param attention - the shared `{ entries }` object the snapshot also reads.
 */
export function registerActions(ctx, attention) {
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ALERT_ROUTE,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => alertAction(request, attention, Date.now()),
      }),
    'dsh-workbench: alerts',
  )
}

/** Open the persisted attention store, shared with the snapshot. */
export function openAttention() {
  return openStore('alerts.json', emptyAlerts())
}

/**
 * `POST /api/workbench/alerts` — acknowledge, snooze or dismiss one item.
 *
 * A dismissal outranks the condition it was raised for: the reader decided this item
 * is not worth their time, so it stays closed until a new state or a newly failed turn
 * (which carries a new key) raises it again.
 */
async function alertAction(request, attention, now) {
  let body
  try {
    body = JSON.parse(await request.text())
  } catch {
    return json(400, { code: 'INVALID_BODY', error: 'invalid JSON body' })
  }
  const key = typeof body?.key === 'string' && body.key !== '' ? body.key.slice(0, 400) : undefined
  const action = body?.action
  if (key === undefined || !['ack', 'snooze', 'solve'].includes(action)) {
    return json(400, { code: 'INVALID_BODY', error: 'key and action are required' })
  }
  const previous = attention.entries[key] ?? {}
  const pointer = {
    ...previous,
    triggeredAt: Number(body.triggeredAt) || Number(previous.triggeredAt) || now,
    stateAt: typeof body.state === 'string' ? body.state : previous.stateAt,
  }
  if (action === 'ack') pointer.acknowledgedAt = now
  if (action === 'solve') {
    pointer.solvedAt = now
    pointer.dismissedAt = now
  }
  if (action === 'snooze') {
    const minutes = Math.max(1, Math.min(24 * 60, Number(body.minutes) || 30))
    pointer.snoozedUntil = now + minutes * 60_000
  }
  attention.entries[key] = pointer
  await attention.save()
  return json(200, { key, pointer })
}
