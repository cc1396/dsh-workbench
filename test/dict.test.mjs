import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'client.js'), 'utf8')
const lines = source.split('\n')

function block(startMarker, endMarker) {
  const start = lines.findIndex((line) => line.includes(startMarker))
  assert.notEqual(start, -1, `${startMarker} not found`)
  const end = lines.findIndex((line, index) => index > start && line.includes(endMarker))
  assert.notEqual(end, -1, `${endMarker} not found`)
  return lines.slice(start, end)
}

function keys(text) {
  const found = []
  for (const line of text) {
    const match = line.match(/^\s+(?:'([^']+)'|([A-Za-z][\w.]*)):\s/u)
    if (match !== null) found.push(match[1] ?? match[2])
  }
  return found
}

const zhKeys = keys(block('const zh = {', 'const en = {'))
const enStart = lines.findIndex((line) => line.includes('const en = {'))
const enEnd = lines.findIndex((line, index) => index > enStart && line.includes('// --- data'))
const enKeys = keys(lines.slice(enStart, enEnd))

test('zh and en dictionaries define the same keys', () => {
  assert.ok(zhKeys.length > 100, `zh has ${zhKeys.length} keys`)
  assert.ok(enKeys.length > 100, `en has ${enKeys.length} keys`)
  assert.deepEqual([...enKeys].sort(), [...zhKeys].sort())
  assert.equal(new Set(zhKeys).size, zhKeys.length, 'no duplicate zh keys')
  assert.equal(new Set(enKeys).size, enKeys.length, 'no duplicate en keys')
})

test('every log key used by the work log exists', () => {
  const used = [...source.matchAll(/t\('(log\.[A-Za-z]+)'/gu)].map((match) => match[1])
  for (const key of new Set(used)) {
    assert.ok(zhKeys.includes(key), `missing zh key ${key}`)
    assert.ok(enKeys.includes(key), `missing en key ${key}`)
  }
})
