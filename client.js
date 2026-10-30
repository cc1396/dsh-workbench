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
    const POLL_MS = 15000
    const RETRY_MS = 4000
    const NOW_MS = 30000
    /** Donut geometry: a round ring with the same 8px band on every edge. */
    const DONUT_RADIUS = 38
    const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

    /** Simplified Chinese dictionary (key-set source of truth). */
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
      'summary.line': '有 {running} 个任务正在进行中，{recent} 个任务已完成',
      'legend.running': '进行中',
      'legend.done': '已完成',
      'hero.label': '账户余额',
      'hero.ratio': '已用占比',
      'hero.ratioAria': '已用占比 {percent}',
      'hero.split': '充值 {recharge} · 赠送 {bonus}',
      'hero.used': '累计消耗',
      'hero.combined': '余额 + 消耗',
      'hero.tokens': '累计 Token',
      'card.balanceSignedOut': '未登录',
      'card.balanceSignedOutDetail': '登录 DeepSeek 账户后可查看余额',
      'card.balanceFailed': '余额读取失败，请稍后重试',
      'card.balanceUnavailable': '当前环境不支持余额查询',
      'card.todayAmount': '今日消耗',
      'card.todayDetail': '今日 00:00 起 · 本机估算',
      'card.todayTokens': '今日 Token',
      'card.todayTokensDetail': '输入 {input} · 缓存 {cache} · 输出 {output}',
      'stats.total': '任务总数',
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
      'summary.line': '{running} tasks in progress · {recent} completed',
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
      'stats.total': 'Tasks',
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

    function localeTag() {
      try {
        return navigator.language || 'en'
      } catch {
        return 'en'
      }
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

    function Card({ label, value, detail, tone }) {
      return h(
        'article',
        { className: 'dswb-card' },
        h('div', { className: 'dswb-card-label' }, label),
        h('div', { className: 'dswb-card-value', 'data-tone': tone }, value),
        detail === undefined ? null : h('div', { className: 'dswb-card-detail' }, detail),
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

    /** Fill one sentence's `{running}` / `{recent}` slots with emphasised counts. */
    function summaryParts(template, values) {
      const parts = []
      const pattern = /\{(running|recent)\}/g
      let cursor = 0
      let match
      while ((match = pattern.exec(template)) !== null) {
        if (match.index > cursor) parts.push(template.slice(cursor, match.index))
        const kind = match[1]
        parts.push(
          h(
            'b',
            { key: `${kind}-${match.index}`, className: `dswb-summary-count dswb-summary-count-${kind}` },
            values[kind],
          ),
        )
        cursor = match.index + match[0].length
      }
      parts.push(template.slice(cursor))
      return parts
    }

    /**
     * One hero card: the current balance, the cumulative spend, and the share
     * already consumed. The donut reads the estimated spend against
     * balance + spend, so both numbers and their relation stay on one surface.
     */
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

      const metrics = [
        h(
          'div',
          { className: 'dswb-hero-metric', key: 'spent' },
          h('span', { className: 'dswb-hero-metric-label' }, t('hero.used')),
          h('span', { className: 'dswb-hero-metric-value' }, formatMoney(spent, 'CNY')),
        ),
      ]
      if (comparable) {
        metrics.push(
          h(
            'div',
            { className: 'dswb-hero-metric', key: 'combined' },
            h('span', { className: 'dswb-hero-metric-label' }, t('hero.combined')),
            h('span', { className: 'dswb-hero-metric-value' }, formatMoney(combined, primary)),
          ),
        )
      }
      metrics.push(
        h(
          'div',
          { className: 'dswb-hero-metric', key: 'tokens' },
          h('span', { className: 'dswb-hero-metric-label' }, t('hero.tokens')),
          h('span', { className: 'dswb-hero-metric-value' }, formatTokens(tokenTotal(usage?.total))),
        ),
      )

      return h(
        'article',
        { className: 'dswb-hero' },
        h(
          'div',
          { className: 'dswb-hero-main' },
          h('div', { className: 'dswb-hero-label' }, t('hero.label')),
          h('div', { className: 'dswb-hero-value', 'data-tone': ready ? undefined : 'muted' }, value),
          detail === undefined ? null : h('div', { className: 'dswb-hero-sub' }, detail),
        ),
        h(
          'div',
          {
            className: 'dswb-donut',
            role: 'img',
            'aria-label': t('hero.ratioAria', { percent: percentText }),
          },
          h(
            'svg',
            {
              className: 'dswb-donut-svg',
              viewBox: '0 0 88 88',
              width: 88,
              height: 88,
              'aria-hidden': 'true',
              focusable: 'false',
            },
            h('circle', {
              cx: 44,
              cy: 44,
              r: DONUT_RADIUS,
              fill: 'none',
              strokeWidth: 8,
              style: { stroke: 'var(--dsw-alias-border-l2)' },
            }),
            ratio === undefined
              ? null
              : h('circle', {
                  className: 'dswb-donut-arc',
                  cx: 44,
                  cy: 44,
                  r: DONUT_RADIUS,
                  fill: 'none',
                  strokeWidth: 8,
                  strokeLinecap: 'round',
                  strokeDasharray: String(DONUT_CIRCUMFERENCE),
                  strokeDashoffset: String(DONUT_CIRCUMFERENCE * (1 - ratio)),
                  transform: 'rotate(-90 44 44)',
                  style: { stroke: 'var(--dsw-alias-brand-primary)' },
                }),
          ),
          h(
            'div',
            { className: 'dswb-donut-text', 'aria-hidden': 'true' },
            h('span', { className: 'dswb-donut-value' }, percentText),
            h('span', { className: 'dswb-donut-label' }, t('hero.ratio')),
          ),
        ),
        h('div', { className: 'dswb-hero-foot' }, ...metrics),
      )
    }

    /** Task totals with the running / completed legend and a quiet dashed ring. */
    function TaskTotalCard({ tasks, t }) {
      return h(
        'article',
        { className: 'dswb-card dswb-card-total' },
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
        h(
          'svg',
          {
            className: 'dswb-card-deco',
            viewBox: '0 0 56 56',
            width: 56,
            height: 56,
            'aria-hidden': 'true',
            focusable: 'false',
          },
          h('circle', {
            cx: 28,
            cy: 28,
            r: 25,
            fill: 'none',
            strokeWidth: 1.2,
            strokeDasharray: '3 6',
            style: { stroke: 'var(--dswb-deco, var(--dsw-alias-border-l2))' },
          }),
        ),
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

    function TaskCard({ item, running, t, now, openSession }) {
      const title = typeof item.title === 'string' && item.title !== '' ? item.title : t('row.untitled')
      const folder = basename(item.cwd)
      const time = relativeTime(t, item.updatedAt, now)
      const meta = []

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
            h('span', { className: 'dswb-task-meta' }, ...meta),
          ),
          running ? h(Spinner) : null,
        ),
      )
    }

    function TaskPanel({ title, count, items, running, emptyKey, t, now, openSession }) {
      const rows = Array.isArray(items) ? items : []
      return h(
        'section',
        { className: 'dswb-panel', 'aria-label': title },
        h(
          'header',
          { className: 'dswb-panel-head' },
          h('h2', null, title),
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
                  h(TaskCard, { key: item.sessionId, item, running, t, now, openSession }),
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
      const now = useNow(NOW_MS)
      const data = state.data
      const loading = state.status === 'loading'

      const greeting = greetingText(t, now)
      const accountName = data?.account?.profile?.name
      const pageTitle =
        typeof accountName === 'string' && accountName !== ''
          ? t('greet.named', { greeting, name: accountName })
          : greeting
      const heading = h(
        'div',
        { className: 'dswb-head' },
        h(
          'div',
          { className: 'dswb-head-main' },
          h('h1', null, pageTitle),
          data === undefined
            ? null
            : h(
                'p',
                { className: 'dswb-summary' },
                ...summaryParts(t('summary.line'), {
                  running: formatTokens(data.tasks?.running),
                  recent: formatTokens(data.tasks?.recent),
                }),
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

        body = h(
          React.Fragment,
          null,
          h(BalanceHero, { account: data.account, usage, t }),
          h(
            'div',
            { className: 'dswb-cards' },
            h(Card, {
              label: t('card.todayAmount'),
              value: formatMoney(today.costCny, 'CNY'),
              detail: t('card.todayDetail'),
            }),
            h(Card, {
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
      '.dswb-page{width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:14px;line-height:1.6;display:flex;overflow:hidden}',
      '.dswb-scroll{scrollbar-gutter:stable;flex:1;min-height:0;overflow:auto}',
      '.dswb-content{max-width:960px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}',
      '.dswb-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding-top:28px;margin-bottom:24px}',
      '[data-platform=darwin] .dswb-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
      '.dswb-head h1{margin:0;font-size:24px;font-weight:500;line-height:32px;overflow-wrap:anywhere}',
      '.dswb-head-main{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dswb-summary{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dswb-summary-count{font-weight:500;font-variant-numeric:tabular-nums}',
      '.dswb-summary-count-running{color:var(--dsw-alias-brand-primary)}',
      '.dswb-summary-count-recent{color:var(--dsw-alias-state-success-primary)}',
      '.dswb-head-side{display:flex;align-items:center;gap:12px;flex:none}',
      '.dswb-updated{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;font-variant-numeric:tabular-nums}',
      '.dswb-refresh{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l3);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background .15s,border-color .15s}',
      '.dswb-refresh:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dswb-refresh:disabled{cursor:default;opacity:.5}',
      '.dswb-refresh:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}',
      '.dswb-card{background:var(--dsw-alias-bg-layer-1);border-radius:16px;border:.5px solid var(--dsw-alias-border-l1);padding:16px;min-width:0;position:relative}',
      '.dswb-card-deco{position:absolute;right:14px;top:14px;pointer-events:none;opacity:.85}',
      '.dswb-card-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-legend{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      '.dswb-legend b{font-weight:500;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dswb-legend-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}',
      '.dswb-legend-dot[data-kind=running]{background:var(--dsw-alias-brand-primary)}',
      '.dswb-legend-dot[data-kind=done]{background:var(--dsw-alias-state-success-primary)}',
      '.dswb-card-label{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dswb-card-value{margin-top:4px;font-size:24px;font-weight:500;line-height:32px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dswb-card-value[data-tone=muted]{color:var(--dsw-alias-label-secondary);font-size:18px;line-height:32px}',
      '.dswb-card-detail{margin-top:4px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}',
      '.dswb-hero{display:flex;flex-wrap:wrap;align-items:center;gap:18px 28px;margin-bottom:16px;padding:20px 22px;border-radius:20px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
      '.dswb-hero-main{display:flex;flex-direction:column;flex:1 1 220px;min-width:0;gap:2px}',
      '.dswb-hero-label{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dswb-hero-value{font-size:32px;font-weight:500;line-height:40px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dswb-hero-value[data-tone=muted]{color:var(--dsw-alias-label-secondary);font-size:22px;line-height:40px}',
      '.dswb-hero-sub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}',
      '.dswb-donut{position:relative;width:88px;height:88px;flex:none;display:grid;place-items:center}',
      '.dswb-donut-svg{position:absolute;inset:0}',
      '.dswb-donut-arc{transition:stroke-dashoffset .4s ease}',
      '.dswb-donut-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;pointer-events:none}',
      '.dswb-donut-value{font-size:18px;font-weight:500;line-height:22px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.dswb-donut-label{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}',
      '.dswb-hero-foot{flex-basis:100%;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 28px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-hero-metric{display:flex;flex-direction:column;gap:2px;min-width:96px}',
      '.dswb-hero-metric-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-hero-metric-value{font-size:16px;font-weight:500;line-height:24px;font-variant-numeric:tabular-nums}',
      '.dswb-hint{margin:0 0 12px;padding:10px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px}',
      '.dswb-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:28px;align-items:stretch}',
      '.dswb-panel{display:flex;flex-direction:column;min-width:0;min-height:220px;padding:18px;border-radius:20px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
      '.dswb-panel-head{display:flex;align-items:baseline;gap:6px;margin:0 0 14px}',
      '.dswb-panel-head h2{margin:0;font-size:14px;font-weight:500;line-height:22px}',
      '.dswb-panel-count{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;font-variant-numeric:tabular-nums}',
      '.dswb-tasks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}',
      '.dswb-task{min-width:0}',
      '.dswb-task-button{width:100%;display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:16px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0;transition:border-color .15s,background .15s}',
      '.dswb-task-button:hover{border-color:var(--dsw-alias-border-l2)}',
      '.dswb-task-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-task-icon{width:34px;height:34px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;flex:none;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}',
      '.dswb-task[data-running=true] .dswb-task-icon{color:var(--dsw-alias-brand-primary)}',
      '.dswb-task-main{display:flex;flex-direction:column;flex:1;min-width:0;gap:4px}',
      '.dswb-task-title{font-size:14px;font-weight:500;line-height:22px;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
      '.dswb-task-meta{display:flex;flex-wrap:wrap;align-items:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;min-width:0}',
      '.dswb-task-meta>span{position:relative;min-width:0}',
      '.dswb-task-meta>span+span{padding-left:9px}',
      '.dswb-task-meta>span+span:before{content:"";position:absolute;left:0;top:50%;width:1px;height:10px;transform:translateY(-50%);background:var(--dsw-alias-border-l2)}',
      '.dswb-task-folder{display:inline-flex;align-items:center;gap:4px;max-width:100%}',
      '.dswb-task-folder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.dswb-task-folder-icon{flex:none;opacity:.9}',
      '.dswb-spinner{flex:none;margin-top:2px;width:18px;height:18px;transform-origin:center;animation:dswb-spin .8s linear infinite}',
      '@keyframes dswb-spin{to{transform:rotate(360deg)}}',
      '.dswb-panel-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 12px;min-height:160px;color:var(--dsw-alias-label-tertiary);text-align:center}',
      '.dswb-panel-empty p{margin:0;font-size:13px;line-height:20px}',
      '.dswb-panel-more{margin:10px 2px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-empty-art{opacity:.85}',
      '.dswb-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}',
      '.dswb-dot[data-running=true]{background:var(--dsw-alias-brand-primary);animation:dswb-pulse 1.6s ease-in-out infinite}',
      '@keyframes dswb-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '@media (width<=720px){.dswb-panels{grid-template-columns:minmax(0,1fr)}}',
      '@media (prefers-reduced-motion:reduce){.dswb-spinner{animation:none}}',
      '.dswb-loading{display:flex;align-items:center;gap:10px;padding:48px 8px;color:var(--dsw-alias-label-tertiary);font-size:13px;justify-content:center}',
      '.dswb-notice{margin-bottom:16px;padding:16px;border-radius:16px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:21px}',
      '.dswb-notice p{margin:0}',
      '.dswb-notice p.dswb-notice-title{margin-bottom:4px;color:var(--dsw-alias-label-primary);font-weight:500}',
      '.dswb-notice .dswb-refresh{margin-top:12px}',
      '.dswb-notice-error{border:.5px solid var(--dsw-alias-state-error-primary)}',
      '.dswb-footnote{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}',
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
      const t = ctx.locale.bind(NS)
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
