/**
 * Host half of the DSH Workbench bundle.
 *
 * Owns exactly one authenticated, read-only route, `GET /api/workbench/status`,
 * which returns the snapshot the Workbench panel renders:
 *
 *  - DeepSeek account wallets (optional service: absent outside signed-in profiles)
 *  - token and amount usage folded from the Session logs
 *  - the task inventory: totals, currently running Sessions, recently finished ones
 *
 * The route rides the shared `/api` Fetch channel, so Connection authenticates
 * every caller and only the owner peer can read the snapshot.
 */

const ROUTE_PATH = '/api/workbench/status'
const DAY_MS = 86_400_000
const TOKENS_PER_UNIT = 1_000_000
const FALLBACK_PRICE = { input: 2, output: 8, cacheRead: 0.5 }

/** Hard requirements: the authenticated Fetch transport and the Session catalog. */
export const inject = ['connection', 'sessionController']

/**
 * Install the snapshot route.
 * @param ctx - Host context carrying Connection and the Session catalog.
 * @param config - optional bundle configuration from `cordis.patch.yml`.
 */
export function apply(ctx, config) {
  const settings = resolveSettings(config)
  /** Per-Session fold cache, invalidated by `SessionSummary.updatedAt`. */
  const usageCache = new Map()
  /** Wallet reads are cached: the Platform is queried at most once a minute. */
  const walletCache = { at: 0, value: undefined }

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => snapshot(ctx, settings, usageCache, walletCache, request),
      }),
    'dsh-workbench: /api/workbench/status',
  )
}

/**
 * Answer one snapshot request.
 * @param ctx - Host context.
 * @param settings - resolved bundle configuration.
 * @param usageCache - per-Session fold cache.
 * @param walletCache - mutable wallet cache.
 * @param request - incoming Fetch request.
 * @returns JSON response with the Workbench snapshot.
 */
async function snapshot(ctx, settings, usageCache, walletCache, request) {
  const url = new URL(request.url)
  const tzOffsetSeconds = clampInteger(url.searchParams.get('tzOffset'), -86_400, 86_400, 0)
  const locale = normalizeLocale(url.searchParams.get('locale'))
  const generatedAt = Date.now()
  const dayStart = localDayStart(generatedAt, tzOffsetSeconds)
  const input = { dayStart, tzOffsetSeconds, locale, signal: request.signal }
  try {
    const body = await buildSnapshot(ctx, settings, usageCache, walletCache, input, generatedAt)
    return jsonResponse(200, body)
  } catch (error) {
    return jsonResponse(500, { error: messageOf(error) })
  }
}

/**
 * Compose the snapshot.
 * @param ctx - Host context.
 * @param settings - resolved configuration.
 * @param usageCache - per-Session fold cache.
 * @param walletBox - mutable wallet cache.
 * @param input - request-scoped facts.
 * @param generatedAt - snapshot timestamp.
 * @returns the snapshot body.
 */
async function buildSnapshot(ctx, settings, usageCache, walletBox, input, generatedAt) {
  const listed = await ctx.sessionController.list({}, input.signal)
  const sessions = Array.isArray(listed?.items) ? listed.items.filter(isSummary) : []
  const tasks = sessions.filter((item) => item.origin !== 'subagent' && item.blank !== true)
  const runningTasks = tasks.filter((item) => item.running === true).sort(byActivity)
  const recentTasks = tasks.filter((item) => item.running !== true).sort(byActivity)

  const usage = await foldUsage(ctx, settings, usageCache, sessions, {
    ...input,
    first: [...runningTasks, ...recentTasks].slice(0, settings.maxRunningTasks + settings.maxRecentTasks),
  })
  const account = await readAccount(ctx, settings, walletBox, input, generatedAt)

  return {
    generatedAt,
    dayStart: input.dayStart,
    account,
    usage: usage.summary,
    tasks: { total: tasks.length, running: runningTasks.length, recent: recentTasks.length },
    running: runningTasks.slice(0, settings.maxRunningTasks).map((item) => taskRow(item, usageCache)),
    recent: recentTasks.slice(0, settings.maxRecentTasks).map((item) => taskRow(item, usageCache)),
  }
}

/** Project one Session summary into the row the panel renders. */
function taskRow(item, usageCache) {
  const cached = usageCache.get(item.sessionId)
  const fallback = cached?.title
  return {
    sessionId: item.sessionId,
    title: typeof fallback === 'string' && fallback !== '' ? fallback : undefined,
    cwd: typeof item.cwd === 'string' ? item.cwd : undefined,
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0,
  }
}

/**
 * Fold token usage for every visible Session, reusing cached folds.
 *
 * Display Sessions are scanned first so the panel always has fresh titles, then
 * the rest in activity order. The scan is bounded by a session count and a time
 * budget; whatever remains is reported as pending and picked up by the next poll.
 * Sessions a fork inherited are excluded through `inheritedEventCount`.
 */
