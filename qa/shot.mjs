/**
 * Render one Workbench view in headless Chrome and write a PNG.
 *
 * The page loads the real `client.js` through a module-loader shim, mounts the
 * panel with React, and answers the snapshot, alert and summary routes from
 * fixtures, so a screenshot shows the code the browser will run — no server.
 *
 *   node qa/shot.mjs --snap qa/scenarios/home.json --out /tmp/home.png --width 1440 --theme light
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index].replace(/^--/, ''), process.argv[index + 1])
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const width = Number(args.get('width') ?? 1440)
const height = Number(args.get('height') ?? 1000)
const theme = args.get('theme') ?? 'light'
const out = resolve(args.get('out') ?? '/tmp/dswb.png')
const snapName = args.get('snap') ?? 'home'
const snapshot = JSON.parse(readFileSync(join(root, 'qa/scenarios', snapName.endsWith('.json') ? snapName : `${snapName}.json`), 'utf8'))
const page = readFileSync(join(here, 'index.html'), 'utf8')
  .replace('__SNAPSHOT__', JSON.stringify(snapshot))
  .replace('__THEME__', theme === 'dark' ? 'dark' : 'light')
const pagePath = join(root, 'qa', '.page.html')
writeFileSync(pagePath, page)

const hash = encodeURIComponent(args.get('path') ?? '')
const child = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  `--user-data-dir=${resolve(root, 'qa', `.chrome-${process.pid}`)}`,
  '--disable-gpu',
  '--disable-crash-reporter',
  '--no-first-run',
  '--disable-extensions',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--allow-file-access-from-files',
  `--window-size=${width},${height}`,
  `--screenshot=${out}`,
  '--virtual-time-budget=5000',
  `file://${pagePath}#${hash}`,
], { stdio: ['ignore', 'ignore', 'pipe'] })
let log = ''
child.stderr.on('data', (chunk) => { log += chunk })
child.on('close', (code) => {
  console.log(code === 0 ? `wrote ${out}` : `chrome exited ${code}\n${log.slice(-2000)}`)
  process.exit(code === 0 ? 0 : 1)
})
