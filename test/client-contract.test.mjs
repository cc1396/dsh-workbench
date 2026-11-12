import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCHEMA_VERSION as HOST_SCHEMA } from '../src/snapshot.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
// The browser half is one self-contained file: the Host loader is a CJS factory model,
// so a relative ESM import is not resolvable there.
const client = readFileSync(join(root, 'client.js'), 'utf8')
const read = (path) => readFileSync(join(root, path), 'utf8')

test('the client is a single classic-script factory, not an ESM graph', () => {
  assert.match(client, /__ModuleLoader__\.load/u)
  assert.match(client, /factory\(require\)/u)
  assert.match(client, /require\('react'\)/u)
  // An ESM import/export would throw inside `new Function('window', source)`.
  assert.equal(/^\s*(?:import|export)\s/mu.test(client), false)
  assert.equal(client.includes("import('./client/"), false)
})

test('both halves agree on the snapshot schema version', () => {
  assert.match(client, /const SCHEMA = 3/u)
  assert.equal(HOST_SCHEMA, 3)
})

test('the dictionaries define the same keys', () => {
  // Each dictionary is one object literal; slice to its own closing brace so CSS and
  // functions that follow cannot be mistaken for entries.
  const literal = (startMarker) => {
    const start = client.indexOf(startMarker)
    let depth = 0
    for (let index = start; index < client.length; index += 1) {
      if (client[index] === '{') depth += 1
      else if (client[index] === '}') {
        depth -= 1
        if (depth === 0) return client.slice(start, index + 1)
      }
    }
    return ''
  }
  const zh = literal('const zh = {')
  const en = literal('const en = {')
  // Only quoted keys: a bare identifier like `panel:` is also a dictionary key, but CSS
  // inside the same file uses `aria-current:` and friends, which are not.
  const keys = (block) =>
    [...block.matchAll(/^\s*'([\w.-]+)':/gmu)]
      .map((match) => match[1])
      .concat([...block.matchAll(/^\s{6}([a-zA-Z][\w]*):/gmu)].map((match) => match[1]))
      .sort()
  const zhKeys = keys(zh)
  const enKeys = keys(en)
  assert.deepEqual(enKeys, zhKeys)
  assert.ok(zhKeys.length > 50)
})

test('every key the components translate exists in the dictionary', () => {
  const used = new Set()
  for (const match of client.matchAll(/\bt\(\s*'([\w.-]+)'/gu)) used.add(match[1])
  for (const state of ['waiting', 'running', 'stuck', 'failed', 'ended', 'cancelled', 'unknown']) used.add(`state.${state}`)
  const declared = new Set([
    ...[...client.matchAll(/^\s*'([\w.-]+)':/gmu)].map((match) => match[1]),
    ...[...client.matchAll(/^\s*([a-zA-Z][\w]*):/gmu)].map((match) => match[1]),
  ])
  const missing = [...used].filter((key) => !declared.has(key))
  assert.deepEqual(missing, [])
})

test('every amount renders in RMB, and the currency is not a parameter', () => {
  assert.match(client, /const RMB = '¥'/u)
  assert.equal(/function moneyOf\([^)]*currency/u.test(client), false)
  assert.equal(client.includes('"$"'), false)
})

test('the speed card carries no aggregates', () => {
  assert.equal(client.includes('speed.median'), false)
  assert.equal(client.includes('speed.p90'), false)
})

test('a cached paint is not reported as an outage', () => {
  assert.match(client, /status: 'cached'/u)
  assert.match(client, /'fresh\.cached'/u)
})

test('closing an item means no further reminders', () => {
  // The label, the accessible name and the explanation all state the definition.
  assert.match(client, /'attention\.dismiss': '关闭'/u)
  assert.match(client, /'attention\.dismiss': 'Close'/u)
  assert.match(client, /'attention\.closeHint': '关闭后不再提醒/u)
  assert.match(client, /'attention\.closeHint': 'No further reminders/u)
  assert.equal(client.includes("'attention.dismiss': '取消'"), false)
  // The action still maps to the Host's `solve`, which is terminal for that key.
  assert.match(client, /action === 'dismiss' \? 'solve'/u)
})

test('an executing row has a motion indicator with a static reduced-motion fallback', () => {
  // Motion is scoped to `running`; no other state blinks.
  assert.match(client, /function RunningDots\(\)/u)
  assert.match(client, /state === 'running' \? h\(RunningDots\)/u)
  assert.match(client, /data-state=running/u)
  assert.match(client, /@keyframes wb-pulse/u)
  // The leading edge is a static marker: no travelling light animation.
  assert.equal(client.includes('@keyframes wb-flow'), false)
  assert.match(client, /\.wb-row\[data-state=running\]::before\{content:'';position:absolute;left:0;top:6px/u)
  assert.equal(/\.wb-row\[data-state=running\]::before[^}]*animation:/u.test(client), false)
  // ~2px more room between task rows.
  assert.match(client, /\.wb-row-main\{[^}]*padding:10px 4px/u)
  // The indicator is decorative: the word 执行中 is still rendered by StateBadge.
  assert.match(client, /'aria-hidden': 'true'/u)
  assert.match(client, /t\(`state\.\$\{state\}`\)/u)
  // Motion off must leave a visible static cue rather than nothing.
  assert.match(client, /prefers-reduced-motion:reduce/u)
  assert.match(client, /\.wb-pulse i\{opacity:1;transform:none\}/u)
})

test('the cost page renders project, trend and session spend, and sums token buckets', () => {
  assert.match(client, /function CostPage\(/u)
  assert.match(client, /t\('cost\.byProject'\)/u)
  assert.match(client, /t\('cost\.trend'\)/u)
  assert.match(client, /t\('cost\.todaySessions'\)/u)
  // A bucket set is an object: it must be summed before formatting, never coerced.
  assert.match(client, /function sumTokens\(buckets\)/u)
  assert.equal(/tokensOf\(entry\.tokens\)/u.test(client), false)
  assert.match(client, /tokensOf\(sumTokens\(entry\.tokens\)\)/u)
  // The overview's cost metric is the way in.
  assert.match(client, /onClick: \(\) => setDetail\(\{ kind: 'cost' \}\)/u)
})

test('every page is reachable from the top navigation', () => {
  assert.match(client, /function NavBar\(/u)
  // The three destinations the panel has, each with its own label.
  for (const key of ['nav.overview', 'nav.cost', 'nav.attention']) {
    assert.ok(client.includes(`'${key}'`), `${key} must be defined`)
  }
  // The bar is rendered on the overview and on every detail page.
  // Rendered as its own child on the detail pages and inside the overview's content.
  const renders = [/'wb-content' \}, nav, page\)/u, /^\s+nav,$/mu].filter((pattern) => pattern.test(client)).length
  assert.equal(renders, 2, 'nav must render on both the overview and detail pages')
  // The current page is marked for assistive tech.
  assert.match(client, /'aria-current': current === page\.kind \? 'page'/u)
  // It is a real navigation landmark with a name.
  assert.match(client, /className: 'wb-nav', 'aria-label': t\('tabs\.label'\)/u)
})
