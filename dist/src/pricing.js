/**
 * Money: how a billed bucket set becomes an estimate, in RMB.
 *
 * One price table, one rounding rule, one currency. The table has a `default` row and
 * per-model overrides; an unlisted model uses the default rather than reporting "not
 * estimable" (PRD F05), because a new model id must not silently zero a whole day.
 *
 * An estimate is never a bill: the row, the table version and the coverage travel with
 * every amount so a reader can tell "unknown" from "zero".
 */

/** The built-in table, used when the configuration supplies nothing usable. */
export const FALLBACK_PRICE = { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 2 }

const CURRENCY = 'CNY'

/** Accept `input`/`cacheRead`/… or the projection's long names. */
function rowOf(value) {
  if (value === null || typeof value !== 'object') return undefined
  const pick = (a, b) => {
    const number = Number(value[a] ?? value[b])
    return Number.isFinite(number) && number >= 0 ? number : undefined
  }
  const input = pick('input', 'uncachedInput')
  const cacheRead = pick('cacheRead', 'cacheReadInput')
  const output = pick('output')
  if (input === undefined && cacheRead === undefined && output === undefined) return undefined
  return {
    input: input ?? 0,
    cacheRead: cacheRead ?? 0,
    cacheWrite: pick('cacheWrite', 'cacheWriteInput') ?? cacheRead ?? 0,
    output: output ?? 0,
  }
}

/**
 * Resolve the configuration into the pricing model used everywhere else.
 *
 * @param config - the plugin's `prices` block `{ ref?, default?, models? }`.
 */
export function pricingOf(config) {
  const source = config !== null && typeof config === 'object' ? config : {}
  const models = new Map()
  if (source.models !== null && typeof source.models === 'object') {
    for (const [model, value] of Object.entries(source.models)) {
      const row = rowOf(value)
      if (row !== undefined) models.set(model, row)
    }
  }
  return {
    currency: CURRENCY,
    ref: typeof source.ref === 'string' && source.ref !== '' ? source.ref.slice(0, 60) : 'configured',
    default: rowOf(source.default) ?? FALLBACK_PRICE,
    models,
  }
}

/** The price row a model route is billed by. */
export function priceRowOf(pricing, model) {
  if (typeof model !== 'string' || model === '') return pricing.default
  return pricing.models.get(model) ?? pricing.default
}

/** Price one bucket set with one row: tokens × price per million ÷ 1e6. */
export function amountOf(tokens, row) {
  const price = rowOf(row)
  if (price === undefined) return undefined
  return (
    (Number(tokens?.uncachedInput) || 0) * price.input +
    (Number(tokens?.cacheReadInput) || 0) * price.cacheRead +
    (Number(tokens?.cacheWriteInput) || 0) * price.cacheWrite +
    (Number(tokens?.output) || 0) * price.output
  ) / 1_000_000
}

/** Round for display without inventing precision. */
export function roundAmount(value, digits = 6) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const factor = 10 ** digits
  return Math.round(number * factor) / factor
}

/**
 * Price one Session-day.
 *
 * @returns `{ amount, quality, coverage, row, ref }` where `quality` is `priced`,
 *   `unpriced` (no row) or `empty` (no tokens).
 */
export function priceSessionDay(tokens, model, pricing) {
  const row = priceRowOf(pricing, model)
  const amount = amountOf(tokens, row)
  const total = (Number(tokens?.uncachedInput) || 0) + (Number(tokens?.cacheReadInput) || 0) + (Number(tokens?.cacheWriteInput) || 0) + (Number(tokens?.output) || 0)
  return {
    amount: amount === undefined ? 0 : roundAmount(amount),
    quality: total === 0 ? 'empty' : amount === undefined ? 'unpriced' : 'priced',
    coverage: total === 0 ? undefined : amount === undefined ? 0 : 1,
    row,
    ref: pricing.ref,
    currency: pricing.currency,
  }
}
