/**
 * The browser entry: register the dictionaries, the panel and its sidebar entry.
 *
 * The Host's module loader hands the factory a `require`, and the panel modules are
 * plain relative ESM imports, so this file only wires the two together.
 */

import { NS, en, zh } from './text.js'
import { setLanguage } from './format.js'
import { createIcon, createPanel } from './panel.js'

export const inject = ['slots', 'locale']

const PANEL_ID = 'workbench'

/**
 * Register the panel.
 *
 * @param ctx - browser services: slots, locale, and the workspace used to open a Session.
 * @param React - the runtime's React.
 */
export function applyWith(ctx, React) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'dsh-workbench: dictionaries',
  )

  const t = ctx.locale.bind(NS)
  // The visible dictionary is the source of truth for formatting, not the browser locale.
  setLanguage(t('panel') === zh.panel ? 'zh' : 'en')

  const openSession = (sessionId) => {
    const workspace = ctx.get('uiWorkspace')
    if (workspace !== undefined && typeof workspace.openSession === 'function') {
      workspace.openSession(sessionId)
      return
    }
    const sessions = ctx.get('sessions')
    if (sessions !== undefined && typeof sessions.open === 'function') sessions.open(sessionId)
  }

  const WorkbenchPage = createPanel(React)
  const WorkbenchIcon = createIcon(React)

  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ openSession }) }, WorkbenchPage),
  )
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 20, locale: NS, label: () => t('panel') }, WorkbenchIcon),
  )
}
