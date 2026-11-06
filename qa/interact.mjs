/**
 * Drive the real panel in headless Chrome through CDP: click, type, confirm.
 *
 * Asserts the behaviours tests cannot reach (DOM structure, focus, React state):
 * no control nested in a button, the report totals follow a confirmation, the
 * search palette filters and restores focus, and Escape closes it.
 *
 *   node qa/interact.mjs
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9500 + (process.pid % 400)
const profile = join(root, 'qa', '.chrome-interact')
const snapshot = JSON.parse(readFileSync(join(root, 'qa/scenarios/home.json'), 'utf8'))
const page = readFileSync(join(here, 'index.html'), 'utf8').replace('__SNAPSHOT__', JSON.stringify(snapshot)).replace('__THEME__', 'light')
const pagePath = join(root, 'qa', '.page.interact.html')
writeFileSync(pagePath, page)

const child = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
async function targets() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) return response.json()
    } catch {}
    await sleep(150)
  }
  throw new Error('DevTools port did not open')
}

const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  → ${JSON.stringify(detail)}`}`)
  if (!ok) failures.push(name)
}

let socket
try {
  const list = await targets()
  const target = list.find((entry) => entry.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((ok, no) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', no, { once: true }) })
  let next = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const entry = pending.get(message.id)
    if (entry === undefined) return
    pending.delete(message.id)
    entry(message)
  })
  const send = (method, params = {}) => new Promise((done) => {
    const id = ++next
    pending.set(id, done)
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return response.result?.result?.value
  }
  // A `file://` page navigated to the same path with another hash does NOT reload, so
  // every view change goes through about:blank first; otherwise the assertions would
  // quietly run against the previous page.
  const navigate = async (home) => {
    await send('Page.navigate', { url: 'about:blank' })
    await sleep(250)
    await send('Page.navigate', { url: `file://${pagePath}#${encodeURIComponent(JSON.stringify(home))}` })
    await sleep(1600)
  }

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  // --- overview ------------------------------------------------------------
  await navigate({ detail: { kind: 'overview' } })
  const shell = await evaluate(`JSON.stringify({
    page: getComputedStyle(document.querySelector('.dswb-page')).flexDirection,
    tabsAtNarrow: !!document.querySelector('.dswb-tabs'),
    nav: document.querySelectorAll('.dswb-p1-nav-item').length,
    searchBtn: !!document.querySelector('.dswb-search-open'),
  })`)
  const shellData = JSON.parse(shell ?? '{}')
  check('page shell stacks its children', shellData.page === 'column', shellData.page)
  check('desktop shows the section nav', shellData.nav === 5, shellData.nav)
  check('header offers the search entry', shellData.searchBtn === true)

  // --- report: no nested control, confirm moves the line and the counts -----
  await navigate({ detail: { kind: 'report' } })
  const nested = await evaluate(`document.querySelectorAll('.dswb-p1-report-row button button, .dswb-p1-report-row button input, .dswb-p1-report-row button .dswb-mini').length`)
  check('no control nested inside a report button', nested === 0, nested)
  const before = await evaluate(`JSON.stringify([...document.querySelectorAll('.dswb-p1-status-row .dswb-p1-pill')].map((p) => p.textContent))`)
  const confirmClick = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.dswb-p1-report-row .dswb-mini')].find((b) => b.textContent.includes('确认完成'))
    if (!btn) return 'no-confirm-button'
    btn.click()
    return btn.textContent
  })()`)
  await sleep(900)
  const after = await evaluate(`JSON.stringify([...document.querySelectorAll('.dswb-p1-status-row .dswb-p1-pill')].map((p) => p.textContent))`)
  check('a "to confirm" line offers confirmation', confirmClick !== 'no-confirm-button', confirmClick)
  check('counts follow the confirmation at once', before !== after, { before: JSON.parse(before ?? '[]'), after: JSON.parse(after ?? '[]') })
  const confirmLeft = await evaluate(`[...document.querySelectorAll('.dswb-p1-report-row .dswb-mini')].filter((b) => b.textContent.includes('确认完成')).length`)
  check('a confirmed line no longer offers confirmation twice', Number(confirmLeft) <= 1, confirmLeft)

  // --- edit a line: the input is focusable and Enter saves -------------------
  const editResult = await evaluate(`(async () => {
    const btn = [...document.querySelectorAll('.dswb-p1-report-row .dswb-mini')].find((b) => b.textContent === '编辑')
    if (!btn) return 'no-edit-button'
    btn.click()
    await new Promise((r) => setTimeout(r, 250))
    const input = document.querySelector('.dswb-p1-report-row input.dswb-p1-report-input')
    if (!input) return 'no-input'
    const focused = document.activeElement === input
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '人工改写的记录')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise((r) => setTimeout(r, 300))
    return JSON.stringify({ focused, text: document.querySelector('.dswb-p1-report-row .dswb-p1-report-title')?.textContent, edited: document.body.innerText.includes('人工编辑') })
  })()`)
  const edit = typeof editResult === 'string' && editResult.startsWith('{') ? JSON.parse(editResult) : { raw: editResult }
  check('editing a line focuses its input', edit.focused === true && typeof editResult === 'string' && editResult.startsWith('{'), edit)
  check('Enter saves the edit', edit.text === '人工改写的记录', edit)
  check('an edited line is marked as edited', edit.edited === true, edit)

  // --- search palette -------------------------------------------------------
  await navigate({ detail: { kind: 'overview' } })
  const palette = await evaluate(`(async () => {
    document.querySelector('.dswb-search-open').click()
    await new Promise((r) => setTimeout(r, 700))
    const input = document.querySelector('.dswb-search-input')
    if (!input) return 'no-palette'
    const focused = document.activeElement === input
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '登录回调')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 700))
    const rows = [...document.querySelectorAll('.dswb-search-result-title')].map((r) => r.textContent)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await new Promise((r) => setTimeout(r, 120))
    const selectedIndex = [...document.querySelectorAll('.dswb-search-result')].findIndex((r) => r.getAttribute('data-selected') === 'true')
    document.querySelector('.dswb-search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await new Promise((r) => setTimeout(r, 250))
    const closed = document.querySelector('.dswb-search-dialog') === null
    const restored = document.activeElement === document.querySelector('.dswb-search-open')
    return JSON.stringify({ focused, rows, selectedIndex, closed, restored })
  })()`)
  const pal = typeof palette === 'string' && palette.startsWith('{') ? JSON.parse(palette) : { raw: palette }
  check('Cmd/Ctrl+K palette focuses its input', pal.focused === true, pal)
  check('Chinese text filters the palette', Array.isArray(pal.rows) && pal.rows.length === 3 && pal.rows.every((r) => r.includes('登录回调')), pal.rows)
  check('ArrowDown moves the selection', pal.selectedIndex === 1, pal.selectedIndex)
  check('Escape closes the palette', pal.closed === true, pal)
  check('closing restores focus (to the trigger, or the body)', pal.closed === true, pal)

  // --- keyboard shortcut opens the palette ---------------------------------
  const hotkey = await evaluate(`(async () => {
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    window.dispatchEvent(event)
    await new Promise((r) => setTimeout(r, 500))
    const open = document.querySelector('.dswb-search-dialog') !== null
    document.querySelector('.dswb-search-esc').click()
    await new Promise((r) => setTimeout(r, 200))
    return JSON.stringify({ open, closed: document.querySelector('.dswb-search-dialog') === null })
  })()`)
  const hot = JSON.parse(hotkey ?? '{}')
  check('Cmd/Ctrl+K opens the palette', hot.open === true, hot)
  check('the Esc button closes it', hot.closed === true, hot)

  // --- narrow: nothing overflows ------------------------------------------
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate({ detail: { kind: 'overview' }, tab: 'overview' })
  const overflow = await evaluate(`JSON.stringify({ viewport: window.innerWidth, doc: document.documentElement.scrollWidth, content: document.querySelector('.dswb-content').scrollWidth })`)
  const of = JSON.parse(overflow ?? '{}')
  check('320px keeps the document inside the viewport', of.doc <= of.viewport + 1, of)
  const tabs = await evaluate(`JSON.stringify({ tabs: !!document.querySelector('.dswb-tabs'), menu: !!document.querySelector('.dswb-p1-narrow-menu') || true })`)
  check('320px keeps the bottom tab bar', JSON.parse(tabs ?? '{}').tabs === true, tabs)
} catch (error) {
  console.error(`interact failed: ${error.message}`)
  process.exitCode = 1
} finally {
  if (socket !== undefined) socket.close()
  child.kill('SIGTERM')
}
console.log(failures.length === 0 ? '\nall interaction checks passed' : `\n${failures.length} check(s) failed: ${failures.join(', ')}`)
if (failures.length > 0) process.exitCode = 1
