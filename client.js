/**
 * The browser half of the Workbench bundle.
 *
 * The Host's client loader is a CommonJS factory model: it registers `{ id, factory }`,
 * calls `factory(require)` when the panel is materialised, and resolves `require` only
 * against registered plugin ids — a relative ESM import is not a module in that graph.
 * Everything therefore lives in this one file, inside the factory closure. The sections
 * below are separated by comments rather than files for that reason.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ==== text.js ================================================================
    /**
     * Every user-visible string, in one place, with the same keys in both languages.
     *
     * A key that exists in only one dictionary is a bug: the other language would render
     * the key itself. `test/client.test.mjs` checks that the two objects agree.
     */

    const NS = 'dsh.workbench'

    const zh = {
      panel: '工作台',
      'panel.description': '今日估算费用、运行中的会话与需要处理的事项',
      title: '工作台',
      loading: '正在加载工作台…',
      'error.title': '无法加载工作台数据',
      'error.body': '插件宿主部分没有响应，请重试或重启 DSH。',
      'error.retry': '重试',
      'error.schema': '数据格式版本不匹配（{got} / 需要 {want}）。请重启 DSH 以同时更新插件两端。',
      refresh: '刷新',
      'fresh.live': '实时同步',
      'fresh.stale': '离线快照',
      'fresh.cached': '正在同步…',

      'today.title': '今日概览',
      'today.subtitle': '{date} · {zone} · 已于 {time} 同步',
      'today.cost': '今日估算费用',
      'today.coverage': '计价覆盖 {percent}%',
      'today.noSample': '暂无样本',
      'today.tokens': '{tokens} tok',
      'today.running': '运行中',
      'today.runningDetail': '{waiting} 项等待',
      'today.attention': '待处理',
      'today.attentionDetail': '{failed} 失败 · {waiting} 等待',
      'today.speed': '生成速度',
      'today.speedValue': '{rate} tok/s',
      'today.speedNone': '暂无样本',
      'today.speedDetail': '{count} 个样本',
      'today.zero': '今日 {count} 个会话未计入费用：{reason}',
      'today.zero.noUsage': '没有读到时用量',
      'today.zero.noPrice': '价目表未生效',
      'today.day': '{date} · 今日',

      'running.title': '运行中的 Session',
      'running.empty': '没有正在运行的会话。',
      'running.hint': '点击打开原 Session',
      'running.turn': '本轮',
      'attention.title': '需要关注',
      'attention.empty': '没有需要处理的事项。',
      'attention.foot': '来自宿主待办与轮次结束事件',
      'attention.all': '全部',
      'attention.more': '还有 {count} 条',
      'attention.open': '打开会话',
      'attention.ack': '确认',
      'attention.snooze': '暂缓 30 分钟',
      'attention.dismiss': '关闭',
      'attention.dismissAria': '关闭这条提醒，后续不再提醒',
      'attention.closeHint': '关闭后不再提醒；若之后出现新的失败或等待，仍会重新提醒。',
      'attention.acknowledged': '已确认',
      'attention.snoozed': '已暂缓',
      'attention.key': '条目 ID',
      'attention.reason': '触发依据',
      'attention.triggered': '触发时间',

      'recent.title': '最近结束',
      'recent.empty': '近 7 天没有结束的会话。',
      'recent.hint': '近 7 天 · 按结束时间',

      'state.waiting': '等待用户',
      'state.running': '执行中',
      'state.stuck': '可能卡住',
      'state.failed': '执行异常',
      'state.ended': '已结束',
      'state.cancelled': '已取消',
      'state.unknown': '状态未知',
      'wait.approval': '等待审批',
      'wait.question': '等待回答',

      'field.session': '会话',
      'field.state': '状态',
      'field.project': '项目',
      'field.model': '模型',
      'field.turns': '{count} 轮',
      'field.children': '{count} 个子任务',
      'field.untitled': '未命名会话',
      'field.none': '—',

      'time.justNow': '刚刚',
      'time.minutesAgo': '{count} 分钟前',
      'time.hoursAgo': '{count} 小时前',
      'time.daysAgo': '{count} 天前',

      'cap.title': '宿主能力',
      'cap.catalog': '会话目录',
      'cap.log': '日志读取',
      'cap.projections': '投影',
      'cap.agents': '运行状态',
      'cap.missing': '不可用',
      foot: '本地数据 · 费用按价目表估算，不是平台账单',
      'foot.synced': '最后同步 {time}',

      'tabs.label': '工作台分区',
      'tabs.overview': '概览',
      'tabs.attention': '提醒',
      'tabs.capability': '状态',
    }

    const en = {
      panel: 'Workbench',
      'panel.description': "Today's estimated spend, running sessions and what needs you",
      title: 'Workbench',
      loading: 'Loading the workbench…',
      'error.title': 'Could not load the workbench',
      'error.body': 'The plugin host did not answer. Retry, or restart DSH.',
      'error.retry': 'Retry',
      'error.schema': 'Snapshot version mismatch ({got} / needs {want}). Restart DSH so both halves update together.',
      refresh: 'Refresh',
      'fresh.live': 'Live',
      'fresh.stale': 'Offline snapshot',
      'fresh.cached': 'Syncing…',

      'today.title': "Today's overview",
      'today.subtitle': '{date} · {zone} · synced {time}',
      'today.cost': 'Estimated spend today',
      'today.coverage': 'Priced {percent}%',
      'today.noSample': 'No sample',
      'today.tokens': '{tokens} tok',
      'today.running': 'Running',
      'today.runningDetail': '{waiting} waiting',
      'today.attention': 'To handle',
      'today.attentionDetail': '{failed} failed · {waiting} waiting',
      'today.speed': 'Generation speed',
      'today.speedValue': '{rate} tok/s',
      'today.speedNone': 'No sample',
      'today.speedDetail': '{count} samples',
      'today.zero': '{count} sessions today were not priced: {reason}',
      'today.zero.noUsage': 'no usage was read',
      'today.zero.noPrice': 'the price table did not apply',
      'today.day': '{date} · today',

      'running.title': 'Running sessions',
      'running.empty': 'Nothing is running.',
      'running.hint': 'Click to open the session',
      'running.turn': 'Turn',
      'attention.title': 'Needs attention',
      'attention.empty': 'Nothing needs your attention.',
      'attention.foot': 'From host waits and turn-end events',
      'attention.all': 'All',
      'attention.more': '{count} more',
      'attention.open': 'Open session',
      'attention.ack': 'Acknowledge',
      'attention.snooze': 'Snooze 30 min',
      'attention.dismiss': 'Close',
      'attention.dismissAria': 'Close this item; no further reminders',
      'attention.closeHint': 'No further reminders after closing; a new failure or wait raises a fresh item.',
      'attention.acknowledged': 'acknowledged',
      'attention.snoozed': 'snoozed',
      'attention.key': 'Item id',
      'attention.reason': 'Trigger',
      'attention.triggered': 'Triggered',

      'recent.title': 'Recently ended',
      'recent.empty': 'Nothing ended in the last 7 days.',
      'recent.hint': 'Last 7 days · by end time',

      'state.waiting': 'Waiting',
      'state.running': 'Running',
      'state.stuck': 'Possibly stuck',
      'state.failed': 'Failed',
      'state.ended': 'Ended',
      'state.cancelled': 'Cancelled',
      'state.unknown': 'Unknown',
      'wait.approval': 'approval',
      'wait.question': 'your answer',

      'field.session': 'Session',
      'field.state': 'State',
      'field.project': 'Project',
      'field.model': 'Model',
      'field.turns': '{count} turns',
      'field.children': '{count} children',
      'field.untitled': 'Untitled session',
      'field.none': '—',

      'time.justNow': 'just now',
      'time.minutesAgo': '{count} min ago',
      'time.hoursAgo': '{count} h ago',
      'time.daysAgo': '{count} d ago',

      'cap.title': 'Host capabilities',
      'cap.catalog': 'Session catalog',
      'cap.log': 'Log read',
      'cap.projections': 'Projections',
      'cap.agents': 'Run state',
      'cap.missing': 'unavailable',
      foot: 'Local data · estimated from the price table, not a bill',
      'foot.synced': 'Synced {time}',

      'tabs.label': 'Workbench sections',
      'tabs.overview': 'Overview',
      'tabs.attention': 'Alerts',
      'tabs.capability': 'Status',
    }


    // ==== format.js ==============================================================
    /**
     * Formatting. RMB only, tabular numbers, and never a guessed value.
     *
     * The workbench is a Chinese product priced in yuan; a `$` beside a yuan figure was a
     * real defect, so the currency is not a parameter here.
     */

    const RMB = '¥'

    /** Current interface language, set once at registration. */
    let language = 'zh'

    function setLanguage(value) {
      language = typeof value === 'string' && value !== '' ? value : 'zh'
    }

    function currentLanguage() {
      return language
    }

    /** Local timezone offset in seconds, east positive. */
    function tzOffsetSeconds() {
      return -new Date().getTimezoneOffset() * 60
    }

    /** `UTC+08:00` for the header. */
    function utcOffsetLabel() {
      const minutes = -new Date().getTimezoneOffset()
      const sign = minutes >= 0 ? '+' : '-'
      const absolute = Math.abs(minutes)
      return `UTC${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`
    }

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    /** `MM/DD HH:mm`. */
    function dateTimeOf(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return ''
      const date = new Date(value)
      return `${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    /** `HH:mm` of a timestamp. */
    function clockOf(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return ''
      const date = new Date(value)
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    /** `M月D日`, or the locale's medium date. */
    function dateLabel(time) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return ''
      try {
        return new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' }).format(new Date(value))
      } catch {
        return dateTimeOf(value)
      }
    }

    /** Money in RMB, two decimals; a non-zero amount below a cent says so. */
    function moneyOf(amount) {
      const value = Number(amount)
      if (!Number.isFinite(value)) return `${RMB}0.00`
      if (value > 0 && value < 0.01) return `<${RMB}0.01`
      return `${RMB}${value.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    /** Compact token counts: `1.2M`, `96k`, `138`. */
    function tokensOf(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '0'
      const trim = (text) => text.replace(/\.0$/, '')
      if (number >= 1_000_000) return `${trim((number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1))}M`
      if (number >= 1000) return `${trim((number / 1000).toFixed(number >= 100_000 ? 0 : 1))}k`
      return String(Math.round(number))
    }

    /** A generation rate, one decimal below 100. */
    function rateOf(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '—'
      return number >= 100 ? String(Math.round(number)) : String(Math.round(number * 10) / 10)
    }

    /** `2m41s` style durations. */
    function durationOf(ms) {
      const seconds = Number(ms) / 1000
      if (!Number.isFinite(seconds) || seconds <= 0) return '0s'
      if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
      const minutes = Math.floor(seconds / 60)
      const rest = Math.round(seconds % 60)
      if (minutes < 60) return `${minutes}m${pad2(rest)}s`
      const hours = Math.floor(minutes / 60)
      return `${hours}h${pad2(minutes % 60)}m`
    }

    /** Relative time from a translation function, so the wording stays local. */
    function relativeTime(t, time, now) {
      const at = Number(time)
      if (!Number.isFinite(at) || at <= 0) return ''
      const delta = Math.max(0, Number(now) - at)
      if (delta < 60_000) return t('time.justNow')
      const minutes = Math.floor(delta / 60_000)
      if (minutes < 60) return t('time.minutesAgo', { count: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('time.hoursAgo', { count: hours })
      return t('time.daysAgo', { count: Math.floor(hours / 24) })
    }

    /** The last path segment of a workspace. */
    function basename(path) {
      if (typeof path !== 'string' || path === '') return ''
      const parts = path.split(/[\\/]+/).filter((part) => part !== '')
      return parts.length === 0 ? path : parts[parts.length - 1]
    }

    /** Truncate for a single line, keeping the ending visible. */
    function clip(text, limit) {
      const value = String(text ?? '')
      return value.length > limit ? `${value.slice(0, limit)}…` : value
    }


    // ==== api.js =================================================================
    /**
     * The browser's side of the Host contract.
     *
     * One snapshot route, one action route. A snapshot is accepted only when its `schema`
     * matches this build: a mismatch used to render as blank panels, which is
     * indistinguishable from "no data", so it now becomes an explicit error.
     */

    const ROUTE = '/api/workbench/status'
    const ALERT_ROUTE = '/api/workbench/alerts'

    /** Must equal `src/snapshot.js`'s `SCHEMA_VERSION`. */
    const SCHEMA = 3

    class SchemaError extends Error {
      constructor(got) {
        super(`snapshot schema ${got} != ${SCHEMA}`)
        this.got = got
        this.want = SCHEMA
      }
    }

    /** Read one snapshot. Throws on transport failure or a schema mismatch. */
    async function readSnapshot(tzOffset, signal) {
      const response = await fetch(`${ROUTE}?tzOffset=${tzOffset}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body === null || typeof body !== 'object') throw new Error('invalid snapshot')
      if (body.schema !== SCHEMA) throw new SchemaError(body.schema)
      return body
    }

    /** Record a decision on one attention item. The local UI updates optimistically. */
    async function sendAlertAction(payload) {
      const response = await fetch(ALERT_ROUTE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return response.ok
    }


    // ==== hooks.js ===============================================================
    /**
     * Data hooks: one snapshot poll and one clock.
     *
     * The snapshot is cached in `sessionStorage` so returning to the panel paints the last
     * answer immediately instead of an empty shell, and a cached paint is never reported
     * as an outage. Freshness follows the browser's own clock, not the Host's stamp.
     */

    const POLL_MS = 15_000
    const RETRY_MS = 4_000
    const CACHE_KEY = 'dsh-workbench:snapshot:v3'
    const CACHE_MAX_AGE_MS = 10 * 60_000

    function readCache() {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (raw === null) return undefined
        const cached = JSON.parse(raw)
        if (!Number.isFinite(Number(cached?.at)) || Date.now() - Number(cached.at) > CACHE_MAX_AGE_MS) return undefined
        return cached.data !== null && typeof cached.data === 'object' ? cached.data : undefined
      } catch {
        return undefined
      }
    }

    function writeCache(data) {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
      } catch {
        // Storage full or disabled only costs the fast path.
      }
    }

    /**
     * Poll the snapshot.
     *
     * @param React - the runtime's React.
     * @param read - `(signal) => Promise<snapshot>`; supplied so a test can drive it.
     * @param tzOffset - the viewer's offset in seconds.
     * @returns `{ state, refresh }` with `state.status` one of
     *   `loading | ready | stale | error | cached`.
     */
    function useSnapshot(React, read, tzOffset) {
      const [state, setState] = React.useState(() => {
        const cached = readCache()
        return cached === undefined
          ? { status: 'loading', data: undefined, error: undefined }
          : { status: 'cached', data: cached, error: undefined }
      })
      const [attempt, setAttempt] = React.useState(0)
      const refresh = React.useCallback(() => setAttempt((value) => value + 1), [])

      React.useEffect(() => {
        const controller = new AbortController()
        let alive = true
        let timer

        const run = async () => {
          let delay = POLL_MS
          try {
            const data = await read(tzOffset, controller.signal)
            if (!alive) return
            writeCache(data)
            setState({ status: 'ready', data, error: undefined })
          } catch (error) {
            if (!alive || controller.signal.aborted) return
            // A cached or previous answer stays on screen; only the badge changes.
            setState((previous) => (previous.data === undefined ? { status: 'error', data: undefined, error } : { status: 'stale', data: previous.data, error }))
            delay = RETRY_MS
          }
          if (alive) timer = setTimeout(run, delay)
        }

        run()
        return () => {
          alive = false
          clearTimeout(timer)
          controller.abort()
        }
      }, [attempt, tzOffset])

      React.useEffect(() => {
        if (typeof document === 'undefined') return undefined
        const onVisible = () => {
          if (document.visibilityState === 'visible') setAttempt((value) => value + 1)
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
      }, [])

      return [state, refresh]
    }

    /** A ticking clock for relative times. */
    function useNow(React, interval = 30_000) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), interval)
        return () => clearInterval(timer)
      }, [interval])
      return now
    }

    /** Whether the panel is in its narrow layout. */
    function useNarrow(React, breakpoint = 720) {
      const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && Number(window.innerWidth) < breakpoint)
      React.useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
        const query = window.matchMedia(`(width<=${breakpoint - 1}px)`)
        const onChange = () => setNarrow(query.matches)
        setNarrow(query.matches)
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
      }, [breakpoint])
      return narrow
    }


    // ==== components.js ==========================================================
    /**
     * The small, reusable pieces: a glyph, a state badge, a metric card, an empty state.
     *
     * Every state carries an icon, a colour and a word, so colour is never the only signal
     * (PRD UX01) and a reader who cannot see the tint still reads the state.
     */


    const GLYPHS = {
      waiting: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5v3.4l2.1 1.3',
      running: 'M3.2 8h2.1M10.7 8h2.1M5.6 4.4l4.8 3.6-4.8 3.6z',
      stuck: 'M8 2.4 14 13H2zM8 6.2v3.2M8 11.2v.2',
      failed: 'M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8',
      ended: 'M3.8 8.4l2.7 2.7 5.7-5.9',
      cancelled: 'M4.6 8h6.8',
      unknown: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM6.4 6.4a1.7 1.7 0 1 1 2.2 1.6c-.5.2-.6.7-.6 1.1M8 11.4v.2',
      clock: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5v3.4l2.1 1.3',
      refresh: 'M13.4 8a5.4 5.4 0 1 1-1.6-3.8M13.4 2.6v3.1h-3.1',
      search: 'M7.2 2.6a4.6 4.6 0 1 0 2.9 8.2l3.4 3.4',
      open: 'M6.2 3.4h6.4v6.4M12.6 3.4 4.2 11.8',
      folder: 'M2.6 4.4h4l1.4 1.6h5.4v7.2H2.6z',
      calendar: 'M3.2 5.2h9.6v8.4H3.2zM5.6 3.2v3.2M10.4 3.2v3.2M3.2 7.6h9.6',
      check: 'M3.8 8.4l2.7 2.7 5.7-5.9',
    }

    /** One inline SVG glyph. */
    function Glyph({ name, size = 14 }) {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: GLYPHS[name] ?? GLYPHS.unknown,
          fill: name === 'running' ? 'currentColor' : 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /** The state a row is shown in, and its tone. */
    function stateOf(row) {
      const name = String(row?.state ?? 'unknown')
      return name in GLYPHS ? name : 'unknown'
    }

    function toneOf(state) {
      if (state === 'failed') return 'error'
      if (state === 'waiting' || state === 'stuck') return 'warn'
      if (state === 'running') return 'ok'
      if (state === 'ended') return 'idle'
      return 'muted'
    }

    /**
     * A running indicator: three dots pulsing in sequence.
     *
     * Motion is the only signal that something is *actively* happening; a static icon
     * reads the same as "ended". It stays a decoration (`aria-hidden`) — the badge still
     * carries the word 执行中, so colour and motion are never the only cues.
     */
    function RunningDots() {
      return h(
        'span',
        { className: 'wb-pulse', 'aria-hidden': 'true' },
        h('i'), h('i'), h('i'),
      )
    }

    /** Icon + colour + word, never colour alone. */
    function StateBadge({ t, state }) {
      return h(
        'span',
        { className: 'wb-badge', 'data-tone': toneOf(state), 'data-state': state },
        state === 'running' ? h(RunningDots) : h(Glyph, { name: state, size: 12 }),
        h('span', null, t(`state.${state}`)),
      )
    }

    /** A metric card: label, value, and one line saying what the value means. */
    function Metric({ label, value, detail, tone, onClick }) {
      const body = [
        h('span', { className: 'wb-metric-label', key: 'l' }, label),
        h('span', { className: 'wb-metric-value', key: 'v', 'data-tone': tone ?? 'default' }, value),
        detail === undefined ? null : h('span', { className: 'wb-metric-detail', key: 'd' }, detail),
      ]
      return onClick === undefined
        ? h('article', { className: 'wb-metric' }, ...body)
        : h('button', { type: 'button', className: 'wb-metric', onClick, 'aria-label': `${label}: ${value}` }, ...body)
    }

    /** A quiet panel with a title, an optional count and its body. */
    function Panel({ title, count, action, children, className }) {
      return h(
        'section',
        { className: `wb-panel ${className ?? ''}`.trim(), 'aria-label': title },
        h(
          'header',
          { className: 'wb-panel-head' },
          h('h2', { className: 'wb-panel-title' }, title),
          count === undefined ? null : h('span', { className: 'wb-count' }, count),
          h('span', { className: 'wb-fill' }),
          action ?? null,
        ),
        children,
      )
    }

    /** A sentence in place of content, with an optional retry. */
    function Empty({ text, onRetry, retryLabel }) {
      return h(
        'div',
        { className: 'wb-empty' },
        h('p', null, text),
        onRetry === undefined ? null : h('button', { type: 'button', className: 'wb-mini', onClick: onRetry }, retryLabel),
      )
    }

    /** A row of a wide table, or a card on a narrow screen. */
    function SessionRow({ t, row, now, onOpen, showProject = true }) {
      const state = stateOf(row)
      const title = row.title === undefined || row.title === '' ? t('field.untitled') : row.title
      const detail = detailOf(t, row, now)
      return h(
        'li',
        { className: 'wb-row', 'data-tone': toneOf(state), 'data-state': state },
        h(
          'button',
          { type: 'button', className: 'wb-row-main', onClick: () => onOpen(row.sessionId), 'aria-label': `${title} · ${t(`state.${state}`)}` },
          h(
            'span',
            { className: 'wb-row-body' },
            h('span', { className: 'wb-row-title' }, title),
            showProject && row.projectName !== undefined && row.projectName !== '' ? h('span', { className: 'wb-row-project' }, row.projectName) : null,
            h('span', { className: 'wb-row-detail' }, detail),
          ),
          h(StateBadge, { t, state }),
          row.today !== undefined && row.today.amount > 0 ? h('span', { className: 'wb-row-amount' }, moneyOf(row.today.amount)) : null,
          h('span', { className: 'wb-row-open', 'aria-hidden': 'true' }, h(Glyph, { name: 'open', size: 12 })),
        ),
      )
    }

    /** One line explaining why a row looks the way it does. */
    function detailOf(t, row, now) {
      if (row.state === 'waiting') return `${t(row.waiting?.kind === 'question' ? 'wait.question' : 'wait.approval')} · ${relativeTime(t, row.lastAt, now)}`
      if (row.state === 'failed') return `${t('state.failed')} · ${relativeTime(t, row.endedAt ?? row.lastAt, now)}`
      if (row.turns > 0) return `${t('field.turns', { count: row.turns })} · ${tokensOf(row.tokens && row.tokens.output)} tok · ${relativeTime(t, row.lastAt, now)}`
      return relativeTime(t, row.lastAt, now)
    }


    // ==== alerts.js ==============================================================
    /**
     * Attention items: one compact row for attention, one expanded view for evidence.
     *
     * The compact row answers "what is wrong and where"; the expanded view adds the
     * trigger, the item id and the reader's own decision. Acknowledging only marks the
     * item; handling the wait still happens in the original Session.
     */


    /** One item in a list. */
    function AlertItem({ t, item, now, onOpen, onAction }) {
      const title = item.title === undefined || item.title === '' ? t('field.untitled') : item.title
      const reason = item.type === 'failure' ? t('state.failed') : t(item.reason === 'question' ? 'wait.question' : 'wait.approval')
      return h(
        'li',
        { className: 'wb-alert', 'data-tone': item.type === 'failure' ? 'error' : 'warn' },
        h(
          'button',
          { type: 'button', className: 'wb-alert-body', onClick: onOpen, 'aria-label': `${title} · ${reason}` },
          h('span', { className: 'wb-alert-title' }, `${reason} · ${title}`),
          h('span', { className: 'wb-alert-meta' }, `${item.projectName ?? ''} · ${relativeTime(t, item.triggeredAt, now)}`),
        ),
        h(
          'div',
          { className: 'wb-alert-actions' },
          h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'ack') }, t('attention.ack')),
          h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'snooze') }, t('attention.snooze')),
          h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'dismiss'), 'aria-label': t('attention.dismissAria') }, t('attention.dismiss')),
        ),
      )
    }

    /** The expanded view: what triggered it, and the way into the Session. */
    function AlertDetail({ t, item, now, onBack, onAction, openSession }) {
      const facts = [
        [t('field.session'), item.title ?? t('field.untitled')],
        [t('field.project'), item.projectName ?? t('field.none')],
        [t('field.state'), t(`state.${item.currentState ?? 'unknown'}`)],
        [t('attention.reason'), item.reason ?? t('attention.foot')],
        [t('attention.triggered'), `${clockOf(item.triggeredAt)} · ${relativeTime(t, item.triggeredAt, now)}`],
        [t('attention.key'), item.key],
      ]
      return h(
        React.Fragment,
        null,
        h('div', { className: 'wb-detailbar' }, h('button', { type: 'button', className: 'wb-mini', onClick: onBack }, `← ${t('attention.title')}`)),
        h(
          'section',
          { className: 'wb-panel' },
          h('h2', { className: 'wb-panel-title' }, item.title ?? t('field.untitled')),
          h('dl', { className: 'wb-facts' }, ...facts.map(([label, value]) => h('div', { key: label, className: 'wb-fact' }, h('dt', null, label), h('dd', null, String(value ?? t('field.none')))))),
          h(
            'div',
            { className: 'wb-detail-actions' },
            h('button', { type: 'button', className: 'wb-mini wb-mini-primary', onClick: () => openSession(item.sessionId) }, h(Glyph, { name: 'open', size: 12 }), t('attention.open')),
            h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'ack') }, t('attention.ack')),
            h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'snooze') }, t('attention.snooze')),
            h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'dismiss') }, t('attention.dismiss')),
          ),
          h('p', { className: 'wb-hint' }, t('attention.closeHint')),
        ),
      )
    }



    // ==== styles.js ==============================================================
    /**
     * The panel's stylesheet.
     *
     * Colour comes from the Host's alias tokens, so the panel follows both themes without
     * a second palette. Badges use translucent tints over the surface rather than opaque
     * state fills, which is what made a "0% coverage" badge look like a solid button.
     */
    const CSS = `
    .wb-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;--wb-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;--wb-ok:var(--dsw-alias-state-success-primary);--wb-warn:var(--dsw-alias-state-warning-primary);--wb-err:var(--dsw-alias-state-error-primary);--wb-accent:var(--dsw-alias-brand-primary)}
    .wb-scroll{flex:1;min-height:0;overflow:auto}
    .wb-content{padding:28px 24px 24px;max-width:1240px;margin:0 auto}
    .wb-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px}
    .wb-eyebrow{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase}
    .wb-h1{margin:2px 0 0;font-size:26px;font-weight:600;line-height:34px;letter-spacing:-.02em}
    .wb-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}
    .wb-head-side{display:flex;align-items:center;gap:8px}
    .wb-fresh{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:12px;font-size:11.5px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-secondary)}
    .wb-fresh[data-state=ready] i{background:var(--wb-ok)}
    .wb-fresh[data-state=stale] i{background:var(--wb-warn)}
    .wb-fresh[data-state=cached] i{background:var(--wb-accent)}
    .wb-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
    .wb-icon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:15px;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
    .wb-icon:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
    .wb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
    .wb-metric{display:flex;flex-direction:column;gap:2px;min-width:0;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}
    button.wb-metric{cursor:pointer}
    button.wb-metric:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}
    .wb-metric-label{color:var(--dsw-alias-label-tertiary);font-size:12px}
    .wb-metric-value{font-family:var(--wb-mono);font-size:24px;font-weight:600;line-height:32px;font-variant-numeric:tabular-nums}
    .wb-metric-value[data-tone=alert]{color:var(--wb-err)}
    .wb-metric-value[data-tone=default]{color:var(--dsw-alias-label-primary)}
    .wb-metric-detail{color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:17px}
    .wb-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr);gap:12px;align-items:start}
    .wb-main,.wb-aside{display:flex;flex-direction:column;gap:12px;min-width:0}
    .wb-panel{min-width:0;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
    .wb-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .wb-panel-title{margin:0;font-size:14px;font-weight:600;line-height:22px}
    .wb-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 7px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px}
    .wb-fill{flex:1}
    .wb-hint{color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-rows,.wb-alerts{list-style:none;margin:0;padding:0}
    .wb-row{border-bottom:.5px solid var(--dsw-alias-border-l1)}
    .wb-row:last-child{border-bottom:0}
    /* A quiet static marker on the leading edge: no motion here. */
    .wb-row[data-state=running]{position:relative}
    .wb-row[data-state=running]::before{content:'';position:absolute;left:0;top:6px;bottom:6px;width:2px;border-radius:2px;background:var(--wb-ok);opacity:.6}
    .wb-row-main{display:flex;align-items:center;gap:10px;width:100%;padding:10px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .wb-row-main:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
    .wb-row-body{display:flex;flex-direction:column;flex:1;min-width:0;gap:1px}
    .wb-row-title{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-row-project{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px}
    .wb-row-detail{color:var(--dsw-alias-label-secondary);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-row-amount{font-family:var(--wb-mono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .wb-row-open{color:var(--dsw-alias-label-tertiary)}
    .wb-badge{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:5px;font-size:11px;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-secondary)}
    .wb-badge[data-tone=ok]{background:color-mix(in srgb,var(--wb-ok) 13%,transparent);color:var(--wb-ok)}
    .wb-badge[data-tone=warn]{background:color-mix(in srgb,var(--wb-warn) 14%,transparent);color:var(--wb-warn)}
    .wb-badge[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 13%,transparent);color:var(--wb-err)}
    .wb-pulse{display:inline-flex;align-items:center;justify-content:center;gap:2px;width:14px;height:12px;flex:none}
    .wb-pulse i{display:block;width:3px;height:3px;border-radius:50%;background:currentColor;animation:wb-pulse 1.15s ease-in-out infinite}
    .wb-pulse i:nth-child(2){animation-delay:.16s}
    .wb-pulse i:nth-child(3){animation-delay:.32s}
    @keyframes wb-pulse{0%,55%,100%{opacity:.32;transform:scale(.8)}28%{opacity:1;transform:scale(1.4)}}
    .wb-badge[data-state=running]{animation:wb-breathe 2.6s ease-in-out infinite}
    @keyframes wb-breathe{0%,100%{box-shadow:inset 0 0 0 0 color-mix(in srgb,var(--wb-ok) 0%,transparent)}50%{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--wb-ok) 26%,transparent)}}
    .wb-alert{display:flex;flex-direction:column;gap:6px;padding:9px 10px;margin-bottom:6px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--wb-warn) 6%,transparent)}
    .wb-alert[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 6%,transparent)}
    .wb-alert-body{display:flex;flex-direction:column;gap:1px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:0}
    .wb-alert-title{font-size:12.5px;font-weight:600}
    .wb-alert-meta{color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-alert-actions{display:flex;flex-wrap:wrap;gap:4px}
    .wb-mini{height:26px;padding:0 9px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
    .wb-mini:hover{border-color:var(--dsw-alias-label-tertiary);color:var(--dsw-alias-label-primary)}
    .wb-mini-primary{border-color:color-mix(in srgb,var(--wb-accent) 55%,transparent);color:var(--wb-accent)}
    .wb-caps{padding-bottom:12px}
    .wb-caps-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
    .wb-caps-list li{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
    .wb-caps-list li[data-tone=warn]{color:var(--wb-warn)}
    .wb-caps-value{margin-left:auto;font-family:var(--wb-mono);font-size:11px;color:var(--dsw-alias-label-tertiary)}
    .wb-empty{padding:20px 4px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}
    .wb-stub{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:40px 20px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}
    .wb-stub-title{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;margin:0}
    .wb-detabar,.wb-detailbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .wb-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;margin:10px 0}
    .wb-fact dt{color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-fact dd{margin:0;font-size:12.5px;font-family:var(--wb-mono);overflow-wrap:anywhere}
    .wb-detail-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .wb-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:16px;color:var(--dsw-alias-label-tertiary);font-size:11px}
    @media (width<=1199px){.wb-grid{grid-template-columns:minmax(0,1fr)}}
    @media (width<=767px){.wb-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.wb-content{padding:20px 14px 16px}.wb-h1{font-size:22px;line-height:30px}}
    @media (width<=419px){.wb-metric{padding:10px 12px}.wb-metric-value{font-size:19px;line-height:26px}}
    /* Without motion the running state still reads as running: a solid dot row and a
       solid leading bar, never a blank or blinking placeholder. */
    @media (prefers-reduced-motion:reduce){
      *{animation:none!important;transition:none!important}
      .wb-pulse i{opacity:1;transform:none}
      .wb-badge[data-state=running]{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--wb-ok) 26%,transparent)}
    }
    `


    // ==== panel.js ===============================================================
    /**
     * The workbench panel: today's numbers first, then what needs a decision, then what is
     * running, then what ended.
     *
     * One snapshot drives every section, so a badge and its card can never disagree. Each
     * section degrades on its own: an unreadable catalog leaves the numbers at zero and
     * says so in the capability strip rather than hiding the panel.
     */


    /**
     * The panel.
     *
     * @param props - slot props: `t`, `openSession`.
     */
    function WorkbenchPage({ t, openSession }) {
        const tz = tzOffsetSeconds()
        const [state, refresh] = useSnapshot(React, readSnapshot, tz)
        const now = useNow(React)
        const [detail, setDetail] = React.useState(undefined)
        const [marks, setMarks] = React.useState({})
        const data = state.data
        const loading = state.status === 'loading' && data === undefined

        if (loading) {
          return h('section', { className: 'wb-page', 'aria-label': t('title') }, h('style', null, CSS), h('p', { className: 'wb-stub', role: 'status' }, t('loading')))
        }
        if (state.status === 'error') {
          const schema = state.error instanceof SchemaError
          return h(
            'section',
            { className: 'wb-page', 'aria-label': t('title') },
            h('style', null, CSS),
            h(
              'div',
              { className: 'wb-stub', role: 'alert' },
              h('p', { className: 'wb-stub-title' }, t('error.title')),
              h('p', null, schema ? t('error.schema', { got: String(state.error.got), want: String(SCHEMA) }) : t('error.body')),
              h('button', { type: 'button', className: 'wb-mini', onClick: refresh }, t('error.retry')),
            ),
          )
        }

        // Local marks let a click take effect before the Host answers; the next snapshot wins.
        const alerts = (data.alerts ?? []).map((item) => (marks[item.key] === undefined ? item : { ...item, state: marks[item.key] }))
        const pending = alerts.filter((item) => item.state === 'open' || item.state === 'acknowledged')

        const act = async (item, action) => {
          const next = action === 'ack' ? 'acknowledged' : action === 'dismiss' ? 'solved' : 'snoozed'
          setMarks((previous) => ({ ...previous, [item.key]: next }))
          await sendAlertAction({ key: item.key, action: action === 'dismiss' ? 'solve' : action, triggeredAt: item.triggeredAt, state: item.currentState, minutes: 30 }).catch(() => {})
          refresh()
        }

        if (detail !== undefined) {
          const item = alerts.find((entry) => entry.key === detail)
          return h(
            'section',
            { className: 'wb-page', 'aria-label': t('title') },
            h('style', null, CSS),
            item === undefined
              ? h(Empty, { text: t('attention.empty') })
              : h(AlertDetail, { t, item, now, onBack: () => setDetail(undefined), onAction: act, openSession }),
          )
        }

        const overview = data.overview ?? {}
        const zeroReason = overview.amount === 0 && overview.sessions > 0
          ? t('today.zero', { count: overview.sessions, reason: overview.unpricedTokens > 0 ? t('today.zero.noPrice') : t('today.zero.noUsage') })
          : undefined
        const coverage = overview.coverage === undefined || overview.coverage === null
          ? t('today.noSample')
          : t('today.coverage', { percent: Math.round(Number(overview.coverage) * 100) })

        return h(
          'section',
          { className: 'wb-page', 'aria-label': t('title') },
          h('style', null, CSS),
          h(
            'div',
            { className: 'wb-scroll' },
            h(
              'div',
              { className: 'wb-content' },
              h(
                'header',
                { className: 'wb-head' },
                h(
                  'div',
                  null,
                  h('span', { className: 'wb-eyebrow' }, 'LOCAL / ', data.overview?.dayKey ?? ''),
                  h('h1', { className: 'wb-h1' }, t('today.title')),
                  h('p', { className: 'wb-sub' }, t('today.subtitle', { date: dateLabel(data.generatedAt), zone: utcOffsetLabel(), time: new Date(data.generatedAt).toLocaleTimeString() })),
                ),
                h(
                  'div',
                  { className: 'wb-head-side' },
                  h('span', { className: 'wb-fresh', 'data-state': state.status }, h('i', { className: 'wb-dot', 'aria-hidden': 'true' }), t(state.status === 'ready' ? 'fresh.live' : state.status === 'cached' ? 'fresh.cached' : 'fresh.stale')),
                  h('button', { type: 'button', className: 'wb-icon', onClick: refresh, 'aria-label': t('refresh') }, h(Glyph, { name: 'refresh', size: 14 })),
                ),
              ),
              h(
                'div',
                { className: 'wb-metrics' },
                h(Metric, { label: t('today.cost'), value: moneyOf(overview.amount), detail: zeroReason ?? `${coverage} · ${t('today.tokens', { tokens: tokensOf(overview.tokens) })}` }),
                h(Metric, { label: t('today.running'), value: String(overview.running ?? 0), detail: t('today.runningDetail', { waiting: overview.waiting ?? 0 }) }),
                h(Metric, { label: t('today.attention'), value: String(pending.length), tone: pending.length > 0 ? 'alert' : 'default', detail: t('today.attentionDetail', { failed: overview.failed ?? 0, waiting: overview.waiting ?? 0 }), onClick: undefined }),
                h(Metric, {
                  h,
                  label: t('today.speed'),
                  value: overview.speed === undefined ? t('today.speedNone') : t('today.speedValue', { rate: rateOf(overview.speed.p50) }),
                  detail: overview.speed === undefined ? '—' : t('today.speedDetail', { count: overview.speed.samples }),
                }),
              ),
              h(
                'div',
                { className: 'wb-grid' },
                h(
                  'div',
                  { className: 'wb-main' },
                  h(
                    Panel,
                    { h, title: t('running.title'), count: String((data.running ?? []).length) },
                    (data.running ?? []).length === 0
                      ? h(Empty, { text: t('running.empty') })
                      : h('ul', { className: 'wb-rows' }, ...data.running.map((row) => h(SessionRow, { key: row.sessionId, t, row, now, onOpen: openSession }))),
                  ),
                  h(
                    Panel,
                    { h, title: t('recent.title'), count: undefined, action: h('span', { className: 'wb-hint' }, t('recent.hint')) },
                    (data.recent ?? []).length === 0
                      ? h(Empty, { text: t('recent.empty') })
                      : h('ul', { className: 'wb-rows' }, ...data.recent.map((row) => h(SessionRow, { key: row.sessionId, t, row, now, onOpen: openSession }))),
                  ),
                ),
                h(
                  'aside',
                  { className: 'wb-aside' },
                  h(
                    Panel,
                    { h, title: t('attention.title'), count: String(pending.length), action: pending.length > 3 ? h('span', { className: 'wb-hint' }, t('attention.more', { count: pending.length - 3 })) : null },
                    pending.length === 0
                      ? h(Empty, { text: t('attention.empty') })
                      : h('ul', { className: 'wb-alerts' }, ...pending.slice(0, 3).map((item) => h(AlertItem, { key: item.key, t, item, now, onOpen: () => openSession(item.sessionId), onAction: act, onDetail: () => setDetail(item.key) }))),
                  ),
                  h(Capabilities, { t, capabilities: data.capabilities ?? {} }),
                ),
              ),
              h('footer', { className: 'wb-foot' }, h('span', null, t('foot')), h('span', null, t('foot.synced', { time: new Date(data.generatedAt).toLocaleTimeString() }))),
            ),
          ),
        )
      }

    /** What the Host could and could not answer: a silent zero is worse than a reason. */
    function Capabilities({ t, capabilities }) {
      const rows = [
        ['cap.catalog', capabilities.catalog],
        ['cap.log', capabilities.log],
        ['cap.projections', capabilities.projections],
        ['cap.agents', capabilities.agents],
      ]
      return h(
        'section',
        { className: 'wb-panel wb-caps' },
        h('h2', { className: 'wb-panel-title' }, t('cap.title')),
        h(
          'ul',
          { className: 'wb-caps-list' },
          ...rows.map(([key, value]) =>
            h(
              'li',
              { key, 'data-tone': value === 'unavailable' ? 'warn' : 'ok' },
              h(Glyph, { name: value === 'unavailable' ? 'stuck' : 'check', size: 12 }),
              h('span', null, t(key)),
              h('span', { className: 'wb-caps-value' }, value === 'unavailable' ? t('cap.missing') : String(value)),
            ),
          ),
        ),
      )
    }

    /** The sidebar entry. */
    function WorkbenchIcon() {
    return h(
      'svg',
      { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' },
      h('rect', { x: 2, y: 2, width: 5, height: 12, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('rect', { x: 9, y: 2, width: 5, height: 5, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('rect', { x: 9, y: 9, width: 5, height: 5, rx: 1.2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
    )
    }


    // ==== registration ======================================================
    const PANEL_ID = 'workbench'

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-workbench: dictionaries')
        const t = ctx.locale.bind(NS)
        // The visible dictionary decides formatting; the browser locale does not.
        setLanguage(t('panel') === zh.panel ? 'zh' : 'en')

        const openSession = (sessionId) => {
          const workspace = ctx.get('uiWorkspace')
          if (workspace !== undefined && typeof workspace.openSession === 'function') {
            workspace.openSession(sessionId)
            return
          }
          const sessions = ctx.get('sessions')
          if (sessions !== undefined && typeof sessions.open === 'function') sessions.open(sessionId)
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ openSession }) }, WorkbenchPage),
        )
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 20, locale: NS, label: () => t('panel') }, WorkbenchIcon),
        )
      },
    }
  },
})
