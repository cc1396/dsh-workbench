/**
 * Attention items (PRD F03): the two signals the Host can prove, plus the two it may
 * infer. An item is derived from facts the snapshot already computed, so a card and
 * its alert can never disagree, and its key is stable so a replayed poll or a reload
 * never duplicates one.
 *
 * Raised:
 *   - `waiting`  the Session is waiting on an approval or a question;
 *   - `failure`  its last turn ended in an explicit error.
 * Deliberately not raised while the condition is only suspected: an inferred rule must
 * be enabled in the configuration and must carry the evidence that triggered it.
 */

const SEVERITY = { failure: 2, waiting: 1 }

/**
 * The items for one cut.
 *
 * @param rows - the public Session rows of this snapshot.
 * @param store - `{ entries }` of persisted per-key state, or undefined.
 * @param now - the snapshot clock.
 * @returns `{ items, seen }` where `seen` is true when a new key was recorded.
 */
export function alertsOf(rows, store, now) {
  const items = []
  let seen = false
  for (const row of rows) {
    for (const hit of rulesOf(row)) {
      const pointer = store?.entries?.[hit.key] ?? undefined
      if (store !== undefined && pointer === undefined) {
        store.entries[hit.key] = { triggeredAt: hit.triggeredAt, stateAt: row.state }
        seen = true
      }
      const state = stateOf(pointer, hit, now)
      items.push({
        key: hit.key,
        type: hit.type,
        severity: hit.severity,
        sessionId: row.sessionId,
        title: row.title,
        project: row.project,
        projectName: row.projectName,
        state,
        reason: hit.reason,
        triggeredAt: hit.triggeredAt,
        acknowledgedAt: pointer?.acknowledgedAt,
        snoozedUntil: pointer?.snoozedUntil,
        currentState: row.state,
      })
    }
  }
  return { items: items.sort(byUrgency), seen }
}

/** The rules that apply to one row, each with its stable key. */
function rulesOf(row) {
  const hits = []
  const at = Number(row.lastAt) || Date.now()
  if (row.state === 'waiting') {
    // One item per Session per wait kind: a second approval is the same attention need.
    hits.push({
      key: `${row.sessionId}|waiting|${row.waiting?.kind ?? 'wait'}`,
      type: 'waiting',
      severity: SEVERITY.waiting,
      triggeredAt: at,
      reason: row.waiting?.kind,
    })
  }
  if (row.state === 'failed') {
    // Keyed by the failing turn, so a later turn that fails again is a new item while a
    // reload of the same failure is not.
    hits.push({
      key: `${row.sessionId}|failure|${row.turn ?? ''}|${row.endedAt ?? at}`,
      type: 'failure',
      severity: SEVERITY.failure,
      triggeredAt: Number(row.endedAt) || at,
      reason: row.failureMessage,
    })
  }
  return hits
}

/**
 * The persisted pointer decides, so a reader's decision survives a reload.
 *
 * `solved` is terminal for this key: the condition was fixed, or the reader dismissed
 * it. A new trigger carries a new key and starts open again.
 */
function stateOf(pointer, hit, now) {
  if (pointer === undefined) return 'open'
  if (pointer.dismissedAt !== undefined && pointer.dismissedAt >= hit.triggeredAt) return 'solved'
  if (pointer.acknowledgedAt !== undefined && pointer.acknowledgedAt >= hit.triggeredAt) return 'acknowledged'
  if (pointer.snoozedUntil !== undefined && pointer.snoozedUntil > now) return 'snoozed'
  return 'open'
}

/** Failures first, then waits; newest first inside a tier, key as the stable tie-break. */
function byUrgency(left, right) {
  return (
    (SEVERITY[right.type] ?? 0) - (SEVERITY[left.type] ?? 0) ||
    (Number(right.triggeredAt) || 0) - (Number(left.triggeredAt) || 0) ||
    left.key.localeCompare(right.key)
  )
}

/** The count the badge shows: open and acknowledged items still need a look. */
export function pendingCount(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item.state === 'open' || item.state === 'acknowledged').length
}

/** A row is only "needing attention" when one of its items is unresolved. */
export function attentionOf(items) {
  const map = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    if (item.state === 'solved' || item.state === 'snoozed') continue
    map.set(item.sessionId, item)
  }
  return map
}
