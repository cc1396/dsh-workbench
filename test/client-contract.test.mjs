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
  const zh = client.slice(client.indexOf('const zh = {'), client.indexOf('const en = {'))
  const en = client.slice(client.indexOf('const en = {'))
  const keys = (block) => [...block.matchAll(/^\s*'([\w.-]+)':/gmu)].map((match) => match[1]).sort()
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
  assert.match(client, /@keyframes wb-flow/u)
  // The indicator is decorative: the word 执行中 is still rendered by StateBadge.
  assert.match(client, /'aria-hidden': 'true'/u)
  assert.match(client, /t\(`state\.\$\{state\}`\)/u)
  // Motion off must leave a visible static cue rather than nothing.
  assert.match(client, /prefers-reduced-motion:reduce/u)
  assert.match(client, /\.wb-pulse i\{opacity:1;transform:none\}/u)
})
