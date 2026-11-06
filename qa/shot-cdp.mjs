/**
 * Render one Workbench view at an exact CSS width through the DevTools protocol.
 *
 * Headless Chrome clamps `--window-size` to a 500px minimum, so the ordinary
 * `shot.mjs` cannot exercise the 320/360px breakpoints. This script overrides the
 * device metrics with CDP before navigating, then captures the page.
 *
 *   node qa/shot-cdp.mjs --snap home --out qa/out/360.png --width 360 --theme light
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index].replace(/^--/, ''), process.argv[index + 1])
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const width = Number(args.get('width') ?? 360)
const height = Number(args.get('height') ?? 1000)
const theme = args.get('theme') ?? 'light'
const out = resolve(args.get('out') ?? '/tmp/dswb-cdp.png')
const snapName = args.get('snap') ?? 'home'
const snapshot = JSON.parse(readFileSync(join(root, 'qa/scenarios', snapName.endsWith('.json') ? snapName : `${snapName}.json`), 'utf8'))
const page = readFileSync(join(here, 'index.html'), 'utf8')
  .replace('__SNAPSHOT__', JSON.stringify(snapshot))
  .replace('__THEME__', theme === 'dark' ? 'dark' : 'light')
const pagePath = join(root, 'qa', '.page.cdp.html')
writeFileSync(pagePath, page)
const hash = encodeURIComponent(args.get('path') ?? '')
const url = `file://${pagePath}#${hash}`
const port = 9300 + (process.pid % 500)
const profile = join(root, 'qa', `.chrome-cdp-${process.pid}`)

const child = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-crash-reporter',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=800,1000',
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
async function targets() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) return response.json()
    } catch {
      // Chrome is still starting.
    }
    await sleep(150)
  }
  throw new Error('Chrome DevTools port did not open')
}

class Cdp {
  constructor(socket) {
    this.socket = socket
    this.next = 0
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id === undefined) return
      const entry = this.pending.get(message.id)
      if (entry === undefined) return
      this.pending.delete(message.id)
      if (message.error !== undefined) entry.reject(new Error(JSON.stringify(message.error)))
      else entry.resolve(message.result)
    })
  }
  send(method, params = {}) {
    const id = ++this.next
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }
}

let socket
try {
  const list = await targets()
  const target = list.find((entry) => entry.type === 'page')
  if (target === undefined) throw new Error('no page target')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const cdp = new Cdp(socket)
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url })
  await sleep(2500)
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(out, Buffer.from(result.data, 'base64'))
  console.log(`wrote ${out} (${width}x${height} CSS px)`)
} catch (error) {
  console.error(`shot-cdp failed: ${error.message}`)
  process.exitCode = 1
} finally {
  if (socket !== undefined) socket.close()
  child.kill('SIGTERM')
}