async function foldUsage(ctx, settings, cache, sessions, input) {
  const ordered = [...sessions].sort(byActivity)
  const first = new Set(input.first.map((item) => item.sessionId))
  const queue = [
    ...ordered.filter((item) => first.has(item.sessionId)),
    ...ordered.filter((item) => !first.has(item.sessionId)),
  ]
  const deadline = Date.now() + settings.scanBudgetMs
  let scanned = 0

  const worker = async () => {
    while (queue.length > 0) {
      if (Date.now() > deadline || scanned >= settings.maxScanSessions) return
      const item = queue.shift()
      const cached = cache.get(item.sessionId)
      if (cached !== undefined && cached.failed !== true && cached.updatedAt === item.updatedAt && item.running !== true) continue
      scanned += 1
      await foldSession(ctx, settings, cache, item, input.dayStart)
    }
  }

  await Promise.all([worker(), worker(), worker(), worker()])

  let total = emptyUsage()
  let today = emptyUsage()
  let pending = 0
  let failed = 0
  for (const item of ordered) {
    const cached = cache.get(item.sessionId)
    if (cached === undefined) {
      pending += 1
      continue
    }
    if (cached.updatedAt !== item.updatedAt) pending += 1
    if (cached.failed === true) failed += 1
    total = mergeUsage(total, cached.total)
    today = mergeUsage(today, cached.today)
  }

  if (cache.size > 400) {
    const live = new Set(sessions.map((item) => item.sessionId))
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key)
  }

  return {
    summary: {
      today: finalizeUsage(today),
      total: finalizeUsage(total),
      pendingSessions: pending,
      failedSessions: failed,
      estimated: true,
    },
  }
}

/** Read one Session log and fold its usage and title. Failures stay isolated. */
async function foldSession(ctx, settings, cache, item, dayStart) {
  let title
  let total = emptyUsage()
  let today = emptyUsage()
  let failed = false
  let firstUserText
  try {
    const inspected = await ctx.sessionController.inspect(item.sessionId)
    const inherited = Number(inspected?.inheritedEventCount ?? 0)
    const events = Array.isArray(inspected?.events) ? inspected.events : []
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index]
      if (event === null || typeof event !== 'object') continue
      if (event.type === 'session/title' && typeof event.data?.title === 'string') title = event.data.title
      if (event.type === 'user/message' && firstUserText === undefined) {
        firstUserText = userTextOf(event.data)
      }
      if (event.type !== 'assistant/message' || index < inherited) continue
      const usage = event.data?.usage
      if (usage === null || typeof usage !== 'object') continue
      const tokens = readTokens(usage)
      if (tokens.input === 0 && tokens.output === 0 && tokens.cacheRead === 0) continue
      const model = event.data?.message?.source?.model
      const price = priceFor(settings, typeof model === 'string' ? model : '')
      const cost = costOf(tokens, price)
      total = addUsage(total, tokens, cost)
      if (Number(event.time) >= dayStart) today = addUsage(today, tokens, cost)
    }
  } catch {
    failed = true
  }
  cache.set(item.sessionId, {
    updatedAt: item.updatedAt,
    title: title ?? firstUserText,
    total,
    today,
    failed,
  })
}

/** Best-effort wallet read: the desktop Platform wallet, cached for a minute. */
async function readAccount(ctx, settings, box, input, now) {
  if (box.value !== undefined && now - box.at < settings.balanceTtlMs) return box.value
  const service = ctx.get('deepseekAccount')
  if (service === undefined) {
    const value = { status: 'unavailable', wallets: [], bonusWallets: [] }
    box.at = now
    box.value = value
    return value
  }
  let value
  try {
    const state = await service.getState()
    if (state?.status !== 'credential-stored') {
      value = { status: 'signed-out', wallets: [], bonusWallets: [] }
    } else {
      const client = {
        version: settings.clientVersion,
        locale: input.locale,
        timezoneOffsetSeconds: input.tzOffsetSeconds,
      }
      // The profile is optional decoration for the greeting: a missing name or a
      // failing profile read never hides the wallet itself.
      const [details, profile] = await Promise.all([
        withTimeout(service.getBalance(client), 4000).catch(() => null),
        typeof service.getProfile === 'function'
          ? withTimeout(service.getProfile(client), 4000).catch(() => null)
          : Promise.resolve(null),
      ])
      const name =
        profile?.status === 'ready' && typeof profile.value?.name === 'string' && profile.value.name.trim() !== ''
          ? profile.value.name.trim()
          : undefined
      const identity = name === undefined ? {} : { profile: { name } }
      value =
        details?.status === 'ready'
          ? {
              status: 'ready',
              wallets: walletsOf(details.value),
              bonusWallets: walletsOf(details.bonusWallets),
              ...identity,
            }
          : { status: 'failed', wallets: [], bonusWallets: [], ...identity }
    }
  } catch {
    value = { status: 'failed', wallets: [], bonusWallets: [] }
  }
  box.at = now
  box.value = value
  return value
}

