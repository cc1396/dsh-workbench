/**
 * Render one Workbench view and write a PNG.
 *
 *   node qa/shot.mjs --snap v3 --out qa/out/overview.png --width 1440 --theme dark [--path '#/overview']
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './cdp.mjs'
import { serve } from './serve.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index].replace(/^--/, ''), process.argv[index + 1])

const width = Number(args.get('width') ?? 1440)
const height = Number(args.get('height') ?? 1000)
const theme = args.get('theme') === 'dark' ? 'dark' : 'light'
const out = resolve(args.get('out') ?? join(root, 'qa/out/shot.png'))
const snapName = args.get('snap') ?? 'v3'
const path = args.get('path') ?? ''

// The fixture is read by the page from a sibling file.
const fixture = readFileSync(join(root, 'qa/scenarios', `${snapName}.json`), 'utf8')
writeFileSync(join(root, 'qa/.snapshot.json'), fixture)
writeFileSync(join(root, 'qa/.page.html'), readFileSync(join(here, 'index.html'), 'utf8').replace('__THEME__', theme))

const { server, port } = await serve(0)
const client = await launch(join(root, 'qa', `.chrome-${process.pid}`), { width, height })
try {
  await client.goto(`http://127.0.0.1:${port}/qa/.page.html${path}`)
  writeFileSync(out, await client.screenshot())
  const text = await client.evaluate(`(document.querySelector('main, .wb-page')?.innerText ?? '').slice(0, 120)`)
  console.log(`wrote ${out} (${width}x${height}) ${JSON.stringify(text)}`)
} finally {
  client.close()
  server.close()
}
