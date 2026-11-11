/**
 * The workbench panel: today's numbers first, then what needs a decision, then what is
 * running, then what ended.
 *
 * One snapshot drives every section, so a badge and its card can never disagree. Each
 * section degrades on its own: an unreadable catalog leaves the numbers at zero and
 * says so in the capability strip rather than hiding the panel.
 */

import { SCHEMA, SchemaError, readSnapshot, sendAlertAction } from './api.js'
import { dateLabel, moneyOf, rateOf, relativeTime, tokensOf, utcOffsetLabel, tzOffsetSeconds } from './format.js'
import { useNow, useSnapshot } from './hooks.js'
import { Empty, Glyph, Metric, Panel, SessionRow, StateBadge, stateOf } from './components.js'
import { AlertDetail, AlertItem } from './alerts.js'
import { CSS } from './styles.js'

export function createPanel(React) {
  const h = React.createElement

  /**
   * @param props - slot props: `t`, `openSession`, plus the narrow-layout flag.
   */
  function WorkbenchPage({ t, openSession }) {
    const tz = tzOffsetSeconds()
    const [state, refresh] = useSnapshot(React, readSnapshot, tz)
    const now = useNow(React)
    const [detail, setDetail] = React.useState(undefined)
    const [marks, setMarks] = React.useState({})
    const data = state.data
    const loading = state.status === 'loading' && data === undefined

    if (loading) {
      return h('section', { className: 'wb-page', 'aria-label': t('title') }, h('style', null, CSS), h('p', { className: 'wb-stub', role: 'status' }, t('loading')))
    }
    if (state.status === 'error') {
      const schema = state.error instanceof SchemaError
      return h(
        'section',
        { className: 'wb-page', 'aria-label': t('title') },
        h('style', null, CSS),
        h(
          'div',
          { className: 'wb-stub', role: 'alert' },
          h('p', { className: 'wb-stub-title' }, t('error.title')),
          h('p', null, schema ? t('error.schema', { got: String(state.error.got), want: String(SCHEMA) }) : t('error.body')),
          h('button', { type: 'button', className: 'wb-mini', onClick: refresh }, t('error.retry')),
        ),
      )
    }

    // Local marks let a click take effect before the Host answers; the next snapshot wins.
    const alerts = (data.alerts ?? []).map((item) => (marks[item.key] === undefined ? item : { ...item, state: marks[item.key] }))
    const pending = alerts.filter((item) => item.state === 'open' || item.state === 'acknowledged')

    const act = async (item, action) => {
      const next = action === 'ack' ? 'acknowledged' : action === 'dismiss' ? 'solved' : 'snoozed'
      setMarks((previous) => ({ ...previous, [item.key]: next }))
      await sendAlertAction({ key: item.key, action: action === 'dismiss' ? 'solve' : action, triggeredAt: item.triggeredAt, state: item.currentState, minutes: 30 }).catch(() => {})
      refresh()
    }

    if (detail !== undefined) {
      const item = alerts.find((entry) => entry.key === detail)
      return h(
        'section',
        { className: 'wb-page', 'aria-label': t('title') },
        h('style', null, CSS),
        item === undefined
          ? h(Empty, { h, text: t('attention.empty') })
          : h(AlertDetail, { h, t, item, now, onBack: () => setDetail(undefined), onAction: act, openSession }),
      )
    }

    const overview = data.overview ?? {}
    const zeroReason = overview.amount === 0 && overview.sessions > 0
      ? t('today.zero', { count: overview.sessions, reason: overview.unpricedTokens > 0 ? t('today.zero.noPrice') : t('today.zero.noUsage') })
      : undefined
    const coverage = overview.coverage === undefined || overview.coverage === null
      ? t('today.noSample')
      : t('today.coverage', { percent: Math.round(Number(overview.coverage) * 100) })

    return h(
      'section',
      { className: 'wb-page', 'aria-label': t('title') },
      h('style', null, CSS),
      h(
        'div',
        { className: 'wb-scroll' },
        h(
          'div',
          { className: 'wb-content' },
          h(
            'header',
            { className: 'wb-head' },
            h(
              'div',
              null,
              h('span', { className: 'wb-eyebrow' }, 'LOCAL / ', data.overview?.dayKey ?? ''),
              h('h1', { className: 'wb-h1' }, t('today.title')),
              h('p', { className: 'wb-sub' }, t('today.subtitle', { date: dateLabel(data.generatedAt), zone: utcOffsetLabel(), time: new Date(data.generatedAt).toLocaleTimeString() })),
            ),
            h(
              'div',
              { className: 'wb-head-side' },
              h('span', { className: 'wb-fresh', 'data-state': state.status }, h('i', { className: 'wb-dot', 'aria-hidden': 'true' }), t(state.status === 'ready' ? 'fresh.live' : state.status === 'cached' ? 'fresh.cached' : 'fresh.stale')),
              h('button', { type: 'button', className: 'wb-icon', onClick: refresh, 'aria-label': t('refresh') }, h(Glyph, { h, name: 'refresh', size: 14 })),
            ),
          ),
          h(
            'div',
            { className: 'wb-metrics' },
            h(Metric, { h, label: t('today.cost'), value: moneyOf(overview.amount), detail: zeroReason ?? `${coverage} · ${t('today.tokens', { tokens: tokensOf(overview.tokens) })}` }),
            h(Metric, { h, label: t('today.running'), value: String(overview.running ?? 0), detail: t('today.runningDetail', { waiting: overview.waiting ?? 0 }) }),
            h(Metric, { h, label: t('today.attention'), value: String(pending.length), tone: pending.length > 0 ? 'alert' : 'default', detail: t('today.attentionDetail', { failed: overview.failed ?? 0, waiting: overview.waiting ?? 0 }), onClick: undefined }),
            h(Metric, {
              h,
              label: t('today.speed'),
              value: overview.speed === undefined ? t('today.speedNone') : t('today.speedValue', { rate: rateOf(overview.speed.p50) }),
              detail: overview.speed === undefined ? '—' : t('today.speedDetail', { count: overview.speed.samples }),
            }),
          ),
          h(
            'div',
            { className: 'wb-grid' },
            h(
              'div',
              { className: 'wb-main' },
              h(
                Panel,
                { h, title: t('running.title'), count: String((data.running ?? []).length) },
                (data.running ?? []).length === 0
                  ? h(Empty, { h, text: t('running.empty') })
                  : h('ul', { className: 'wb-rows' }, ...data.running.map((row) => h(SessionRow, { key: row.sessionId, h, t, row, now, onOpen: openSession }))),
              ),
              h(
                Panel,
                { h, title: t('recent.title'), count: undefined, action: h('span', { className: 'wb-hint' }, t('recent.hint')) },
                (data.recent ?? []).length === 0
                  ? h(Empty, { h, text: t('recent.empty') })
                  : h('ul', { className: 'wb-rows' }, ...data.recent.map((row) => h(SessionRow, { key: row.sessionId, h, t, row, now, onOpen: openSession }))),
              ),
            ),
            h(
              'aside',
              { className: 'wb-aside' },
              h(
                Panel,
                { h, title: t('attention.title'), count: String(pending.length), action: pending.length > 3 ? h('span', { className: 'wb-hint' }, t('attention.more', { count: pending.length - 3 })) : null },
                pending.length === 0
                  ? h(Empty, { h, text: t('attention.empty') })
                  : h('ul', { className: 'wb-alerts' }, ...pending.slice(0, 3).map((item) => h(AlertItem, { key: item.key, h, t, item, now, onOpen: () => openSession(item.sessionId), onAction: act, onDetail: () => setDetail(item.key) }))),
              ),
              h(Capabilities, { h, t, capabilities: data.capabilities ?? {} }),
            ),
          ),
          h('footer', { className: 'wb-foot' }, h('span', null, t('foot')), h('span', null, t('foot.synced', { time: new Date(data.generatedAt).toLocaleTimeString() }))),
        ),
      ),
    )
  }

  /** What the Host could and could not answer: a silent zero is worse than a reason. */
  function Capabilities({ h, t, capabilities }) {
    const rows = [
      ['cap.catalog', capabilities.catalog],
      ['cap.log', capabilities.log],
      ['cap.projections', capabilities.projections],
      ['cap.agents', capabilities.agents],
    ]
    return h(
      'section',
      { className: 'wb-panel wb-caps' },
      h('h2', { className: 'wb-panel-title' }, t('cap.title')),
      h(
        'ul',
        { className: 'wb-caps-list' },
        ...rows.map(([key, value]) =>
          h(
            'li',
            { key, 'data-tone': value === 'unavailable' ? 'warn' : 'ok' },
            h(Glyph, { h, name: value === 'unavailable' ? 'stuck' : 'check', size: 12 }),
            h('span', null, t(key)),
            h('span', { className: 'wb-caps-value' }, value === 'unavailable' ? t('cap.missing') : String(value)),
          ),
        ),
      ),
    )
  }

  return WorkbenchPage
}

/** The sidebar entry. */
export function createIcon(React) {
  const h = React.createElement
  return function WorkbenchIcon() {
    return h(
      'svg',
      { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' },
      h('rect', { x: 2, y: 2, width: 5, height: 12, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('rect', { x: 9, y: 2, width: 5, height: 5, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('rect', { x: 9, y: 9, width: 5, height: 5, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
    )
  }
}

export { stateOf, StateBadge }