/** Normalize wallet rows to plain currency/amount pairs. */
function walletsOf(wallets) {
  if (!Array.isArray(wallets)) return []
  const rows = []
  for (const wallet of wallets) {
    if (wallet === null || typeof wallet !== 'object') continue
    if (wallet.currency !== 'CNY' && wallet.currency !== 'USD') continue
    const amount = Number(wallet.balance)
    if (!Number.isFinite(amount)) continue
    rows.push({ currency: wallet.currency, amount })
  }
  return rows
}

/** Resolve configuration with defensive defaults. */
function resolveSettings(config) {
  const source = config !== null && typeof config === 'object' ? config : {}
  const prices = source.prices !== null && typeof source.prices === 'object' ? source.prices : {}
  const modelPrices = new Map()
  if (prices.models !== null && typeof prices.models === 'object') {
    for (const [model, value] of Object.entries(prices.models)) {
      const price = normalizePrice(value)
      if (price !== undefined) modelPrices.set(model, price)
    }
  }
  return {
    maxRunningTasks: integer(source.maxRunningTasks, 8, 1, 50),
    maxRecentTasks: integer(source.maxRecentTasks, 8, 1, 50),
    maxScanSessions: integer(source.maxScanSessions, 60, 1, 500),
    scanBudgetMs: integer(source.scanBudgetMs, 4000, 250, 20_000),
    balanceTtlMs: integer(source.balanceTtlMs, 60_000, 5_000, 3_600_000),
    clientVersion: typeof source.clientVersion === 'string' && source.clientVersion !== '' ? source.clientVersion : '1.0.0',
    defaultPrice: normalizePrice(prices.default) ?? FALLBACK_PRICE,
    modelPrices,
  }
}

function priceFor(settings, model) {
  return settings.modelPrices.get(model) ?? settings.defaultPrice
}

function normalizePrice(value) {
  if (value === null || typeof value !== 'object') return undefined
  const numbers = ['input', 'output', 'cacheRead'].map((key) => {
    const number = Number(value[key])
    return Number.isFinite(number) && number >= 0 ? number : undefined
  })
  if (numbers.some((number) => number === undefined)) return undefined
  return { input: numbers[0], output: numbers[1], cacheRead: numbers[2] }
}

function integer(value, fallback, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  if (value === null || value === '' || !Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

function normalizeLocale(value) {
  if (typeof value !== 'string') return 'en'
  const trimmed = value.trim().slice(0, 32)
  return trimmed === '' ? 'en' : trimmed
}

/** Start of the client's local calendar day, in epoch milliseconds. */
function localDayStart(now, tzOffsetSeconds) {
  const offsetMs = tzOffsetSeconds * 1000
  return Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs
}

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, tokens: 0, costCny: 0 }
}

function readTokens(usage) {
  return {
    input: count(usage.inputTokens),
    output: count(usage.outputTokens),
    cacheRead: count(usage.cacheReadTokens),
  }
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

/**
 * Price one assistant response. The log keeps cache-miss input, cache-hit input
 * and output apart, matching the provider's billed buckets.
 */
function costOf(tokens, price) {
  return (tokens.input * price.input + tokens.cacheRead * price.cacheRead + tokens.output * price.output) / TOKENS_PER_UNIT
}

function addUsage(bucket, tokens, cost) {
  return {
    inputTokens: bucket.inputTokens + tokens.input,
    outputTokens: bucket.outputTokens + tokens.output,
    cacheReadTokens: bucket.cacheReadTokens + tokens.cacheRead,
    tokens: bucket.tokens + tokens.input + tokens.output + tokens.cacheRead,
    costCny: bucket.costCny + cost,
  }
}

function mergeUsage(left, right) {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
    tokens: left.tokens + right.tokens,
    costCny: left.costCny + right.costCny,
  }
}

function finalizeUsage(usage) {
  return {
    inputTokens: Math.round(usage.inputTokens),
    outputTokens: Math.round(usage.outputTokens),
    cacheReadTokens: Math.round(usage.cacheReadTokens),
    tokens: Math.round(usage.tokens),
    costCny: Math.round(usage.costCny * 1_000_000) / 1_000_000,
  }
}

/** One text block of the first user message, as a title fallback. */
function userTextOf(message) {
  const content = message?.content
  if (!Array.isArray(content)) return undefined
  const text = content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text === '') return undefined
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

function isSummary(item) {
  return item !== null && typeof item === 'object' && typeof item.sessionId === 'string'
}

function byActivity(left, right) {
  return (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0)
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/** Bound one external call so a hung Platform request cannot hold the snapshot. */
function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('account request timed out')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
