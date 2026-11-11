/**
 * Drive the real panel in Chrome: click, acknowledge, dismiss, and check the layout at
 * a narrow width. These are the behaviours a Node test cannot reach.
 *
 *   node qa/interact.mjs
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './cdp.mjs'
import { serve } from './serve.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  → ${JSON.stringify(detail)}`}`)
  if (!ok) failures.push(name)
}

writeFileSync(join(root, 'qa/.snapshot.json'), readFileSync(join(root, 'qa/scenarios/v3.json'), 'utf8'))
writeFileSync(join(root, 'qa/.page.html'), readFileSync(join(here, 'index.html'), 'utf8').replace('__THEME__', 'dark'))

const { server, port } = await serve(0)
const client = await launch(join(root, 'qa', `.chrome-${process.pid}`), { width: 1440, height: 1000 })
const errors = []
client.onEvent((message) => {
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.exception?.description ?? 'exception')
})
try {
  await client.goto(`http://127.0.0.1:${port}/qa/.page.html`)

  const overview = JSON.parse(await client.evaluate(`JSON.stringify({
    metrics: [...document.querySelectorAll('.wb-metric-value')].map((node) => node.textContent),
    running: document.querySelectorAll('.wb-main .wb-panel:first-child .wb-row').length,
    recent: document.querySelectorAll('.wb-main .wb-panel:last-child .wb-row').length,
    alerts: document.querySelectorAll('.wb-alert').length,
    caps: document.querySelectorAll('.wb-caps-list li').length,
    amount: document.querySelector('.wb-metric-value')?.textContent,
  })`))
  check('the four metrics render', overview.metrics.length === 4, overview.metrics)
  check('the amount is in RMB', String(overview.amount).startsWith('¥'), overview.amount)
  check('running sessions are listed', overview.running === 3, overview.running)
  check('recent sessions are listed', overview.recent === 2, overview.recent)
  check('attention items are listed', overview.alerts === 2, overview.alerts)
  check('host capabilities are shown', overview.caps === 4, overview.caps)

  // Dismiss the first item: it must leave the list in the same view.
  const dismissed = JSON.parse(await client.evaluate(`(async () => {
    const before = document.querySelectorAll('.wb-alert').length
    const node = [...document.querySelectorAll('.wb-alert')][0]
    const button = [...node.querySelectorAll('.wb-mini')].find((entry) => entry.textContent === '关闭')
    if (!button) return JSON.stringify({ error: 'no close button' })
    button.click()
    await new Promise((done) => setTimeout(done, 600))
    return JSON.stringify({ before, after: document.querySelectorAll('.wb-alert').length })
  })()`))
  check('closing removes the item at once', dismissed.after === dismissed.before - 1, dismissed)

  // Keyboard: every action is a real button, reachable by Tab.
  const keyboard = JSON.parse(await client.evaluate(`JSON.stringify({
    buttons: document.querySelectorAll('button').length,
    focusable: [...document.querySelectorAll('button')].every((node) => node.tabIndex >= 0),
    labelled: [...document.querySelectorAll('button')].every((node) => (node.getAttribute('aria-label') ?? node.textContent.trim()) !== ''),
  })`))
  check('every action is a focusable, named button', keyboard.focusable && keyboard.labelled, keyboard)

  // Narrow layout: nothing overflows and the grid collapses.
  await client.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 900, deviceScaleFactor: 1, mobile: false })
  await client.goto(`http://127.0.0.1:${port}/qa/.page.html`)
  const narrow = JSON.parse(await client.evaluate(`JSON.stringify({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector('.wb-grid')).gridTemplateColumns,
  })`))
  check('360px does not scroll sideways', narrow.documentWidth <= narrow.viewport + 1, narrow)
  check('360px collapses to one column', !String(narrow.columns).includes(' '), narrow.columns)

  check('no page exceptions', errors.length === 0, errors.slice(0, 2))
} finally {
  client.close()
  server.close()
}
console.log(failures.length === 0 ? '\nall interaction checks passed' : `\n${failures.length} failed: ${failures.join(', ')}`)
if (failures.length > 0) process.exitCode = 1
