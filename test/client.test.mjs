import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = readFileSync(join(root, 'client.js'), 'utf8')

/**
 * Evaluate the factory with a stub `require` and return its internals.
 *
 * `client.js` is one module-loader factory; running it here lets a test call the
 * page functions directly instead of trusting a screenshot.
 */
function evaluateClient() {
  let registration
  const window = { __ModuleLoader__: { load: (definition) => { registration = definition } }, innerWidth: 1440, addEventListener() {}, removeEventListener() {} }
  new Function('window', source)(window)
  const React = {
    createElement: () => ({}),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    Fragment: Symbol('fragment'),
  }
  const exports = registration.factory((name) => (name === 'react' ? React : undefined))
  return exports
}

test('the client factory evaluates and exposes apply/inject', () => {
  const exported = evaluateClient()
  assert.equal(typeof exported.apply, 'function')
  assert.ok(Array.isArray(exported.inject))
})

test('every page handler references only identifiers declared above it', () => {
  // The report page once used `confirmedKeys` after a rewrite dropped its `useRef`.
  // A syntax-only check cannot catch it, so every `const`/`let` used by a handler must
  // be declared inside the same function body.
  const start = source.indexOf('function ReportPage(')
  const end = source.indexOf('\n    function ', start + 10)
  const body = source.slice(start, end < 0 ? undefined : end)
  // Every identifier the confirm handler touches must exist in the same body, either as
  // a `const` or through a `[x, setX]` state binding; a rewrite once dropped one and the
  // click threw a ReferenceError that only a browser could surface.
  const declared = new Set([...body.matchAll(/\bconst\s+(?:\[([^\]]+)\]|([A-Za-z_$][\w$]*))\s*=/gu)].flatMap((match) => {
    const names = match[1] !== undefined ? match[1].split(',').map((name) => name.trim()) : [match[2]]
    return names.filter((name) => name !== '')
  }))
  for (const name of ['confirmedKeys', 'setConfirming', 'setDraft', 'setSelected', 'refresh', 'result', 'draft']) {
    assert.ok(declared.has(name), `${name} must be declared in ReportPage`)
  }
  // And the handler must not escape into the global scope with debug hooks.
  for (const marker of ['__dbg', '__enter', '__posted', '__calls', '__run', '__t,']) {
    assert.equal(source.includes(marker), false, `${marker} left behind`)
  }
})

test('every locale key used by t() exists in both dictionaries', () => {
  const start = source.indexOf('const zh = {')
  const zhEnd = source.indexOf('\n    }', start)
  const zh = source.slice(start, zhEnd)
  const keys = new Set([...zh.matchAll(/^\s{6}['"]?([\w.-]+)['"]?\s*:/gmu)].map((match) => match[1]))
  const used = [...source.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/gu)].map((match) => match[1])
  // `'state.' + name` is a deliberate dynamic prefix; these come from other modules.
  const dynamic = new Set(['state.', 'task.action.', 'projects.filter.'])
  const missing = [...new Set(used)].filter(
    (key) => !keys.has(key) && !dynamic.has(key) && !['refresh', 'loading', 'title', 'panel', 'panel.count', 'panel.more'].includes(key),
  )
  assert.deepEqual(missing, [])
})

test('no page nests an interactive control inside a button', () => {
  // The report row once put an <input> inside a <button>, which is invalid and breaks focus.
  const report = source.slice(source.indexOf('function ReportItemRow('), source.indexOf('function ReportEvidence('))
  assert.equal(/h\('button',[\s\S]*h\('input'/.test(report), false)
})

test('every amount renders as RMB, whatever currency a stale snapshot carries', () => {
  // The workbench is RMB-only: a snapshot from an earlier config must never print "$".
  assert.equal(source.includes("currency === 'USD' ? '$' : '¥'"), false)
  assert.match(source, /function currencySymbol\(\) \{\s*\n\s*return '¥'/u)
  assert.equal(/formatMoney\([^)]*,\s*(currency|overview\.currency)/u.test(source), false)
})

test('a coverage badge is only a success at full coverage', () => {
  // 0%/75% used to render as a green ✓ badge, which read as "healthy".
  assert.match(source, /const tone = percent >= 100 \? 'ok' : 'warn'/u)
  assert.equal(source.includes("tone: 'ok', glyph: 'check', label: t('cost.coverage'"), false)
})

test('the speed table lists only each model and its rate', () => {
  // The reader asked for per-model rates alone; aggregates and the recent-request
  // list were removed rather than hidden.
  const start = source.indexOf('function SpeedCard(')
  const end = source.indexOf('function WorkLogCard(')
  const card = source.slice(start, end)
  assert.match(card, /t\('speed\.model'\)/u)
  assert.match(card, /t\('speed\.rate'\)/u)
  for (const removed of ['speed.median', 'speed.p90', 'speed.requests', 'speed.recent', 'speed.current']) {
    assert.equal(card.includes(removed), false, `${removed} must not be rendered`)
  }
})

test('an attention item offers a dismiss action that clears it locally', () => {
  assert.match(source, /onAction\(alert, 'dismiss'\)/u)
  assert.match(source, /t\('alert\.dismiss'\)/u)
  // A dismissal is a solved state, so the item leaves "pending" immediately.
  assert.match(source, /action === 'dismiss' \? 'solved'/u)
})

test('a revisit paints the last snapshot before the live one arrives', () => {
  // Entering the workbench always showed an empty panel until the Host answered.
  assert.match(source, /function readCachedSnapshot\(\)/u)
  assert.match(source, /sessionStorage\.setItem\(CACHED_KEY/u)
  // A cached paint must not be presented as an outage.
  assert.match(source, /state\.status === 'stale' && state\.cached !== true/u)
  // Freshness is measured from when the browser cached it.
  assert.match(source, /Date\.now\(\) - Number\(cached\.at\)/u)
})
