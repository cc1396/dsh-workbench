/**
 * The browser's side of the Host contract.
 *
 * One snapshot route, one action route. A snapshot is accepted only when its `schema`
 * matches this build: a mismatch used to render as blank panels, which is
 * indistinguishable from "no data", so it now becomes an explicit error.
 */

export const ROUTE = '/api/workbench/status'
export const ALERT_ROUTE = '/api/workbench/alerts'

/** Must equal `src/snapshot.js`'s `SCHEMA_VERSION`. */
export const SCHEMA = 3

export class SchemaError extends Error {
  constructor(got) {
    super(`snapshot schema ${got} != ${SCHEMA}`)
    this.got = got
    this.want = SCHEMA
  }
}

/** Read one snapshot. Throws on transport failure or a schema mismatch. */
export async function readSnapshot(tzOffset, signal) {
  const response = await fetch(`${ROUTE}?tzOffset=${tzOffset}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (body === null || typeof body !== 'object') throw new Error('invalid snapshot')
  if (body.schema !== SCHEMA) throw new SchemaError(body.schema)
  return body
}

/** Record a decision on one attention item. The local UI updates optimistically. */
export async function sendAlertAction(payload) {
  const response = await fetch(ALERT_ROUTE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.ok
}
