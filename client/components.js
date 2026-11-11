/**
 * The small, reusable pieces: a glyph, a state badge, a metric card, an empty state.
 *
 * Every state carries an icon, a colour and a word, so colour is never the only signal
 * (PRD UX01) and a reader who cannot see the tint still reads the state.
 */

import { moneyOf, tokensOf, relativeTime } from './format.js'

const GLYPHS = {
  waiting: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5v3.4l2.1 1.3',
  running: 'M3.2 8h2.1M10.7 8h2.1M5.6 4.4l4.8 3.6-4.8 3.6z',
  stuck: 'M8 2.4 14 13H2zM8 6.2v3.2M8 11.2v.2',
  failed: 'M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8',
  ended: 'M3.8 8.4l2.7 2.7 5.7-5.9',
  cancelled: 'M4.6 8h6.8',
  unknown: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM6.4 6.4a1.7 1.7 0 1 1 2.2 1.6c-.5.2-.6.7-.6 1.1M8 11.4v.2',
  clock: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5v3.4l2.1 1.3',
  refresh: 'M13.4 8a5.4 5.4 0 1 1-1.6-3.8M13.4 2.6v3.1h-3.1',
  search: 'M7.2 2.6a4.6 4.6 0 1 0 2.9 8.2l3.4 3.4',
  open: 'M6.2 3.4h6.4v6.4M12.6 3.4 4.2 11.8',
  folder: 'M2.6 4.4h4l1.4 1.6h5.4v7.2H2.6z',
  calendar: 'M3.2 5.2h9.6v8.4H3.2zM5.6 3.2v3.2M10.4 3.2v3.2M3.2 7.6h9.6',
  check: 'M3.8 8.4l2.7 2.7 5.7-5.9',
}

/** One inline SVG glyph. */
export function Glyph({ h, name, size = 14 }) {
  return h(
    'svg',
    { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      d: GLYPHS[name] ?? GLYPHS.unknown,
      fill: name === 'running' ? 'currentColor' : 'none',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** The state a row is shown in, and its tone. */
export function stateOf(row) {
  const name = String(row?.state ?? 'unknown')
  return name in GLYPHS ? name : 'unknown'
}

export function toneOf(state) {
  if (state === 'failed') return 'error'
  if (state === 'waiting' || state === 'stuck') return 'warn'
  if (state === 'running') return 'ok'
  if (state === 'ended') return 'idle'
  return 'muted'
}

/** Icon + colour + word, never colour alone. */
export function StateBadge({ h, t, state }) {
  return h(
    'span',
    { className: 'wb-badge', 'data-tone': toneOf(state) },
    h(Glyph, { h, name: state, size: 12 }),
    h('span', null, t(`state.${state}`)),
  )
}

/** A metric card: label, value, and one line saying what the value means. */
export function Metric({ h, label, value, detail, tone, onClick }) {
  const body = [
    h('span', { className: 'wb-metric-label', key: 'l' }, label),
    h('span', { className: 'wb-metric-value', key: 'v', 'data-tone': tone ?? 'default' }, value),
    detail === undefined ? null : h('span', { className: 'wb-metric-detail', key: 'd' }, detail),
  ]
  return onClick === undefined
    ? h('article', { className: 'wb-metric' }, ...body)
    : h('button', { type: 'button', className: 'wb-metric', onClick, 'aria-label': `${label}: ${value}` }, ...body)
}

/** A quiet panel with a title, an optional count and its body. */
export function Panel({ h, title, count, action, children, className }) {
  return h(
    'section',
    { className: `wb-panel ${className ?? ''}`.trim(), 'aria-label': title },
    h(
      'header',
      { className: 'wb-panel-head' },
      h('h2', { className: 'wb-panel-title' }, title),
      count === undefined ? null : h('span', { className: 'wb-count' }, count),
      h('span', { className: 'wb-fill' }),
      action ?? null,
    ),
    children,
  )
}

/** A sentence in place of content, with an optional retry. */
export function Empty({ h, text, onRetry, retryLabel }) {
  return h(
    'div',
    { className: 'wb-empty' },
    h('p', null, text),
    onRetry === undefined ? null : h('button', { type: 'button', className: 'wb-mini', onClick: onRetry }, retryLabel),
  )
}

/** A row of a wide table, or a card on a narrow screen. */
export function SessionRow({ h, t, row, now, onOpen, showProject = true }) {
  const state = stateOf(row)
  const title = row.title === undefined || row.title === '' ? t('field.untitled') : row.title
  const detail = detailOf(t, row, now)
  return h(
    'li',
    { className: 'wb-row', 'data-tone': toneOf(state) },
    h(
      'button',
      { type: 'button', className: 'wb-row-main', onClick: () => onOpen(row.sessionId), 'aria-label': `${title} · ${t(`state.${state}`)}` },
      h(
        'span',
        { className: 'wb-row-body' },
        h('span', { className: 'wb-row-title' }, title),
        showProject && row.projectName !== undefined && row.projectName !== '' ? h('span', { className: 'wb-row-project' }, row.projectName) : null,
        h('span', { className: 'wb-row-detail' }, detail),
      ),
      h(StateBadge, { h, t, state }),
      row.today !== undefined && row.today.amount > 0 ? h('span', { className: 'wb-row-amount' }, moneyOf(row.today.amount)) : null,
      h('span', { className: 'wb-row-open', 'aria-hidden': 'true' }, h(Glyph, { h, name: 'open', size: 12 })),
    ),
  )
}

/** One line explaining why a row looks the way it does. */
function detailOf(t, row, now) {
  if (row.state === 'waiting') return `${t(row.waiting?.kind === 'question' ? 'wait.question' : 'wait.approval')} · ${relativeTime(t, row.lastAt, now)}`
  if (row.state === 'failed') return `${t('state.failed')} · ${relativeTime(t, row.endedAt ?? row.lastAt, now)}`
  if (row.turns > 0) return `${t('field.turns', { count: row.turns })} · ${tokensOf(row.tokens && row.tokens.output)} tok · ${relativeTime(t, row.lastAt, now)}`
  return relativeTime(t, row.lastAt, now)
}
