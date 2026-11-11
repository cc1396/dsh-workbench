/**
 * Attention items: one compact row for attention, one expanded view for evidence.
 *
 * The compact row answers "what is wrong and where"; the expanded view adds the
 * trigger, the item id and the reader's own decision. Acknowledging only marks the
 * item; handling the wait still happens in the original Session.
 */

import { clockOf, relativeTime } from './format.js'
import { Glyph, StateBadge } from './components.js'

/** One item in a list. */
export function AlertItem({ h, t, item, now, onOpen, onAction }) {
  const title = item.title === undefined || item.title === '' ? t('field.untitled') : item.title
  const reason = item.type === 'failure' ? t('state.failed') : t(item.reason === 'question' ? 'wait.question' : 'wait.approval')
  return h(
    'li',
    { className: 'wb-alert', 'data-tone': item.type === 'failure' ? 'error' : 'warn' },
    h(
      'button',
      { type: 'button', className: 'wb-alert-body', onClick: onOpen, 'aria-label': `${title} · ${reason}` },
      h('span', { className: 'wb-alert-title' }, `${reason} · ${title}`),
      h('span', { className: 'wb-alert-meta' }, `${item.projectName ?? ''} · ${relativeTime(t, item.triggeredAt, now)}`),
    ),
    h(
      'div',
      { className: 'wb-alert-actions' },
      h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'ack') }, t('attention.ack')),
      h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'snooze') }, t('attention.snooze')),
      h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'dismiss'), 'aria-label': t('attention.dismissAria') }, t('attention.dismiss')),
    ),
  )
}

/** The expanded view: what triggered it, and the way into the Session. */
export function AlertDetail({ h, t, item, now, onBack, onAction, openSession }) {
  const facts = [
    [t('field.session'), item.title ?? t('field.untitled')],
    [t('field.project'), item.projectName ?? t('field.none')],
    [t('field.state'), t(`state.${item.currentState ?? 'unknown'}`)],
    [t('attention.reason'), item.reason ?? t('attention.foot')],
    [t('attention.triggered'), `${clockOf(item.triggeredAt)} · ${relativeTime(t, item.triggeredAt, now)}`],
    [t('attention.key'), item.key],
  ]
  return h(
    React.Fragment,
    null,
    h('div', { className: 'wb-detailbar' }, h('button', { type: 'button', className: 'wb-mini', onClick: onBack }, `← ${t('attention.title')}`)),
    h(
      'section',
      { className: 'wb-panel' },
      h('h2', { className: 'wb-panel-title' }, item.title ?? t('field.untitled')),
      h('dl', { className: 'wb-facts' }, ...facts.map(([label, value]) => h('div', { key: label, className: 'wb-fact', children: [h('dt', { key: 't' }, label), h('dd', { key: 'd' }, String(value ?? t('field.none')))] }))),
      h(
        'div',
        { className: 'wb-detail-actions' },
        h('button', { type: 'button', className: 'wb-mini wb-mini-primary', onClick: () => openSession(item.sessionId) }, h(Glyph, { h, name: 'open', size: 12 }), t('attention.open')),
        h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'ack') }, t('attention.ack')),
        h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'snooze') }, t('attention.snooze')),
        h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'dismiss') }, t('attention.dismiss')),
      ),
      h('p', { className: 'wb-hint' }, t('attention.foot')),
    ),
  )
}

export { StateBadge }
