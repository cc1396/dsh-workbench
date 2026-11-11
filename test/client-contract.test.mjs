import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zh, en } from '../client/text.js'
import { SCHEMA as CLIENT_SCHEMA } from '../client/api.js'
import { SCHEMA_VERSION as HOST_SCHEMA } from '../src/snapshot.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (path) => readFileSync(join(root, path), 'utf8')

test('both halves agree on the snapshot schema version', () => {
  // A mismatch renders as blank panels, which is indistinguishable from "no data".
  assert.equal(CLIENT_SCHEMA, HOST_SCHEMA)
})

test('the dictionaries define the same keys', () => {
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  assert.deepEqual(enKeys, zhKeys)
})

test('every key the components translate exists in both dictionaries', () => {
  const sources = readdirSync(join(root, 'client')).filter((name) => name.endsWith('.js')).map((name) => read(join('client', name)))
  const used = new Set()
  for (const source of sources) {
    for (const match of source.matchAll(/\bt\(\s*'([\w.-]+)'/gu)) used.add(match[1])
    for (const match of source.matchAll(/\bt\(\s*`([\w.-]+)\.\$\{/gu)) used.add(`${match[1]}.`)
  }
  // States are addressed as `state.${name}`; every state name must have a label.
  for (const state of ['waiting', 'running', 'stuck', 'failed', 'ended', 'cancelled', 'unknown']) used.add(`state.${state}`)
  const missing = [...used].filter((key) => !key.endsWith('.') && !(key in zh))
  assert.deepEqual(missing, [])
  assert.equal('state.' in zh, false)
})

test('every amount renders in RMB, and the currency is not a parameter', () => {
  const format = read('client/format.js')
  assert.match(format, /const RMB = '¥'/u)
  assert.equal(/function moneyOf\([^)]*currency/u.test(format), false)
  assert.equal(format.includes("'$'"), false)
})

test('the panel never renders an aggregate into the speed card', () => {
  const panel = read('client/panel.js')
  assert.equal(panel.includes('speed.median'), false)
  assert.equal(panel.includes('speed.p90'), false)
})

test('a cached paint is not reported as an outage', () => {
  const hooks = read('client/hooks.js')
  assert.match(hooks, /status: 'cached'/u)
  const panel = read('client/panel.js')
  // The badge wording depends on the status, so `cached` must have its own label.
  assert.match(panel, /fresh\.cached/u)
})

test('the client loads through the module loader and declares its requires', () => {
  const entry = read('client.js')
  assert.match(entry, /__ModuleLoader__\.load/u)
  assert.match(entry, /require\('react'\)/u)
  assert.match(entry, /import\('\.\/client\/main\.js'\)/u)
})
