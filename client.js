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
      'today.subtitle': '{scope} · {zone} · 已于 {time} 同步',
      'today.cost': '今日估算费用',
      'today.coverage': '计价覆盖 {percent}%',
      'today.noSample': '暂无样本',
      'today.tokens': '{tokens} tok',
      'today.running': '运行中',
      'today.runningDetail': '{waiting} 项等待',
      'today.attention': '待处理',
      'today.attentionDetail': '{failed} 失败 · {waiting} 等待',
      'today.speed': '生成速度',
      'today.speedP50': '生成速度 P50',
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

      'detail.back': '返回概览',
      'side.group.workbench': '工作台',
      'side.group.analysis': '分析与记录',
      'side.group.preferences': '偏好设置',
      'side.overview': '今日概览',
      'side.sessions': 'Session',
      'side.attention': '需要关注',
      'side.projects': '项目',
      'side.cost': '消耗归因',
      'side.performance': '模型性能',
      'side.records': '工作记录',
      'side.settings': '设置',
      'side.workspace': '本地工作区',
      'side.profile': '个人配置 · local',
      'side.profileValue': '当前 profile · local',
      'side.data': '本地数据',
      'side.soon': '{name}：本版本暂未提供',
      'side.soonShort': '待上线',
      'top.search': '搜索 Session',
      'top.searchHint': '搜索在后续版本提供',
      'today.scope': '所有项目',
      'today.date': '{date} · 今天',
      'field.action': '最后动作',
      'field.duration': '本轮耗时',
      'field.todayCost': '今日估算',
      'field.open': '打开',
      'action.tool': '运行工具中',
      'action.generating': '模型正在生成',
      'action.failed': '轮次已终止',
      'action.prompt': '{text}',
      'running.open': '打开 {title}',
      'alert.failure': '执行异常',
      'alert.waiting': '等待确认',
      'projects.title': '项目工作进展',
      'projects.all': '查看项目',
      'projects.sessions': '{count} 个 Session 有活动',
      'projects.empty': '今天还没有项目活动。',
      'cost.all': '查看明细',
      'cost.foot': '今日已知估算 · {amount}',
      'speed.title': '模型性能',
      'speed.week': '近 7 天',
      'speed.empty': '近 7 天没有成功的生成样本。',
      'speed.detail': '{count} 个有效样本',
      'recent.hint': '查看历史',
      'worklog.title': '工作记录与账户',
      'worklog.open': '打开日报',
      'worklog.summary': '今日摘要 · {count} 个会话有花费',
      'worklog.priced': '计价 {percent}%',
      'worklog.tokens': '{tokens} tok',
      'worklog.account': '账户余额 · 不可获取',
      'nav.overview': '概览',
      'nav.cost': '消耗归因',
      'nav.attention': '需要关注',
      'cost.title': '消耗归因',
      'cost.subtitle': '{date} · 人民币 · 估算',
      'cost.today': '今日估算费用',
      'cost.tokens': '今日 Token',
      'cost.sessions': '{count} 个会话',
      'cost.unpriced': '未计价 Token',
      'cost.unpricedHint': '这些用量缺少价目，覆盖率已降低',
      'cost.allPriced': '全部用量均可计价',
      'cost.byProject': '按项目',
      'cost.todaySessions': '今日会话花费',
      'cost.trend': '近 7 天',
      'cost.last7': '含今日',
      'cost.empty': '没有可展示的用量。',
      'cost.note': '按价目表 {ref} 估算，不是平台账单。',
      'cost.notEstimable': '不可估算',
      'cost.unpricedRow': '缺价目',
      'cost.open': '查看消耗归因',
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
      'today.subtitle': '{scope} · {zone} · synced {time}',
      'today.cost': 'Estimated spend today',
      'today.coverage': 'Priced {percent}%',
      'today.noSample': 'No sample',
      'today.tokens': '{tokens} tok',
      'today.running': 'Running',
      'today.runningDetail': '{waiting} waiting',
      'today.attention': 'To handle',
      'today.attentionDetail': '{failed} failed · {waiting} waiting',
      'today.speed': 'Generation speed',
      'today.speedP50': 'Speed P50',
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

      'detail.back': 'Back to overview',
      'side.group.workbench': 'Workbench',
      'side.group.analysis': 'Analysis',
      'side.group.preferences': 'Preferences',
      'side.overview': "Today's overview",
      'side.sessions': 'Sessions',
      'side.attention': 'Needs attention',
      'side.projects': 'Projects',
      'side.cost': 'Cost attribution',
      'side.performance': 'Model performance',
      'side.records': 'Work log',
      'side.settings': 'Settings',
      'side.workspace': 'Local workspace',
      'side.profile': 'Personal config · local',
      'side.profileValue': 'profile · local',
      'side.data': 'Local data',
      'side.soon': '{name}: not in this version yet',
      'side.soonShort': 'soon',
      'top.search': 'Search sessions',
      'top.searchHint': 'Search arrives in a later version',
      'today.scope': 'All projects',
      'today.date': '{date} · today',
      'field.action': 'Last action',
      'field.duration': 'Turn time',
      'field.todayCost': 'Today est.',
      'field.open': 'Open',
      'action.tool': 'Running a tool',
      'action.generating': 'Model is generating',
      'action.failed': 'Turn failed',
      'action.prompt': '{text}',
      'running.open': 'Open {title}',
      'alert.failure': 'Failed',
      'alert.waiting': 'Waiting',
      'projects.title': 'Project progress',
      'projects.all': 'See projects',
      'projects.sessions': '{count} sessions active',
      'projects.empty': 'No project activity today.',
      'cost.all': 'See detail',
      'cost.foot': "Today's known estimate · {amount}",
      'speed.title': 'Model performance',
      'speed.week': 'Last 7 days',
      'speed.empty': "No successful generation in the last 7 days.",
      'speed.detail': '{count} valid samples',
      'recent.hint': 'See history',
      'worklog.title': 'Work log and account',
      'worklog.open': 'Open report',
      'worklog.summary': "Today's summary · {count} sessions with spend",
      'worklog.priced': 'Priced {percent}%',
      'worklog.tokens': '{tokens} tok',
      'worklog.account': 'Account balance · unavailable',
      'nav.overview': 'Overview',
      'nav.cost': 'Cost',
      'nav.attention': 'Attention',
      'cost.title': 'Cost attribution',
      'cost.subtitle': '{date} · CNY · estimate',
      'cost.today': 'Estimated spend today',
      'cost.tokens': 'Tokens today',
      'cost.sessions': '{count} sessions',
      'cost.unpriced': 'Unpriced tokens',
      'cost.unpricedHint': 'These tokens have no price entry; coverage is lower',
      'cost.allPriced': 'Every token is priced',
      'cost.byProject': 'By project',
      'cost.todaySessions': "Today's sessions",
      'cost.trend': 'Last 7 days',
      'cost.last7': 'includes today',
      'cost.empty': 'No usage to show.',
      'cost.note': 'Estimated with price table {ref}; not a platform bill.',
      'cost.notEstimable': 'Not estimable',
      'cost.unpricedRow': 'no price',
      'cost.open': 'Cost attribution',
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

    /** Sum of the four exclusive token buckets (a value the Host may send as an object). */
    function sumTokens(buckets) {
      if (buckets === null || typeof buckets !== 'object') return Number(buckets) || 0
      return (
        (Number(buckets.uncachedInput) || 0) +
        (Number(buckets.cacheReadInput) || 0) +
        (Number(buckets.cacheWriteInput) || 0) +
        (Number(buckets.output) || 0)
      )
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
    /* ---- shell: sidebar + body --------------------------------------------- */
    .wb-shell{display:flex;height:100%;min-height:0;width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.55;--wb-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;--wb-ok:var(--dsw-alias-state-success-primary);--wb-warn:var(--dsw-alias-state-warning-primary);--wb-err:var(--dsw-alias-state-error-primary);--wb-accent:var(--dsw-alias-brand-primary);--wb-soft:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);--wb-line:var(--dsw-alias-border-l1)}
    .wb-side{flex:0 0 211px;display:flex;flex-direction:column;gap:2px;min-height:0;padding:14px 10px 10px;overflow-y:auto;background:color-mix(in srgb,var(--dsw-alias-label-primary) 2.5%,var(--dsw-alias-bg-base));border-right:.5px solid var(--wb-line)}
    .wb-brand{display:flex;align-items:center;gap:8px;padding:2px 8px 12px}
    .wb-logo{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base)}
    .wb-brand-name{font-size:13px;font-weight:600}
    .wb-workspace{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px;border-radius:9px;border:.5px solid var(--wb-line);background:var(--dsw-alias-bg-layer-1)}
    .wb-workspace-badge{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:6px;background:color-mix(in srgb,var(--wb-accent) 18%,transparent);color:var(--wb-accent);font-size:11px;font-weight:600}
    .wb-workspace-text{display:flex;flex-direction:column;min-width:0}
    .wb-workspace-name{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-workspace-sub{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
    .wb-side-group{display:flex;flex-direction:column;gap:1px;margin-bottom:10px}
    .wb-side-label{padding:0 8px 6px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;letter-spacing:.02em}
    .wb-side-item{display:flex;align-items:center;gap:8px;width:100%;min-height:30px;padding:5px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
    .wb-side-item:hover:not([data-soon=true]){background:var(--wb-soft);color:var(--dsw-alias-label-primary)}
    .wb-side-item[aria-current=page]{background:color-mix(in srgb,var(--wb-accent) 14%,transparent);color:var(--wb-accent);font-weight:600}
    [data-soon=true].wb-side-item{color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary));cursor:default}
    .wb-side-item-label{flex:1;min-width:0}
    .wb-side-badge{min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--wb-err);color:var(--dsw-alias-brand-primary-invert);font-family:var(--wb-mono);font-size:10px;line-height:16px;font-style:normal;text-align:center}
    .wb-side-soon{font-size:9.5px;padding:1px 4px;border-radius:4px;background:var(--wb-soft);color:var(--dsw-alias-label-tertiary);font-style:normal;white-space:nowrap}
    .wb-side-foot{margin-top:auto;padding:10px 8px 2px;border-top:.5px solid var(--wb-line)}
    .wb-side-profile{display:block;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
    /* ---- body ------------------------------------------------------------- */
    .wb-body{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0}
    .wb-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 24px;border-bottom:.5px solid var(--wb-line)}
    .wb-crumbs{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:12px}
    .wb-crumb-sep{margin-right:6px;color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary))}
    .wb-crumb-current{color:var(--dsw-alias-label-primary)}
    .wb-top-side{display:flex;align-items:center;gap:8px}
    .wb-search{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px;border-radius:15px;border:.5px solid var(--wb-line);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}
    .wb-search:disabled{cursor:default;opacity:.75}
    .wb-kbd{padding:1px 5px;border-radius:4px;border:.5px solid var(--wb-line);font-family:var(--wb-mono);font-size:10px}
    .wb-scroll{flex:1;min-height:0;overflow:auto}
    .wb-content{padding:22px 24px 24px;max-width:1240px;margin:0 auto}
    /* ---- page head -------------------------------------------------------- */
    .wb-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px}
    .wb-eyebrow{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:14px;letter-spacing:.14em;text-transform:uppercase}
    .wb-h1{margin:2px 0 0;font-size:26px;font-weight:600;line-height:34px;letter-spacing:-.02em}
    .wb-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}
    .wb-head-side{display:flex;align-items:center;gap:8px}
    .wb-date{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:8px;border:.5px solid var(--wb-line);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
    /* ---- metrics ---------------------------------------------------------- */
    .wb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
    .wb-metric{display:flex;flex-direction:column;gap:2px;min-width:0;padding:12px 14px;border-radius:10px;border:.5px solid var(--wb-line);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}
    button.wb-metric{cursor:pointer}
    button.wb-metric:hover{border-color:color-mix(in srgb,var(--wb-accent) 40%,transparent)}
    .wb-metric-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
    .wb-metric-label{color:var(--dsw-alias-label-tertiary);font-size:11.5px}
    .wb-metric-glyph{color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary))}
    .wb-metric-value{font-family:var(--wb-mono);font-size:23px;font-weight:600;line-height:31px;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
    .wb-metric-value[data-tone=alert]{color:var(--wb-err)}
    .wb-metric-detail{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
    /* ---- card grid -------------------------------------------------------- */
    .wb-row-2{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,1fr);gap:12px;margin-bottom:12px;align-items:start}
    .wb-row-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px;align-items:start}
    .wb-panel{min-width:0;padding:13px 15px;border-radius:10px;border:.5px solid var(--wb-line);background:var(--dsw-alias-bg-layer-1)}
    .wb-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:9px}
    .wb-panel-title{margin:0;font-size:13.5px;font-weight:600;line-height:21px}
    .wb-count{display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;padding:0 6px;border-radius:10px;background:var(--wb-soft);color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px}
    .wb-fill{flex:1}
    .wb-hint{color:var(--dsw-alias-label-tertiary);font-size:11px;margin:6px 0 0}
    .wb-link{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11.5px;cursor:pointer;padding:2px 4px;border-radius:5px}
    .wb-link:hover{color:var(--wb-accent)}
    /* ---- running table ---------------------------------------------------- */
    .wb-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .wb-table th{padding:0 8px 6px 0;border-bottom:.5px solid var(--wb-line);color:var(--dsw-alias-label-tertiary);font-size:10.5px;font-weight:400;text-align:left}
    .wb-table th:nth-child(1){width:31%}
    .wb-table th:nth-child(2){width:15%}
    .wb-table th:nth-child(3){width:auto}
    .wb-table th:nth-child(4),.wb-table th:nth-child(5){width:78px}
    .wb-table th.wb-col-icon{width:28px}
    .wb-col-num{text-align:right}
    .wb-table th.wb-col-num{text-align:right}
    .wb-table td{padding:8px 8px 8px 0;border-bottom:.5px solid var(--wb-line);vertical-align:middle;font-size:12px}
    .wb-table tr:last-child td{border-bottom:0}
    .wb-table tr[data-tone=warn] td{background:color-mix(in srgb,var(--wb-warn) 7%,transparent)}
    .wb-table tr[data-tone=error] td{background:color-mix(in srgb,var(--wb-err) 7%,transparent)}
    .wb-cell-link{display:flex;flex-direction:column;gap:1px;min-width:0;max-width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .wb-cell-title{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-cell-project{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-cell-detail{color:var(--dsw-alias-label-secondary);font-size:11.5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-col-action{max-width:0}
    .wb-mono{font-family:var(--wb-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
    .wb-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
    .wb-icon-btn:hover{background:var(--wb-soft);color:var(--dsw-alias-label-primary)}
    .wb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    /* ---- state badge ------------------------------------------------------ */
    .wb-badge{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:5px;font-size:11px;white-space:nowrap;background:var(--wb-soft);color:var(--dsw-alias-label-secondary)}
    .wb-badge[data-tone=ok]{background:color-mix(in srgb,var(--wb-ok) 13%,transparent);color:var(--wb-ok)}
    .wb-badge[data-tone=warn]{background:color-mix(in srgb,var(--wb-warn) 14%,transparent);color:var(--wb-warn)}
    .wb-badge[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 13%,transparent);color:var(--wb-err)}
    .wb-pulse{display:inline-flex;align-items:center;gap:2px;width:14px;height:12px;flex:none}
    .wb-pulse i{display:block;width:3px;height:3px;border-radius:50%;background:currentColor;animation:wb-pulse 1.15s ease-in-out infinite}
    .wb-pulse i:nth-child(2){animation-delay:.16s}
    .wb-pulse i:nth-child(3){animation-delay:.32s}
    @keyframes wb-pulse{0%,55%,100%{opacity:.32;transform:scale(.8)}28%{opacity:1;transform:scale(1.4)}}
    /* ---- attention -------------------------------------------------------- */
    .wb-alerts,.wb-recents,.wb-projects,.wb-bars{list-style:none;margin:0;padding:0}
    .wb-alert{display:flex;flex-direction:column;gap:6px;padding:9px 10px;margin-bottom:7px;border-radius:8px;border:.5px solid var(--wb-line);background:color-mix(in srgb,var(--wb-warn) 6%,transparent)}
    .wb-alert:last-child{margin-bottom:0}
    .wb-alert[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 6%,transparent)}
    .wb-alert-body{display:flex;flex-direction:column;gap:1px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .wb-alert-title{font-size:12.5px;font-weight:600}
    .wb-alert-meta{color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-alert-actions{display:flex;flex-wrap:wrap;gap:4px}
    .wb-mini{height:25px;padding:0 9px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
    .wb-mini:hover{border-color:var(--dsw-alias-label-tertiary);color:var(--dsw-alias-label-primary)}
    .wb-mini-primary{border-color:color-mix(in srgb,var(--wb-accent) 55%,transparent);color:var(--wb-accent)}
    /* ---- projects / bars / speed ------------------------------------------ */
    .wb-project{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:.5px solid var(--wb-line);font-size:12px}
    .wb-project:last-child{border-bottom:0}
    .wb-project-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-project-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;white-space:nowrap}
    .wb-project-amount{font-family:var(--wb-mono);font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .wb-bar-row{display:grid;grid-template-columns:minmax(0,1fr) 78px;align-items:center;gap:4px 8px;padding:6px 0}
    .wb-bar-name{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-bar-track{grid-column:1;height:6px;border-radius:3px;background:var(--wb-soft);overflow:hidden}
    .wb-bar-track>i{display:block;height:100%;border-radius:3px;background:var(--wb-accent)}
    .wb-bar-amount{grid-column:2;grid-row:1/3;text-align:right;font-size:11.5px}
    .wb-speed{display:flex;align-items:baseline;gap:4px;padding:4px 0 2px}
    .wb-speed-value{font-family:var(--wb-mono);font-size:26px;font-weight:600;line-height:32px}
    .wb-speed-unit{color:var(--dsw-alias-label-tertiary);font-size:11.5px}
    /* ---- recent / work log ------------------------------------------------ */
    .wb-recent{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid var(--wb-line)}
    .wb-recent:last-child{border-bottom:0}
    .wb-recent-main{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .wb-tags{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 0}
    .wb-tag{padding:1px 7px;border-radius:11px;font-size:11px;background:var(--wb-soft);color:var(--dsw-alias-label-secondary)}
    .wb-tag[data-tone=ok]{background:color-mix(in srgb,var(--wb-ok) 13%,transparent);color:var(--wb-ok)}
    /* ---- misc ------------------------------------------------------------- */
    .wb-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:14px;border:.5px solid var(--wb-line);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
    .wb-icon:hover{color:var(--dsw-alias-label-primary);background:var(--wb-soft)}
    .wb-fresh{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:11px;font-size:11px;background:var(--wb-soft);color:var(--dsw-alias-label-secondary)}
    .wb-fresh[data-state=ready] i{background:var(--wb-ok)}
    .wb-fresh[data-state=stale] i{background:var(--wb-warn)}
    .wb-fresh[data-state=cached] i{background:var(--wb-accent)}
    .wb-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
    .wb-empty{padding:18px 4px;color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:center}
    .wb-stub{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:40px 20px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}
    .wb-stub-title{margin:0;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600}
    .wb-detailbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .wb-h1-inline{display:inline-block;font-size:20px;line-height:28px}
    .wb-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;margin:10px 0}
    .wb-fact dt{color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-fact dd{margin:0;font-size:12.5px;font-family:var(--wb-mono);overflow-wrap:anywhere}
    .wb-detail-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .wb-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:8px 24px;border-top:.5px solid var(--wb-line);color:var(--dsw-alias-label-tertiary);font-size:10.5px}
    /* ---- cost page -------------------------------------------------------- */
    .wb-metrics-3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .wb-cost-projects{list-style:none;margin:0;padding:0}
    .wb-cost-project{padding:8px 0;border-bottom:.5px solid var(--wb-line)}
    .wb-cost-project:last-child{border-bottom:0}
    .wb-cost-project-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
    .wb-cost-name{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-cost-amount{font-family:var(--wb-mono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .wb-bar{height:5px;margin:5px 0 4px;border-radius:3px;background:var(--wb-soft);overflow:hidden}
    .wb-bar>span{display:block;height:100%;border-radius:3px;background:var(--wb-accent)}
    .wb-cost-meta{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px}
    .wb-cost-coverage{margin-left:auto}
    .wb-trend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
    .wb-trend-day{display:grid;grid-template-columns:52px minmax(0,1fr) 68px;align-items:center;gap:8px;font-size:11.5px}
    .wb-trend-day[data-today=true] .wb-trend-label{color:var(--dsw-alias-label-primary);font-weight:600}
    .wb-trend-label{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;white-space:nowrap}
    .wb-trend-bar{height:6px;border-radius:3px;background:var(--wb-soft);overflow:hidden}
    .wb-trend-bar>i{display:block;height:100%;border-radius:3px;background:color-mix(in srgb,var(--wb-accent) 70%,transparent)}
    .wb-trend-day[data-today=true] .wb-trend-bar>i{background:var(--wb-accent)}
    .wb-trend-amount{text-align:right;font-family:var(--wb-mono);font-size:10.5px;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
    .wb-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr);gap:12px;align-items:start}
    .wb-main,.wb-aside{display:flex;flex-direction:column;gap:12px;min-width:0}
    .wb-row{border-bottom:.5px solid var(--wb-line)}
    .wb-row:last-child{border-bottom:0}
    .wb-row[data-state=running]{position:relative}
    .wb-row[data-state=running]::before{content:'';position:absolute;left:0;top:6px;bottom:6px;width:2px;border-radius:2px;background:var(--wb-ok);opacity:.6}
    .wb-row-main{display:flex;align-items:center;gap:10px;width:100%;padding:10px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
    .wb-row-main:hover{background:var(--wb-soft)}
    .wb-row-body{display:flex;flex-direction:column;flex:1;min-width:0;gap:1px}
    .wb-row-title{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-row-project{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px}
    .wb-row-detail{color:var(--dsw-alias-label-secondary);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wb-row-amount{font-family:var(--wb-mono);font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .wb-row-open{color:var(--dsw-alias-label-tertiary)}
    /* ---- responsive: the design's 768 / 420 rules ------------------------- */
    @media (width<=1199px){.wb-row-2{grid-template-columns:minmax(0,1fr)}.wb-row-3{grid-template-columns:minmax(0,1fr)}.wb-grid{grid-template-columns:minmax(0,1fr)}}
    @media (width<=899px){.wb-side{flex-basis:64px;padding:12px 6px}.wb-brand-name,.wb-workspace-text,.wb-side-label,.wb-side-item-label,.wb-side-soon,.wb-side-profile{display:none}.wb-side-item{justify-content:center}.wb-side-badge{position:absolute;margin:-16px 0 0 18px}}
    @media (width<=767px){.wb-metrics,.wb-metrics-3{grid-template-columns:repeat(2,minmax(0,1fr))}.wb-top,.wb-content,.wb-foot{padding-left:14px;padding-right:14px}.wb-h1{font-size:22px;line-height:30px}.wb-table th:nth-child(3){display:none}.wb-table td:nth-child(3){display:none}}
    @media (width<=520px){.wb-side{display:none}.wb-search span,.wb-kbd{display:none}.wb-metrics,.wb-metrics-3{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.wb-metric{padding:10px 12px}.wb-metric-value{font-size:19px;line-height:26px}}
    @media (prefers-reduced-motion:reduce){
      *{animation:none!important;transition:none!important}
      .wb-pulse i{opacity:1;transform:none}
      .wb-badge[data-state=running]{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--wb-ok) 26%,transparent)}
    }
    `


    // ==== panel.js ===============================================================
    // ==== layout shell ======================================================

    /**
     * The left sidebar: the panel's navigation, laid out as the design draws it.
     *
     * Three labelled groups — workbench, analysis, preferences — plus the workspace chip
     * at the top and the local profile at the bottom. A page this version does not build
     * yet is still listed and marked 待上线, so the structure stays legible instead of
     * the panel silently having fewer pages than it was designed with.
     */
    function Sidebar({ t, detail, go, counts, profile }) {
      const groups = [
        {
          label: t('side.group.workbench'),
          pages: [
            { kind: 'overview', label: t('side.overview'), glyph: 'calendar' },
            { kind: 'sessions', label: t('side.sessions'), glyph: 'terminal', badge: counts.sessions },
            { kind: 'attention', label: t('side.attention'), glyph: 'stuck', badge: counts.attention },
            { kind: 'projects', label: t('side.projects'), glyph: 'folder', soon: true },
          ],
        },
        {
          label: t('side.group.analysis'),
          pages: [
            { kind: 'cost', label: t('side.cost'), glyph: 'chart' },
            { kind: 'performance', label: t('side.performance'), glyph: 'gauge', soon: true },
            { kind: 'records', label: t('side.records'), glyph: 'document', soon: true },
          ],
        },
        {
          label: t('side.group.preferences'),
          pages: [{ kind: 'settings', label: t('side.settings'), glyph: 'sliders', soon: true }],
        },
      ]
      const current = detail === undefined ? 'overview' : detail.kind === 'alert' ? 'attention' : detail.kind
      return h(
        'aside',
        { className: 'wb-side', 'aria-label': t('title') },
        h(
          'div',
          { className: 'wb-brand' },
          h('span', { className: 'wb-logo', 'aria-hidden': 'true' }, h(Glyph, { name: 'pulse', size: 15 })),
          h('span', { className: 'wb-brand-name' }, t('panel')),
        ),
        h(
          'div',
          { className: 'wb-workspace' },
          h('span', { className: 'wb-workspace-badge', 'aria-hidden': 'true' }, 'L'),
          h(
            'span',
            { className: 'wb-workspace-text' },
            h('span', { className: 'wb-workspace-name' }, t('side.workspace')),
            h('span', { className: 'wb-workspace-sub' }, t('side.profile')),
          ),
        ),
        ...groups.map((group) =>
          h(
            'nav',
            { key: group.label, className: 'wb-side-group', 'aria-label': group.label },
            h('span', { className: 'wb-side-label' }, group.label),
            ...group.pages.map((page) =>
              h(
                'button',
                {
                  type: 'button',
                  key: page.kind,
                  className: 'wb-side-item',
                  'aria-current': current === page.kind ? 'page' : undefined,
                  'data-soon': page.soon === true ? 'true' : undefined,
                  title: page.soon === true ? t('side.soon', { name: page.label }) : undefined,
                  onClick: () => go(page.kind),
                },
                h(Glyph, { name: page.glyph, size: 14 }),
                h('span', { className: 'wb-side-item-label' }, page.label),
                page.badge > 0 ? h('i', { className: 'wb-side-badge' }, page.badge > 99 ? '99+' : String(page.badge)) : null,
                page.soon === true ? h('i', { className: 'wb-side-soon' }, t('side.soonShort')) : null,
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'wb-side-foot' },
          h('span', { className: 'wb-side-label' }, t('side.data')),
          h('span', { className: 'wb-side-profile' }, profile),
        ),
      )
    }

    /** The top bar: breadcrumb, search entry, freshness and refresh. */
    function TopBar({ t, trail, onSearch, onRefresh, status }) {
      return h(
        'header',
        { className: 'wb-top' },
        h(
          'nav',
          { className: 'wb-crumbs', 'aria-label': t('tabs.label') },
          h('span', null, t('panel')),
          ...trail.map((label) =>
            h('span', { key: label }, h('span', { className: 'wb-crumb-sep', 'aria-hidden': 'true' }, '›'), h('span', { className: 'wb-crumb-current' }, label)),
          ),
        ),
        h(
          'div',
          { className: 'wb-top-side' },
          h(
            'button',
            { type: 'button', className: 'wb-search', onClick: onSearch, disabled: onSearch === undefined, title: onSearch === undefined ? t('side.soon', { name: t('top.search') }) : undefined },
            h(Glyph, { name: 'search', size: 13 }),
            h('span', null, t('top.search')),
            h('kbd', { className: 'wb-kbd' }, '⌘K'),
          ),
          h('span', { className: 'wb-fresh', 'data-state': status }, h('i', { className: 'wb-dot', 'aria-hidden': 'true' }), t(status === 'ready' ? 'fresh.live' : status === 'cached' ? 'fresh.cached' : 'fresh.stale')),
          h('button', { type: 'button', className: 'wb-icon', onClick: onRefresh, 'aria-label': t('refresh') }, h(Glyph, { name: 'refresh', size: 14 })),
        ),
      )
    }

    /** The page header the design repeats on every page: eyebrow, title, subtitle, date. */
    function PageHead({ t, title, subtitle, dayLabel, children }) {
      return h(
        'header',
        { className: 'wb-head' },
        h(
          'div',
          null,
          h('span', { className: 'wb-eyebrow' }, 'LOCAL / ', dayLabel.replace(/-/g, '.')),
          h('h1', { className: 'wb-h1' }, title),
          subtitle === undefined ? null : h('p', { className: 'wb-sub' }, subtitle),
        ),
        h('div', { className: 'wb-head-side' }, children),
      )
    }

    /** A metric card: label, value, one line of meaning, and its glyph in the corner. */
    function Metric({ label, value, detail, tone, glyph, onClick }) {
      const body = [
        h('span', { className: 'wb-metric-top', key: 't' }, h('span', { className: 'wb-metric-label' }, label), glyph === undefined ? null : h('span', { className: 'wb-metric-glyph', 'aria-hidden': 'true' }, h(Glyph, { name: glyph, size: 14 }))),
        h('span', { className: 'wb-metric-value', key: 'v', 'data-tone': tone ?? 'default' }, value),
        detail === undefined ? null : h('span', { className: 'wb-metric-detail', key: 'd' }, detail),
      ]
      return onClick === undefined
        ? h('article', { className: 'wb-metric' }, ...body)
        : h('button', { type: 'button', className: 'wb-metric', onClick, 'aria-label': `${label}: ${value}` }, ...body)
    }

    /**
     * The overview, laid out as the design does:
     *
     *   header → four metrics → [running table | attention] →
     *   [projects | cost bars | model speed] → [recently ended | work log]
     *
     * Every section reads the same snapshot, so a badge and its card can never
     * disagree, and each degrades on its own when the Host cannot answer.
     */
    function OverviewPage({ t, data, now, state, refresh, openSession, go, setDetail, alerts, act }) {
      const overview = data.overview ?? {}
      const ledger = data.ledger ?? {}
      const projects = Array.isArray(ledger.projects) ? ledger.projects : []
      const running = Array.isArray(data.running) ? data.running : []
      const recent = Array.isArray(data.recent) ? data.recent : []

      const coverage = overview.coverage === undefined || overview.coverage === null
        ? t('today.noSample')
        : t('today.coverage', { percent: Math.round(Number(overview.coverage) * 100) })
      const speed = overview.speed

      return h(
        React.Fragment,
        null,
        h(PageHead, {
          t,
          title: t('today.title'),
          subtitle: t('today.subtitle', {
            scope: t('today.scope'),
            zone: utcOffsetLabel(),
            time: new Date(data.generatedAt).toLocaleTimeString(),
          }),
          dayLabel: overview.dayKey ?? '',
        }, h(
          'button',
          { type: 'button', className: 'wb-date', onClick: refresh },
          h(Glyph, { name: 'calendar', size: 13 }),
          h('span', null, t('today.date', { date: dateLabel(data.generatedAt) })),
        )),

        h(
          'div',
          { className: 'wb-metrics' },
          h(Metric, { label: t('today.cost'), value: moneyOf(overview.amount), detail: coverage, glyph: 'wallet', onClick: () => go('cost') }),
          h(Metric, { label: t('today.running'), value: String(overview.running ?? 0), detail: t('today.runningDetail', { waiting: overview.waiting ?? 0 }), glyph: 'pulse' }),
          h(Metric, { label: t('today.attention'), value: String(alerts.length), tone: alerts.length > 0 ? 'alert' : 'default', detail: t('today.attentionDetail', { failed: overview.failed ?? 0, waiting: overview.waiting ?? 0 }), glyph: 'stuck', onClick: () => go('attention') }),
          h(Metric, { label: t('today.speedP50'), value: speed === undefined ? t('today.speedNone') : t('today.speedValue', { rate: rateOf(speed.p50) }), detail: speed === undefined ? t('today.speedDetail', { count: 0 }) : t('today.speedDetail', { count: speed.samples }), glyph: 'gauge' }),
        ),

        h(
          'div',
          { className: 'wb-row-2' },
          h(RunningTable, { t, rows: running, now, openSession }),
          h(AttentionCard, { t, items: alerts, now, onAction: act, onOpen: openSession, onDetail: (item) => setDetail({ kind: 'alert', key: item.key }) }),
        ),
        h(
          'div',
          { className: 'wb-row-3' },
          h(ProjectsCard, { t, projects, go }),
          h(CostBarsCard, { t, projects, currency: ledger.currency, total: ledger.today?.amount ?? 0, go }),
          h(SpeedCard, { t, speed }),
        ),
        h(
          'div',
          { className: 'wb-row-2' },
          h(RecentCard, { t, rows: recent, now, openSession }),
          h(WorkLogCard, { t, ledger, go }),
        ),
      )
    }

    /**
     * The running table: the design's five columns plus the way in.
     *
     * A row's "last action" is what the Host can prove — the phase of the current turn
     * and, when it has one, the prompt that opened it — never an invented tool call.
     */
    function RunningTable({ t, rows, now, openSession }) {
      return h(
        Panel,
        { title: t('running.title'), count: String(rows.length), action: h('span', { className: 'wb-hint' }, t('running.hint')) },
        rows.length === 0
          ? h(Empty, { text: t('running.empty') })
          : h(
              'table',
              { className: 'wb-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', { scope: 'col' }, t('field.session')),
                  h('th', { scope: 'col' }, t('field.state')),
                  h('th', { scope: 'col' }, t('field.action')),
                  h('th', { scope: 'col', className: 'wb-col-num' }, t('field.duration')),
                  h('th', { scope: 'col', className: 'wb-col-num' }, t('field.todayCost')),
                  h('th', { scope: 'col', className: 'wb-col-icon' }, h('span', { className: 'wb-sr' }, t('field.open'))),
                ),
              ),
              h(
                'tbody',
                null,
                ...rows.map((row) =>
                  h(
                    'tr',
                    { key: row.sessionId, 'data-tone': toneOf(stateOf(row)) },
                    h(
                      'td',
                      null,
                      h(
                        'button',
                        { type: 'button', className: 'wb-cell-link', onClick: () => openSession(row.sessionId) },
                        h('span', { className: 'wb-cell-title' }, row.title || t('field.untitled')),
                        h('span', { className: 'wb-cell-project' }, row.projectName || t('field.none')),
                      ),
                    ),
                    h('td', null, h(StateBadge, { t, state: stateOf(row) })),
                    h('td', { className: 'wb-col-action' }, h('span', { className: 'wb-cell-detail' }, actionLine(t, row, now))),
                    h('td', { className: 'wb-col-num wb-mono' }, turnLength(t, row, now)),
                    h('td', { className: 'wb-col-num wb-mono' }, row.today?.amount > 0 ? moneyOf(row.today.amount) : t('cost.notEstimable')),
                    h('td', { className: 'wb-col-icon' }, h('button', { type: 'button', className: 'wb-icon-btn', onClick: () => openSession(row.sessionId), 'aria-label': t('running.open', { title: row.title || t('field.untitled') }) }, h(Glyph, { name: 'open', size: 12 }))),
                  ),
                ),
              ),
            ),
      )
    }

    /** What the row is doing, in the design's "last action + relative time" form. */
    function actionLine(t, row, now) {
      const when = relativeTime(t, row.lastAt, now)
      if (row.state === 'waiting') return `${t(row.waiting?.kind === 'question' ? 'wait.question' : 'wait.approval')} · ${when}`
      if (row.state === 'failed') return `${t('action.failed')} · ${when}`
      if (row.phase === 'tool') return `${t('action.tool')} · ${when}`
      if (row.phase === 'generation') return `${t('action.generating')} · ${when}`
      return when
    }

    /** This turn's wall time, start → now; a Session without one reads an em dash. */
    function turnLength(t, row, now) {
      const start = Number(row.turnStartedAt)
      if (!Number.isFinite(start) || start <= 0) return t('field.none')
      const end = row.running === true ? now : Number(row.lastAt) || now
      return end > start ? durationOf(end - start) : t('field.none')
    }

    /** Attention items, failures first, each with the reader's three decisions. */
    function AttentionCard({ t, items, now, onAction, onOpen, onDetail }) {
      return h(
        Panel,
        { title: t('attention.title'), count: String(items.length), action: items.length > 2 ? h('button', { type: 'button', className: 'wb-link', onClick: () => onDetail(items[0]) }, t('attention.all')) : null },
        items.length === 0
          ? h(Empty, { text: t('attention.empty') })
          : h(
              'ul',
              { className: 'wb-alerts' },
              ...items.slice(0, 3).map((item) =>
                h(
                  'li',
                  { key: item.key, className: 'wb-alert', 'data-tone': item.type === 'failure' ? 'error' : 'warn' },
                  h(
                    'button',
                    { type: 'button', className: 'wb-alert-body', onClick: () => onDetail(item) },
                    h('span', { className: 'wb-alert-title' }, `${t(item.type === 'failure' ? 'alert.failure' : 'alert.waiting')} · ${item.title ?? t('field.untitled')}`),
                    h('span', { className: 'wb-alert-meta' }, `${item.projectName ?? ''} · ${relativeTime(t, item.triggeredAt, now)}`),
                  ),
                  h(
                    'div',
                    { className: 'wb-alert-actions' },
                    h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'ack') }, t('attention.ack')),
                    h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'snooze') }, t('attention.snooze')),
                    h('button', { type: 'button', className: 'wb-mini', onClick: () => onAction(item, 'dismiss'), 'aria-label': t('attention.dismissAria') }, t('attention.dismiss')),
                    h('button', { type: 'button', className: 'wb-mini wb-mini-primary', onClick: () => onOpen(item.sessionId) }, t('attention.open')),
                  ),
                ),
              ),
            ),
        h('p', { className: 'wb-hint' }, t('attention.foot')),
      )
    }

    /** Projects with activity today, and how many of their items are unfinished. */
    function ProjectsCard({ t, projects, go }) {
      return h(
        Panel,
        { title: t('projects.title'), action: h('button', { type: 'button', className: 'wb-link', onClick: () => go('projects') }, t('projects.all')) },
        projects.length === 0
          ? h(Empty, { text: t('projects.empty') })
          : h(
              'ul',
              { className: 'wb-projects' },
              ...projects.slice(0, 4).map((project) =>
                h(
                  'li',
                  { key: project.projectId, className: 'wb-project' },
                  h('span', { className: 'wb-project-name' }, project.name || project.projectId),
                  h('span', { className: 'wb-project-meta' }, t('projects.sessions', { count: project.sessions ?? 0 })),
                  h('span', { className: 'wb-project-amount' }, moneyOf(project.amount)),
                ),
              ),
            ),
      )
    }

    /** Where today's spend went, as the design's small bar chart. */
    function CostBarsCard({ t, projects, currency, total, go }) {
      const max = Math.max(0, ...projects.map((project) => Number(project.amount) || 0))
      return h(
        Panel,
        { title: t('cost.title'), action: h('button', { type: 'button', className: 'wb-link', onClick: () => go('cost') }, t('cost.all')) },
        projects.length === 0
          ? h(Empty, { text: t('cost.empty') })
          : h(
              'ul',
              { className: 'wb-bars' },
              ...projects.slice(0, 4).map((project) =>
                h(
                  'li',
                  { key: project.projectId, className: 'wb-bar-row' },
                  h('span', { className: 'wb-bar-name' }, project.name || project.projectId),
                  h('span', { className: 'wb-bar-track' }, h('i', { style: { width: `${max > 0 ? Math.max(3, ((Number(project.amount) || 0) / max) * 100) : 0}%` } })),
                  h('span', { className: 'wb-bar-amount wb-mono' }, moneyOf(project.amount)),
                ),
              ),
            ),
        h('p', { className: 'wb-hint' }, t('cost.foot', { amount: moneyOf(total) })),
      )
    }

    /** The model speed reading the design shows: P50 and its sample count. */
    function SpeedCard({ t, speed }) {
      return h(
        Panel,
        { title: t('speed.title'), action: h('span', { className: 'wb-hint' }, t('speed.week')) },
        speed === undefined
          ? h(Empty, { text: t('speed.empty') })
          : h(
              React.Fragment,
              null,
              h('div', { className: 'wb-speed' }, h('span', { className: 'wb-speed-value' }, rateOf(speed.p50)), h('span', { className: 'wb-speed-unit' }, 'tok/s')),
              h('p', { className: 'wb-hint' }, t('speed.detail', { count: speed.samples })),
            ),
      )
    }

    /** Sessions that ended, newest first, with the reason they ended. */
    function RecentCard({ t, rows, now, openSession }) {
      return h(
        Panel,
        { title: t('recent.title'), action: h('span', { className: 'wb-hint' }, t('recent.hint')) },
        rows.length === 0
          ? h(Empty, { text: t('recent.empty') })
          : h(
              'ul',
              { className: 'wb-recents' },
              ...rows.slice(0, 4).map((row) =>
                h(
                  'li',
                  { key: row.sessionId, className: 'wb-recent' },
                  h(
                    'button',
                    { type: 'button', className: 'wb-recent-main', onClick: () => openSession(row.sessionId) },
                    h('span', { className: 'wb-cell-title' }, row.title || t('field.untitled')),
                    h('span', { className: 'wb-cell-project' }, `${row.projectName ?? ''} · ${clockOf(row.endedAt ?? row.lastAt)}`),
                  ),
                  h(StateBadge, { t, state: stateOf(row) }),
                ),
              ),
            ),
      )
    }

    /** The day in one line: what it cost and how much of it is priced. */
    function WorkLogCard({ t, ledger, go }) {
      return h(
        Panel,
        { title: t('worklog.title'), action: h('button', { type: 'button', className: 'wb-link', onClick: () => go('records') }, t('worklog.open')) },
        h('p', { className: 'wb-cell-detail' }, t('worklog.summary', { count: ledger.today?.sessions?.length ?? 0 })),
        h(
          'div',
          { className: 'wb-tags' },
          h('span', { className: 'wb-tag', 'data-tone': 'ok' }, t('worklog.priced', { percent: Math.round(Number(ledger.today?.coverage ?? 0) * 100) })),
          h('span', { className: 'wb-tag', 'data-tone': 'idle' }, t('worklog.tokens', { tokens: tokensOf(sumTokens(ledger.today?.tokens)) })),
        ),
        h('p', { className: 'wb-hint' }, t('worklog.account')),
      )
    }

    /**
     * The workbench panel: sidebar, top bar, and the current page.
     *
     * The panel owns the snapshot, the reader's local marks on attention items and the
     * current page. Every page receives the same data, which is why a badge and the card
     * it opens can never disagree.
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
        return h('section', { className: 'wb-shell', 'aria-label': t('title') }, h('style', null, CSS), h('p', { className: 'wb-stub', role: 'status' }, t('loading')))
      }
      if (state.status === 'error') {
        const schema = state.error instanceof SchemaError
        return h(
          'section',
          { className: 'wb-shell', 'aria-label': t('title') },
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

      // A click marks an item before the Host answers; the next snapshot is authoritative.
      const alerts = (data.alerts ?? [])
        .map((item) => (marks[item.key] === undefined ? item : { ...item, state: marks[item.key] }))
        .filter((item) => item.state === 'open' || item.state === 'acknowledged')
      const act = async (item, action) => {
        const next = action === 'ack' ? 'acknowledged' : action === 'dismiss' ? 'solved' : 'snoozed'
        setMarks((previous) => ({ ...previous, [item.key]: next }))
        await sendAlertAction({ key: item.key, action: action === 'dismiss' ? 'solve' : action, triggeredAt: item.triggeredAt, state: item.currentState, minutes: 30 }).catch(() => {})
        refresh()
      }

      const go = (kind) => {
        // A page this version does not build yet stays visible but does nothing.
        if (['projects', 'performance', 'records', 'settings', 'sessions'].includes(kind)) return
        setDetail(kind === 'overview' ? undefined : { kind })
      }
      const back = () => setDetail(undefined)

      const page = detail === undefined
        ? { key: 'overview', label: t('side.overview'), node: h(OverviewPage, { t, data, now, state, refresh, openSession, go, setDetail, alerts, act }) }
        : detail.kind === 'cost'
          ? { key: 'cost', label: t('side.cost'), node: h(CostPage, { t, data, now, back, openSession }) }
          : detail.kind === 'attention'
            ? { key: 'attention', label: t('side.attention'), node: h(AttentionPage, { t, alerts, now, openSession, onAction: act, onDetail: (item) => setDetail({ kind: 'alert', key: item.key }), back }) }
            : {
                key: 'attention',
                label: t('side.attention'),
                node: (() => {
                  const item = alerts.find((entry) => entry.key === detail.key)
                  return item === undefined ? h(Empty, { text: t('attention.empty') }) : h(AlertDetail, { t, item, now, onBack: back, onAction: act, openSession })
                })(),
              }

      return h(
        'section',
        { className: 'wb-shell', 'aria-label': t('title') },
        h('style', null, CSS),
        h(Sidebar, {
          t,
          detail,
          go: (kind) => {
            go(kind)
          },
          counts: { attention: alerts.length, sessions: (data.running ?? []).length },
          profile: t('side.profileValue'),
        }),
        h(
          'div',
          { className: 'wb-body' },
          h(TopBar, { t, trail: [page.label], status: state.status, onRefresh: refresh }),
          h('div', { className: 'wb-scroll' }, h('div', { className: 'wb-content' }, page.node)),
          h('footer', { className: 'wb-foot' }, h('span', null, t('foot')), h('span', null, t('foot.synced', { time: new Date(data.generatedAt).toLocaleTimeString() }))),
        ),
      )
    }

    // ==== attention page ====================================================

    /**
     * Every unresolved attention item, in the same order the overview shows the first
     * three: failures before waits, newest first. The overview answers "is anything
     * wrong"; this page answers "what, exactly".
     */
    function AttentionPage({ t, alerts, now, openSession, onAction, onDetail, back }) {
      const items = alerts.filter((item) => item.state === 'open' || item.state === 'acknowledged')
      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'wb-detailbar' },
          h('h1', { className: 'wb-h1 wb-h1-inline' }, t('attention.title')),
          h('span', { className: 'wb-count' }, String(items.length)),
          h('span', { className: 'wb-fill' }),
          h('span', { className: 'wb-hint' }, t('attention.foot')),
        ),
        h(
          Panel,
          { title: t('attention.title'), count: String(items.length) },
          items.length === 0
            ? h(Empty, { text: t('attention.empty') })
            : h(
                'ul',
                { className: 'wb-alerts' },
                ...items.map((item) =>
                  h(AlertItem, { key: item.key, t, item, now, onOpen: () => onDetail(item), onAction }),
                ),
              ),
        ),
      )
    }

    // ==== cost page ==========================================================

    /**
     * Cost attribution: where today's estimate came from.
     *
     * Three readings of the same ledger, each answering a different question:
     * the day's total and its pricing coverage, the projects that spent it, and the
     * seven-day shape that says whether today is usual. Every amount is an estimate
     * from the configured price table — the footer says so, and no figure is presented
     * as a bill.
     */
    function CostPage({ t, data, now, back, openSession }) {
      const ledger = data.ledger ?? {}
      const today = ledger.today ?? {}
      const projects = Array.isArray(ledger.projects) ? ledger.projects : []
      const trend = Array.isArray(ledger.trend) ? ledger.trend : []
      const sessions = Array.isArray(today.sessions) ? today.sessions : []
      const maxProject = Math.max(0, ...projects.map((project) => Number(project.amount) || 0))
      const maxDay = Math.max(0, ...trend.map((point) => Number(point.amount) || 0))
      const coverage = today.coverage === undefined || today.coverage === null
        ? t('today.noSample')
        : t('today.coverage', { percent: Math.round(Number(today.coverage) * 100) })

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'wb-detailbar' },
          h('button', { type: 'button', className: 'wb-mini', onClick: back }, `← ${t('detail.back')}`),
          h('h1', { className: 'wb-h1 wb-h1-inline' }, t('cost.title')),
          h('span', { className: 'wb-hint' }, t('cost.subtitle', { date: data.overview?.dayKey ?? '' })),
        ),
        h(
          'div',
          { className: 'wb-metrics wb-metrics-3' },
          h(Metric, { label: t('cost.today'), value: moneyOf(today.amount), detail: coverage }),
          // `today.sessions` is the day's rows, not a count: the tally is its length.
          h(Metric, { label: t('cost.tokens'), value: tokensOf(sumTokens(today.tokens)), detail: t('cost.sessions', { count: String(sessions.length) }) }),
          h(Metric, {
            label: t('cost.unpriced'),
            value: tokensOf(today.unpricedTokens),
            detail: today.unpricedTokens > 0 ? t('cost.unpricedHint') : t('cost.allPriced'),
            tone: today.unpricedTokens > 0 ? 'alert' : 'default',
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
              { title: t('cost.byProject'), count: String(projects.length) },
              projects.length === 0
                ? h(Empty, { text: t('cost.empty') })
                : h(
                    'ul',
                    { className: 'wb-cost-projects' },
                    ...projects.map((project) =>
                      h(
                        'li',
                        { key: project.projectId, className: 'wb-cost-project' },
                        h(
                          'div',
                          { className: 'wb-cost-project-head' },
                          h('span', { className: 'wb-cost-name' }, project.name || project.projectId),
                          h('span', { className: 'wb-cost-amount' }, moneyOf(project.amount)),
                        ),
                        h(
                          'div',
                          { className: 'wb-bar', role: 'presentation' },
                          h('span', {
                            style: { width: `${maxProject > 0 ? Math.max(2, (Number(project.amount) / maxProject) * 100) : 0}%` },
                          }),
                        ),
                        h(
                          'div',
                          { className: 'wb-cost-meta' },
                          h('span', null, t('cost.sessions', { count: String(project.sessions ?? 0) })),
                          h('span', null, tokensOf(sumTokens(project.tokens))),
                          h('span', { className: 'wb-cost-coverage' }, project.coverage === undefined || project.coverage === null
                            ? t('today.noSample')
                            : t('today.coverage', { percent: Math.round(Number(project.coverage) * 100) })),
                        ),
                      ),
                    ),
                  ),
            ),
            h(
              Panel,
              { title: t('cost.todaySessions'), count: String(sessions.length) },
              sessions.length === 0
                ? h(Empty, { text: t('cost.empty') })
                : h('ul', { className: 'wb-rows' }, ...sessions.map((entry) => h(CostSessionRow, { key: entry.sessionId, t, entry, onOpen: openSession }))),
            ),
          ),
          h(
            'aside',
            { className: 'wb-aside' },
            h(
              Panel,
              { title: t('cost.trend'), count: undefined, action: h('span', { className: 'wb-hint' }, t('cost.last7')) },
              maxDay === 0
                ? h(Empty, { text: t('cost.empty') })
                : h(
                    'ul',
                    { className: 'wb-trend', role: 'list' },
                    ...trend.map((point) =>
                      h(
                        'li',
                        { key: point.day, className: 'wb-trend-day', 'data-today': point.day === data.overview?.todayStart ? 'true' : undefined },
                        h('span', { className: 'wb-trend-label' }, dateLabel(point.day)),
                        h(
                          'span',
                          { className: 'wb-trend-bar' },
                          h('i', { style: { width: `${maxDay > 0 ? Math.max(point.amount > 0 ? 3 : 0, (Number(point.amount) / maxDay) * 100) : 0}%` } }),
                        ),
                        h('span', { className: 'wb-trend-amount' }, moneyOf(point.amount)),
                      ),
                    ),
                  ),
            ),
            h(
              Panel,
              { title: t('cap.title') },
              h('p', { className: 'wb-hint' }, t('cost.note', { ref: String(data.capabilities?.prices?.ref ?? '—') })),
            ),
          ),
        ),
      )
    }

    /** One Session of today's spend, as a row that opens it. */
    function CostSessionRow({ t, entry, onOpen }) {
      const title = entry.title === undefined || entry.title === '' ? t('field.untitled') : entry.title
      return h(
        'li',
        { className: 'wb-row' },
        h(
          'button',
          { type: 'button', className: 'wb-row-main', onClick: () => onOpen(entry.sessionId), 'aria-label': `${title} · ${moneyOf(entry.amount)}` },
          h(
            'span',
            { className: 'wb-row-body' },
            h('span', { className: 'wb-row-title' }, title),
            h('span', { className: 'wb-row-project' }, entry.name ?? ''),
            h('span', { className: 'wb-row-detail' }, `${tokensOf(sumTokens(entry.tokens))} tok${entry.quality === 'unpriced' ? ' · ' + t('cost.unpricedRow') : ''}`),
          ),
          h('span', { className: 'wb-row-amount' }, entry.amount > 0 ? moneyOf(entry.amount) : t('cost.notEstimable')),
          h('span', { className: 'wb-row-open', 'aria-hidden': 'true' }, h(Glyph, { name: 'open', size: 12 })),
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
