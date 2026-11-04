/**
 * Browser half of the DSH Workbench bundle.
 *
 * Registers a global main panel named `workbench` plus its sidebar entry. The
 * panel reads one authenticated snapshot from this bundle's Host half and
 * renders the account wallets, today's usage, the task inventory, the running
 * Sessions, and the recently finished ones.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'dsh.workbench'
    /** Main panel key; the sidebar entry reuses it as its list id. */
    const PANEL_ID = 'workbench'
    const ROUTE = '/api/workbench/status'
    const SUMMARY_ROUTE = '/api/workbench/summarize'
    const POLL_MS = 15000
    const RETRY_MS = 4000
    const NOW_MS = 30000

    const zh = {
      panel: '工作台',
      'panel.count': '（{count}）',
      'panel.more': '另有 {count} 个',
      title: '工作台',
      refresh: '刷新',
      updatedAt: '更新于 {time}',
      'greet.morning': '上午好',
      'greet.noon': '中午好',
      'greet.afternoon': '下午好',
      'greet.evening': '晚上好',
      'greet.late': '夜深了',
      'greet.named': '{greeting}，{name}',
      'now.running': '{project} 上还有 {count} 个任务在跑',
      'now.work': '今天在 {projects} 上做了 {count} 件事',
      'now.idle': '今天有 {count} 个会话，还没有归纳出工作',
      'now.empty': '今天还没有记录',
      'legend.running': '进行中',
      'legend.done': '已完成',
      'hero.label': '账户余额',
      'hero.ratio': '已用占比',
      'hero.ratioAria': '已用占比 {percent}',
      'hero.split': '充值 {recharge} · 赠送 {bonus}',
      'hero.used': '累计消耗',
      'hero.combined': '余额 + 消耗',
      'hero.cacheHitLabel': '缓存命中',
      'hero.runwayLabel': '余额可用',
      'hero.runwayValue': '约 {days} 天',
      'hero.runwayLess': '不足 1 天',
      'hero.runwayTitle': '按前 6 天日均 {amount} 估算',
      'hero.priceLabel': '每百万 Token',
      'hero.tokens': '累计 Token',
      'card.balanceSignedOut': '未登录',
      'card.balanceSignedOutDetail': '登录 DeepSeek 账户后可查看余额',
      'card.balanceFailed': '余额读取失败，请稍后重试',
      'card.balanceUnavailable': '当前环境不支持余额查询',
      'card.todayAmount': '今日消耗',
      'card.todayDetail': '今日 00:00 起 · 本机估算',
      'card.todayTokens': '今日 Token',
      'card.todayTokensDetail': '输入 {input} · 缓存 {cache} · 输出 {output}',
      'card.todayHigher': '较日均 +{percent}%',
      'card.todayLower': '较日均 -{percent}%',
      'card.todaySame': '与日均持平',
      'card.baselineTitle': '前 6 天日均 {amount}',
      'speed.title': '码表',
      'speed.median': '中位',
      'speed.aggregate': '合计',
      'speed.current': '当前速度',
      'speed.noCurrent': '暂无生成记录',
      'speed.currentMeta': '{title} · {time} · {tokens} tok / {duration}',
      'speed.p90': 'P90',
      'speed.requests': '请求',
      'speed.output': '输出',
      'speed.model': '模型',
      'speed.rate': '速率',
      'speed.recent': '最近请求',
      'speed.empty': '近 7 天没有有效生成记录',
      'speed.unit': 'tok/s',
      'speed.week': '近 7 天',
      'speed.today': '今日',
      'speed.note': '已剔除低于 1 tok/s 的超时样本',
      'speed.unknownModel': '未知模型',
      'speed.recentMeta': '{tokens} tok · {duration} · {rate} tok/s',
      'stats.total': '任务总数',
      'log.title': '工作记录',
      'log.subtitle': 'AI 归纳 · 近 31 天',
      'log.prevMonth': '上个月',
      'log.nextMonth': '下个月',
      'log.thisMonth': '本月',
      'log.pending': '待归纳',
      'log.pickDay': '点一个日期查看当天工作',
      'log.generate': '生成今日日报',
      'log.generateDay': '生成',
      'log.regenerate': '重新生成',
      'log.generating': 'AI 正在归纳…',
      'log.copy': '复制日报',
      'log.copyDay': '复制',
      'log.copied': '已复制',
      'log.failed': '生成失败',
      'log.prompt': '点击生成，让 AI 归纳当天工作',
      'log.empty': '近 31 天没有可记录的工作',
      'log.emptyDay': '这天没有可归纳的工作',
      'log.noItems': 'AI 没有给出条目',
      'log.note': 'AI 归纳可能不完整，复制后可自行补充。',
      'log.reportTitle': '日报 · {date}',
      'task.tokens': '{count} tokens',
      'task.tools': '{count} 次工具',
      'task.action.read': '正在读取 {target}',
      'task.action.edit': '正在编辑 {target}',
      'task.action.run': '正在运行 {target}',
      'task.action.search': '正在搜索 {target}',
      'task.action.find': '正在查找 {target}',
      'task.action.web': '正在搜索网页 {target}',
      'task.action.fetch': '正在抓取 {target}',
      'task.action.delegate': '正在委派 {target}',
      'task.action.todo': '正在更新待办',
      'task.action.job': '正在查看后台任务',
      'task.action.other': '正在调用 {tool}',
      'task.action.otherTarget': '正在调用 {tool}：{target}',
      'section.running': '进行中的任务',
      'section.recent': '最近完成的任务',
      'empty.running': '暂无进行中的任务',
      'empty.recent': '暂无最近完成的任务',
      'row.running': '执行中',
      'row.finished': '已完成',
      'row.untitled': '未命名任务',
      'row.open': '打开任务：{title}',
      'time.justNow': '刚刚',
      'time.minutesAgo': '{count} 分钟前',
      'time.hoursAgo': '{count} 小时前',
      'time.daysAgo': '{count} 天前',
      loading: '正在加载工作台…',
      'error.title': '无法加载工作台数据',
      'error.body': '请确认工作台插件的 Host 部分已启用，然后重试。',
      'error.retry': '重试',
      stale: '刷新失败，当前显示上次读取的数据。',
      'usage.pending': '仍有 {count} 个任务的用量待统计',
      footnote: 'Token 与金额按本机会话日志和价格配置估算，仅供参考；余额来自 DeepSeek 账户。',
    }

    /** English dictionary, key-identical to the Chinese source of truth. */

    const en = {
      panel: 'Workbench',
      'panel.count': '({count})',
      'panel.more': '{count} more',
      title: 'Workbench',
      refresh: 'Refresh',
      updatedAt: 'Updated {time}',
      'greet.morning': 'Good morning',
      'greet.noon': 'Good afternoon',
      'greet.afternoon': 'Good afternoon',
      'greet.evening': 'Good evening',
      'greet.late': 'Working late',
      'greet.named': '{greeting}, {name}',
      'now.running': '{count} still running on {project}',
      'now.work': '{count} things done on {projects} today',
      'now.idle': '{count} sessions today, nothing summarized yet',
      'now.empty': 'Nothing recorded today',
      'legend.running': 'Running',
      'legend.done': 'Done',
      'hero.label': 'Account balance',
      'hero.ratio': 'used',
      'hero.ratioAria': 'Used share {percent}',
      'hero.split': 'Topped up {recharge} · Bonus {bonus}',
      'hero.used': 'Total spent',
      'hero.combined': 'Balance + spent',
      'hero.tokens': 'Tokens total',
      'card.balanceSignedOut': 'Signed out',
      'card.balanceSignedOutDetail': 'Sign in to a DeepSeek account to see the balance',
      'card.balanceFailed': 'Could not read the balance. Try again later.',
      'card.balanceUnavailable': 'Balance lookup is unavailable in this environment',
      'card.todayAmount': 'Spent today',
      'card.todayDetail': 'Since local midnight · local estimate',
      'card.todayTokens': 'Tokens today',
      'card.todayTokensDetail': 'Input {input} · Cache {cache} · Output {output}',
      'hero.cacheHitLabel': 'Cache hit',
      'hero.runwayLabel': 'Runway',
      'hero.runwayValue': '~{days} days',
      'hero.runwayLess': '<1 day',
      'hero.runwayTitle': 'Estimated from the previous 6-day average of {amount}',
      'hero.priceLabel': 'Per 1M tokens',
      'card.todayHigher': '{percent}% above the 6-day average',
      'card.todayLower': '{percent}% below the 6-day average',
      'card.todaySame': 'In line with the 6-day average',
      'card.baselineTitle': 'Previous 6-day average {amount}',
      'speed.title': 'Speed table',
      'speed.median': 'median',
      'speed.aggregate': 'aggregate',
      'speed.current': 'Current speed',
      'speed.noCurrent': 'No generation yet',
      'speed.currentMeta': '{title} · {time} · {tokens} tok / {duration}',
      'speed.p90': 'P90',
      'speed.requests': 'requests',
      'speed.output': 'output',
      'speed.model': 'Model',
      'speed.rate': 'rate',
      'speed.recent': 'Recent requests',
      'speed.empty': 'No valid generations in the last 7 days',
      'speed.unit': 'tok/s',
      'speed.week': 'Last 7 days',
      'speed.today': 'Today',
      'speed.note': 'Timeout samples below 1 tok/s are excluded',
      'speed.unknownModel': 'Unknown model',
      'speed.recentMeta': '{tokens} tok · {duration} · {rate} tok/s',
      'stats.total': 'Tasks',
      'log.title': 'Work log',
      'log.subtitle': 'AI summary · last 31 days',
      'log.prevMonth': 'Previous month',
      'log.nextMonth': 'Next month',
      'log.thisMonth': 'This month',
      'log.pending': 'Pending',
      'log.pickDay': 'Pick a day to see its work',
      'log.generate': 'Generate today’s report',
      'log.generateDay': 'Generate',
      'log.regenerate': 'Regenerate',
      'log.generating': 'Summarizing with AI…',
      'log.copy': 'Copy report',
      'log.copyDay': 'Copy',
      'log.copied': 'Copied',
      'log.failed': 'Generation failed',
      'log.prompt': 'Generate to let AI summarize the day’s work',
      'log.empty': 'Nothing to log in the last 31 days',
      'log.emptyDay': 'Nothing to summarize on this day',
      'log.noItems': 'The model returned no items',
      'log.note': 'AI summaries can be incomplete; edit the copied report as needed.',
      'log.reportTitle': 'Daily report · {date}',
      'task.tokens': '{count} tokens',
      'task.tools': '{count} tools',
      'task.action.read': 'Reading {target}',
      'task.action.edit': 'Editing {target}',
      'task.action.run': 'Running {target}',
      'task.action.search': 'Searching {target}',
      'task.action.find': 'Finding {target}',
      'task.action.web': 'Searching the web for {target}',
      'task.action.fetch': 'Fetching {target}',
      'task.action.delegate': 'Delegating {target}',
      'task.action.todo': 'Updating the todo list',
      'task.action.job': 'Checking a background job',
      'task.action.other': 'Calling {tool}',
      'task.action.otherTarget': 'Calling {tool}: {target}',
      'section.running': 'In progress',
      'section.recent': 'Recently completed',
      'empty.running': 'No task in progress',
      'empty.recent': 'No recently completed task',
      'row.running': 'Running',
      'row.finished': 'Finished',
      'row.untitled': 'Untitled task',
      'row.open': 'Open task: {title}',
      'time.justNow': 'just now',
      'time.minutesAgo': '{count} min ago',
      'time.hoursAgo': '{count} h ago',
      'time.daysAgo': '{count} d ago',
      loading: 'Loading the Workbench…',
      'error.title': 'Could not load the Workbench',
      'error.body': 'Check that this plugin’s Host half is enabled, then retry.',
      'error.retry': 'Retry',
      stale: 'Refresh failed; showing the last snapshot.',
      'usage.pending': '{count} more tasks still being counted',
      footnote: 'Tokens and amounts are estimated from local Session logs and the configured prices; the balance comes from the DeepSeek account.',
    }

    // --- data -----------------------------------------------------------------

    let uiLanguage = 'en'

    /** The DSH interface language, not the browser's Accept-Language. */
    function readUiLocale(service) {
      try {
        const snapshot = typeof service?.getSnapshot === 'function' ? service.getSnapshot() : service?.snapshot
        const active = snapshot?.active ?? service?.active
        if (typeof active === 'string' && active !== '') return active
      } catch {
        // Fall through to the document language.
      }
      try {
        const documentLanguage = document.documentElement?.lang
        if (typeof documentLanguage === 'string' && documentLanguage !== '') return documentLanguage
      } catch {
        // Fall through to the browser language.
      }
      try {
        return navigator.language || 'en'
      } catch {
        return 'en'
      }
    }

    function localeTag() {
      return uiLanguage || 'en'
    }

    function snapshotUrl() {
      const tzOffset = -new Date().getTimezoneOffset() * 60
      return `${ROUTE}?tzOffset=${tzOffset}&locale=${encodeURIComponent(localeTag())}`
    }

    async function readSnapshot(signal) {
      const response = await fetch(snapshotUrl(), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const value = await response.json()
      if (value === null || typeof value !== 'object') throw new Error('invalid snapshot')
      return value
    }

    // --- hooks ----------------------------------------------------------------

    function useSnapshot() {
      const [state, setState] = React.useState({ status: 'loading', data: undefined, error: undefined })
      const [attempt, setAttempt] = React.useState(0)
      const refresh = React.useCallback(() => setAttempt((value) => value + 1), [])

      React.useEffect(() => {
        const controller = new AbortController()
        let alive = true
        let timer

        const run = async () => {
          let delay = POLL_MS
          try {
            const data = await readSnapshot(controller.signal)
            if (!alive) return
            setState({ status: 'ready', data, error: undefined })
          } catch (error) {
            if (!alive || controller.signal.aborted) return
            setState((previous) =>
              previous.data === undefined
                ? { status: 'error', data: undefined, error }
                : { status: 'stale', data: previous.data, error },
            )
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
      }, [attempt])

      React.useEffect(() => {
        // Re-read the snapshot as soon as the panel is looked at again.
        if (typeof document === 'undefined') return undefined
        const onVisible = () => {
          if (document.visibilityState === 'visible') setAttempt((value) => value + 1)
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
      }, [])

      return [state, refresh]
    }

    function useNow(interval) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), interval)
        return () => clearInterval(timer)
      }, [interval])
      return now
    }

    // --- formatting -----------------------------------------------------------

    function clockOf(time) {
      if (!Number.isFinite(time)) return ''
      try {
        return new Date(time).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' })
      } catch {
        return new Date(time).toTimeString().slice(0, 5)
      }
    }

    function currencySymbol(currency) {
      return currency === 'USD' ? '$' : '¥'
    }

    function formatMoney(amount, currency) {
      const value = Number(amount)
      const symbol = currencySymbol(currency)
      if (!Number.isFinite(value)) return `${symbol}0.00`
      if (value > 0 && value < 0.01) return `<${symbol}0.01`
      let text
      try {
        text = value.toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      } catch {
        text = value.toFixed(2)
      }
      return `${symbol}${text}`
    }

    function formatTokens(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '0'
      try {
        return Math.round(number).toLocaleString(localeTag())
      } catch {
        return String(Math.round(number))
      }
    }

    /** Per-task amounts are small: keep four decimals below one yuan. */
    function formatCost(amount) {
      const value = Number(amount)
      if (!Number.isFinite(value) || value <= 0) return ''
      if (value < 0.0001) return '<¥0.0001'
      if (value >= 1) return `¥${value.toFixed(2)}`
      const text = value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
      return `¥${text}`
    }

    function formatCompactTokens(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '0'
      const trim = (text) => text.replace(/\.0$/, '')
      if (number >= 1_000_000) return `${trim((number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1))}M`
      if (number >= 1000) return `${trim((number / 1000).toFixed(number >= 100_000 ? 0 : 1))}k`
      return String(Math.round(number))
    }

    function formatRate(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number <= 0) return '—'
      return number >= 100 ? String(Math.round(number)) : String(Math.round(number * 10) / 10)
    }

    function formatDuration(ms) {
      const seconds = Number(ms) / 1000
      if (!Number.isFinite(seconds) || seconds <= 0) return '0s'
      if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
      const minutes = Math.floor(seconds / 60)
      const rest = Math.round(seconds % 60)
      return `${minutes}m${String(rest).padStart(2, '0')}s`
    }

    /** Map a tool name onto the verb used by the running-task action line. */
    function actionKind(name) {
      const leaf = String(name).toLowerCase().split('__').pop() ?? ''
      if (leaf === 'bash' || leaf === 'shell' || leaf === 'exec' || leaf === 'run') return 'run'
      if (leaf === 'read' || leaf === 'read_file' || leaf === 'view') return 'read'
      if (leaf === 'write' || leaf === 'edit' || leaf === 'multi_edit' || leaf === 'apply_patch') return 'edit'
      if (leaf === 'grep' || leaf === 'rg' || leaf === 'search_files') return 'search'
      if (leaf === 'glob' || leaf === 'find') return 'find'
      if (leaf === 'web_search') return 'web'
      if (leaf === 'web_fetch') return 'fetch'
      if (leaf === 'subagent' || leaf === 'subagent_fork' || leaf === 'workflow') return 'delegate'
      if (leaf === 'todo_write' || leaf === 'todo') return 'todo'
      if (leaf === 'job_output' || leaf === 'job_list' || leaf === 'job_kill') return 'job'
      return 'other'
    }

    function actionText(t, action) {
      const name = typeof action?.name === 'string' && action.name !== '' ? action.name : 'tool'
      const target = typeof action?.target === 'string' ? action.target : ''
      const kind = actionKind(name)
      if (kind === 'todo') return t('task.action.todo')
      if (kind === 'job') return t('task.action.job')
      if (kind === 'other') {
        return target === ''
          ? t('task.action.other', { tool: shortToolName(name) })
          : t('task.action.otherTarget', { tool: shortToolName(name), target })
      }
      return target === '' ? t('task.action.other', { tool: shortToolName(name) }) : t(`task.action.${kind}`, { target })
    }

    /** MCP names arrive namespaced; the last segment is the readable part. */
    function shortToolName(name) {
      const text = typeof name === 'string' && name !== '' ? name : 'tool'
      const parts = text.split(/__|[./]/).filter((part) => part !== '')
      return parts.length === 0 ? text : parts[parts.length - 1]
    }

    function dateLabel(time, options) {
      const value = Number(time)
      if (!Number.isFinite(value) || value <= 0) return ''
      try {
        return new Intl.DateTimeFormat(localeTag(), options).format(new Date(value))
      } catch {
        return new Date(value).toLocaleDateString()
      }
    }

    function tzOffsetSeconds() {
      return -new Date().getTimezoneOffset() * 60
    }

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    /** Local calendar key of a day start, independent of the browser locale. */
    function dayKeyOf(time) {
      const date = new Date(Number(time) + tzOffsetSeconds() * 1000)
      return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
    }

    function monthKeyOf(time) {
      return dayKeyOf(time).slice(0, 7)
    }

    /** Monday-first month grid: null for the padding cells. */
    function monthCells(monthKey) {
      const [year, month] = monthKey.split('-').map(Number)
      const first = new Date(Date.UTC(year, month - 1, 1))
      const offset = (first.getUTCDay() + 6) % 7
      const total = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const cells = Array.from({ length: offset }, () => null)
      for (let day = 1; day <= total; day += 1) {
        cells.push({ key: `${year}-${pad2(month)}-${pad2(day)}`, day })
      }
      while (cells.length % 7 !== 0) cells.push(null)
      return cells
    }

    function monthLabelOf(monthKey) {
      const [year, month] = monthKey.split('-').map(Number)
      if (localeTag().toLowerCase().startsWith('zh')) return `${year} 年 ${month} 月`
      try {
        return new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'long' }).format(
          new Date(Date.UTC(year, month - 1, 1)),
        )
      } catch {
        return `${year}-${pad2(month)}`
      }
    }

    function weekdayLabels() {
      return localeTag().toLowerCase().startsWith('zh')
        ? ['一', '二', '三', '四', '五', '六', '日']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    }

    function truncateText(value, limit) {
      const text = String(value ?? '')
      return text.length > limit ? `${text.slice(0, limit)}…` : text
    }

    /** Render one generated day as the copyable daily report. */
    function buildDailyReport(t, projects, label) {
      const lines = [`# ${t('log.reportTitle', { date: label })}`]
      for (const project of Array.isArray(projects) ? projects : []) {
        const items = Array.isArray(project.items) ? project.items.filter((item) => typeof item === 'string' && item !== '') : []
        if (items.length === 0) continue
        lines.push('', `## ${project.project || '—'}`)
        for (const item of items) lines.push(`- ${item}`)
      }
      if (lines.length === 1) {
        lines.push('', t('log.noItems'))
      }
      return lines.join('\n')
    }

    function relativeTime(t, time, now) {
      const updated = Number(time)
      if (!Number.isFinite(updated) || updated <= 0) return ''
      const delta = Math.max(0, now - updated)
      if (delta < 60000) return t('time.justNow')
      const minutes = Math.floor(delta / 60000)
      if (minutes < 60) return t('time.minutesAgo', { count: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t('time.hoursAgo', { count: hours })
      return t('time.daysAgo', { count: Math.floor(hours / 24) })
    }

    function basename(path) {
      if (typeof path !== 'string') return ''
      const parts = path.split(/[\\/]+/).filter((part) => part !== '')
      return parts.length === 0 ? '' : parts[parts.length - 1]
    }

    /** Sum the usage buckets the Host reports; a duplicate total is only a fallback. */
    function tokenTotal(bucket) {
      const usage = bucket !== null && typeof bucket === 'object' ? bucket : {}
      const sum =
        (Number(usage.inputTokens) || 0) +
        (Number(usage.outputTokens) || 0) +
        (Number(usage.cacheReadTokens) || 0)
      if (sum > 0) return sum
      const reported = Number(usage.tokens)
      return Number.isFinite(reported) && reported > 0 ? reported : 0
    }

    function walletTotals(wallets) {
      const totals = new Map()
      if (!Array.isArray(wallets)) return totals
      for (const wallet of wallets) {
        if (wallet === null || typeof wallet !== 'object') continue
        const amount = Number(wallet.amount)
        if (!Number.isFinite(amount)) continue
        const currency = wallet.currency === 'USD' ? 'USD' : 'CNY'
        totals.set(currency, (totals.get(currency) ?? 0) + amount)
      }
      return totals
    }

    function balanceFacts(account) {
      const facts = account !== null && typeof account === 'object' ? account : {}
      const paid = walletTotals(facts.wallets)
      const bonus = walletTotals(facts.bonusWallets)
      const currencies = new Set([...paid.keys(), ...bonus.keys()])
      return { status: facts.status, paid, bonus, currencies }
    }

    // --- components -----------------------------------------------------------

    function Card({ label, value, detail, tone, index, detailTitle }) {
      return h(
        'article',
        { className: 'dswb-card' },
        index === undefined ? null : h('span', { className: 'dswb-card-index', 'aria-hidden': 'true' }, index),
        h('div', { className: 'dswb-card-label' }, label),
        h('div', { className: 'dswb-card-value', 'data-tone': tone }, value),
        detail === undefined ? null : h('div', { className: 'dswb-card-detail', title: detailTitle }, detail),
      )
    }

    /** Time-of-day greeting for the page heading. */
    function greetingText(t, now) {
      const hour = new Date(now).getHours()
      const key =
        hour >= 5 && hour < 11
          ? 'greet.morning'
          : hour >= 11 && hour < 13
            ? 'greet.noon'
            : hour >= 13 && hour < 18
              ? 'greet.afternoon'
              : hour >= 18 && hour < 23
                ? 'greet.evening'
                : 'greet.late'
      return t(key)
    }

    function BalanceHero({ account, usage, t }) {
      const facts = balanceFacts(account)
      const primary = facts.currencies.has('CNY') ? 'CNY' : [...facts.currencies][0]
      const ready = facts.status === 'ready'
      const paid = primary === undefined ? 0 : (facts.paid.get(primary) ?? 0)
      const bonus = primary === undefined ? 0 : (facts.bonus.get(primary) ?? 0)
      const balance = paid + bonus
      const spent = Number(usage?.total?.costCny) || 0
      const combined = balance + spent
      const comparable = ready && primary === 'CNY'
      const ratio = comparable && combined > 0 ? Math.min(1, spent / combined) : undefined
      const percent = ratio === undefined ? undefined : Math.round(ratio * 1000) / 10
      const percentText = percent === undefined ? '—' : `${percent >= 10 ? Math.round(percent) : percent}%`
      const totalTokens = tokenTotal(usage?.total)
      const inputTokens = Number(usage?.total?.inputTokens) || 0
      const cacheTokens = Number(usage?.total?.cacheReadTokens) || 0
      const promptTokens = inputTokens + cacheTokens
      const cachePercent = promptTokens > 0 ? Math.round((cacheTokens / promptTokens) * 100) : undefined
      const recentAverage = Number(usage?.previousAverageCny) || 0
      const runway = comparable && recentAverage > 0 ? balance / recentAverage : undefined
      const pricePerM = totalTokens > 0 && spent > 0 ? spent / (totalTokens / 1_000_000) : undefined

      const value = ready
        ? formatMoney(balance, primary)
        : facts.status === 'signed-out'
          ? t('card.balanceSignedOut')
          : '—'
      const detail = ready
        ? primary === undefined
          ? undefined
          : t('hero.split', {
              recharge: formatMoney(paid, primary),
              bonus: formatMoney(bonus, primary),
            })
        : facts.status === 'signed-out'
          ? t('card.balanceSignedOutDetail')
          : facts.status === 'failed'
            ? t('card.balanceFailed')
            : t('card.balanceUnavailable')

      const items = [{ key: 'spent', label: t('hero.used'), value: formatMoney(spent, 'CNY') }]
      if (comparable) {
        items.push({ key: 'combined', label: t('hero.combined'), value: formatMoney(combined, primary) })
      }
      if (totalTokens > 0) {
        items.push({
          key: 'tokens',
          label: t('hero.tokens'),
          value: formatCompactTokens(totalTokens),
          title: formatTokens(totalTokens),
        })
      }
      if (cachePercent !== undefined) {
        items.push({ key: 'cache', label: t('hero.cacheHitLabel'), value: `${cachePercent}%` })
      }
      if (runway !== undefined) {
        items.push({
          key: 'runway',
          label: t('hero.runwayLabel'),
          value: runway < 1 ? t('hero.runwayLess') : t('hero.runwayValue', { days: String(Math.floor(runway)) }),
          title: t('hero.runwayTitle', { amount: formatMoney(recentAverage, 'CNY') }),
        })
      }
      if (pricePerM !== undefined) {
        items.push({ key: 'price', label: t('hero.priceLabel'), value: formatMoney(pricePerM, 'CNY') })
      }

      return h(
        'article',
        { className: 'dswb-hero' },
        h(
          'div',
          { className: 'dswb-hero-main' },
          h('span', { className: 'dswb-eyebrow' }, 'WALLET'),
          h('div', { className: 'dswb-hero-label' }, t('hero.label')),
          h('div', { className: 'dswb-hero-value', 'data-tone': ready ? undefined : 'muted' }, value),
          detail === undefined ? null : h('div', { className: 'dswb-hero-sub' }, detail),
        ),
        h(
          'div',
          { className: 'dswb-hero-side' },
          comparable
            ? h(
                'div',
                { className: 'dswb-hero-ratio' },
                h('span', { className: 'dswb-hero-ratio-label' }, t('hero.ratio')),
                h('span', { className: 'dswb-hero-ratio-value' }, percentText),
                h(
                  'div',
                  {
                    className: 'dswb-hero-track',
                    role: 'progressbar',
                    'aria-valuemin': 0,
                    'aria-valuemax': 100,
                    'aria-valuenow': Math.round((ratio ?? 0) * 100),
                    'aria-label': t('hero.ratioAria', { percent: percentText }),
                  },
                  h('i', {
                    className: 'dswb-hero-fill',
                    style: { width: `${Math.round((ratio ?? 0) * 1000) / 10}%` },
                  }),
                ),
              )
            : null,
          items.length === 0
            ? null
            : h(
                'div',
                { className: 'dswb-hero-facts' },
                items.map((item) =>
                  h(
                    'span',
                    { key: item.key, className: 'dswb-hero-fact' },
                    h('span', { className: 'dswb-hero-fact-label' }, item.label),
                    h('span', { className: 'dswb-hero-fact-value', title: item.title }, item.value),
                  ),
                ),
              ),
        ),
      )
    }

    /** Task totals with the running / completed legend. */
    function TaskTotalCard({ tasks, t }) {
      return h(
        'article',
        { className: 'dswb-card dswb-card-total' },
        h('span', { className: 'dswb-card-index', 'aria-hidden': 'true' }, '03'),
        h('div', { className: 'dswb-card-label' }, t('stats.total')),
        h('div', { className: 'dswb-card-value' }, formatTokens(tasks.total)),
        h(
          'div',
          { className: 'dswb-card-legend' },
          h(
            'span',
            { className: 'dswb-legend' },
            h('i', { className: 'dswb-legend-dot', 'data-kind': 'running', 'aria-hidden': 'true' }),
            t('legend.running'),
            h('b', null, formatTokens(tasks.running)),
          ),
          h(
            'span',
            { className: 'dswb-legend' },
            h('i', { className: 'dswb-legend-dot', 'data-kind': 'done', 'aria-hidden': 'true' }),
            t('legend.done'),
            h('b', null, formatTokens(tasks.recent)),
          ),
        ),
      )
    }

    /**
     * Throughput table: median / P90 decode speed per model plus the latest
     * requests. Samples below 1 tok/s are dropped upstream (timeouts/retries).
     */
    function SpeedCard({ speed, t, now, openSession }) {
      if (speed === null || typeof speed !== 'object') return null
      const week = speed.week !== null && typeof speed.week === 'object' ? speed.week : {}
      const today = speed.today !== null && typeof speed.today === 'object' ? speed.today : {}
      const models = Array.isArray(week.models) ? week.models.slice(0, 5) : []
      const recent = Array.isArray(speed.recent) ? speed.recent : []
      const requests = Number(week.requests) || 0
      const hasWeek = requests > 0
      const todayRequests = Number(today.requests) || 0
      const current = speed.current !== null && typeof speed.current === 'object' ? speed.current : undefined
      const currentTitle =
        current !== undefined && typeof current.title === 'string' && current.title !== ''
          ? current.title
          : t('row.untitled')
      const currentMeta =
        current === undefined
          ? t('speed.noCurrent')
          : t('speed.currentMeta', {
              title: currentTitle,
              time: relativeTime(t, current.time, now),
              tokens: formatCompactTokens(current.outputTokens),
              duration: formatDuration(current.durationMs),
            })

      const stats = [
        h(
          'span',
          { className: 'dswb-speed-stat', key: 'median' },
          h('b', null, formatRate(week.medianTokensPerSecond)),
          h('span', null, ` ${t('speed.unit')} ${t('speed.median')}`),
        ),
        h(
          'span',
          { className: 'dswb-speed-stat', key: 'aggregate' },
          h('b', null, formatRate(week.tokensPerSecond)),
          h('span', null, ` ${t('speed.unit')} ${t('speed.aggregate')}`),
        ),
        h(
          'span',
          { className: 'dswb-speed-stat', key: 'p90' },
          h('b', null, formatRate(week.p90TokensPerSecond)),
          h('span', null, ` ${t('speed.unit')} ${t('speed.p90')}`),
        ),
        h(
          'span',
          { className: 'dswb-speed-stat', key: 'output' },
          h('b', null, formatCompactTokens(week.outputTokens)),
          h('span', null, ` ${t('speed.output')}`),
        ),
        h(
          'span',
          { className: 'dswb-speed-stat', key: 'requests' },
          h('b', null, formatTokens(requests)),
          h('span', null, ` ${t('speed.requests')}`),
        ),
      ]
      if (todayRequests > 0) {
        stats.push(
          h(
            'span',
            { className: 'dswb-speed-stat', key: 'today' },
            h('b', null, formatRate(today.medianTokensPerSecond)),
            h('span', null, ` ${t('speed.unit')} ${t('speed.today')}`),
          ),
        )
      }

      return h(
        'article',
        { className: 'dswb-speed' },
        h(
          'div',
          { className: 'dswb-speed-head' },
          h(
            'div',
            { className: 'dswb-speed-heading' },
            h('span', { className: 'dswb-eyebrow' }, 'THROUGHPUT'),
            h(
              'div',
              { className: 'dswb-speed-title-row' },
              h('h2', { className: 'dswb-speed-title' }, t('speed.title')),
              h('span', { className: 'dswb-speed-window' }, t('speed.week')),
            ),
          ),
          h(
            'div',
            { className: 'dswb-speed-current' },
            h('span', { className: 'dswb-speed-current-label' }, t('speed.current')),
            h(
              'div',
              { className: 'dswb-speed-current-line' },
              h(
                'span',
                {
                  className: 'dswb-speed-current-value',
                  'data-empty': current === undefined ? 'true' : 'false',
                },
                current === undefined ? '—' : formatRate(current.tokensPerSecond),
              ),
              h('span', { className: 'dswb-speed-current-unit' }, t('speed.unit')),
            ),
            h('span', { className: 'dswb-speed-current-meta', title: currentMeta }, currentMeta),
          ),
        ),
        h('div', { className: 'dswb-speed-stats' }, ...stats),
        hasWeek
          ? h(
              'div',
              { className: 'dswb-speed-body' },
              h(
                'div',
                { className: 'dswb-speed-pane' },
                h(
                'table',
                { className: 'dswb-speed-table' },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    h('th', null, t('speed.model')),
                    h('th', { className: 'dswb-speed-num' }, t('speed.rate')),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  models.map((row) =>
                    h(
                      'tr',
                      { key: row.model },
                      h(
                        'td',
                        {
                          className: 'dswb-speed-model',
                          title: row.model === 'unknown' ? t('speed.unknownModel') : row.model,
                        },
                        row.model === 'unknown' ? t('speed.unknownModel') : row.model,
                      ),
                      h('td', { className: 'dswb-speed-num' }, `${formatRate(row.tokensPerSecond)} ${t('speed.unit')}`),
                    ),
                  ),
                ),
              ),
              ),
              h(
                'div',
                { className: 'dswb-speed-pane dswb-speed-recent' },
                h('span', { className: 'dswb-eyebrow' }, t('speed.recent')),
                recent.length === 0
                  ? h('p', { className: 'dswb-speed-empty' }, t('speed.empty'))
                  : h(
                      'ul',
                      { className: 'dswb-speed-recent-list' },
                      recent.map((entry) => {
                        const title =
                          typeof entry.title === 'string' && entry.title !== '' ? entry.title : t('row.untitled')
                        return h(
                          'li',
                          { key: `${entry.sessionId}-${entry.time}` },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dswb-speed-recent-row',
                              'aria-label': t('row.open', { title }),
                              title: entry.model,
                              onClick: () => openSession(entry.sessionId),
                            },
                            h('span', { className: 'dswb-speed-time' }, clockOf(entry.time)),
                            h('span', { className: 'dswb-speed-recent-title' }, title),
                            h(
                              'span',
                              { className: 'dswb-speed-recent-meta' },
                              t('speed.recentMeta', {
                                tokens: formatCompactTokens(entry.outputTokens),
                                duration: formatDuration(entry.durationMs),
                                rate: formatRate(entry.tokensPerSecond),
                              }),
                            ),
                          ),
                        )
                      }),
                    ),
              ),
            )
          : h('p', { className: 'dswb-speed-empty' }, t('speed.empty')),
        h('p', { className: 'dswb-speed-note' }, t('speed.note')),
      )
    }

    /**
     * Work log: a month calendar over the same day summaries.
     * The panel shows dates and projects; the AI summary supplies the work
     * items. No intents, commands, file counts or token counts are rendered.
     */
    function WorkLogCard({ worklog, t, onWorkItems }) {
      const days = worklog !== null && typeof worklog === 'object' && Array.isArray(worklog.days) ? worklog.days : []
      const [summaries, setSummaries] = React.useState({})
      const [copiedDay, setCopiedDay] = React.useState(undefined)
      const [month, setMonth] = React.useState(undefined)
      const [selectedKey, setSelectedKey] = React.useState(undefined)
      const holder = React.useRef(null)

      const today = days.length > 0 ? days[0] : undefined
      const todaySummary = today === undefined ? undefined : summaries[today.start]
      const months = []
      for (const day of days) {
        const key = monthKeyOf(day.start)
        if (!months.includes(key)) months.push(key)
      }
      const dayByKey = new Map(days.map((day) => [dayKeyOf(day.start), day]))
      const activeMonth = month ?? months[0]
      const monthDays = days.filter((day) => monthKeyOf(day.start) === activeMonth)
      const selectedDay = days.find((day) => day.start === selectedKey) ?? monthDays[0]
      const autoRef = React.useRef(undefined)

      const generate = async (dayStart, force = false) => {
        if (summaries[dayStart]?.status === 'loading') return
        setSummaries((previous) => ({ ...previous, [dayStart]: { status: 'loading' } }))
        try {
          const response = await fetch(SUMMARY_ROUTE, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              dayStart,
              tzOffset: tzOffsetSeconds(),
              locale: localeTag(),
              force,
            }),
          })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`)
          setSummaries((previous) => ({
            ...previous,
            [dayStart]: {
              status: 'ready',
              projects: Array.isArray(payload?.projects) ? payload.projects : [],
              model: typeof payload?.model === 'string' ? payload.model : undefined,
            },
          }))
        } catch (error) {
          setSummaries((previous) => ({
            ...previous,
            [dayStart]: { status: 'error', error: error instanceof Error ? error.message : String(error) },
          }))
        }
      }

      // Open the panel with today's report already there when nothing is cached.
      React.useEffect(() => {
        if (today === undefined || autoRef.current === today.start) return
        if (summaries[today.start] !== undefined) return
        autoRef.current = today.start
        generate(today.start)
      }, [today?.start])

      // Publish today's first work item per project for the task panels.
      React.useEffect(() => {
        if (typeof onWorkItems !== 'function') return
        const summary = today === undefined ? undefined : summaries[today.start]
        if (summary?.status !== 'ready') return
        const map = {}
        for (const project of summary.projects) {
          if (typeof project.project !== 'string' || !Array.isArray(project.items)) continue
          const items = project.items.filter((item) => typeof item === 'string' && item !== '')
          if (items.length > 0) map[project.project] = items
        }
        onWorkItems(map)
      }, [summaries, today?.start])

      const writeReport = async (day, summary) => {
        if (day === undefined || summary?.status !== 'ready') return
        const label = dateLabel(day.start, { month: 'long', day: 'numeric', weekday: 'long' })
        const report = buildDailyReport(t, summary.projects, label)
        let ok = false
        try {
          await navigator.clipboard.writeText(report)
          ok = true
        } catch {
          try {
            const area = document.createElement('textarea')
            area.value = report
            area.setAttribute('readonly', '')
            area.style.position = 'fixed'
            area.style.opacity = '0'
            holder.current?.appendChild(area)
            area.select()
            document.execCommand('copy')
            area.remove()
            ok = true
          } catch {
            ok = false
          }
        }
        if (ok) setCopiedDay(day.start)
        setTimeout(() => setCopiedDay(undefined), 2200)
      }

      const copyToday = () => writeReport(today, todaySummary)
      const todayHasItems =
        todaySummary?.status === 'ready' &&
        todaySummary.projects.some((project) => Array.isArray(project.items) && project.items.length > 0)
      const busy = todaySummary?.status === 'loading'

      const switchMonth = (nextMonth) => {
        setMonth(nextMonth)
        setSelectedKey(days.find((day) => monthKeyOf(day.start) === nextMonth)?.start)
      }

      const selectDay = (day) => {
        setSelectedKey(day.start)
        if (monthKeyOf(day.start) !== activeMonth) setMonth(monthKeyOf(day.start))
      }

      const renderDay = (day) => {
        const key = Number(day.start)
        const label = dateLabel(day.start, { month: 'numeric', day: 'numeric', weekday: 'short' })
        const summary = summaries[key]
        const projects = Array.isArray(day.projects) ? day.projects : []
        const generated =
          summary?.status === 'ready'
            ? summary.projects.filter((project) => Array.isArray(project.items) && project.items.length > 0)
            : []
        return h(
          'li',
          { className: 'dswb-log-day', key, 'data-today': day === today ? 'true' : 'false' },
          h(
            'div',
            { className: 'dswb-log-day-head' },
            h(
              'div',
              { className: 'dswb-log-day-title' },
              h('span', { className: 'dswb-log-day-label' }, label),
              projects.length > 1
                ? h(
                    'span',
                    { className: 'dswb-log-day-projects' },
                    projects.map((project) => project.project).join(' · '),
                  )
                : null,
            ),
            h(
              'div',
              { className: 'dswb-log-day-actions' },
              day !== today && summary?.status === 'ready' && generated.length > 0
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dswb-log-day-action',
                      onClick: () => writeReport(day, summary),
                    },
                    copiedDay === key ? t('log.copied') : t('log.copyDay'),
                  )
                : null,
              day !== today || (summary !== undefined && summary.status !== 'loading')
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dswb-log-day-action',
                      disabled: summary?.status === 'loading',
                      onClick: () => generate(key, summary?.status === 'ready'),
                    },
                    summary?.status === 'loading'
                      ? t('log.generating')
                      : summary?.status === 'ready'
                        ? t('log.regenerate')
                        : t('log.generateDay'),
                  )
                : null,
            ),
          ),
          summary?.status === 'loading'
            ? h(
                'p',
                { className: 'dswb-log-status', role: 'status' },
                h('span', { className: 'dswb-log-dot', 'aria-hidden': 'true' }),
                t('log.generating'),
              )
            : summary?.status === 'error'
              ? h(
                  'div',
                  { className: 'dswb-log-status dswb-log-status-error', role: 'alert' },
                  h('span', null, `${t('log.failed')}：${summary.error}`),
                )
              : summary?.status === 'ready'
                ? generated.length === 0
                  ? h('p', { className: 'dswb-log-empty' }, t('log.noItems'))
                  : h(
                      'div',
                      { className: 'dswb-log-summary' },
                      generated.map((project) =>
                        h(
                          'section',
                          { className: 'dswb-log-summary-project', key: project.project },
                          h('h3', { className: 'dswb-log-summary-name' }, project.project || '—'),
                          h(
                            'ul',
                            { className: 'dswb-log-items' },
                            project.items.map((item, index) =>
                              h('li', { className: 'dswb-log-item', key: `${project.project}-${index}` }, item),
                            ),
                          ),
                        ),
                      ),
                    )
                : h(
                    'p',
                    { className: 'dswb-log-prompt' },
                    projects.length === 0 ? t('log.emptyDay') : t('log.prompt'),
                  ),
        )
      }

      let headerAction
      if (busy) {
        headerAction = { label: t('log.generating'), onClick: undefined, disabled: true }
      } else if (todayHasItems) {
        headerAction = {
          label: copiedDay === today?.start ? t('log.copied') : t('log.copy'),
          onClick: copyToday,
          disabled: false,
        }
      } else if (todaySummary?.status === 'error' || todaySummary?.status === 'ready') {
        headerAction = { label: t('log.regenerate'), onClick: () => today && generate(today.start, true), disabled: false }
      } else {
        headerAction = { label: t('log.generate'), onClick: () => today && generate(today.start), disabled: today === undefined }
      }

      const calendar =
        activeMonth === undefined
          ? h('p', { className: 'dswb-log-empty' }, t('log.empty'))
          : (() => {
              const cells = monthCells(activeMonth)
              const index = months.indexOf(activeMonth)
              const newer = index > 0 ? months[index - 1] : undefined
              const older = index >= 0 && index < months.length - 1 ? months[index + 1] : undefined
              return h(
                'div',
                { className: 'dswb-log-calendar' },
                h(
                  'div',
                  { className: 'dswb-log-month' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dswb-log-month-btn',
                      'aria-label': t('log.prevMonth'),
                      disabled: older === undefined,
                      onClick: () => older !== undefined && switchMonth(older),
                    },
                    '‹',
                  ),
                  h('span', { className: 'dswb-log-month-label' }, monthLabelOf(activeMonth)),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dswb-log-month-btn',
                      'aria-label': t('log.nextMonth'),
                      disabled: newer === undefined,
                      onClick: () => newer !== undefined && switchMonth(newer),
                    },
                    '›',
                  ),
                  activeMonth !== months[0]
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'dswb-log-month-today',
                          onClick: () => switchMonth(months[0]),
                        },
                        t('log.thisMonth'),
                      )
                    : null,
                ),
                h(
                  'div',
                  { className: 'dswb-log-weekdays' },
                  weekdayLabels().map((label) =>
                    h('span', { className: 'dswb-log-weekday', key: label }, label),
                  ),
                ),
                h(
                  'div',
                  { className: 'dswb-log-grid' },
                  cells.map((cell, index2) => {
                    if (cell === null) {
                      return h('span', { className: 'dswb-log-cell is-empty', key: `empty-${index2}` })
                    }
                    const day = dayByKey.get(cell.key)
                    const summary = day === undefined ? undefined : summaries[day.start]
                    const items =
                      summary?.status === 'ready'
                        ? summary.projects.flatMap((project) => (Array.isArray(project.items) ? project.items : []))
                        : []
                    const names = day === undefined ? [] : day.projects.map((project) => project.project)
                    return h(
                      'button',
                      {
                        type: 'button',
                        className: 'dswb-log-cell',
                        key: cell.key,
                        'data-today': day === today ? 'true' : undefined,
                        'data-selected': day !== undefined && day.start === selectedDay?.start ? 'true' : undefined,
                        'data-empty': day === undefined ? 'true' : undefined,
                        disabled: day === undefined,
                        title: names.length > 0 ? names.join(' · ') : undefined,
                        onClick: () => day !== undefined && selectDay(day),
                      },
                      h('span', { className: 'dswb-log-cell-day' }, String(cell.day)),
                      names.length > 0
                        ? h(
                            'span',
                            { className: 'dswb-log-cell-projects' },
                            `${names.slice(0, 2).join(' · ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`,
                          )
                        : null,
                      items.length > 0
                        ? h('span', { className: 'dswb-log-cell-snippet' }, truncateText(items[0], 24))
                        : day !== undefined
                          ? h('span', { className: 'dswb-log-cell-pending' }, t('log.pending'))
                          : null,
                    )
                  }),
                ),
                selectedDay === undefined
                  ? h('p', { className: 'dswb-log-empty' }, t('log.pickDay'))
                  : h('ul', { className: 'dswb-log-days dswb-log-calendar-detail' }, renderDay(selectedDay)),
              )
            })()

      return h(
        'article',
        { className: 'dswb-log', ref: holder },
        h(
          'div',
          { className: 'dswb-log-head' },
          h(
            'div',
            { className: 'dswb-log-heading' },
            h('span', { className: 'dswb-eyebrow' }, 'WORK LOG'),
            h(
              'div',
              { className: 'dswb-log-title-row' },
              h('h2', { className: 'dswb-log-title' }, t('log.title')),
              h('span', { className: 'dswb-log-window' }, t('log.subtitle')),
            ),
          ),
          h(
            'div',
            { className: 'dswb-log-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dswb-log-copy',
                onClick: headerAction.onClick,
                disabled: headerAction.disabled,
              },
              todayHasItems && !busy ? h(CopyIcon) : null,
              h('span', null, headerAction.label),
            ),
          ),
        ),
        days.length === 0
          ? h('p', { className: 'dswb-log-empty' }, t('log.empty'))
          : calendar,
        h(
          'p',
          { className: 'dswb-log-foot' },
          todaySummary?.status === 'ready' && todaySummary.model !== undefined
            ? `${t('log.note')} · ${todaySummary.model}`
            : t('log.note'),
        ),
      )
    }

    function CopyIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': 'true', focusable: 'false' },
        h('rect', { x: 5.2, y: 5.2, width: 8.4, height: 8.4, rx: 2, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M10.8 3.2H4.4A1.2 1.2 0 0 0 3.2 4.4v6.4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
      )
    }

    function FolderIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 13,
          height: 13,
          'aria-hidden': 'true',
          focusable: 'false',
          className: 'dswb-task-folder-icon',
        },
        h('path', {
          d: 'M1.8 4.4A1.4 1.4 0 0 1 3.2 3h3l1.4 1.6h5.2a1.4 1.4 0 0 1 1.4 1.4v6.6a1.4 1.4 0 0 1-1.4 1.4H3.2a1.4 1.4 0 0 1-1.4-1.4Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
        }),
      )
    }

    function TaskGlyph() {
      return h(
        'svg',
        { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' },
        h('rect', {
          x: 4.2,
          y: 2.8,
          width: 11.6,
          height: 14.4,
          rx: 3,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
        }),
        h('path', {
          d: 'M7.2 7.4h5.6M7.2 10.4h5.6M7.2 13.4h3.4',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
      )
    }

    /** Quiet illustration for a panel without rows. */
    function EmptyArt() {
      return h(
        'svg',
        {
          viewBox: '0 0 72 72',
          width: 64,
          height: 64,
          'aria-hidden': 'true',
          focusable: 'false',
          className: 'dswb-empty-art',
        },
        h('circle', { cx: 36, cy: 36, r: 27, style: { fill: 'var(--dsw-alias-bg-module-platform)' } }),
        h('rect', {
          x: 23,
          y: 19,
          width: 23,
          height: 29,
          rx: 4,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
        }),
        h('path', {
          d: 'M28.5 27h12M28.5 33h12M28.5 39h6.5',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
        h('circle', {
          cx: 46,
          cy: 45,
          r: 6.4,
          style: { fill: 'var(--dsw-alias-bg-base)' },
          stroke: 'currentColor',
          strokeWidth: 1.6,
        }),
        h('path', {
          d: 'M50.8 49.8 56 55',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      )
    }

    function TaskCard({ item, running, t, now, openSession, workItem }) {
      const title = typeof item.title === 'string' && item.title !== '' ? item.title : t('row.untitled')
      const folder = basename(item.cwd)
      const time = relativeTime(t, item.updatedAt, now)
      const usage = item.usage !== null && typeof item.usage === 'object' ? item.usage : {}
      const cost = Number(usage.costCny) || 0
      const tokens = Number(usage.tokens) || 0
      const tools = Number(item.tools) || 0
      const action = running && item.lastAction !== null && typeof item.lastAction === 'object' ? item.lastAction : undefined
      const actionTime = Number(action?.time)
      const meta = []
      const stats = []

      if (folder !== '') {
        meta.push(
          h(
            'span',
            { className: 'dswb-task-folder', key: 'folder' },
            h(FolderIcon),
            h('span', { className: 'dswb-task-folder-name' }, folder),
          ),
        )
      }
      meta.push(
        h(
          'span',
          { className: 'dswb-task-status', key: 'status' },
          running ? t('row.running') : t('row.finished'),
        ),
      )
      if (time !== '') meta.push(h('span', { className: 'dswb-task-time', key: 'time' }, time))

      if (cost > 0) {
        stats.push(h('span', { className: 'dswb-task-stat', key: 'cost' }, formatCost(cost)))
      }
      if (tokens > 0) {
        stats.push(
          h(
            'span',
            { className: 'dswb-task-stat', key: 'tokens', title: formatTokens(tokens) },
            t('task.tokens', { count: formatCompactTokens(tokens) }),
          ),
        )
      }
      if (tools > 0) {
        stats.push(h('span', { className: 'dswb-task-stat', key: 'tools' }, t('task.tools', { count: String(tools) })))
      }

      return h(
        'li',
        { className: 'dswb-task', 'data-running': running ? 'true' : 'false' },
        h(
          'button',
          {
            type: 'button',
            className: 'dswb-task-button',
            'aria-label': t('row.open', { title }),
            onClick: () => openSession(item.sessionId),
          },
          h('span', { className: 'dswb-task-icon', 'aria-hidden': 'true' }, h(TaskGlyph)),
          h(
            'span',
            { className: 'dswb-task-main' },
            h('span', { className: 'dswb-task-title' }, title),
            typeof workItem === 'string' && workItem !== ''
              ? h('span', { className: 'dswb-task-work', title: workItem }, workItem)
              : null,
            h('span', { className: 'dswb-task-meta' }, ...meta),
            stats.length === 0 ? null : h('span', { className: 'dswb-task-stats' }, ...stats),
            action === undefined
              ? null
              : h(
                  'span',
                  { className: 'dswb-task-action' },
                  h('span', { className: 'dswb-task-action-text' }, actionText(t, action)),
                  Number.isFinite(actionTime) && actionTime > 0
                    ? h('span', { className: 'dswb-task-action-time' }, relativeTime(t, actionTime, now))
                    : null,
                ),
          ),
          running ? h(Spinner) : null,
        ),
      )
    }

    function TaskPanel({ title, count, items, running, emptyKey, t, now, openSession, workItems }) {
      const rows = Array.isArray(items) ? items : []
      return h(
        'section',
        { className: 'dswb-panel', 'aria-label': title },
        h(
          'header',
          { className: 'dswb-panel-head' },
          h(
            'div',
            { className: 'dswb-panel-heading' },
            h('span', { className: 'dswb-eyebrow' }, running ? 'RUNNING' : 'RECENT'),
            h('h2', null, title),
          ),
          h('span', { className: 'dswb-panel-count' }, t('panel.count', { count: String(Number(count) || 0) })),
        ),
        rows.length === 0
          ? h('div', { className: 'dswb-panel-empty' }, h(EmptyArt), h('p', null, t(emptyKey)))
          : h(
              React.Fragment,
              null,
              h(
                'ul',
                { className: 'dswb-tasks' },
                rows.map((item) =>
                  h(TaskCard, {
                    key: item.sessionId,
                    item,
                    running,
                    t,
                    now,
                    openSession,
                    workItem: workItems?.[basename(item.cwd)]?.[0],
                  }),
                ),
              ),
              Number(count) > rows.length
                ? h(
                    'p',
                    { className: 'dswb-panel-more' },
                    t('panel.more', { count: String(Number(count) - rows.length) }),
                  )
                : null,
            ),
      )
    }

    function RefreshIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: 'M13.4 8a5.4 5.4 0 1 1-1.6-3.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M13.4 2.6v3.1h-3.1',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function WorkbenchPage(props) {
      const { t, openSession } = props
      const [state, refresh] = useSnapshot()
      const [todayWorkItems, setTodayWorkItems] = React.useState({})
      const now = useNow(NOW_MS)
      const data = state.data
      const loading = state.status === 'loading'
      const runningTasks = Array.isArray(data?.running) ? data.running : []
      const recentTasks = Array.isArray(data?.recent) ? data.recent : []
      const lastTask = runningTasks[0] ?? recentTasks[0]
      const lastProject = lastTask === undefined ? '' : basename(lastTask.cwd)
      const workProjects = Object.keys(todayWorkItems)
      const workCount = workProjects.reduce((sum, name) => sum + todayWorkItems[name].length, 0)
      const runningCount = Number(data?.tasks?.running) || 0
      let statusLine
      if (data !== undefined) {
        if (runningCount > 0 && lastProject !== '') {
          statusLine = t('now.running', { project: lastProject, count: String(runningCount) })
        } else if (workCount > 0) {
          const separator = localeTag().toLowerCase().startsWith('zh') ? '、' : ', '
          statusLine = t('now.work', { projects: workProjects.slice(0, 2).join(separator), count: String(workCount) })
        } else if ((Number(data.tasks?.total) || 0) > 0) {
          statusLine = t('now.idle', { count: String(data.tasks.total) })
        } else {
          statusLine = t('now.empty')
        }
      }

      const greeting = greetingText(t, now)
      const accountName = data?.account?.profile?.name
      const pageTitle =
        typeof accountName === 'string' && accountName !== ''
          ? t('greet.named', { greeting, name: accountName })
          : greeting
      const monogram = typeof accountName === 'string' && accountName.trim() !== '' ? accountName.trim().slice(0, 1) : 'W'
      const heading = h(
        'div',
        { className: 'dswb-head' },
        h(
          'div',
          { className: 'dswb-head-main' },
          h('span', { className: 'dswb-monogram', 'aria-hidden': 'true' }, monogram),
          h(
            'div',
            { className: 'dswb-id-text' },
            h(
              'span',
              { className: 'dswb-eyebrow dswb-eyebrow-live' },
              h('i', { className: 'dswb-eyebrow-dot', 'aria-hidden': 'true' }),
              'WORKBENCH',
            ),
            h('h1', null, pageTitle),
            statusLine === undefined ? null : h('p', { className: 'dswb-summary' }, statusLine),
          ),
        ),
        h(
          'div',
          { className: 'dswb-head-side' },
          data === undefined
            ? null
            : h('span', { className: 'dswb-updated' }, t('updatedAt', { time: clockOf(data.generatedAt) })),
          h(
            'button',
            {
              type: 'button',
              className: 'dswb-refresh',
              onClick: refresh,
              disabled: loading,
              'aria-label': t('refresh'),
            },
            h(RefreshIcon),
            h('span', null, t('refresh')),
          ),
        ),
      )

      let body
      if (data === undefined) {
        body =
          state.status === 'error'
            ? h(
                'div',
                { className: 'dswb-notice dswb-notice-error', role: 'alert' },
                h('p', { className: 'dswb-notice-title' }, t('error.title')),
                h('p', null, t('error.body')),
                h(
                  'button',
                  { type: 'button', className: 'dswb-refresh', onClick: refresh },
                  h(RefreshIcon),
                  h('span', null, t('error.retry')),
                ),
              )
            : h(
                'div',
                { className: 'dswb-loading', role: 'status' },
                h('span', { className: 'dswb-dot', 'data-running': 'true', 'aria-hidden': 'true' }),
                t('loading'),
              )
      } else {
        const usage = data.usage ?? {}
        const today = usage.today ?? {}
        const tasks = data.tasks ?? { total: 0, running: 0, recent: 0 }
        const pending = Number(usage.pendingSessions)
        const baseline = Number(usage.previousAverageCny) || 0
        const todayCost = Number(today.costCny) || 0
        let todayDetail = t('card.todayDetail')
        let todayDetailTitle
        if (todayCost > 0 && baseline > 0) {
          const delta = ((todayCost - baseline) / baseline) * 100
          const percent = String(Math.round(Math.abs(delta)))
          todayDetail =
            Math.abs(delta) < 10
              ? t('card.todaySame')
              : t(delta > 0 ? 'card.todayHigher' : 'card.todayLower', { percent })
          todayDetailTitle = t('card.baselineTitle', { amount: formatMoney(baseline, 'CNY') })
        }

        body = h(
          React.Fragment,
          null,
          h(BalanceHero, { account: data.account, usage, t }),
          h(
            'div',
            { className: 'dswb-cards' },
            h(Card, {
              index: '01',
              label: t('card.todayAmount'),
              value: formatMoney(today.costCny, 'CNY'),
              detail: todayDetail,
              detailTitle: todayDetailTitle,
            }),
            h(Card, {
              index: '02',
              label: t('card.todayTokens'),
              value: formatTokens(tokenTotal(today)),
              detail: t('card.todayTokensDetail', {
                input: formatTokens(today.inputTokens),
                cache: formatTokens(today.cacheReadTokens),
                output: formatTokens(today.outputTokens),
              }),
            }),
            h(TaskTotalCard, { tasks, t }),
          ),
          h(SpeedCard, { speed: data.speed, t, now, openSession }),
          h(WorkLogCard, { worklog: data.worklog, t, onWorkItems: setTodayWorkItems }),
          Number.isFinite(pending) && pending > 0
            ? h(
                'p',
                { className: 'dswb-hint', role: 'status' },
                t('usage.pending', { count: pending }),
              )
            : null,
          state.status === 'stale'
            ? h('p', { className: 'dswb-hint', role: 'status' }, t('stale'))
            : null,
          h(
            'div',
            { className: 'dswb-panels' },
            h(TaskPanel, {
              title: t('section.running'),
              count: tasks.running,
              items: data.running,
              running: true,
              emptyKey: 'empty.running',
              t,
              now,
              openSession,
              workItems: todayWorkItems,
            }),
            h(TaskPanel, {
              title: t('section.recent'),
              count: tasks.recent,
              items: data.recent,
              running: false,
              emptyKey: 'empty.recent',
              t,
              now,
              openSession,
              workItems: todayWorkItems,
            }),
          ),
          h('p', { className: 'dswb-footnote' }, t('footnote')),
        )
      }

      return h(
        'section',
        { className: 'dswb-page', 'aria-label': t('title') },
        h('style', { key: 'styles' }, CSS),
        h('div', { className: 'dswb-scroll' }, h('div', { className: 'dswb-content' }, heading, body)),
      )
    }

    /** Circular indeterminate spinner: one round-capped arc on a faint track. */
    function Spinner() {
      return h(
        'svg',
        {
          className: 'dswb-spinner',
          viewBox: '0 0 20 20',
          width: 18,
          height: 18,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('circle', {
          cx: 10,
          cy: 10,
          r: 8,
          fill: 'none',
          strokeWidth: 2,
          style: { stroke: 'var(--dsw-alias-border-l1)' },
        }),
        h('circle', {
          className: 'dswb-spinner-arc',
          cx: 10,
          cy: 10,
          r: 8,
          fill: 'none',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeDasharray: '12.57 50.27',
          style: { stroke: 'var(--dsw-alias-brand-primary)' },
        }),
      )
    }

    /** Decorative dashboard glyph for the sidebar entry. */
    function WorkbenchIcon({ size }) {
      const edge = Number.isFinite(size) && size > 0 ? size : 16
      return h(
        'svg',
        {
          width: edge,
          height: edge,
          viewBox: '0 0 20 20',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('rect', { x: 2, y: 2, width: 7, height: 7, rx: 2, fill: 'currentColor' }),
        h('rect', { x: 11, y: 2, width: 7, height: 7, rx: 2, fill: 'currentColor', opacity: 0.5 }),
        h('rect', { x: 2, y: 11, width: 7, height: 7, rx: 2, fill: 'currentColor', opacity: 0.5 }),
        h('rect', { x: 11, y: 11, width: 7, height: 7, rx: 2, fill: 'currentColor' }),
      )
    }

    const CSS = [
      // --- page shell -------------------------------------------------------
      '.dswb-page{background-color:var(--dsw-alias-bg-base);--wb-grad:linear-gradient(135deg,#8ea7ff,#5eead4);--wb-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;width:100%;min-width:0;height:100%;min-height:0;position:relative;color:var(--dsw-alias-label-primary);background:radial-gradient(780px 460px at 8% -12%,color-mix(in srgb,#6f8cff 14%,transparent),transparent 68%),radial-gradient(620px 380px at 100% 110%,color-mix(in srgb,#2dd4bf 9%,transparent),transparent 72%),var(--dsw-alias-bg-base);font-size:14px;line-height:1.6;font-feature-settings:"tnum" 1;display:flex;overflow:hidden}',
      '.dswb-page:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent) 1px,transparent 1.2px);background-size:24px 24px;opacity:.2;-webkit-mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 55%,transparent 92%);mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 55%,transparent 92%)}',
      '.dswb-scroll{position:relative;z-index:1;scrollbar-gutter:stable;flex:1;min-height:0;overflow:auto}',
      '.dswb-content{max-width:960px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}',

      // --- header -----------------------------------------------------------
      '.dswb-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding-top:32px;margin-bottom:26px;animation:dswb-rise .45s ease both}',
      '[data-platform=darwin] .dswb-head{padding-top:calc(32px + var(--dsh-frame-top-clearance,0px))}',
      '.dswb-head-main{display:flex;align-items:center;gap:15px;min-width:0}',
      '.dswb-id-text{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.dswb-monogram{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;flex:none;font-family:var(--wb-mono);font-size:18px;font-weight:600;line-height:1;color:var(--dsw-alias-label-primary);background:radial-gradient(circle at 32% 26%,color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent),transparent 72%),var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent);box-shadow:0 0 28px -8px rgba(124,156,255,.55),inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}',
      '.dswb-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:14px;letter-spacing:.16em;text-transform:uppercase}',
      '.dswb-eyebrow-dot{width:5px;height:5px;border-radius:50%;flex:none;background:#5eead4;box-shadow:0 0 9px rgba(94,234,212,.9);animation:dswb-breathe 2.4s ease-in-out infinite}',
      '.dswb-head h1{margin:0;font-size:32px;font-weight:500;line-height:40px;letter-spacing:-.02em;overflow-wrap:anywhere}',
      '.dswb-summary{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dswb-summary-count{font-weight:500;font-variant-numeric:tabular-nums}',
      '.dswb-summary-count-running{color:var(--dsw-alias-brand-primary)}',
      '.dswb-summary-count-recent{color:var(--dsw-alias-state-success-primary)}',
      '.dswb-head-side{display:flex;align-items:center;gap:12px;flex:none}',
      '.dswb-updated{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;line-height:20px;font-variant-numeric:tabular-nums}',
      '.dswb-updated:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-success-primary);box-shadow:0 0 7px color-mix(in srgb,var(--dsw-alias-state-success-primary) 70%,transparent)}',
      '.dswb-refresh{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l3);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent);background:transparent;background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background .15s,border-color .15s}',
      '.dswb-refresh:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}',
      '.dswb-refresh:disabled{cursor:default;opacity:.5}',
      '.dswb-refresh:disabled svg{animation:dswb-spin 1s linear infinite}',
      '.dswb-refresh:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',

      // --- metric cards -----------------------------------------------------
      '.dswb-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;animation:dswb-rise .5s ease .08s both}',
      '.dswb-card{border-radius:18px;padding:18px;min-width:0;position:relative}',
      '.dswb-card-index{position:absolute;top:15px;right:17px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:14px;letter-spacing:.12em;opacity:.55}',
      '.dswb-card-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;letter-spacing:.02em}',
      '.dswb-card-value{margin-top:6px;font-family:var(--wb-mono);font-size:26px;font-weight:500;line-height:34px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dswb-card-value[data-tone=muted]{color:var(--dsw-alias-label-secondary);font-size:18px;line-height:34px}',
      '.dswb-card-detail{margin-top:4px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:18px}',
      '.dswb-card-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-legend{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      '.dswb-legend b{font-weight:500;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dswb-legend-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}',
      '.dswb-legend-dot[data-kind=running]{background:var(--dsw-alias-brand-primary)}',
      '.dswb-legend-dot[data-kind=done]{background:var(--dsw-alias-state-success-primary)}',

      // --- shared surface ---------------------------------------------------
      '.dswb-card,.dswb-hero,.dswb-panel,.dswb-speed,.dswb-log{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-card,.dswb-hero,.dswb-panel,.dswb-speed,.dswb-log{background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent),transparent 55%),var(--dsw-alias-bg-layer-1);border:.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);box-shadow:0 26px 60px -48px color-mix(in srgb,#0b1020 60%,transparent),inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}',

      // --- wallet hero ------------------------------------------------------
      '.dswb-hero{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px 32px;margin-bottom:16px;padding:16px 20px;border-radius:20px;position:relative;overflow:hidden;animation:dswb-rise .5s ease .04s both}',
      '.dswb-hero:before{content:"";position:absolute;top:0;left:22px;right:22px;height:1px;background:linear-gradient(90deg,transparent,rgba(142,167,255,.55),rgba(94,234,212,.35),transparent)}',
      '.dswb-hero:after{content:"";position:absolute;right:26px;top:50%;width:320px;height:170px;transform:translateY(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(124,156,255,.10),transparent 70%);pointer-events:none}',
      '.dswb-hero>*{position:relative;z-index:1}',
      '.dswb-hero-main{display:flex;flex-direction:column;flex:0 1 240px;min-width:0;gap:2px}',
      '.dswb-hero-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-hero-value{font-family:var(--wb-mono);font-size:30px;font-weight:500;line-height:38px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dswb-hero-value[data-tone=muted]{color:var(--dsw-alias-label-secondary);font-size:20px;line-height:38px}',
      '.dswb-hero-sub{color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:18px}',
      '.dswb-hero-side{display:flex;flex-direction:column;gap:18px;flex:1 1 360px;min-width:0}',
      '.dswb-hero-ratio{display:flex;align-items:center;gap:10px;min-width:0}',
      '.dswb-hero-ratio-label{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;white-space:nowrap}',
      '.dswb-hero-ratio-value{font-family:var(--wb-mono);font-size:16px;font-weight:500;line-height:24px;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.dswb-hero-track{flex:1;min-width:80px;height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-3);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}',
      '.dswb-hero-fill{display:block;height:100%;border-radius:2px;background:var(--wb-grad)}',
      '.dswb-hero-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px 18px;min-width:0;padding-top:2px}',
      '.dswb-hero-fact{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.dswb-hero-fact-label{color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-hero-fact-value{font-family:var(--wb-mono);font-size:13px;font-weight:500;line-height:19px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-hint{margin:0 0 12px;padding:10px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px}',

      // --- throughput table -------------------------------------------------
      '.dswb-speed{margin-bottom:16px;padding:18px 20px;border-radius:20px;position:relative;overflow:hidden;animation:dswb-rise .5s ease .12s both}',
      '.dswb-speed-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px 18px;margin-bottom:8px}',
      '.dswb-speed-heading{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dswb-speed-title-row{display:flex;align-items:baseline;gap:8px;min-width:0}',
      '.dswb-speed-title{margin:0;font-size:16px;font-weight:500;line-height:24px;letter-spacing:-.01em}',
      '.dswb-speed-window{color:var(--dswb-alias-label-tertiary);color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:18px;letter-spacing:.04em}',
      '.dswb-speed-stats{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;padding:2px 0 12px;border-bottom:.5px solid var(--dsw-alias-border-l1);margin-bottom:12px}',
      '.dswb-speed-stat{display:inline-flex;align-items:baseline;gap:4px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;line-height:18px;font-variant-numeric:tabular-nums}',
      '.dswb-speed-stat b{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500}',
      '.dswb-speed-current{display:flex;flex-direction:column;align-items:flex-end;gap:1px;min-width:0;text-align:right}',
      '.dswb-speed-current-label{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:9.5px;line-height:14px;letter-spacing:.14em;text-transform:uppercase}',
      '.dswb-speed-current-line{display:flex;align-items:baseline;gap:6px}',
      '.dswb-speed-current-value{font-family:var(--wb-mono);font-size:28px;font-weight:500;line-height:34px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
      '.dswb-speed-current-value[data-empty=true]{color:var(--dsw-alias-label-tertiary);font-size:22px}',
      '.dswb-speed-current-unit{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;line-height:18px}',
      '.dswb-speed-current-meta{max-width:320px;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-speed-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px 24px;align-items:start}',
      '.dswb-speed-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px}',
      '.dswb-speed-table th{padding:0 8px 6px 0;border-bottom:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:9.5px;font-weight:400;letter-spacing:.06em;text-align:left;text-transform:uppercase}',
      '.dswb-speed-table th:first-child{width:58%}',
      '.dswb-speed-table td{padding:7px 8px 7px 0;border-bottom:.5px solid var(--dsw-alias-border-l1);vertical-align:middle}',
      '.dswb-speed-table tr:last-child td{border-bottom:0}',
      '.dswb-speed-table th:last-child,.dswb-speed-table td:last-child{padding-right:0}',
      '.dswb-speed-model{overflow:hidden;color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-speed-num{text-align:right;font-family:var(--wb-mono);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.dswb-speed-table th.dswb-speed-num{text-align:right;letter-spacing:0}',
      '.dswb-speed-pane{display:flex;flex-direction:column;gap:5px;min-width:0}',
      '.dswb-speed-recent{padding-left:20px;border-left:.5px solid var(--dsw-alias-border-l1)}',
      '@media (width<=720px){.dswb-speed-body{grid-template-columns:minmax(0,1fr)}.dswb-speed-recent{padding-left:0;padding-top:12px;border-left:0;border-top:.5px solid var(--dsw-alias-border-l1)}}',
      '.dswb-speed-recent-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}',
      '.dswb-speed-recent-row{display:flex;align-items:center;gap:8px;width:100%;min-width:0;padding:5px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .15s}',
      '.dswb-speed-recent-row:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}',
      '.dswb-speed-recent-row:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-speed-time{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:16px;font-variant-numeric:tabular-nums}',
      '.dswb-speed-recent-title{flex:1;min-width:0;overflow:hidden;font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-speed-recent-meta{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:16px;white-space:nowrap}',
      '.dswb-speed-empty{margin:0;padding:12px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-speed-note{margin:10px 0 0;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;opacity:.8}',

      // --- work log ---------------------------------------------------------
      '.dswb-log{margin-bottom:16px;padding:18px 20px;border-radius:20px;position:relative;overflow:hidden;animation:dswb-rise .5s ease .14s both}',
      '.dswb-log-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px 18px;margin-bottom:10px}',
      '.dswb-log-heading{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dswb-log-title-row{display:flex;align-items:baseline;gap:8px;min-width:0}',
      '.dswb-log-title{margin:0;font-size:16px;font-weight:500;line-height:24px;letter-spacing:-.01em}',
      '.dswb-log-window{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:18px;letter-spacing:.04em}',
      '.dswb-log-copy{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:14px;border:.5px solid var(--dsw-alias-border-l3);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;transition:color .15s,border-color .15s}',
      '.dswb-log-copy:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-tertiary)}',
      '.dswb-log-copy:disabled{opacity:.55;cursor:default}',
      '.dswb-log-copy:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-log-days{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}',
      '.dswb-log-day{padding:12px 14px;border-radius:14px;background:var(--dsw-alias-bg-layer-2);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,transparent);border:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-log-day[data-today=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 42%,transparent)}',
      '.dswb-log-day-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}',
      '.dswb-log-day-title{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.dswb-log-day-label{color:var(--dsw-alias-label-primary);font-family:var(--wb-mono);font-size:12px;font-weight:500;line-height:18px}',
      '.dswb-log-day-projects{max-width:100%;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-log-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.dswb-log-calendar{padding:12px 14px;border-radius:14px;background:var(--dsw-alias-bg-layer-2);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,transparent);border:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-log-month{display:flex;align-items:center;gap:6px;margin-bottom:8px}',
      '.dswb-log-month-label{flex:1;color:var(--dsw-alias-label-primary);font-family:var(--wb-mono);font-size:12px;font-weight:500;line-height:18px}',
      '.dswb-log-month-btn{width:24px;height:24px;padding:0;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;line-height:1;cursor:pointer}',
      '.dswb-log-month-btn:disabled{opacity:.35;cursor:default}',
      '.dswb-log-month-today{height:24px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:16px;cursor:pointer}',
      '.dswb-log-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-bottom:4px}',
      '.dswb-log-weekday{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:9.5px;line-height:14px;text-align:center}',
      '.dswb-log-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}',
      '.dswb-log-cell{display:flex;min-width:0;min-height:64px;flex-direction:column;gap:2px;padding:5px 6px;border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left}',
      '.dswb-log-cell[data-empty=true]{opacity:.35;border-color:transparent}',
      '.dswb-log-cell:not([data-empty=true]){cursor:pointer}',
      '.dswb-log-cell[data-today=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 48%,transparent)}',
      '.dswb-log-cell[data-selected=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,transparent)}',
      '.dswb-log-cell:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-log-cell.is-empty{display:block;min-height:0;border:0}',
      '.dswb-log-cell-day{align-self:flex-start;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:14px}',
      '.dswb-log-cell[data-today=true] .dswb-log-cell-day{color:var(--dsw-alias-brand-text,var(--dsw-alias-brand-primary))}',
      '.dswb-log-cell-projects{max-width:100%;overflow:hidden;color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:9.5px;line-height:13px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-log-cell-snippet{max-width:100%;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:13px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}',
      '.dswb-log-cell-pending{color:var(--dsw-alias-label-tertiary);font-size:9.5px;line-height:13px;opacity:.75}',
      '.dswb-log-calendar-detail{margin-top:10px}',
      '.dswb-log-day-actions{display:flex;align-items:center;gap:6px;flex:none}',
      '.dswb-log-day-action{flex:none;height:24px;padding:0 9px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:16px;cursor:pointer;white-space:nowrap}',
      '.dswb-log-day-action:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}',
      '.dswb-log-day-action:disabled{opacity:.55;cursor:default}',
      '.dswb-log-day-action:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-log-status{display:flex;align-items:center;gap:8px;margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-log-status-error{flex-wrap:wrap;color:var(--dsw-alias-state-warn-label)}',
      '.dswb-log-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-brand-primary);animation:dswb-breathe 1.8s ease-in-out infinite}',
      '.dswb-log-summary{display:flex;flex-direction:column;gap:10px;margin-top:9px}',
      '.dswb-log-summary-project{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dswb-log-summary-name{margin:0;color:var(--dsw-alias-label-primary);font-family:var(--wb-mono);font-size:11.5px;font-weight:500;line-height:18px}',
      '.dswb-log-items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}',
      '.dswb-log-item{position:relative;padding-left:12px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px;overflow-wrap:anywhere}',
      '.dswb-log-item:before{content:"";position:absolute;left:0;top:7px;width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
      '.dswb-log-prompt{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-log-empty{margin:8px 0 0;padding:2px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-log-foot{margin:10px 0 0;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;opacity:.8}',

      // --- task panels ------------------------------------------------------
      '.dswb-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:28px;align-items:stretch;animation:dswb-rise .5s ease .16s both}',
      '.dswb-panel{display:flex;flex-direction:column;min-width:0;min-height:220px;padding:16px 18px 14px;border-radius:22px}',
      '.dswb-panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin:0 0 6px}',
      '.dswb-panel-heading{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dswb-panel-head h2{margin:0;font-size:15px;font-weight:500;line-height:23px;letter-spacing:-.01em}',
      '.dswb-panel-count{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;line-height:18px;font-variant-numeric:tabular-nums}',
      '.dswb-tasks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}',
      '.dswb-task{min-width:0;position:relative}',
      '.dswb-task+.dswb-task{border-top:.5px solid var(--dsw-alias-border-l1);border-top-color:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}',
      '.dswb-task-button{width:100%;display:flex;align-items:flex-start;gap:12px;padding:14px 8px 14px 16px;border-radius:12px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0;position:relative;transition:background .15s}',
      '.dswb-task-button:before{content:"";position:absolute;left:0;top:15px;bottom:15px;width:2px;border-radius:2px;background:transparent;transition:background .15s}',
      '.dswb-task[data-running=true] .dswb-task-button:before{background:var(--wb-grad);box-shadow:0 0 12px rgba(124,156,255,.5)}',
      '.dswb-task-button:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}',
      '.dswb-task-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-task-icon{width:32px;height:32px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;flex:none;border:.5px solid var(--dsw-alias-border-l1);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);background:transparent;background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,transparent);color:var(--dsw-alias-label-secondary)}',
      '.dswb-task[data-running=true] .dswb-task-icon{color:#9db2ff;border-color:rgba(142,167,255,.4)}',
      '.dswb-task-main{display:flex;flex-direction:column;flex:1;min-width:0;gap:4px}',
      '.dswb-task-title{font-size:14px;font-weight:500;line-height:22px;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
      '.dswb-task-work{overflow:hidden;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-task-meta{display:flex;flex-wrap:wrap;align-items:center;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:18px;min-width:0}',
      '.dswb-task-meta>span{position:relative;min-width:0}',
      '.dswb-task-meta>span+span{padding-left:9px}',
      '.dswb-task-meta>span+span:before{content:"";position:absolute;left:0;top:50%;width:1px;height:10px;transform:translateY(-50%);background:var(--dsw-alias-border-l2);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent)}',
      '.dswb-task-stats{display:flex;flex-wrap:wrap;align-items:center;column-gap:8px;row-gap:2px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;line-height:17px;font-variant-numeric:tabular-nums;min-width:0}',
      '.dswb-task-stat{position:relative;min-width:0;white-space:nowrap}',
      '.dswb-task-stat+.dswb-task-stat{padding-left:9px}',
      '.dswb-task-stat+.dswb-task-stat:before{content:"";position:absolute;left:0;top:50%;width:1px;height:10px;transform:translateY(-50%);background:var(--dsw-alias-border-l2);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent)}',
      '.dswb-task-action{display:flex;align-items:center;gap:6px;min-width:0;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:18px}',
      '.dswb-task-action-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-task-action-time{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-variant-numeric:tabular-nums}',
      '.dswb-task-folder{display:inline-flex;align-items:center;gap:4px;max-width:100%}',
      '.dswb-task-folder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.dswb-task-folder-icon{flex:none;opacity:.9}',
      '.dswb-spinner{flex:none;margin-top:2px;width:17px;height:17px;transform-origin:center;animation:dswb-spin .8s linear infinite}',
      '.dswb-panel-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 12px;min-height:160px;color:var(--dsw-alias-label-tertiary);text-align:center}',
      '.dswb-panel-empty p{margin:0;font-size:12.5px;line-height:20px}',
      '.dswb-panel-more{margin:8px 2px 0;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;line-height:17px}',
      '.dswb-empty-art{opacity:.8}',
      '.dswb-footnote{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}',

      // --- loading / notices ------------------------------------------------
      '.dswb-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:48px 8px;color:var(--dsw-alias-label-tertiary);font-size:13px}',
      '.dswb-notice{margin-bottom:16px;padding:16px;border-radius:16px;background:var(--dsw-alias-bg-layer-1);background-color:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:21px}',
      '.dswb-notice p{margin:0}',
      '.dswb-notice p.dswb-notice-title{margin-bottom:4px;color:var(--dsw-alias-label-primary);font-weight:500}',
      '.dswb-notice .dswb-refresh{margin-top:12px}',
      '.dswb-notice-error{border:.5px solid var(--dsw-alias-state-error-primary)}',
      '.dswb-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}',
      '.dswb-dot[data-running=true]{background:var(--dsw-alias-brand-primary);animation:dswb-pulse 1.6s ease-in-out infinite}',

      // --- motion -----------------------------------------------------------
      '@keyframes dswb-spin{to{transform:rotate(360deg)}}',
      '@keyframes dswb-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '@keyframes dswb-breathe{0%,100%{opacity:.4}50%{opacity:1}}',
      '@keyframes dswb-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',

      // --- responsive -------------------------------------------------------
      '@media (width<=720px){.dswb-panels{grid-template-columns:minmax(0,1fr)}.dswb-hero-side{flex-basis:100%}.dswb-speed-current{align-items:flex-start;text-align:left}.dswb-speed-current-meta{max-width:100%}}',
      '@media (width<=560px){.dswb-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.dswb-card-total{grid-column:1/-1}}',
      '@media (width<=540px){.dswb-head h1{font-size:26px;line-height:34px}.dswb-monogram{width:40px;height:40px;font-size:16px}.dswb-hero-value{font-size:30px;line-height:38px}}',
      '@media (prefers-reduced-motion:reduce){.dswb-spinner{animation:none}.dswb-eyebrow-dot,.dswb-dot,.dswb-log-dot,.dswb-head,.dswb-hero,.dswb-cards,.dswb-speed,.dswb-log,.dswb-panels,.dswb-refresh:disabled svg{animation:none}}',
    ].join('')

    // --- registration ---------------------------------------------------------

    const inject = ['slots', 'locale']

    /**
     * Register the dictionaries, the main panel, and its sidebar entry.
     * @param ctx - browser services used by these contributions.
     */
    function apply(ctx) {
      ctx.effect(
        () =>
          ctx.locale.register(NS, {
            zh,
            en,
          }),
        'dsh-workbench: dictionaries',
      )
      uiLanguage = readUiLocale(ctx.locale)
      const t = ctx.locale.bind(NS)
      // The visible dictionary is the source of truth for the summary language.
      if (t('log.title') === zh['log.title']) uiLanguage = 'zh'
      else if (t('log.title') === en['log.title']) uiLanguage = 'en'
      const openSession = (sessionId) => {
        const workspace = ctx.get('uiWorkspace')
        if (workspace !== undefined && typeof workspace.openSession === 'function') {
          workspace.openSession(sessionId)
        }
      }

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ openSession }),
          },
          WorkbenchPage,
        ),
      )
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 20,
            locale: NS,
            label: () => t('panel'),
          },
          WorkbenchIcon,
        ),
      )
    }

    return { inject, apply }
  },
})
