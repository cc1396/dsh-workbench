/**
 * One DevTools-protocol client, shared by the screenshot and interaction harnesses.
 *
 * Chrome's `--screenshot` cannot set a viewport below 500px and cannot click, so both
 * harnesses drive Chrome directly over CDP instead.
 */
import { spawn } from 'node:child_process'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/**
 * Start headless Chrome and connect to its first page target.
 *
 * @param profile - the user-data directory for this run.
 * @returns `{ send, evaluate, goto, screenshot, close }`.
 */
export async function launch(profile, { width = 1440, height = 1000 } = {}) {
  const port = 9200 + (process.pid % 700)
  const child = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-crash-reporter',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' })

  let list
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) {
        list = await response.json()
        break
      }
    } catch {
      // Chrome is still starting.
    }
    await sleep(150)
  }
  if (list === undefined) {
    child.kill('SIGTERM')
    throw new Error('Chrome DevTools did not open')
  }
  const target = list.find((entry) => entry.type === 'page')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((ok, fail) => {
    socket.addEventListener('open', ok, { once: true })
    socket.addEventListener('error', fail, { once: true })
  })

  let next = 0
  const pending = new Map()
  const listeners = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id !== undefined) {
      const entry = pending.get(message.id)
      if (entry !== undefined) {
        pending.delete(message.id)
        entry(message)
      }
      return
    }
    for (const listener of listeners) listener(message)
  })
  const send = (method, params = {}) =>
    new Promise((done) => {
      const id = ++next
      pending.set(id, done)
      socket.send(JSON.stringify({ id, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    const details = result.result?.exceptionDetails
    if (details !== undefined) throw new Error(details.exception?.description ?? details.text)
    return result.result?.result?.value
  }

  return {
    send,
    evaluate,
    /** Navigate and wait for the page to settle. */
    async goto(url, settleMs = 1800) {
      await send('Page.navigate', { url })
      await sleep(settleMs)
    },
    /** Capture the visible viewport as a PNG buffer. */
    async screenshot() {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      return Buffer.from(result.result.data, 'base64')
    },
    /** Console errors and exceptions seen so far. */
    onEvent(listener) {
      listeners.push(listener)
    },
    close() {
      socket.close()
      child.kill('SIGTERM')
    },
  }
}
