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
    const ALERT_ROUTE = '/api/workbench/alerts'
    const SUMMARY_ROUTE = '/api/workbench/summarize'
    const SEARCH_ROUTE = '/api/workbench/search'
    const REQUEST_ROUTE = '/api/workbench/requests'
    const REPORT_ROUTE = '/api/workbench/report'
    const TASKS_ROUTE = '/api/workbench/tasks'
    const DAY_MS = 86_400_000
    const SEARCH_PAGE_SIZE = 20
    const POLL_MS = 15000
    const RETRY_MS = 4000
    const NOW_MS = 30000

    const zh = {
      'overview.title': '今日概览',
      'overview.subtitle': '{date} · {zone} · 已于 {time} 同步',
      'fresh.live': '实时同步',
      'fresh.stale': '离线快照',
      'kpi.region': '今日指标',
      'kpi.cost': '今日估算费用',
      'kpi.coverage': '计价覆盖 {percent}%',
      'kpi.noSample': '暂无样本',
      'kpi.unpriced': ' · 含未计价',
      'kpi.running': '运行中',
      'kpi.runningDetail': '{waiting} 项等待',
      'kpi.attention': '待处理',
      'kpi.attentionDetail': '{failed} 失败 · {waiting} 等待',
      'kpi.speed': '生成速度 P50',
      'kpi.speedValue': '{rate} tok/s',
      'kpi.speedDetail': '模型样本 {count}',
      'attention.title': '需要关注',
      'attention.all': '全部提醒',
      'attention.empty': '没有需要处理的事项。',
      'attention.more': '还有 {count} 条',
      'attention.foot': '依据宿主待办与轮次结束事件',
      'alert.failure': '执行异常',
      'alert.waiting': '等待确认',
      'alert.stuck': '可能卡住',
      'alert.toolFailure': '工具连续失败',
      'alert.stuckReason': '已 {minutes} 分钟没有新的活动证据',
      'alert.toolFailureReason': '{tool} 连续失败',
      'alert.ack': '确认',
      'alert.dismiss': '取消',
      'alert.dismissAria': '取消这条提醒',
      'alert.snooze': '暂缓 30 分钟',
      'alert.evidence': '查看证据',
      'alert.open': '打开原 Session',
      'alert.acknowledged': '已确认',
      'alert.snoozed': '已暂缓',
      'evidence.itemState': '提醒状态',
      'evidence.open': '未确认',
      'evidence.solved': '已解决',
      'alert.gone': '这条提醒已经不再有效。',
      'running.title': '运行中的 Session',
      'running.hint': '点击任意任务打开原 Session',
      'running.empty': '没有正在运行的 Session。',
      'recent.title': '最近结束',
      'recent.hint': '近 7 天 · 按结束时间',
      'recent.empty': '近 7 天没有结束的 Session。',
      'thead.session': 'Session',
      'thead.state': '状态',
      'thead.action': '最后动作',
      'thead.duration': '本轮耗时',
      'thead.cost': '今日估算',
      'thead.open': '打开',
      'state.waiting': '等待用户',
      'state.running': '执行中',
      'state.stuck': '可能卡住',
      'state.failed': '执行异常',
      'state.ended': '已结束',
      'state.cancelled': '已取消',
      'state.unknown': '状态未知',
      'wait.approval': '等待审批',
      'wait.question': '等待回答',
      'reason.done': '正常结束',
      'reason.cancelled': '用户取消',
      'reason.error': '执行失败',
      'reason.maxTokens': '达到输出上限',
      'row.waitReason': '正在{kind}{detail}',
      'row.failureReason': '轮次已终止：{message}',
      'row.unknownReason': '缺少运行证据，保留最近已知状态',
      'row.endedReason': '{reason} · {time}',
      'run.turn': '本轮',
      'run.children': ' · {count} 个子任务',
      'cost.unknown': '不可估算',
      'value.none': '—',
      'tabs.label': '工作台分区',
      'tabs.overview': '概览',
      'tabs.sessions': '会话',
      'tabs.attention': '提醒',
      'tabs.records': '记录',
      'detail.back': '返回概览',
      'evidence.session': 'Session ID',
      'evidence.project': '项目',
      'evidence.state': '当前状态',
      'evidence.triggered': '触发时间',
      'evidence.updated': '最后更新',
      'evidence.none': '没有更多证据',
      'evidence.note': '确认或暂缓只影响本站提醒，处理流程仍在原 Session 内完成。',
      'offline.title': '实时连接已中断',
      'offline.badge': '离线',
      'offline.body': '正在显示 {time} 的本地快照。重连后会先补齐遗漏事件。',
      'offline.reconnect': '重新连接',
      'foot.note': '本地数据 · 费用依据已结算请求估算',
      'foot.synced': '最后同步',
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
      'speed.model': '模型',
      'speed.rate': '速率',
      'speed.empty': '近 7 天没有有效生成记录',
      'speed.unit': 'tok/s',
      'speed.week': '近 7 天',
      'speed.note': '已剔除低于 1 tok/s 的超时样本',
      'speed.unknownModel': '未知模型',
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
      'task.action.read.bare': '正在读取文件',
      'task.action.edit.bare': '正在写入文件',
      'task.action.run.bare': '正在运行命令',
      'task.action.search.bare': '正在搜索代码',
      'task.action.find.bare': '正在查找文件',
      'task.action.web.bare': '正在搜索网页',
      'task.action.fetch.bare': '正在抓取网页',
      'task.action.delegate.bare': '正在委派子任务',
      'task.action.calling': '正在调用 {tool}',
      'task.action.editing': '正在写入',
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
      'page.dateHint': '按本地日期查看',
      'projects.tests': '测试',
      'projects.state': '状态',
      'report.viewEvidence': '查看这条记录的证据',
      'report.confirming': '确认中…',
      'projects.gitEnable': '启用 Git 证据',
      'projects.gitDisable': '停用 Git 证据',
      'search.filters': '筛选',
      'nav.cost': '消耗归因',
      'nav.projects': '项目',
      'nav.report': '开发日报',
      'nav.search': '搜索 Session',
      'nav.settings': '设置',
      'nav.overview': '今日概览',
      'crumb.home': '工作台',
      'crumb.cost': '消耗归因',
      'crumb.projects': '项目工作进展',
      'crumb.report': '开发日报',
      'page.today': '今天',
      'page.all': '所有项目',
      'page.prevDay': '前一天',
      'page.nextDay': '后一天',
      'page.back': '返回',
      'page.open': '打开',
      'page.copy': '复制',
      'page.copied': '已复制',
      'page.refresh': '刷新',
      'page.unavailable': '不可获取',
      'page.noSample': '暂无样本',
      'page.loading': '正在读取…',
      'page.error': '读取失败',
      'page.retry': '重试',
      'page.local': '本地数据 · 费用依据已结算请求估算',
      'search.title': '搜索 Session',
      'search.placeholder': '搜索标题、项目、模型或 ID',
      'search.found': '找到 {count} 个 Session',
      'search.recent': '最近 10 条',
      'search.empty': '没有匹配的 Session。',
      'search.clear': '清除筛选',
      'search.more': '载入更多',
      'search.project': '项目',
      'search.date': '日期',
      'search.model': '模型',
      'search.state': '状态',
      'search.all': '全部',
      'search.last7': '近 7 天',
      'search.allTime': '全部时间',
      'search.localIndex': '本地元数据索引 · {count} 条',
      'search.rebuild': '重建索引',
      'search.rebuilding': '正在重建…',
      'search.hint': '↑/↓ 选择 · Enter 打开 · Esc 返回',
      'search.composing': '正在输入…',
      'search.open': '打开 Session',
      'search.noIndex': '索引不可用，请重建',
      'search.moreCount': '还有 {count} 条',
      'cost.title': '消耗归因',
      'cost.subtitle': '{date} · 人民币 · {zone}',
      'cost.today': '今日估算费用',
      'cost.known': '已知估算 · 人民币',
      'cost.coverage': '计价覆盖 {percent}%',
      'cost.projects': '按项目汇总',
      'cost.projectSessions': '{count} 个 Session',
      'cost.viewDetail': '查看明细',
      'cost.sessionTitle': 'Session 费用明细',
      'cost.requests': '模型请求',
      'cost.requestDetail': '请求详情',
      'cost.open': '打开 Session',
      'cost.priced': '已计价',
      'cost.unpriced': '不可估算',
      'cost.pricedRow': '{priced} 条已计价 · {unpriced} 条不可估算',
      'cost.success': '成功',
      'cost.failed': '失败',
      'cost.aggregate': '会话补差',
      'cost.source': '来源',
      'cost.model': '模型',
      'cost.uncached': '未缓存输入',
      'cost.cacheRead': '缓存命中输入',
      'cost.output': '输出',
      'cost.priceRef': '价目版本',
      'cost.attribution': '归属来源',
      'cost.attribution.workspace': '工作区映射 · {project}',
      'cost.attribution.session': '会话汇总',
      'cost.priceNote': '每百万 Token 单价 · 未缓存 {input} · 缓存 {cache} · 输出 {output}',
      'cost.settledAt': '结算时间',
      'cost.empty': '这一天没有可计价请求。',
      'cost.missingUsage': '缺少可信用量，计价覆盖率已反映该请求',
      'cost.estimateNote': '估算明细与平台账务分别显示',
      'cost.sessionId': 'Session ID',
      'cost.back': '返回消耗归因',
      'cost.sessions': 'Session',
      'cost.amount': '今日估算',
      'cost.day': '日期',
      'cost.currency': '币种（人民币）',
      'cost.terminal': '{count} 条终态',
      'cost.provider': '提供方',
      'cost.none': '不可获取',
      'projects.title': '项目工作进展',
      'projects.subtitle': '{date} · {count} 个项目有活动',
      'projects.sessions': '{count} 个 Session 有活动',
      'projects.evidence': '{count} 条证据',
      'projects.lastAction': '最近动作',
      'projects.timeline': '今日时间线',
      'projects.filter.all': '全部',
      'projects.filter.session': '会话',
      'projects.filter.file': '文件',
      'projects.filter.commit': '提交',
      'projects.filter.test': '测试',
      'projects.empty': '今天没有项目活动。',
      'projects.emptyTimeline': '这个项目今天没有证据。',
      'projects.done': '已完成',
      'projects.active': '进行中',
      'projects.blocked': '阻塞',
      'projects.confirm': '待确认',
      'projects.count': '{count} 项{state}',
      'projects.direct': '直接关联',
      'projects.activity': '项目活动',
      'projects.source': '来源',
      'projects.time': '时间',
      'projects.verified': '可核验',
      'projects.unverified': '未验证',
      'projects.openSession': '打开会话',
      'projects.gitOff': 'Git 证据未启用',
      'projects.gitReady': '只读 Git 证据',
      'projects.testVerified': '{passed} 项通过 · 退出码 {code}',
      'projects.testUnverified': '命令无结构化证据',
      'projects.commitFiles': '{count} 个文件',
      'report.title': '开发日报',
      'report.subtitle': '{date} · {projects} · {zone}',
      'report.copy': '复制 Markdown',
      'report.copied': '已复制',
      'report.draft': '日报草稿',
      'report.editable': '可编辑',
      'report.evidence': '证据详情',
      'report.empty': '这天没有可写的证据。',
      'report.done': '已完成',
      'report.doing': '进行中',
      'report.blocked': '阻塞',
      'report.confirm': '待确认',
      'report.edit': '编辑',
      'report.save': '保存',
      'report.cancel': '取消',
      'report.confirmTask': '确认完成',
      'report.addItem': '新增记录',
      'report.editMark': '人工编辑',
      'report.activityMark': '项目活动',
      'report.sha': '提交',
      'report.tests': '测试',
      'report.verification': '来源',
      'report.confirmBy': '任务确认',
      'report.localUser': '本地用户 · {time}',
      'report.openCommit': '打开提交',
      'report.openTest': '查看测试证据',
      'report.note': '完成状态来自人工确认，提交和测试作为证据',
      'report.reset': '恢复生成稿',
      'report.manual': '人工新增',
      'report.preview': '预览',
      'report.status': '状态',
      'report.reference': '引用',
    }

    /** English dictionary, key-identical to the Chinese source of truth. */

    const en = {
      'overview.title': "Today's overview",
      'overview.subtitle': '{date} · {zone} · synced at {time}',
      'fresh.live': 'Live sync',
      'fresh.stale': 'Offline snapshot',
      'kpi.region': "Today's metrics",
      'kpi.cost': 'Estimated cost today',
      'kpi.coverage': 'Priced {percent}%',
      'kpi.noSample': 'No sample',
      'kpi.unpriced': ' · includes unpriced',
      'kpi.running': 'Running',
      'kpi.runningDetail': '{waiting} waiting',
      'kpi.attention': 'To handle',
      'kpi.attentionDetail': '{failed} failed · {waiting} waiting',
      'kpi.speed': 'Speed P50',
      'kpi.speedValue': '{rate} tok/s',
      'kpi.speedDetail': 'model samples {count}',
      'attention.title': 'Needs attention',
      'attention.all': 'All alerts',
      'attention.empty': 'Nothing needs your attention.',
      'attention.more': '{count} more',
      'attention.foot': 'Based on host waits and turn-end events',
      'alert.failure': 'Failed',
      'alert.waiting': 'Waiting on you',
      'alert.stuck': 'Possibly stuck',
      'alert.toolFailure': 'Repeated tool failures',
      'alert.stuckReason': 'No new activity for {minutes} minutes',
      'alert.toolFailureReason': '{tool} failed repeatedly',
      'alert.ack': 'Acknowledge',
      'alert.dismiss': 'Dismiss',
      'alert.dismissAria': 'Dismiss this item',
      'alert.snooze': 'Snooze 30 min',
      'alert.evidence': 'Evidence',
      'alert.open': 'Open session',
      'alert.acknowledged': 'acknowledged',
      'alert.snoozed': 'snoozed',
      'evidence.itemState': 'Item state',
      'evidence.open': 'Open',
      'evidence.solved': 'Solved',
      'alert.gone': 'This item is no longer valid.',
      'running.title': 'Running sessions',
      'running.hint': 'Click any task to open its session',
      'running.empty': 'No session is running.',
      'recent.title': 'Recently ended',
      'recent.hint': 'Last 7 days · by end time',
      'recent.empty': 'No session ended in the last 7 days.',
      'thead.session': 'Session',
      'thead.state': 'State',
      'thead.action': 'Last action',
      'thead.duration': 'Turn time',
      'thead.cost': 'Today est.',
      'thead.open': 'Open',
      'state.waiting': 'Waiting',
      'state.running': 'Running',
      'state.stuck': 'Possibly stuck',
      'state.failed': 'Failed',
      'state.ended': 'Ended',
      'state.cancelled': 'Cancelled',
      'state.unknown': 'Unknown',
      'wait.approval': 'approval',
      'wait.question': 'your answer',
      'reason.done': 'Completed',
      'reason.cancelled': 'Cancelled',
      'reason.error': 'Failed',
      'reason.maxTokens': 'Output cap reached',
      'row.waitReason': 'Waiting for {kind}{detail}',
      'row.failureReason': 'Turn ended: {message}',
      'row.unknownReason': 'No live evidence; the last known state is kept',
      'row.endedReason': '{reason} · {time}',
      'run.turn': 'Turn',
      'run.children': ' · {count} children',
      'cost.unknown': 'Not estimable',
      'value.none': '—',
      'tabs.label': 'Workbench sections',
      'tabs.overview': 'Overview',
      'tabs.sessions': 'Sessions',
      'tabs.attention': 'Alerts',
      'tabs.records': 'Records',
      'detail.back': 'Back to overview',
      'evidence.session': 'Session ID',
      'evidence.project': 'Project',
      'evidence.state': 'Current state',
      'evidence.triggered': 'Triggered',
      'evidence.updated': 'Last update',
      'evidence.none': 'No further evidence',
      'evidence.note': 'Acknowledge or snooze only marks this local item; the wait itself is handled in the session.',
      'offline.title': 'Live connection lost',
      'offline.badge': 'Offline',
      'offline.body': 'Showing the local snapshot from {time}. Reconnecting replays the missed events first.',
      'offline.reconnect': 'Reconnect',
      'foot.note': 'Local data · cost estimated from settled requests',
      'foot.synced': 'Last synced',
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
      'speed.model': 'Model',
      'speed.rate': 'rate',
      'speed.empty': 'No valid generations in the last 7 days',
      'speed.unit': 'tok/s',
      'speed.week': 'Last 7 days',
      'speed.note': 'Timeout samples below 1 tok/s are excluded',
      'speed.unknownModel': 'Unknown model',
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
      'task.action.read.bare': 'Reading a file',
      'task.action.edit.bare': 'Writing a file',
      'task.action.run.bare': 'Running a command',
      'task.action.search.bare': 'Searching the code',
      'task.action.find.bare': 'Finding files',
      'task.action.web.bare': 'Searching the web',
      'task.action.fetch.bare': 'Fetching a page',
      'task.action.delegate.bare': 'Delegating a subtask',
      'task.action.calling': 'Calling {tool}',
      'task.action.editing': 'Writing',
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
      'page.dateHint': 'Browse by local date',
      'projects.tests': 'Tests',
      'projects.state': 'State',
      'report.viewEvidence': 'Show evidence for this line',
      'report.confirming': 'Confirming…',
      'projects.gitEnable': 'Enable Git evidence',
      'projects.gitDisable': 'Disable Git evidence',
      'search.filters': 'Filters',
      'nav.cost': 'Cost attribution',
      'nav.projects': 'Projects',
      'nav.report': 'Daily report',
      'nav.search': 'Search sessions',
      'nav.settings': 'Settings',
      'nav.overview': 'Today\'s overview',
      'crumb.home': 'Workbench',
      'crumb.cost': 'Cost attribution',
      'crumb.projects': 'Project progress',
      'crumb.report': 'Daily report',
      'page.today': 'Today',
      'page.all': 'All projects',
      'page.prevDay': 'Previous day',
      'page.nextDay': 'Next day',
      'page.back': 'Back',
      'page.open': 'Open',
      'page.copy': 'Copy',
      'page.copied': 'Copied',
      'page.refresh': 'Refresh',
      'page.unavailable': 'Unavailable',
      'page.noSample': 'No sample',
      'page.loading': 'Loading…',
      'page.error': 'Could not load',
      'page.retry': 'Retry',
      'page.local': 'Local data · cost estimated from settled requests',
      'search.title': 'Search sessions',
      'search.placeholder': 'Search titles, projects, models or IDs',
      'search.found': '{count} sessions found',
      'search.recent': '10 most recent',
      'search.empty': 'No session matches.',
      'search.clear': 'Clear filters',
      'search.more': 'Load more',
      'search.project': 'Project',
      'search.date': 'Date',
      'search.model': 'Model',
      'search.state': 'State',
      'search.all': 'All',
      'search.last7': 'Last 7 days',
      'search.allTime': 'All time',
      'search.localIndex': 'Local metadata index · {count} rows',
      'search.rebuild': 'Rebuild index',
      'search.rebuilding': 'Rebuilding…',
      'search.hint': '↑/↓ select · Enter open · Esc back',
      'search.composing': 'Composing…',
      'search.open': 'Open session',
      'search.noIndex': 'Index unavailable; rebuild it',
      'search.moreCount': '{count} more',
      'cost.title': 'Cost attribution',
      'cost.subtitle': '{date} · CNY · {zone}',
      'cost.today': 'Today\'s estimated cost',
      'cost.known': 'Known estimate · CNY',
      'cost.coverage': 'Priced {percent}%',
      'cost.projects': 'By project',
      'cost.projectSessions': '{count} sessions',
      'cost.viewDetail': 'View detail',
      'cost.sessionTitle': 'Session cost detail',
      'cost.requests': 'Model requests',
      'cost.requestDetail': 'Request detail',
      'cost.open': 'Open session',
      'cost.priced': 'Priced',
      'cost.unpriced': 'Not estimable',
      'cost.pricedRow': '{priced} priced · {unpriced} not estimable',
      'cost.success': 'Succeeded',
      'cost.failed': 'Failed',
      'cost.aggregate': 'Session remainder',
      'cost.source': 'Source',
      'cost.model': 'Model',
      'cost.uncached': 'Uncached input',
      'cost.cacheRead': 'Cache-hit input',
      'cost.output': 'Output',
      'cost.priceRef': 'Price version',
      'cost.attribution': 'Attribution',
      'cost.attribution.workspace': 'Workspace mapping · {project}',
      'cost.attribution.session': 'Session aggregate',
      'cost.priceNote': 'Per million tokens · uncached {input} · cache {cache} · output {output}',
      'cost.settledAt': 'Settled at',
      'cost.empty': 'No priced request on this day.',
      'cost.missingUsage': 'Missing trustworthy usage; coverage reflects this request',
      'cost.estimateNote': 'Estimates and platform billing are shown separately',
      'cost.sessionId': 'Session ID',
      'cost.back': 'Back to cost',
      'cost.sessions': 'Session',
      'cost.amount': 'Today\'s est.',
      'cost.day': 'Date',
      'cost.currency': 'Currency (CNY)',
      'cost.terminal': '{count} final',
      'cost.provider': 'Provider',
      'cost.none': 'Unavailable',
      'projects.title': 'Project progress',
      'projects.subtitle': '{date} · {count} projects active',
      'projects.sessions': '{count} sessions active',
      'projects.evidence': '{count} evidence items',
      'projects.lastAction': 'Last action',
      'projects.timeline': 'Today\'s timeline',
      'projects.filter.all': 'All',
      'projects.filter.session': 'Sessions',
      'projects.filter.file': 'Files',
      'projects.filter.commit': 'Commits',
      'projects.filter.test': 'Tests',
      'projects.empty': 'No project activity today.',
      'projects.emptyTimeline': 'No evidence for this project today.',
      'projects.done': 'Done',
      'projects.active': 'In progress',
      'projects.blocked': 'Blocked',
      'projects.confirm': 'To confirm',
      'projects.count': '{count} {state}',
      'projects.direct': 'Direct link',
      'projects.activity': 'Project activity',
      'projects.source': 'Source',
      'projects.time': 'Time',
      'projects.verified': 'Verifiable',
      'projects.unverified': 'Unverified',
      'projects.openSession': 'Open session',
      'projects.gitOff': 'Git evidence off',
      'projects.gitReady': 'Read-only Git evidence',
      'projects.testVerified': '{passed} passed · exit {code}',
      'projects.testUnverified': 'No structured result',
      'projects.commitFiles': '{count} files',
      'report.title': 'Daily report',
      'report.subtitle': '{date} · {projects} · {zone}',
      'report.copy': 'Copy Markdown',
      'report.copied': 'Copied',
      'report.draft': 'Report draft',
      'report.editable': 'Editable',
      'report.evidence': 'Evidence detail',
      'report.empty': 'Nothing to report for this day.',
      'report.done': 'Done',
      'report.doing': 'In progress',
      'report.blocked': 'Blocked',
      'report.confirm': 'To confirm',
      'report.edit': 'Edit',
      'report.save': 'Save',
      'report.cancel': 'Cancel',
      'report.confirmTask': 'Confirm done',
      'report.addItem': 'Add a line',
      'report.editMark': 'Edited by hand',
      'report.activityMark': 'Project activity',
      'report.sha': 'Commit',
      'report.tests': 'Tests',
      'report.verification': 'Source',
      'report.confirmBy': 'Task confirmed',
      'report.localUser': 'Local user · {time}',
      'report.openCommit': 'Open commit',
      'report.openTest': 'View test evidence',
      'report.note': 'Completion comes from a person; commits and tests are evidence',
      'report.reset': 'Restore generated draft',
      'report.manual': 'Added by hand',
      'report.preview': 'Preview',
      'report.status': 'Status',
      'report.reference': 'Reference',
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

    /**
     * The last snapshot this browser saw, per profile-agnostic page load.
     *
     * Entering the workbench used to start from an empty panel and wait for the Host
     * every time. The previous answer is kept in `sessionStorage` and painted first
     * (marked as such until the live one arrives), so a revisit is instant even when
     * the Host needs a moment. It is only a view cache: the Host stays the authority,
     * and a snapshot older than `CACHED_MAX_AGE_MS` is ignored rather than shown stale.
     */
    const CACHED_KEY = 'dsh-workbench:snapshot'
    const CACHED_MAX_AGE_MS = 10 * 60_000

    function readCachedSnapshot() {
      try {
        const raw = sessionStorage.getItem(CACHED_KEY)
        if (raw === null) return undefined
        const cached = JSON.parse(raw)
        if (cached === null || typeof cached !== 'object') return undefined
        if (cached.data === null || typeof cached.data !== 'object') return undefined
        // Freshness is the browser's own clock, not the Host's snapshot stamp: a
        // clock skew or a long-idle tab must not silently disable the fast path.
        if (!Number.isFinite(Number(cached.at)) || Date.now() - Number(cached.at) > CACHED_MAX_AGE_MS) return undefined
        return cached.data
      } catch {
        return undefined
      }
    }

    function writeCachedSnapshot(data) {
      try {
        sessionStorage.setItem(CACHED_KEY, JSON.stringify({ at: Date.now(), data }))
      } catch {
        // A full or disabled storage only costs the fast path, never correctness.
      }
    }

    function useSnapshot() {
      const [state, setState] = React.useState(() => {
        const cached = readCachedSnapshot()
        return cached === undefined
          ? { status: 'loading', data: undefined, error: undefined }
          : { status: 'stale', data: cached, error: undefined, cached: true }
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
            const data = await readSnapshot(controller.signal)
            if (!alive) return
            writeCachedSnapshot(data)
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

    /** The workbench is RMB-only: every amount prints with ￥. */
    function currencySymbol() {
      return '¥'
    }

    function formatMoney(amount) {
      const value = Number(amount)
      const symbol = currencySymbol()
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

    /** Money as the ledger reports it; the zero renders as a plain zero. */
    /**
     * Every amount in the workbench is a local estimate in RMB.
     *
     * The `currency` argument is accepted for call sites that still pass one, but it
     * is ignored on purpose: a snapshot left over from an earlier configuration must
     * never print `$` next to a yuan figure.
     */
    function moneyOf(amount) {
      const value = Number(amount)
      if (!Number.isFinite(value)) return '—'
      return formatMoney(value, 'CNY')
    }

    function formatCost(amount, usage) {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 0) return ''
      if (usage !== undefined && usage !== null && usage.quality === 'unpriced') return ''
      if (value < 0.0001) return `<${currencySymbol('CNY')}0.0001`
      if (value >= 1) return `${currencySymbol('CNY')}${value.toFixed(2)}`
      return `${currencySymbol('CNY')}${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`
    }

    /** `YYYY.MM.DD` plus a clock line for the header. */
    function headerDateOf(time) {
      const value = Number(time)
      if (!Number.isFinite(value)) return ''
      return `${dayKeyOf(value).replace(/-/g, '.')} ${clockOf(value)}`
    }

    function utcOffsetLabel() {
      const minutes = -new Date().getTimezoneOffset()
      const sign = minutes >= 0 ? '+' : '-'
      const absolute = Math.abs(minutes)
      return `UTC${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`
    }

    function todayLabel() {
      const now = Date.now()
      return dateLabel(now, { month: 'numeric', day: 'numeric' })
    }

    function pickFocusIds(ids, previous) {
      return { ids, previous }
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
      // A bare action carries no target: use the verb without a dangling placeholder.
      if (target === '') return t(`task.action.${kind}.bare`, { tool: shortToolName(name) })
      return t(`task.action.${kind}`, { target })
    }

    /** MCP names arrive namespaced; the last segment is the readable part. */
    function shortToolName(name) {
      const text = typeof name === 'string' && name !== '' ? name : 'tool'
      const parts = text.split(/__|[./]/).filter((part) => part !== '')
      return parts.length === 0 ? text : parts[parts.length - 1]
    }

    function dateParts() {
      return { month: 'numeric', day: 'numeric' }
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
    /**
     * The speed table: one row per model with its generation rate.
     *
     * Only the rate per model is shown. The previous card also carried a "current
     * speed" headline, weekly aggregates (median/aggregate/P90), output and request
     * totals and a list of recent requests; the reader asked for the per-model rate
     * alone, so everything else is gone rather than hidden.
     */
    function SpeedCard({ speed, t }) {
      if (speed === null || typeof speed !== 'object') return null
      const week = speed.week !== null && typeof speed.week === 'object' ? speed.week : {}
      const models = Array.isArray(week.models) ? week.models.slice(0, 8) : []
      return h(
        'article',
        { className: 'dswb-speed', 'aria-label': t('speed.title') },
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
        ),
        models.length === 0
          ? h('p', { className: 'dswb-speed-empty' }, t('speed.empty'))
          : h(
              'table',
              { className: 'dswb-speed-table' },
              h(
                'thead',
                null,
                h('tr', null, h('th', { scope: 'col' }, t('speed.model')), h('th', { scope: 'col', className: 'dswb-speed-num' }, t('speed.rate'))),
              ),
              h(
                'tbody',
                null,
                ...models.map((row) =>
                  h(
                    'tr',
                    { key: row.model },
                    h(
                      'td',
                      { className: 'dswb-speed-model', title: row.model === 'unknown' ? t('speed.unknownModel') : row.model },
                      row.model === 'unknown' ? t('speed.unknownModel') : row.model,
                    ),
                    h(
                      'td',
                      { className: 'dswb-speed-num' },
                      row.samples > 0 && row.p50TokensPerSecond > 0
                        ? `${formatRate(row.p50TokensPerSecond)} ${t('speed.unit')}`
                        : t('kpi.noSample'),
                    ),
                  ),
                ),
              ),
            ),
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

    // --- overview home (PRD F01 / F02 / F03 / F07) -------------------------------

    const STATE_KEYS = {
      waiting: 'state.waiting',
      running: 'state.running',
      stuck: 'state.stuck',
      failed: 'state.failed',
      ended: 'state.ended',
      cancelled: 'state.cancelled',
      unknown: 'state.unknown',
    }

    /** The display state of one row: a cancelled end reads as its own state. */
    function stateNameOf(row) {
      const name = String(row?.state ?? 'unknown')
      if (name === 'ended' && row?.lastEnd?.cancelled === true) return 'cancelled'
      return STATE_KEYS[name] === undefined ? 'unknown' : name
    }

    function stateLabel(t, name) {
      return t(STATE_KEYS[name] ?? STATE_KEYS.unknown)
    }

    /** Wheel of state tones: attention first, then life, then closure. */
    function stateTone(name) {
      if (name === 'failed') return 'error'
      if (name === 'waiting' || name === 'stuck') return 'warn'
      if (name === 'running') return 'ok'
      if (name === 'cancelled') return 'muted'
      if (name === 'unknown') return 'unknown'
      return 'idle'
    }

    /** A per-row review of waiting and last action, shared by cards and details. */
    function rowDetail(t, row, now) {
      const lastAction = row?.lastAction
      const actionTextOf = (action) =>
        h('span', { className: 'dswb-row-action' }, actionText(t, action), relativeTime(t, action.at, now))
      const waiting = Array.isArray(row?.waiting) ? row.waiting[0] : undefined
      if (stateNameOf(row) === 'waiting' && waiting !== undefined) {
        return t('row.waitReason', {
          kind: wordingOf(t, waiting.kind),
          detail: waiting.detail === undefined || waiting.detail === '' ? '' : ` · ${waiting.detail}`,
        })
      }
      if (stateNameOf(row) === 'failed' && row?.lastEnd?.message !== undefined && row.lastEnd.message !== '') {
        return t('row.failureReason', { message: truncateText(row.lastEnd.message, 48) })
      }
      if (stateNameOf(row) === 'unknown') return t('row.unknownReason')
      if (stateNameOf(row) === 'ended' || stateNameOf(row) === 'cancelled') {
        return t('row.endedReason', {
          reason: reasonTextOf(t, row?.lastEnd?.reason, stateNameOf(row)),
          time: relativeTime(t, row?.endedAt || row?.lastAt, now),
        })
      }
      if (lastAction !== null && typeof lastAction === 'object' && lastAction.name !== undefined) {
        // The stored action keeps only the tool name: name it, never guess a target.
        const text = t('task.action.calling', { tool: shortToolName(lastAction.name) })
        return `${text} · ${relativeTime(t, lastAction.at, now)}`
      }
      return relativeTime(t, row?.lastAt, now)
    }

    /** Wording of one wait kind; unknown kinds keep their raw name. */
    function wordingOf(t, kind) {
      if (kind === 'approval' || kind === 'plan-review') return t('wait.approval')
      if (kind === 'question') return t('wait.question')
      return String(kind ?? '')
    }

    /** End reason as readable words; protocol values fall back to the raw name. */
    function reasonTextOf(t, reason, state) {
      const name = String(reason ?? '')
      if (name === 'done' || name === 'stop' || name === 'completed' || name === 'finish') return t('reason.done')
      if (name === 'cancelled' || name === 'aborted' || name === 'stopped' || name === 'interrupted') return t('reason.cancelled')
      if (name === 'error' || name === 'failed' || name === 'failure') return t('reason.error')
      if (name === 'max-tokens' || name === 'maxTokens') return t('reason.maxTokens')
      if (name === '') return state === 'cancelled' ? t('reason.cancelled') : t('reason.done')
      return name
    }

    /** Turn duration start → end or now; a missing start reads `—`. */
    function turnLength(t, row, now) {
      const start = Number(row?.turnStartedAt)
      if (!Number.isFinite(start) || start <= 0) return t('value.none')
      const open = row?.running === true || row?.state === 'waiting' || row?.state === 'running' || row?.state === 'stuck'
      const end = open ? now : Number(row?.endedAt) || now
      if (!(end > start)) return t('value.none')
      return formatDuration(end - start)
    }

    function todayEstimate(t, row) {
      const usage = row?.usage
      if (usage === null || typeof usage !== 'object') return t('cost.unknown')
      if (usage.quality === 'unpriced') return t('cost.unknown')
      const amount = formatCost(usage.amount, usage)
      return Number(usage.amount) > 0 && amount !== '' ? amount : formatMoney(0, 'CNY')
    }

    function StateBadge({ name, t }) {
      return h(
        'span',
        { className: 'dswb-state', 'data-tone': stateTone(name) },
        h(StateGlyph, { name }),
        h('span', null, stateLabel(t, name)),
      )
    }

    /** One glyph per state: the badge's icon carries the same meaning as its text. */
    function StateGlyph({ name }) {
      const common = { viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': 'true', focusable: 'false' }
      if (name === 'running') {
        return h('svg', { ...common }, h('circle', { cx: 8, cy: 8, r: 3.2, fill: 'currentColor' }))
      }
      if (name === 'waiting' || name === 'stuck') {
        return h(
          'svg',
          { ...common },
          h('circle', { cx: 8, cy: 8, r: 5.4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
          h('path', { d: 'M8 5v3.4l2.1 1.3', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        )
      }
      if (name === 'failed') {
        return h(
          'svg',
          { ...common },
          h('path', { d: 'M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        )
      }
      if (name === 'ended') {
        return h(
          'svg',
          { ...common },
          h('path', { d: 'M3.8 8.4l2.7 2.7 5.7-5.9', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        )
      }
      if (name === 'cancelled') {
        return h('svg', { ...common }, h('path', { d: 'M4.6 8h6.8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }))
      }
      return h(
        'svg',
        { ...common },
        h('circle', { cx: 8, cy: 8, r: 5.4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeDasharray: '2 2' }),
      )
    }

    function externalLinkOf(t, label, onClick) {
      return h(
        'button',
        { type: 'button', className: 'dswb-open', 'aria-label': label, onClick },
        h(
          'svg',
          { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': 'true', focusable: 'false' },
          h('path', { d: 'M6.2 3.4h6.4v6.4M12.6 3.4 4.2 11.8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        ),
      )
    }

    function HomeHeader({ data, state, refresh, t, locale, onSearch }) {
      const generatedAt = Number(data?.generatedAt) || Date.now()
      // A cached first paint is not an outage; only a failed live read shows as stale.
      const stale = state.status === 'stale' && state.cached !== true
      return h(
        'header',
        { className: 'dswb-home-head' },
        h(
          'div',
          { className: 'dswb-home-title' },
          h('span', { className: 'dswb-eyebrow' }, 'LOCAL / ', dayKeyOf(generatedAt).replace(/-/g, '.')),
          h('h1', null, t('overview.title')),
          h(
            'p',
            { className: 'dswb-home-sub' },
            t('overview.subtitle', { date: dateLabel(generatedAt, dateParts()), zone: utcOffsetLabel(), time: clockOf(generatedAt) }),
          ),
        ),
        h(
          'div',
          { className: 'dswb-home-side' },
          h(
            'button',
            { type: 'button', className: 'dswb-search-open', onClick: onSearch, 'aria-label': t('nav.search'), 'aria-keyshortcuts': 'Meta+K Control+K' },
            h(Glyph, { name: 'search', size: 14 }),
            h('span', { className: 'dswb-search-open-text' }, t('nav.search')),
            h('kbd', { className: 'dswb-search-kbd' }, '⌘K'),
          ),
          h(
            'span',
            { className: 'dswb-fresh', 'data-state': stale ? 'stale' : 'live' },
            h('i', { className: 'dswb-fresh-dot', 'aria-hidden': 'true' }),
            stale ? t('fresh.stale') : t('fresh.live'),
          ),
          h(
            'button',
            { type: 'button', className: 'dswb-icon-btn dswb-refresh', onClick: refresh, disabled: state.status === 'loading', 'aria-label': t('refresh') },
            h(RefreshIcon),
          ),
        ),
      )
    }

    function KpiRow({ overview, onSelect, canSwitch, t }) {
      const amount = Number(overview.amount) || 0
      const coverage = overview.coverage === undefined ? undefined : Number(overview.coverage)
      const waiting = overview.runningByState === undefined ? 0 : Number(overview.runningByState) || 0
      const byState = overview.attentionByType !== null && typeof overview.attentionByType === 'object' ? overview.attentionByType : {}
      const failed = Number(byState.failure) || 0
      const waitItems = (Number(byState.waiting) || 0) + (Number(byState.question) || 0)
      const coverageText =
        coverage === undefined ? t('kpi.noSample') : t('kpi.coverage', { percent: String(Math.round(coverage * 100)) })
      return h(
        'section',
        { className: 'dswb-kpis', 'aria-label': t('kpi.region') },
        h(
          'button',
          { type: 'button', className: 'dswb-kpi', onClick: () => onSelect('cost'), 'aria-label': t('kpi.cost') },
          h('span', { className: 'dswb-kpi-label' }, t('kpi.cost')),
          h('span', { className: 'dswb-kpi-value', 'data-tone': amount > 0 ? 'default' : 'muted' }, formatMoney(amount)),
          h(
            'span',
            { className: 'dswb-kpi-detail' },
            coverageText,
            overview.unpricedTokens > 0 ? h('em', null, t('kpi.unpriced')) : null,
          ),
        ),
        h(
          'button',
          { type: 'button', className: 'dswb-kpi', onClick: () => onSelect('running'), 'aria-label': t('kpi.running') },
          h('span', { className: 'dswb-kpi-label' }, t('kpi.running')),
          h('span', { className: 'dswb-kpi-value' }, formatTokens(overview.running)),
          h('span', { className: 'dswb-kpi-detail' }, t('kpi.runningDetail', { waiting })),
        ),
        h(
          'button',
          { type: 'button', className: 'dswb-kpi', onClick: () => onSelect('attention'), 'aria-label': t('kpi.attention') },
          h('span', { className: 'dswb-kpi-label' }, t('kpi.attention')),
          h('span', { className: 'dswb-kpi-value', 'data-tone': Number(overview.attention) > 0 ? 'alert' : 'default' }, formatTokens(overview.attention)),
          h('span', { className: 'dswb-kpi-detail' }, t('kpi.attentionDetail', { failed, waiting: waitItems })),
        ),
        h(
          'article',
          { className: 'dswb-kpi', 'data-static': canSwitch ? undefined : 'true' },
          h('span', { className: 'dswb-kpi-label' }, t('kpi.speed')),
          h('span', { className: 'dswb-kpi-value', 'data-tone': overview.speedP50 > 0 ? 'default' : 'muted' }, overview.speedP50 > 0 ? t('kpi.speedValue', { rate: formatRate(overview.speedP50) }) : t('kpi.noSample')),
          h('span', { className: 'dswb-kpi-detail' }, t('kpi.speedDetail', { count: String(overview.speedSamples ?? 0) })),
        ),
      )
    }

    const ALERT_PRIORITY = { failure: 0, waiting: 1, question: 2, stuck: 3, toolFailure: 4 }
    const ALERT_ITEM_STATE = { open: 'evidence.open', acknowledged: 'alert.acknowledged', snoozed: 'alert.snoozed', solved: 'evidence.solved' }

    function alertOrder(left, right) {
      return (
        (ALERT_PRIORITY[left.type] ?? 9) - (ALERT_PRIORITY[right.type] ?? 9) ||
        (Number(right.triggeredAt) || 0) - (Number(left.triggeredAt) || 0) ||
        String(left.key).localeCompare(String(right.key))
      )
    }

    function activeAlerts(alerts) {
      return (Array.isArray(alerts) ? alerts : []).filter((alert) => alert.state === 'open' || alert.state === 'acknowledged').sort(alertOrder)
    }

    function AlertRow({ alert, t, now, openSession, onAction, compact }) {
      const type = String(alert.type)
      const title = alert.title === undefined || alert.title === '' ? t('row.untitled') : alert.title
      const name =
        type === 'failure' ? t('alert.failure') : type === 'waiting' || type === 'question' ? t('alert.waiting') : type === 'stuck' ? t('alert.stuck') : t('alert.toolFailure')
      const reason =
        type === 'failure'
          ? t('row.failureReason', { message: truncateText(String(alert.reason ?? ''), 48) })
          : type === 'waiting' || type === 'question'
            ? t('row.waitReason', { kind: wordingOf(t, type === 'waiting' ? 'approval' : 'question'), detail: alert.reason === undefined ? '' : ` · ${alert.reason}` })
            : type === 'stuck'
              ? t('alert.stuckReason', { minutes: String(Math.round((Number(alert.thresholdMs) || 600000) / 60000)) })
              : t('alert.toolFailureReason', { tool: String(alert.reason ?? '') })
      return h(
        'li',
        { className: 'dswb-alert', 'data-tone': type === 'failure' ? 'error' : 'warn', 'data-ack': alert.state === 'acknowledged' ? 'true' : undefined },
        h(StateGlyph, { name: type === 'failure' ? 'failed' : 'waiting' }),
        h(
          'div',
          { className: 'dswb-alert-main' },
          h('span', { className: 'dswb-alert-title' }, `${name} · ${title}`),
          h('span', { className: 'dswb-alert-reason' }, reason),
          h('span', { className: 'dswb-alert-meta' }, `${projectNameOf(alert.projectId, alert.projectName)} · ${alert.state === 'acknowledged' ? t('alert.acknowledged') : relativeTime(t, alert.triggeredAt, now)}`),
          compact
            ? null
            : h(
                'div',
                { className: 'dswb-alert-actions' },
                h('button', { type: 'button', className: 'dswb-mini', onClick: () => onAction(alert, 'ack') }, t('alert.ack')),
                h('button', { type: 'button', className: 'dswb-mini', onClick: () => onAction(alert, 'snooze') }, t('alert.snooze')),
                h('button', { type: 'button', className: 'dswb-mini', onClick: () => onAction(alert, 'evidence') }, t('alert.evidence')),
                h('button', { type: 'button', className: 'dswb-mini', onClick: () => onAction(alert, 'dismiss'), 'aria-label': t('alert.dismissAria') }, t('alert.dismiss')),
                h('button', { type: 'button', className: 'dswb-mini dswb-mini-primary', onClick: () => openSession(alert.sessionId) }, t('alert.open')),
              ),
        ),
        externalLinkOf(t, t('row.open', { title }), () => openSession(alert.sessionId)),
      )
    }

    /** The project label: the Host's basename, else the path's last segment, else a dash. */
    function projectNameOf(projectId, name) {
      if (typeof name === 'string' && name !== '') return name
      if (typeof projectId === 'string' && projectId !== '') return basename(projectId)
      return '—'
    }

    function rowProjectLabel(row) {
      return projectNameOf(row?.projectId, row?.projectName)
    }

    function AttentionPanel({ alerts, t, now, openSession, onAction, onShowAll, limit }) {
      const items = activeAlerts(alerts)
      const shown = items.slice(0, limit)
      return h(
        'section',
        { className: 'dswb-big dswb-attention', 'aria-labelledby': 'dswb-attention-title' },
        h(
          'header',
          { className: 'dswb-big-head' },
          h('h2', { id: 'dswb-attention-title', className: 'dswb-big-title' }, t('attention.title')),
          h('span', { className: 'dswb-pill', 'data-tone': items.length > 0 ? 'warn' : undefined }, formatTokens(items.length)),
          h('span', { className: 'dswb-spacer' }),
          h('button', { type: 'button', className: 'dswb-link', onClick: onShowAll }, t('attention.all')),
        ),
        items.length === 0
          ? h('p', { className: 'dswb-quiet' }, t('attention.empty'))
          : h(
              'ul',
              { className: 'dswb-alerts' },
              ...shown.map((alert) => h(AlertRow, { key: alert.key, alert, t, now, openSession, onAction })),
              items.length > shown.length ? h('li', { className: 'dswb-quiet' }, t('attention.more', { count: String(items.length - shown.length) })) : null,
            ),
        h('p', { className: 'dswb-big-foot' }, t('attention.foot')),
      )
    }

    /** The running list: cards on a narrow table, one row per Session on a wide one. */
    function RunningPanel({ rows, title, count, stack, focusId, t, now, openSession, emptyKey, onToggle, showCost }) {
      const shown = Array.isArray(rows) ? rows : []
      const wide = showCost === true
      return h(
        'section',
        { className: 'dswb-big dswb-running', 'aria-label': title },
        h(
          'header',
          { className: 'dswb-big-head' },
          h('h2', { className: 'dswb-big-title' }, title),
          h('span', { className: 'dswb-pill' }, formatTokens(count)),
          h('span', { className: 'dswb-spacer' }),
          h('span', { className: 'dswb-big-hint' }, t('running.hint')),
        ),
        shown.length === 0
          ? h('p', { className: 'dswb-quiet' }, t(emptyKey))
          : h(
              wide ? 'table' : 'ul',
              { className: wide ? 'dswb-runs-table' : 'dswb-runs' },
              wide
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'thead',
                      null,
                      h(
                        'tr',
                        null,
                        h('th', { scope: 'col' }, t('thead.session')),
                        h('th', { scope: 'col', className: 'dswb-col-state' }, t('thead.state')),
                        h('th', { scope: 'col' }, t('thead.action')),
                        h('th', { scope: 'col', className: 'dswb-col-num' }, t('thead.duration')),
                        h('th', { scope: 'col', className: 'dswb-col-num' }, t('thead.cost')),
                        h('th', { scope: 'col', className: 'dswb-col-open' }, t('thead.open')),
                      ),
                    ),
                    h('tbody', null, ...shown.map((row, index) => runRowWide(h, row, index, t, now, openSession, focusId))),
                  )
                : shown.map((row, index) => runCard(h, row, index, t, now, openSession, focusId, stack)),
            ),
      )
    }

    function runCard(h, row, index, t, now, openSession, focusId, stack) {
      const name = stateNameOf(row)
      const title = typeof row.title === 'string' && row.title !== '' ? row.title : t('row.untitled')
      const open = () => openSession(row.sessionId)
      return h(
        'li',
        { className: 'dswb-run', key: row.sessionId, 'data-tone': stateTone(name), 'data-stack': stack === true ? 'true' : undefined },
        h(
          'button',
          { type: 'button', className: 'dswb-run-main', onClick: open, 'aria-label': t('row.open', { title }), 'data-focus': focusId === row.sessionId ? 'true' : undefined },
          h(
            'span',
            { className: 'dswb-run-topline' },
            h(StateBadge, { name, t }),
            h('span', { className: 'dswb-run-index', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
          ),
          h('span', { className: 'dswb-run-title' }, title),
          h('span', { className: 'dswb-run-project' }, rowProjectLabel(row), row.children > 0 ? t('run.children', { count: String(row.children) }) : null),
          h('span', { className: 'dswb-run-detail' }, rowDetail(t, row, now)),
        ),
        h(
          'div',
          { className: 'dswb-run-metric' },
          h(
            'span',
            { className: 'dswb-run-elapsed' },
            h('span', { className: 'dswb-run-elapsed-label' }, t('run.turn')),
            h('span', { className: 'dswb-run-elapsed-value' }, turnLength(t, row, now)),
            h('span', { className: 'dswb-run-elapsed-split' }, ' · ', todayEstimate(t, row)),
          ),
        ),
        externalLinkOf(t, t('row.open', { title }), open),
      )
    }

    function runRowWide(h, row, index, t, now, openSession, focusId) {
      const name = stateNameOf(row)
      const title = typeof row.title === 'string' && row.title !== '' ? row.title : t('row.untitled')
      const open = () => openSession(row.sessionId)
      return h(
        'tr',
        { key: row.sessionId, className: 'dswb-run-row', 'data-tone': stateTone(name) },
        h(
          'td',
          null,
          h(
            'button',
            { type: 'button', className: 'dswb-run-link', onClick: open, 'data-focus': focusId === row.sessionId ? 'true' : undefined },
            h('span', { className: 'dswb-run-link-title' }, title),
            h('span', { className: 'dswb-run-link-project' }, rowProjectLabel(row)),
          ),
        ),
        h('td', { className: 'dswb-col-state' }, h(StateBadge, { name, t })),
        h('td', null, h('span', { className: 'dswb-run-detail' }, rowDetail(t, row, now))),
        h('td', { className: 'dswb-col-num dswb-run-elapsed-value' }, turnLength(t, row, now)),
        h('td', { className: 'dswb-col-num dswb-run-elapsed-value' }, todayEstimate(t, row)),
        h('td', { className: 'dswb-col-open' }, externalLinkOf(t, t('row.open', { title }), open)),
      )
    }

    function RecentPanel({ rows, t, now, openSession, focusId }) {
      const shown = Array.isArray(rows) ? rows : []
      return h(
        'section',
        { className: 'dswb-big dswb-recent', 'aria-label': t('recent.title') },
        h(
          'header',
          { className: 'dswb-big-head' },
          h('h2', { className: 'dswb-big-title' }, t('recent.title')),
          h('span', { className: 'dswb-spacer' }),
          h('span', { className: 'dswb-big-hint' }, t('recent.hint')),
        ),
        shown.length === 0
          ? h('p', { className: 'dswb-quiet' }, t('recent.empty'))
          : h(
              'ul',
              { className: 'dswb-recents' },
              ...shown.map((row) => {
                const name = stateNameOf(row)
                const title = typeof row.title === 'string' && row.title !== '' ? row.title : t('row.untitled')
                return h(
                  'li',
                  { className: 'dswb-recent-row', key: row.sessionId },
                  h(
                    'button',
                    { type: 'button', className: 'dswb-recent-main', onClick: () => openSession(row.sessionId), 'data-focus': focusId === row.sessionId ? 'true' : undefined, 'aria-label': t('row.open', { title }) },
                    h('span', { className: 'dswb-recent-title' }, title),
                    h('span', { className: 'dswb-recent-meta' }, `${rowProjectLabel(row)} · ${clockOf(row.endedAt || row.lastAt)}`),
                  ),
                  h(StateBadge, { name, t }),
                  externalLinkOf(t, t('row.open', { title }), () => openSession(row.sessionId)),
                )
              }),
            ),
      )
    }

    /** Offline snapshot view (UI-08): keep what was known, never pretend it is live. */
    function OfflineBanner({ data, t, refresh, retrying }) {
      const at = Number(data?.freshness?.at) || Number(data?.generatedAt)
      return h(
        'div',
        { className: 'dswb-offline', role: 'alert' },
        h(
          'div',
          { className: 'dswb-offline-head' },
          h('span', { className: 'dswb-offline-title' }, t('offline.title')),
          h('span', { className: 'dswb-pill', 'data-tone': 'warn' }, t('offline.badge')),
        ),
        h('p', { className: 'dswb-offline-body' }, t('offline.body', { time: clockOf(at) })),
        h(
          'button',
          { type: 'button', className: 'dswb-offline-btn', onClick: refresh, disabled: retrying },
          h(RefreshIcon),
          h('span', null, t('offline.reconnect')),
        ),
      )
    }

    /** Narrow-window navigation: one overview tab and stacked sections behind it. */
    function HomeTabs({ tab, setTab, counts, t }) {
      const items = [
        { id: 'overview', key: 'tabs.overview' },
        { id: 'sessions', key: 'tabs.sessions', badge: counts.sessions },
        { id: 'attention', key: 'tabs.attention', badge: counts.attention },
        { id: 'records', key: 'tabs.records' },
      ]
      return h(
        'nav',
        { className: 'dswb-tabs', 'aria-label': t('tabs.label') },
        ...items.map((item) =>
          h(
            'button',
            {
              type: 'button',
              key: item.id,
              className: 'dswb-tab',
              'aria-current': tab === item.id ? 'page' : undefined,
              onClick: () => setTab(item.id),
              onKeyDown: (event) => {
                // Arrow keys move between tabs; Enter/Space activate.
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                const index = items.findIndex((entry) => entry.id === tab)
                const next = items[(index + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length]
                setTab(next.id)
              },
            },
            h('span', null, t(item.key)),
            item.badge > 0 ? h('i', { className: 'dswb-tab-badge', 'aria-hidden': 'true' }, String(item.badge)) : null,
          ),
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

    /** Local-state hook for the home view: the selected detail, the narrow tab, marks. */
    function useHomeState() {
      // A host page may pin the first view (`__dswbHome`), e.g. for screenshots.
      const initial = typeof window !== 'undefined' && window.__dswbHome !== null && typeof window.__dswbHome === 'object' ? window.__dswbHome : {}
      const [detail, setDetail] = React.useState(initial.detail ?? { kind: 'overview' })
      const [tab, setTab] = React.useState(initial.tab ?? 'overview')
      const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && Number(window.innerWidth) < 720)
      const [alertMarks, setAlertMarks] = React.useState({})

      React.useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const query = typeof window.matchMedia === 'function' ? window.matchMedia('(width<=719px)') : undefined
        if (query !== undefined && typeof query.addEventListener === 'function') {
          const onChange = () => setNarrow(query.matches)
          setNarrow(query.matches)
          query.addEventListener('change', onChange)
          return () => query.removeEventListener('change', onChange)
        }
        const onResize = () => setNarrow(Number(window.innerWidth) < 720)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [])

      const mark = React.useCallback((key, patch) => setAlertMarks((previous) => ({ ...previous, [key]: { ...(previous[key] ?? {}), ...patch } })), [])
      return { detail, setDetail, tab, setTab, narrow, alertMarks, mark }
    }

    /** One focus rule for the whole view: keep whatever row/card was focused. */
    function useRowFocus(rows) {
      const ref = React.useRef(new Set())
      for (const row of Array.isArray(rows) ? rows : []) if (row?.sessionId !== undefined) ref.current.add(row.sessionId)
      return ref.current
    }

    /** Open-item counts per type for the third metric. */
    function countAlertTypes(alerts) {
      const counts = {}
      for (const alert of Array.isArray(alerts) ? alerts : []) {
        if (alert.state !== 'open') continue
        const type = String(alert.type)
        const bucket = type === 'question' ? 'waiting' : type
        counts[bucket] = (counts[bucket] ?? 0) + 1
      }
      return counts
    }

    /**
     * The home: header, four metrics, attention, running Sessions, recently ended.
     *
     * @param props - slot props plus the injected `openSession`, `summarize`, `sessions`.
     */
    function WorkbenchPage(props) {
      const { t, openSession } = props
      const [state, refresh] = useSnapshot()
      const [todayWorkItems, setTodayWorkItems] = React.useState({})
      const now = useNow(NOW_MS)
      const home = useHomeState()
      const data = state.data
      // A refresh over an already-painted snapshot keeps the panel visible.
      const loading = state.status === 'loading' && data === undefined
      const narrow = home.narrow
      const [searchOpen, setSearchOpen] = React.useState(
        () => typeof window !== 'undefined' && window.__dswbHome?.search === true,
      )
      const fallbackDay = Math.floor((now + tzOffsetSeconds() * 1000) / DAY_MS) * DAY_MS - tzOffsetSeconds() * 1000
      const todayStart = Number(data?.overview?.todayStart) || fallbackDay
      const [day, setDay] = React.useState(undefined)
      const currentDay = day === undefined ? todayStart : day

      React.useEffect(() => {
        const onKey = (event) => {
          if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
            event.preventDefault()
            setSearchOpen((value) => !value)
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      const runningRows = Array.isArray(data?.running) ? data.running : []
      const recentRows = Array.isArray(data?.recent) ? data.recent : []
      const focusIds = useRowFocus([...runningRows, ...recentRows])
      const [focusKey, setFocusKey] = React.useState(undefined)
      const captureFocus = (id) => setFocusKey(id)

      const overview = data?.overview ?? { amount: 0, running: 0, attention: 0 }
      // Local marks from this view layer on the Host's state until the next snapshot confirms.
      const alerts = (Array.isArray(data?.alerts) ? data.alerts : []).map((alert) => {
        const mark = home.alertMarks[alert.key]
        return mark === undefined ? alert : { ...alert, state: mark.state }
      })
      const pendingCount = alerts.filter((alert) => alert.state === 'open').length
      const overviewView = { ...overview, attention: pendingCount, attentionByType: countAlertTypes(alerts) }
      const stale = state.status === 'stale' && state.cached !== true

      const openFrom = (sessionId) => {
        captureFocus(sessionId)
        openSession(sessionId)
      }

      const alertAction = async (alert, action) => {
        if (action === 'evidence') {
          home.setDetail({ kind: 'alert', key: alert.key })
          return
        }
        // Dismissal leaves the list for good; the Host records it so a reload agrees.
        const state = action === 'ack' ? 'acknowledged' : action === 'dismiss' ? 'solved' : 'snoozed'
        home.mark(alert.key, { state })
        try {
          await fetch(ALERT_ROUTE, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              key: alert.key,
              action,
              triggeredAt: alert.triggeredAt,
              state: alert.currentState,
              minutes: 30,
            }),
          })
        } catch {
          // Offline: the local mark stands, the next snapshot reconciles it.
        }
        refresh()
      }

      // Metric cards jump to their own section: overview first, then the full page.
      const choose = (target) => {
        if (target === 'attention') home.setDetail({ kind: 'attention' })
        else if (target === 'cost') home.setDetail({ kind: 'cost' })
        else if (narrow) home.setTab('sessions')
        else home.setDetail({ kind: 'overview' })
      }

      const crumbHome = { label: t('crumb.home'), onClick: () => home.setDetail({ kind: 'overview' }) }
      const crumbCost = { label: t('crumb.cost'), onClick: () => home.setDetail({ kind: 'cost' }) }
      const crumbProjects = { label: t('crumb.projects'), onClick: () => home.setDetail({ kind: 'projects' }) }
      const dayLabel = dateLabel(Number(currentDay) + 12 * 3600_000, dateParts())

      let body
      if (data === undefined) {
        body =
          state.status === 'error'
            ? h(
                'div',
                { className: 'dswb-notice dswb-notice-error', role: 'alert' },
                h('p', { className: 'dswb-notice-title' }, t('error.title')),
                h('p', null, t('error.body')),
                h('button', { type: 'button', className: 'dswb-refresh', onClick: refresh }, h(RefreshIcon), h('span', null, t('error.retry'))),
              )
            : h('div', { className: 'dswb-loading', role: 'status' }, h('span', { className: 'dswb-dot', 'data-running': 'true', 'aria-hidden': 'true' }), t('loading'))
      } else if (home.detail.kind === 'overview') {
        body = h(
          React.Fragment,
          null,
          h(KpiRow, { overview: overviewView, canSwitch: false, onSelect: choose, t }),
          narrow ? null : h(
            'div',
            { className: 'dswb-home-grid' },
            h(
              'div',
              { className: 'dswb-home-main' },
              h(RunningPanel, {
                rows: runningRows,
                title: t('running.title'),
                count: overview.running,
                stack: narrow,
                focusId: focusKey,
                t,
                now,
                openSession: openFrom,
                emptyKey: 'running.empty',
                showCost: narrow !== true,
              }),
              h(RecentPanel, { rows: recentRows, t, now, openSession: openFrom, focusId: focusKey }),
            ),
            h(
              'aside',
              { className: 'dswb-home-aside' },
              h(AttentionPanel, { alerts, t, now, openSession: openFrom, onAction: alertAction, onShowAll: () => home.setDetail({ kind: 'attention' }), limit: 3 }),
              h(SpeedCard, { speed: data.speed, t }),
            ),
          ),
        )
        if (narrow) {
          const tab = home.tab
          const attentionCount = activeAlerts(alerts).length
          body = h(
            React.Fragment,
            null,
            h(KpiRow, { overview: overviewView, canSwitch: false, onSelect: choose, t }),
            h(
              'div',
              { className: 'dswb-narrow' },
              tab === 'overview'
                ? h(
                    React.Fragment,
                    null,
                    attentionCount > 0 ? h(AttentionPanel, { alerts, t, now, openSession: openFrom, onAction: alertAction, onShowAll: () => home.setTab('attention'), limit: 1 }) : null,
                    h(RunningPanel, { rows: runningRows, title: t('running.title'), count: overview.running, stack: true, focusId: focusKey, t, now, openSession: openFrom, emptyKey: 'running.empty' }),
                    h(RecentPanel, { rows: recentRows, t, now, openSession: openFrom, focusId: focusKey }),
                  )
                : tab === 'sessions'
                  ? h(RunningPanel, { rows: runningRows, title: t('running.title'), count: overview.running, stack: true, focusId: focusKey, t, now, openSession: openFrom, emptyKey: 'running.empty' })
                  : tab === 'attention'
                    ? h(AttentionPanel, { alerts, t, now, openSession: openFrom, onAction: alertAction, onShowAll: () => home.setTab('overview'), limit: 50 })
                    : h(
                        React.Fragment,
                        null,
                        h(
                          'div',
                          { className: 'dswb-p1-narrow-menu' },
                          h('button', { type: 'button', className: 'dswb-p1-narrow-link', onClick: () => home.setDetail({ kind: 'report' }) }, t('nav.report'), h(Glyph, { name: 'chevron', size: 13 })),
                          h('button', { type: 'button', className: 'dswb-p1-narrow-link', onClick: () => home.setDetail({ kind: 'cost' }) }, t('nav.cost'), h(Glyph, { name: 'chevron', size: 13 })),
                          h('button', { type: 'button', className: 'dswb-p1-narrow-link', onClick: () => home.setDetail({ kind: 'projects' }) }, t('nav.projects'), h(Glyph, { name: 'chevron', size: 13 })),
                        ),
                        h(WorkLogCard, { worklog: data.worklog, t, onWorkItems: setTodayWorkItems }),
                      ),
            ),
          )
        }
      } else if (home.detail.kind === 'attention') {
        body = h(
          React.Fragment,
          null,
          h(DetailBar, { title: t('attention.title'), onBack: () => home.setDetail({ kind: 'overview' }), backLabel: t('detail.back'), t }),
          h(AttentionPanel, { alerts, t, now, openSession: openFrom, onAction: alertAction, onShowAll: () => home.setDetail({ kind: 'overview' }), limit: 50 }),
        )
      } else if (home.detail.kind === 'alert') {
        const alert = alerts.find((entry) => entry.key === home.detail.key)
        body = alert === undefined ? h('p', { className: 'dswb-quiet' }, t('alert.gone')) : h(AlertEvidence, { alert, t, now, openSession: openFrom, onBack: () => home.setDetail({ kind: 'attention' }) })
      } else if (home.detail.kind === 'cost') {
        body = h(CostLanding, { data, t, onSelect: home.setDetail, crumbs: [crumbHome, { label: t('crumb.cost') }], dayLabel })
      } else if (home.detail.kind === 'costProject') {
        body = h(CostProjectPage, {
          detail: home.detail,
          data,
          t,
          day: currentDay,
          onSelect: (selected) => home.setDetail({ ...selected, day: currentDay }),
          crumbs: [crumbHome, crumbCost, { label: home.detail.name || t('cost.sessions') }],
        })
      } else if (home.detail.kind === 'costSession') {
        body = h(CostSessionPage, {
          detail: { ...home.detail, day: home.detail.day ?? currentDay },
          t,
          crumbs: [crumbHome, crumbCost, { label: home.detail.name || t('cost.projects'), onClick: () => home.setDetail({ kind: 'costProject', projectId: home.detail.projectId, name: home.detail.name }) }, { label: home.detail.title || home.detail.sessionId }],
          openSession: openFrom,
          now,
        })
      } else if (home.detail.kind === 'projects') {
        body = h(ProjectsPage, { t, day: currentDay, setDay, todayStart, onSelect: home.setDetail, crumbs: [crumbHome, { label: t('crumb.projects') }], now })
      } else if (home.detail.kind === 'projectTimeline') {
        body = h(ProjectTimelinePage, {
          detail: home.detail,
          t,
          day: currentDay,
          setDay,
          todayStart,
          onBack: () => home.setDetail({ kind: 'projects' }),
          crumbs: [crumbHome, crumbProjects, { label: home.detail.name || t('projects.timeline') }],
          openSession: openFrom,
        })
      } else if (home.detail.kind === 'report') {
        body = h(ReportPage, { t, day: currentDay, setDay, todayStart, crumbs: [crumbHome, { label: t('nav.report') }], openSession: openFrom, narrow })
      } else {
        body = h(
          React.Fragment,
          null,
          h(BalanceHero, { account: data.account, usage: data.usage, t }),
          h(SpeedCard, { speed: data.speed, t }),
          h(WorkLogCard, { worklog: data.worklog, t, onWorkItems: setTodayWorkItems }),
        )
      }

      return h(
        'section',
        { className: 'dswb-page dswb-home', 'aria-label': t('title') },
        h('style', { key: 'styles' }, CSS),
        h('div', { className: 'dswb-mascot', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'dswb-scroll' },
          h(
            'div',
            { className: 'dswb-content' },
            h(HomeHeader, { data: data ?? { generatedAt: Date.now() }, state, refresh, t, locale: localeTag(), onSearch: () => setSearchOpen(true) }),
            stale ? h(OfflineBanner, { data, t, refresh, retrying: loading }) : null,
            data === undefined || narrow ? null : h(PageNav, { t, detail: home.detail, setDetail: home.setDetail, counts: { attention: pendingCount } }),
            h('main', { className: 'dswb-home-body' }, body),
            h(
              'footer',
              { className: 'dswb-home-foot' },
              h('span', null, t('foot.note')),
              data === undefined ? null : h('span', { className: 'dswb-home-foot-time' }, `${t('foot.synced')} ${clockOf(data.generatedAt)}`),
            ),
          ),
        ),
        narrow ? h(HomeTabs, { tab: home.tab, setTab: (id) => { home.setTab(id); home.setDetail({ kind: 'overview' }) }, counts: { sessions: runningRows.length, attention: activeAlerts(alerts).length }, t }) : null,
        searchOpen && data !== undefined ? h(SearchPalette, { t, snapshot: data, openSession: openFrom, onClose: () => setSearchOpen(false), narrow }) : null,
      )
    }

    /** A detail page's breadcrumb row with its back button. */
    function DetailBar({ title, onBack, backLabel, t }) {
      return h(
        'div',
        { className: 'dswb-detailbar' },
        h('button', { type: 'button', className: 'dswb-back', onClick: onBack }, '←', h('span', null, backLabel)),
        h('h2', { className: 'dswb-detailbar-title' }, title),
      )
    }

    /** Evidence for one attention item: what triggered it, when, and the way in. */
    function AlertEvidence({ alert, t, now, openSession, onBack }) {
      const type = String(alert.type)
      const rows = [
        { key: 'session', label: t('evidence.session'), value: alert.sessionId },
        { key: 'project', label: t('evidence.project'), value: projectNameOf(alert.projectId, alert.projectName) },
        { key: 'state', label: t('evidence.state'), value: stateLabel(t, String(alert.currentState ?? 'unknown')) },
        { key: 'triggered', label: t('evidence.triggered'), value: clockOf(alert.triggeredAt) },
        { key: 'updated', label: t('evidence.updated'), value: clockOf(alert.updatedAt || alert.lastEvidence) },
        { key: 'item', label: t('evidence.itemState'), value: t(ALERT_ITEM_STATE[alert.state] ?? 'evidence.none') },
      ]
      return h(
        React.Fragment,
        null,
        h(DetailBar, { title: `${type === 'failure' ? t('alert.failure') : t('alert.waiting')} · ${alert.title ?? ''}`, onBack, backLabel: t('detail.back'), t }),
        h(
          'section',
          { className: 'dswb-big' },
          h(
            'div',
            { className: 'dswb-evidence-head' },
            h('span', { className: 'dswb-alert-reason' }, truncateText(String(alert.reason ?? t('evidence.none')), 240)),
            h('code', { className: 'dswb-evidence-key' }, alert.key),
          ),
          h(
            'dl',
            { className: 'dswb-facts' },
            ...rows.map((row) => h('div', { key: row.key, className: 'dswb-fact' }, h('dt', null, row.label), h('dd', null, String(row.value ?? '—')))),
          ),
          h('button', { type: 'button', className: 'dswb-primary', onClick: () => openSession(alert.sessionId) }, t('alert.open')),
          h('p', { className: 'dswb-big-foot' }, t('evidence.note')),
        ),
      )
    }

    /** Circular indeterminate spinner: one round-capped arc on a faint track. */
    // --- P1: search, cost attribution, projects and evidence report (PRD V1.1) ---

    /** One Host route read. A page change aborts the previous read. */
    async function readRoute(url, signal) {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body === null || typeof body !== 'object') throw new Error('invalid response')
      return body
    }

    /** POST one JSON body to a Host route (task creation and confirmations). */
    async function postRoute(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      return response.ok ? response.json().catch(() => ({})) : Promise.reject(new Error(`HTTP ${response.status}`))
    }

    /** Fetch one route whenever its URL changes; returns `[state, refresh]`. */
    function useRoute(url) {
      const [state, setState] = React.useState({ status: 'loading', data: undefined, error: undefined })
      const [attempt, setAttempt] = React.useState(0)
      const refresh = React.useCallback(() => setAttempt((value) => value + 1), [])
      React.useEffect(() => {
        if (!url) return undefined
        const controller = new AbortController()
        let alive = true
        setState((previous) => ({ ...previous, status: 'loading', error: undefined }))
        readRoute(url, controller.signal).then(
          (data) => {
            if (alive) setState({ status: 'ready', data, error: undefined })
          },
          (error) => {
            if (alive && !controller.signal.aborted) setState((previous) => ({ status: 'error', data: previous.data, error }))
          },
        )
        return () => {
          alive = false
          controller.abort()
        }
      }, [url, attempt])
      return [state, refresh]
    }

    /** Copy text to the clipboard with the same fallback the work log uses. */
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        try {
          const area = document.createElement('textarea')
          area.value = text
          area.setAttribute('readonly', '')
          area.style.position = 'fixed'
          area.style.opacity = '0'
          document.body.appendChild(area)
          area.select()
          const ok = document.execCommand('copy')
          area.remove()
          return ok
        } catch {
          return false
        }
      }
    }

    const GLYPH_PATHS = {
      search: 'M7.2 2.6a4.6 4.6 0 1 0 2.9 8.2l3.4 3.4M10.4 10.4 13.6 13.6',
      calendar: 'M3.2 5.2h9.6v8.4H3.2zM5.6 3.2v3.2M10.4 3.2v3.2M3.2 7.6h9.6',
      chevron: 'M6.2 3.8 10.6 8l-4.4 4.2',
      back: 'M9.8 3.8 5.4 8l4.4 4.2',
      copy: 'M5.2 5.2h8.4v8.4H5.2zM10.8 3.2H4.4A1.2 1.2 0 0 0 3.2 4.4v6.4',
      check: 'M3.8 8.4l2.7 2.7 5.7-5.9',
      folder: 'M2.6 4.4h4l1.4 1.6h5.4v7.2H2.6z',
      git: 'M5 3.4v9.2M5 12.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM11 3.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM11 5.2v2.6a2 2 0 0 1-2 2H7',
      test: 'M4 2.8h8v10.4H4zM6.2 5.6h3.6M6.2 8h3.6M6.2 10.4h2',
      session: 'M2.8 4.2h10.4v7.6H2.8zM5.4 6.6l2 1.6-2 1.6',
      file: 'M4 2.6h5l3 3v7.8H4zM9 2.6v3h3',
      alert: 'M8 2.4 14 13H2zM8 6.2v3.2M8 11.2v.2',
      clock: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5v3.4l2.1 1.3',
    }

    /** A tiny inline SVG glyph; every state also carries text, never colour alone. */
    function Glyph({ name, size }) {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: size ?? 14, height: size ?? 14, 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: GLYPH_PATHS[name] ?? GLYPH_PATHS.session,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /** A pill with a glyph, a colour tone and a text label (PRD: three signals). */
    function StatusPill({ tone, label, glyph, title }) {
      return h(
        'span',
        { className: 'dswb-p1-pill', 'data-tone': tone ?? 'idle', title: title ?? label },
        glyph === undefined ? null : h(Glyph, { name: glyph, size: 12 }),
        h('span', null, label),
      )
    }

    /** A label/value fact row for the evidence and request detail panels. */
    function Fact({ label, value, mono }) {
      return h(
        'div',
        { className: 'dswb-p1-fact' },
        h('dt', null, label),
        h('dd', { className: mono === true ? 'dswb-p1-mono' : undefined }, String(value ?? '—')),
      )
    }

    /** Shared chrome for every page below the overview. */
    function PageHeader({ t, crumbs, title, subtitle, actions }) {
      return h(
        'header',
        { className: 'dswb-p1-head' },
        h(
          'nav',
          { className: 'dswb-p1-crumbs', 'aria-label': t('tabs.label') },
          ...crumbs.map((crumb, index) =>
            h(
              'span',
              { key: index },
              index > 0 ? h('span', { className: 'dswb-p1-crumb-sep', 'aria-hidden': 'true' }, '›') : null,
              typeof crumb.onClick === 'function'
                ? h('button', { type: 'button', className: 'dswb-p1-crumb', onClick: crumb.onClick }, crumb.label)
                : h('span', { className: 'dswb-p1-crumb', 'aria-current': index === crumbs.length - 1 ? 'page' : undefined }, crumb.label),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dswb-p1-title-row' },
          h(
            'div',
            { className: 'dswb-p1-titles' },
            h('h1', { className: 'dswb-p1-title' }, title),
            h('p', { className: 'dswb-p1-sub' }, subtitle),
          ),
          actions === undefined ? null : h('div', { className: 'dswb-p1-actions' }, actions),
        ),
      )
    }

    /** A local-day picker: previous / today / next, kept inside the selected day. */
    function DayPicker({ day, setDay, todayStart, t }) {
      const isToday = Number(day) === Number(todayStart)
      const label = dateLabel(Number(day) + 12 * 3600_000, { month: 'numeric', day: 'numeric' })
      return h(
        'div',
        { className: 'dswb-p1-day', role: 'group', 'aria-label': t('page.dateHint') },
        h('button', { type: 'button', className: 'dswb-p1-day-btn', 'aria-label': t('page.prevDay'), onClick: () => setDay(Number(day) - DAY_MS) }, '‹'),
        h('button', { type: 'button', className: 'dswb-p1-day-label', onClick: () => setDay(Number(todayStart)), 'aria-label': t('page.today') }, h(Glyph, { name: 'calendar', size: 13 }), h('span', null, `${label} · ${isToday ? t('page.today') : dateLabel(Number(day) + 12 * 3600_000, { year: 'numeric' })}`)),
        h('button', { type: 'button', className: 'dswb-p1-day-btn', 'aria-label': t('page.nextDay'), disabled: isToday, onClick: () => setDay(Number(day) + DAY_MS) }, '›'),
      )
    }

    /** The section switcher: one status model, the same destinations on both widths. */
    function PageNav({ t, detail, setDetail, counts }) {
      const items = [
        { id: 'overview', label: t('nav.overview'), glyph: 'session' },
        { id: 'cost', label: t('nav.cost'), glyph: 'copy' },
        { id: 'projects', label: t('nav.projects'), glyph: 'folder' },
        { id: 'report', label: t('nav.report'), glyph: 'file' },
        { id: 'attention', label: t('attention.title'), glyph: 'alert', badge: counts?.attention },
      ]
      const current = (kind) => {
        if (kind === 'overview') return 'overview'
        if (kind === 'cost' || kind === 'costProject' || kind === 'costSession') return 'cost'
        if (kind === 'projects' || kind === 'projectTimeline') return 'projects'
        if (kind === 'report') return 'report'
        if (kind === 'attention' || kind === 'alert') return 'attention'
        return ''
      }
      const active = current(detail.kind)
      return h(
        'nav',
        { className: 'dswb-p1-nav', 'aria-label': t('tabs.label') },
        ...items.map((item) =>
          h(
            'button',
            {
              type: 'button',
              key: item.id,
              className: 'dswb-p1-nav-item',
              'aria-current': active === item.id ? 'page' : undefined,
              onClick: () => setDetail({ kind: item.id }),
            },
            h(Glyph, { name: item.glyph, size: 13 }),
            h('span', null, item.label),
            item.badge > 0 ? h('i', { className: 'dswb-p1-nav-badge', 'aria-hidden': 'true' }, String(item.badge)) : null,
          ),
        ),
      )
    }

    function EmptyState({ text, t, onRetry }) {
      return h(
        'div',
        { className: 'dswb-p1-empty' },
        h('p', null, text),
        onRetry === undefined ? null : h('button', { type: 'button', className: 'dswb-mini', onClick: onRetry }, t('page.retry')),
      )
    }

    function LoadingState({ t }) {
      return h('p', { className: 'dswb-p1-loading', role: 'status' }, h('span', { className: 'dswb-dot', 'data-running': 'true', 'aria-hidden': 'true' }), t('page.loading'))
    }

    // --- F07: global metadata search (UI-05) ----------------------------------

    function searchUrlOf(params, offset, rebuild) {
      const query = new URLSearchParams()
      if (params.text !== '') query.set('q', params.text)
      for (const value of params.projects) query.append('project', value)
      for (const value of params.models) query.append('model', value)
      for (const value of params.states) query.append('state', value)
      query.set('limit', params.text === '' ? '10' : String(SEARCH_PAGE_SIZE))
      query.set('offset', String(offset))
      query.set('tzOffset', String(tzOffsetSeconds()))
      query.set('locale', localeTag())
      if (params.days === 7) query.set('from', String(Date.now() - 7 * DAY_MS))
      if (rebuild) query.set('rebuild', '1')
      return `${SEARCH_ROUTE}?${query.toString()}`
    }

    /** A filter group: several values inside one dimension widen the result (union). */
    function FilterGroup({ label, options, selected, onToggle, t, allKey }) {
      if (options.length === 0) return null
      return h(
        'div',
        { className: 'dswb-search-group' },
        h('span', { className: 'dswb-search-group-label' }, label),
        h(
          'div',
          { className: 'dswb-search-chips' },
          h(
            'button',
            { type: 'button', className: 'dswb-search-chip', 'aria-pressed': selected.length === 0, onClick: () => onToggle(null) },
            t(allKey ?? 'search.all'),
          ),
          ...options.map((option) =>
            h(
              'button',
              {
                type: 'button',
                key: option.value,
                className: 'dswb-search-chip',
                'aria-pressed': selected.includes(option.value),
                onClick: () => onToggle(option.value),
              },
              option.label,
            ),
          ),
        ),
      )
    }

    /**
     * The command palette. Its index is metadata only: titles, project aliases,
     * model routes, states, dates and IDs. It never reads message text.
     */
    function SearchPalette({ t, snapshot, openSession, onClose, narrow }) {
      const rows = Array.isArray(snapshot?.search?.rows) ? snapshot.search.rows : []
      const projectOptions = [...new Set(rows.map((row) => row.projectName).filter(Boolean))].sort().map((value) => ({ value, label: value }))
      const modelOptions = [...new Set(rows.map((row) => row.model).filter(Boolean))].sort().map((value) => ({ value, label: value }))
      const states = ['waiting', 'running', 'stuck', 'failed', 'ended', 'cancelled', 'unknown']
      const stateOptions = states.map((value) => ({ value, label: stateLabel(t, value) }))
      const [draft, setDraft] = React.useState('')
      const [composing, setComposing] = React.useState(false)
      const [filters, setFilters] = React.useState({ projects: [], models: [], states: [], days: 0 })
      const [filtersOpen, setFiltersOpen] = React.useState(false)
      const [nonce, setNonce] = React.useState(0)
      const [result, setResult] = React.useState({ status: 'loading', items: [], total: 0, hasMore: false, index: undefined })
      const [selected, setSelected] = React.useState(0)
      const [rebuilding, setRebuilding] = React.useState(false)
      const inputRef = React.useRef(null)
      const restoreRef = React.useRef(undefined)
      const params = { text: draft.trim(), ...filters }

      React.useEffect(() => {
        restoreRef.current = document.activeElement
        const focus = () => inputRef.current?.focus()
        focus()
        return () => {
          const previous = restoreRef.current
          if (previous !== null && previous !== undefined && typeof previous.focus === 'function') previous.focus()
        }
      }, [])

      const filterKey = JSON.stringify([params.text, params.projects, params.models, params.states, params.days, nonce, composing])
      React.useEffect(() => {
        const controller = new AbortController()
        let alive = true
        let timer
        const run = async () => {
          try {
            const body = await readRoute(searchUrlOf(params, 0, rebuilding), controller.signal)
            if (!alive) return
            setResult({ status: 'ready', items: Array.isArray(body.items) ? body.items : [], total: Number(body.total) || 0, hasMore: body.hasMore === true, index: body.index })
            setSelected(0)
            setRebuilding(false)
          } catch (error) {
            if (!alive || controller.signal.aborted) return
            setResult((previous) => ({ ...previous, status: 'error' }))
            setRebuilding(false)
          }
        }
        setResult((previous) => ({ ...previous, status: 'loading' }))
        // Wait for the IME composition to end before submitting the query.
        timer = setTimeout(run, composing ? 260 : 90)
        return () => {
          alive = false
          clearTimeout(timer)
          controller.abort()
        }
      }, [filterKey])

      const loadMore = async () => {
        try {
          const body = await readRoute(searchUrlOf(params, result.items.length, false))
          setResult((previous) => ({
            ...previous,
            items: [...previous.items, ...(Array.isArray(body.items) ? body.items : [])],
            total: Number(body.total) || previous.total,
            hasMore: body.hasMore === true,
          }))
        } catch {
          // The next poll reconciles it.
        }
      }

      const toggle = (dimension, value) => {
        setFilters((previous) => {
          const next = { ...previous, [dimension]: value === null ? [] : previous[dimension].includes(value) ? previous[dimension].filter((entry) => entry !== value) : [...previous[dimension], value] }
          return next
        })
      }
      const hasFilters = filters.projects.length > 0 || filters.models.length > 0 || filters.states.length > 0 || filters.days > 0
      const clear = () => setFilters({ projects: [], models: [], states: [], days: 0 })

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelected((value) => Math.min(result.items.length - 1, value + 1))
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelected((value) => Math.max(0, value - 1))
        } else if (event.key === 'Enter') {
          const row = result.items[selected]
          if (row !== undefined) {
            event.preventDefault()
            openSession(row.sessionId)
            onClose()
          }
        }
      }

      const items = result.items
      return h(
        'div',
        { className: 'dswb-search-overlay', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() }, role: 'presentation' },
        h(
          'div',
          { className: 'dswb-search-dialog', 'data-narrow': narrow === true ? 'true' : undefined, role: 'dialog', 'aria-modal': 'true', 'aria-label': t('search.title'), onMouseDown: (event) => event.stopPropagation(), onKeyDown },
          h(
            'div',
            { className: 'dswb-search-input-row' },
            h(Glyph, { name: 'search', size: 16 }),
            h('input', {
              ref: inputRef,
              className: 'dswb-search-input',
              type: 'text',
              value: draft,
              placeholder: t('search.placeholder'),
              'aria-label': t('search.title'),
              autoComplete: 'off',
              spellCheck: false,
              onChange: (event) => {
                const text = event.target.value
                setDraft(text)
              },
              onCompositionStart: () => setComposing(true),
              onCompositionEnd: (event) => {
                setComposing(false)
                setDraft(event.target.value)
              },
            }),
            composing ? h('span', { className: 'dswb-search-ime' }, t('search.composing')) : null,
            h('button', { type: 'button', className: 'dswb-search-esc', onClick: onClose, 'aria-label': t('detail.back') }, 'Esc'),
          ),
          h(
            'div',
            { className: 'dswb-search-tools' },
            h(
              'button',
              { type: 'button', className: 'dswb-search-toggle', 'aria-expanded': filtersOpen, onClick: () => setFiltersOpen((value) => !value) },
              t('search.filters'),
              hasFilters ? h('i', { className: 'dswb-search-active' }) : null,
            ),
            h('span', { className: 'dswb-spacer' }),
            h(
              'button',
              { type: 'button', className: 'dswb-search-rebuild', disabled: rebuilding, onClick: () => { setRebuilding(true); setNonce((value) => value + 1) } },
              rebuilding ? t('search.rebuilding') : t('search.rebuild'),
            ),
          ),
          filtersOpen
            ? h(
                'div',
                { className: 'dswb-search-filters' },
                h(FilterGroup, { label: t('search.project'), options: projectOptions, selected: filters.projects, onToggle: (value) => toggle('projects', value), t }),
                h(FilterGroup, { label: t('search.model'), options: modelOptions, selected: filters.models, onToggle: (value) => toggle('models', value), t }),
                h(FilterGroup, { label: t('search.state'), options: stateOptions, selected: filters.states, onToggle: (value) => toggle('states', value), t }),
                h(
                  'div',
                  { className: 'dswb-search-group' },
                  h('span', { className: 'dswb-search-group-label' }, t('search.date')),
                  h(
                    'div',
                    { className: 'dswb-search-chips' },
                    h('button', { type: 'button', className: 'dswb-search-chip', 'aria-pressed': filters.days === 0, onClick: () => setFilters((previous) => ({ ...previous, days: 0 })) }, t('search.allTime')),
                    h('button', { type: 'button', className: 'dswb-search-chip', 'aria-pressed': filters.days === 7, onClick: () => setFilters((previous) => ({ ...previous, days: 7 })) }, t('search.last7')),
                  ),
                ),
                hasFilters ? h('button', { type: 'button', className: 'dswb-mini', onClick: clear }, t('search.clear')) : null,
              )
            : null,
          h(
            'div',
            { className: 'dswb-search-summary' },
            result.status === 'error'
              ? h('span', { role: 'alert' }, t('page.error'))
              : t('search.found', { count: String(result.total) }),
            h('span', { className: 'dswb-spacer' }),
            h('span', { className: 'dswb-search-index' }, t('search.localIndex', { count: String(result.index?.rows ?? rows.length) })),
          ),
          h(
            'ul',
            { className: 'dswb-search-results', role: 'listbox', 'aria-label': t('search.title') },
            items.length === 0 && result.status === 'ready'
              ? h('li', { className: 'dswb-search-none' }, t('search.empty'), hasFilters ? h('button', { type: 'button', className: 'dswb-mini', onClick: clear }, t('search.clear')) : null)
              : items.map((row, index) =>
                  h(
                    'li',
                    { key: `${row.sessionId}-${index}`, role: 'option', 'aria-selected': selected === index },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dswb-search-result',
                        'data-selected': selected === index ? 'true' : undefined,
                        onMouseEnter: () => setSelected(index),
                        onClick: () => { openSession(row.sessionId); onClose() },
                      },
                      h('span', { className: 'dswb-search-result-glyph' }, h(Glyph, { name: 'session', size: 14 })),
                      h(
                        'span',
                        { className: 'dswb-search-result-main' },
                        h('span', { className: 'dswb-search-result-title' }, row.title || t('row.untitled')),
                        h('span', { className: 'dswb-search-result-meta' }, `${row.projectName || '—'} · ${row.model || t('speed.unknownModel')}`),
                      ),
                      h('span', { className: 'dswb-search-result-time' }, dateLabel(Number(row.at), { month: 'numeric', day: 'numeric' })),
                      h(StateBadge, { name: String(row.state ?? 'unknown'), t }),
                      h('span', { className: 'dswb-search-result-open', 'aria-hidden': 'true' }, h(Glyph, { name: 'chevron', size: 13 })),
                    ),
                  ),
                ),
          ),
          result.hasMore
            ? h('div', { className: 'dswb-search-more' }, h('button', { type: 'button', className: 'dswb-mini', onClick: loadMore }, t('search.more')))
            : null,
          h('div', { className: 'dswb-search-foot' }, t('search.hint')),
        ),
      )
    }

    // --- F05: project → Session → request (UI-06) -----------------------------

    function CostLanding({ data, t, onSelect, crumbs, dayLabel }) {
      const ledger = data?.ledger ?? {}
      const projects = Array.isArray(ledger.projects) ? ledger.projects : []
      const max = Math.max(1, ...projects.map((row) => Number(row.amount) || 0))
      const currency = ledger.currency ?? data?.overview?.currency ?? 'CNY'
      return h(
        React.Fragment,
        null,
        h(PageHeader, {
          t,
          crumbs,
          title: t('cost.title'),
          subtitle: t('cost.subtitle', { date: dayLabel, zone: utcOffsetLabel() }),
          actions: h(CoveragePill, { coverage: ledger.coverage, t }),
        }),
        h(
          'div',
          { className: 'dswb-p1-grid' },
          h(
            'section',
            { className: 'dswb-big' },
            h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('cost.today')), h('span', { className: 'dswb-spacer' }), h('span', { className: 'dswb-big-hint' }, '¥ / 元')),
            h(
              'div',
              { className: 'dswb-p1-cost-total' },
              h('span', { className: 'dswb-p1-cost-value' }, moneyOf(data?.overview?.amount, currency)),
              h('span', { className: 'dswb-p1-cost-note' }, t('cost.known')),
            ),
            projects.length === 0
              ? h(EmptyState, { text: t('cost.empty'), t })
              : h(
                  'ul',
                  { className: 'dswb-p1-projects' },
                  ...projects.map((project) =>
                    h(
                      'li',
                      { key: project.projectId },
                      h(
                        'button',
                        { type: 'button', className: 'dswb-p1-project', onClick: () => onSelect({ kind: 'costProject', projectId: project.projectId, name: project.name }) },
                        h('span', { className: 'dswb-p1-project-top' }, h('span', { className: 'dswb-p1-project-name' }, h(Glyph, { name: 'folder', size: 14 }), project.name || basename(project.projectId)), h('span', { className: 'dswb-p1-project-amount' }, moneyOf(project.amount, currency))),
                        h('span', { className: 'dswb-p1-bar' }, h('span', { style: { width: `${Math.max(4, ((Number(project.amount) || 0) / max) * 100)}%` } })),
                        h('span', { className: 'dswb-p1-project-meta' }, t('cost.projectSessions', { count: String(project.sessions ?? 0) }), h('span', { className: 'dswb-spacer' }), t('cost.coverage', { percent: String(Math.round((Number(project.coverage) || 0) * 100)) })),
                      ),
                    ),
                  ),
                ),
          ),
          h(
            'aside',
            { className: 'dswb-big dswb-p1-notes' },
            h('h2', { className: 'dswb-big-title' }, t('cost.requests')),
            h('p', { className: 'dswb-quiet' }, t('cost.estimateNote')),
            h('p', { className: 'dswb-quiet' }, t('foot.note')),
          ),
        ),
      )
    }

    function CostProjectPage({ detail, data, t, onSelect, crumbs, day }) {
      const ledger = data?.ledger ?? {}
      const currency = ledger.currency ?? data?.overview?.currency ?? 'CNY'
      const byId = new Map()
      for (const row of Array.isArray(ledger.sessions) ? ledger.sessions : []) {
        if (row.projectId !== detail.projectId) continue
        byId.set(row.sessionId, { sessionId: row.sessionId, title: row.title, model: row.model, amount: row.amount, quality: row.quality })
      }
      for (const row of [...(Array.isArray(data?.running) ? data.running : []), ...(Array.isArray(data?.recent) ? data.recent : [])]) {
        if (row.projectId !== detail.projectId) continue
        if (byId.has(row.sessionId)) continue
        byId.set(row.sessionId, { sessionId: row.sessionId, title: row.title, model: row.model, amount: row.usage?.amount, quality: row.usage?.quality, state: row.state })
      }
      const rows = [...byId.values()].sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0))
      return h(
        React.Fragment,
        null,
        h(PageHeader, { t, crumbs, title: detail.name || t('cost.title'), subtitle: `${t('cost.projectSessions', { count: String(rows.length) })} · 人民币 · ${dateLabel(Number(day) + 12 * 3600_000, dateParts())}` }),
        h(
          'section',
          { className: 'dswb-big' },
          h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('cost.sessions')), h('span', { className: 'dswb-pill' }, String(rows.length))),
          rows.length === 0
            ? h(EmptyState, { text: t('cost.empty'), t })
            : h(
                'ul',
                { className: 'dswb-p1-sessions' },
                ...rows.map((row) =>
                  h(
                    'li',
                    { key: row.sessionId },
                    h(
                      'button',
                      { type: 'button', className: 'dswb-p1-session', onClick: () => onSelect({ kind: 'costSession', sessionId: row.sessionId, projectId: detail.projectId, name: detail.name, day }) },
                      h('span', { className: 'dswb-p1-session-glyph' }, h(Glyph, { name: 'session', size: 14 })),
                      h('span', { className: 'dswb-p1-session-main' }, h('span', { className: 'dswb-p1-session-title' }, row.title || t('row.untitled')), h('span', { className: 'dswb-p1-session-meta' }, row.model || '—')),
                      row.state === undefined ? null : h(StateBadge, { name: String(row.state), t }),
                      h('span', { className: 'dswb-p1-session-amount' }, row.quality === 'unpriced' || row.amount === undefined ? t('cost.unpriced') : moneyOf(row.amount, currency)),
                      h('span', { className: 'dswb-search-result-open', 'aria-hidden': 'true' }, h(Glyph, { name: 'chevron', size: 13 })),
                    ),
                  ),
                ),
              ),
        ),
      )
    }

    function RequestDetail({ row, result, t, onOpen }) {
      const tokens = row?.tokens ?? {}
      const prices = Array.isArray(result?.prices) ? result.prices.find((entry) => entry.model === row?.model) ?? result.prices[0] : undefined
      const priced = row?.amount !== undefined && row?.amount !== null
      const currency = result?.currency ?? 'CNY'
      const attribution = row?.attribution === 'session' ? t('cost.attribution.session') : t('cost.attribution.workspace', { project: result?.projectName || '—' })
      return h(
        'aside',
        { className: 'dswb-big dswb-p1-detail' },
        h(
          'div',
          { className: 'dswb-big-head' },
          h('h2', { className: 'dswb-big-title' }, t('cost.requestDetail')),
          h('span', { className: 'dswb-spacer' }),
          h(StatusPill, { tone: priced ? 'ok' : 'warn', glyph: priced ? 'check' : 'alert', label: priced ? t('cost.priced') : t('cost.unpriced') }),
        ),
        row === undefined
          ? h(EmptyState, { text: t('cost.empty'), t })
          : h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dswb-p1-detail-value' },
                h('span', { className: 'dswb-p1-detail-amount' }, priced ? moneyOf(row.amount, currency) : t('cost.unpriced')),
                h('span', { className: 'dswb-p1-detail-meta' }, `${row.requestId} · ${row.at === undefined ? t('cost.aggregate') : clockOf(row.at)}`),
              ),
              h(
                'dl',
                { className: 'dswb-p1-facts' },
                h(Fact, { label: t('cost.source'), value: row.provider || '—' }),
                h(Fact, { label: t('cost.model'), value: row.model || '—' }),
                h(Fact, { label: t('cost.uncached'), value: formatTokens(tokens.uncachedInput), mono: true }),
                h(Fact, { label: t('cost.cacheRead'), value: formatTokens(tokens.cacheReadInput), mono: true }),
                h(Fact, { label: t('cost.output'), value: formatTokens(tokens.output), mono: true }),
                h(Fact, { label: t('cost.priceRef'), value: row.priceRef || result?.priceRef || '—', mono: true }),
                h(Fact, { label: t('cost.attribution'), value: attribution }),
              ),
              prices === undefined
                ? null
                : h('p', { className: 'dswb-p1-price-note' }, h(Glyph, { name: 'copy', size: 12 }), t('cost.priceNote', { input: String(prices.input ?? '—'), cache: String(prices.cacheRead ?? '—'), output: String(prices.output ?? '—') })),
              row.quality === 'unpriced' || row.quality === 'missing-usage' || row.quality === 'duplicate'
                ? h('p', { className: 'dswb-p1-warn' }, h(Glyph, { name: 'alert', size: 12 }), t('cost.missingUsage'))
                : null,
              onOpen === undefined ? null : h('button', { type: 'button', className: 'dswb-primary', onClick: onOpen }, h(Glyph, { name: 'session', size: 13 }), t('cost.open')),
            ),
      )
    }

    function CostSessionPage({ detail, t, crumbs, openSession, now }) {
      const url = `${REQUEST_ROUTE}?sessionId=${encodeURIComponent(detail.sessionId)}&day=${Number(detail.day)}&tzOffset=${tzOffsetSeconds()}&locale=${encodeURIComponent(localeTag())}`
      const [state, refresh] = useRoute(url)
      const result = state.data
      const rows = Array.isArray(result?.rows) ? result.rows : []
      const [selectedKey, setSelectedKey] = React.useState(undefined)
      const selected = rows.find((row) => row.requestId === selectedKey) ?? rows[0]
      const currency = result?.currency ?? 'CNY'
      const pricedCount = rows.filter((row) => row.amount !== undefined && row.amount !== null).length
      return h(
        React.Fragment,
        null,
        h(PageHeader, {
          t,
          crumbs,
          title: t('cost.sessionTitle'),
          subtitle: `${detail.sessionId} · 人民币 · ${utcOffsetLabel()}`,
          actions: h(RefreshButton, { t, onClick: refresh, status: state.status }),
        }),
        state.status === 'loading' && result === undefined
          ? h(LoadingState, { t })
          : h(
              'div',
              { className: 'dswb-p1-grid dswb-p1-cost-grid' },
              h(
                'div',
                { className: 'dswb-p1-cost-main' },
                h(
                  'section',
                  { className: 'dswb-big' },
                  h(
                    'div',
                    { className: 'dswb-big-head' },
                    h('h2', { className: 'dswb-big-title' }, t('cost.today')),
                    h('span', { className: 'dswb-spacer' }),
                    h('button', { type: 'button', className: 'dswb-primary dswb-p1-open', onClick: () => openSession(detail.sessionId) }, h(Glyph, { name: 'session', size: 13 }), t('cost.open')),
                  ),
                  h(
                    'div',
                    { className: 'dswb-p1-cost-total' },
                    h('span', { className: 'dswb-p1-cost-value' }, moneyOf(result?.total, currency)),
                    h('span', { className: 'dswb-p1-cost-note' }, t('cost.known')),
                    h(CoveragePill, { coverage: result?.coverage, t }),
                  ),
                  h('p', { className: 'dswb-p1-cost-foot' }, t('cost.pricedRow', { priced: String(pricedCount), unpriced: String(rows.length - pricedCount) }), h('span', { className: 'dswb-spacer' }), t('cost.estimateNote')),
                ),
                h(
                  'section',
                  { className: 'dswb-big' },
                  h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('cost.requests')), h('span', { className: 'dswb-spacer' }), h('span', { className: 'dswb-pill' }, t('cost.terminal', { count: String(rows.length) }))),
                  rows.length === 0
                    ? h(EmptyState, { text: t('cost.empty'), t, onRetry: state.status === 'error' ? refresh : undefined })
                    : h(
                        'ul',
                        { className: 'dswb-p1-requests' },
                        ...rows.map((row) =>
                          h(
                            'li',
                            { key: row.requestId },
                            h(
                              'button',
                              { type: 'button', className: 'dswb-p1-request', 'data-selected': selected?.requestId === row.requestId ? 'true' : undefined, onClick: () => setSelectedKey(row.requestId) },
                              h('span', { className: 'dswb-p1-request-id' }, row.requestId),
                              h('span', { className: 'dswb-p1-request-time' }, row.at === undefined ? t('cost.aggregate') : clockOf(row.at)),
                              h('span', { className: 'dswb-p1-request-status', 'data-tone': row.status === 'settled' ? 'ok' : 'warn' }, row.status === 'settled' ? t('cost.success') : t('cost.failed')),
                              h('span', { className: 'dswb-spacer' }),
                              h('span', { className: 'dswb-p1-request-amount' }, row.amount === undefined || row.amount === null ? t('cost.unpriced') : moneyOf(row.amount, currency)),
                              h('span', { className: 'dswb-search-result-open', 'aria-hidden': 'true' }, h(Glyph, { name: 'chevron', size: 13 })),
                            ),
                          ),
                        ),
                      ),
                ),
              ),
              h(RequestDetail, { row: selected, result, t, onOpen: () => openSession(detail.sessionId) }),
            ),
      )
    }

    /**
     * The pricing-coverage badge (PRD F05).
     *
     * Full coverage is the only success case; a partial day is a warning and an empty
     * day has no sample at all. Rendering every figure — including 0% — as a green
     * "✓" made an unpriced day look healthy, which is what a reader complained about.
     */
    function CoveragePill({ coverage, t }) {
      const known = coverage !== undefined && coverage !== null && Number.isFinite(Number(coverage))
      if (!known) return h(StatusPill, { tone: 'idle', glyph: 'clock', label: t('kpi.noSample') })
      const percent = Math.round(Number(coverage) * 100)
      const tone = percent >= 100 ? 'ok' : 'warn'
      return h(StatusPill, { tone, glyph: percent >= 100 ? 'check' : 'alert', label: t('cost.coverage', { percent: String(percent) }) })
    }

    function RefreshButton({ t, onClick, status }) {
      return h('button', { type: 'button', className: 'dswb-icon-btn dswb-refresh', onClick, disabled: status === 'loading', 'aria-label': t('page.refresh') }, h(RefreshIcon))
    }

    // --- F04: project progress and the evidence timeline ----------------------

    function projectCardOf(project, t, onSelect, now) {
      const card = project.card ?? {}
      const counts = card.counts ?? {}
      const label = card.lastAction?.label ?? card.name ?? '—'
      return h(
        'li',
        { key: card.projectId },
        h(
          'button',
          { type: 'button', className: 'dswb-p1-proj-card', onClick: () => onSelect({ kind: 'projectTimeline', projectId: card.projectId, name: card.name }) },
          h(
            'span',
            { className: 'dswb-p1-proj-top' },
            h('span', { className: 'dswb-p1-proj-name' }, h(Glyph, { name: 'folder', size: 15 }), card.name || basename(card.projectId)),
            h('span', { className: 'dswb-p1-proj-time' }, relativeTime(t, card.lastAt, now)),
          ),
          h('span', { className: 'dswb-p1-proj-meta' }, t('projects.sessions', { count: String(card.sessions ?? 0) }), ' · ', t('projects.evidence', { count: String(card.evidence ?? 0) })),
          h(
            'span',
            { className: 'dswb-p1-proj-counts' },
            ...[
              ['done', counts.done, 'projects.done'],
              ['active', counts.active, 'projects.active'],
              ['blocked', counts.blocked, 'projects.blocked'],
              ['confirm', counts.confirm, 'projects.confirm'],
            ].filter(([, count]) => Number(count) > 0).map(([tone, count, key]) => h(StatusPill, { key: tone, tone, label: t('projects.count', { count: String(count), state: t(key) }) })),
          ),
          h('span', { className: 'dswb-p1-proj-action' }, h(Glyph, { name: 'clock', size: 12 }), truncateText(label, 42)),
          h('span', { className: 'dswb-p1-proj-git' }, project.git === 'ready' ? t('projects.gitReady') : t('projects.gitOff')),
        ),
      )
    }

    function ProjectsPage({ t, day, setDay, todayStart, onSelect, crumbs, now }) {
      const url = `${REPORT_ROUTE}?day=${Number(day)}&tzOffset=${tzOffsetSeconds()}&locale=${encodeURIComponent(localeTag())}`
      const [state, refresh] = useRoute(url)
      const result = state.data
      const projects = Array.isArray(result?.projects) ? result.projects : []
      return h(
        React.Fragment,
        null,
        h(PageHeader, {
          t,
          crumbs,
          title: t('projects.title'),
          subtitle: t('projects.subtitle', { date: dateLabel(Number(day) + 12 * 3600_000, dateParts()), count: String(projects.length) }),
          actions: h(React.Fragment, null, h(DayPicker, { day, setDay, todayStart, t }), h(RefreshButton, { t, onClick: refresh, status: state.status })),
        }),
        state.status === 'loading' && result === undefined
          ? h(LoadingState, { t })
          : projects.length === 0
            ? h(EmptyState, { text: t('projects.empty'), t, onRetry: state.status === 'error' ? refresh : undefined })
            : h(
                'ul',
                { className: 'dswb-p1-proj-grid' },
                ...projects.map((project) => projectCardOf(project, t, onSelect, now)),
              ),
      )
    }

    function TimelineRow({ entry, t, now, onSelect, openSession, selected }) {
      const kind = String(entry.kind)
      const glyph = kind === 'session' ? 'session' : kind === 'file' ? 'file' : kind === 'commit' ? 'git' : 'test'
      const label =
        kind === 'session' ? entry.title || t('row.untitled')
          : kind === 'file' ? entry.path
            : kind === 'commit' ? `${entry.sha} · ${entry.subject}`
              : entry.text
      const source = kind === 'session' ? t('cost.sessionId') : kind === 'commit' ? t('projects.source') : kind === 'test' ? t('projects.tests') : t('projects.source')
      return h(
        'li',
        { key: referenceKeyOf(entry), className: 'dswb-p1-tl-row', 'data-selected': selected ? 'true' : undefined },
        h(
          'button',
          { type: 'button', className: 'dswb-p1-tl-main', onClick: () => onSelect(entry) },
          h('span', { className: 'dswb-p1-tl-glyph', 'data-kind': kind }, h(Glyph, { name: glyph, size: 14 })),
          h(
            'span',
            { className: 'dswb-p1-tl-body' },
            h('span', { className: 'dswb-p1-tl-label' }, truncateText(String(label), 64)),
            h('span', { className: 'dswb-p1-tl-meta' }, `${clockOf(entry.at)} · ${source}`),
          ),
          h(StatusPill, { tone: entry.attribution === 'direct' ? 'ok' : 'idle', label: t(entry.attribution === 'direct' ? 'projects.direct' : 'projects.activity') }),
          kind === 'commit' ? h('span', { className: 'dswb-p1-tl-files' }, t('projects.commitFiles', { count: String(entry.files ?? 0) })) : null,
          kind === 'test' ? h('span', { className: 'dswb-p1-tl-files' }, t(entry.verified === true ? 'projects.verified' : 'projects.unverified')) : null,
        ),
        entry.sessionId === undefined || kind === 'commit' ? null : h('button', { type: 'button', className: 'dswb-open', 'aria-label': t('projects.openSession'), onClick: () => openSession(entry.sessionId) }, h(Glyph, { name: 'session', size: 13 })),
      )
    }

    function referenceKeyOf(entry) {
      return entry?.reference?.sourceRef ?? `${entry?.kind}:${entry?.at}:${entry?.path ?? entry?.sha ?? entry?.sessionId ?? ''}`
    }

    function TimelineEvidence({ entry, t, project, openSession }) {
      const kind = String(entry?.kind ?? '')
      const facts = []
      if (kind === 'commit') {
        facts.push([t('report.sha'), entry.sha || '—'], [t('projects.source'), entry.author || 'Git'], [t('projects.commitFiles', { count: String(entry.files ?? 0) })], [t('projects.time'), clockOf(entry.at)])
      } else if (kind === 'test') {
        facts.push([t('report.tests'), entry.verified === true ? t('projects.testVerified', { passed: String(entry.passed ?? '—'), code: String(entry.exitCode ?? 0) }) : t('projects.testUnverified')], [t('projects.source'), entry.verified === true ? t('projects.verified') : t('projects.unverified')], [t('projects.time'), clockOf(entry.at)])
      } else if (kind === 'file') {
        facts.push([t('projects.source'), entry.path || '—'], [t('projects.time'), clockOf(entry.at)], [t('projects.direct'), String(entry.count ?? 1)])
      } else {
        facts.push([t('cost.sessionId'), entry.sessionId || '—'], [t('projects.state'), t('state.' + String(entry.state ?? 'unknown'))], [t('projects.time'), clockOf(entry.at)])
      }
      return h(
        'aside',
        { className: 'dswb-big dswb-p1-detail' },
        h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('report.evidence')), h('span', { className: 'dswb-spacer' }), h(StatusPill, { tone: entry?.attribution === 'direct' ? 'ok' : 'idle', label: t(entry?.attribution === 'direct' ? 'projects.direct' : 'projects.activity') })),
        entry === undefined
          ? h(EmptyState, { text: t('projects.emptyTimeline'), t })
          : h(
              React.Fragment,
              null,
              h('h3', { className: 'dswb-p1-detail-title' }, truncateText(String(entry.title ?? entry.subject ?? entry.path ?? entry.text ?? ''), 80)),
              h('dl', { className: 'dswb-p1-facts' }, ...facts.map(([label, value], index) => h(Fact, { key: index, label, value }))),
              entry.sessionId === undefined ? null : h('button', { type: 'button', className: 'dswb-primary', onClick: () => openSession(entry.sessionId) }, h(Glyph, { name: 'session', size: 13 }), t('projects.openSession')),
              h('p', { className: 'dswb-p1-detail-note' }, project?.git === 'ready' ? t('projects.gitReady') : t('projects.gitOff')),
            ),
      )
    }

    function ProjectTimelinePage({ detail, t, day, setDay, todayStart, onBack, crumbs, openSession }) {
      const url = `${REPORT_ROUTE}?day=${Number(day)}&tzOffset=${tzOffsetSeconds()}&locale=${encodeURIComponent(localeTag())}&project=${encodeURIComponent(detail.projectId)}`
      const [state, refresh] = useRoute(url)
      const project = (Array.isArray(state.data?.projects) ? state.data.projects : [])[0]
      const timeline = Array.isArray(project?.timeline) ? project.timeline : []
      const [filter, setFilter] = React.useState('all')
      const [selectedKey, setSelectedKey] = React.useState(undefined)
      const shown = timeline.filter((entry) => filter === 'all' || entry.kind === filter)
      const selected = shown.find((entry) => referenceKeyOf(entry) === selectedKey) ?? shown[0]
      const filters = ['all', 'session', 'file', 'commit', 'test']
      return h(
        React.Fragment,
        null,
        h(PageHeader, {
          t,
          crumbs,
          title: `${t('projects.title')} · ${detail.name || basename(detail.projectId)}`,
          subtitle: `${t('projects.sessions', { count: String(project?.card?.sessions ?? 0) })} · ${t('projects.evidence', { count: String(project?.card?.evidence ?? 0) })}`,
          actions: h(React.Fragment, null,
            h('button', { type: 'button', className: 'dswb-mini', onClick: onBack }, t('page.back')),
            h('button', {
              type: 'button',
              className: 'dswb-mini',
              'aria-pressed': project?.git === 'ready' ? 'true' : 'false',
              onClick: async () => {
                try {
                  await postRoute(REPORT_ROUTE, { action: 'git', projectId: detail.projectId, enabled: project?.git !== 'ready' })
                  refresh()
                } catch {
                  // The next read reconciles it.
                }
              },
            }, t(project?.git === 'ready' ? 'projects.gitDisable' : 'projects.gitEnable')),
            h(DayPicker, { day, setDay, todayStart, t }),
            h(RefreshButton, { t, onClick: refresh, status: state.status })),
        }),
        h(
          'div',
          { className: 'dswb-p1-filters' },
          ...filters.map((name) => h('button', { type: 'button', key: name, className: 'dswb-search-chip', 'aria-pressed': filter === name, onClick: () => setFilter(name) }, t(`projects.filter.${name}`))),
        ),
        state.status === 'loading' && project === undefined
          ? h(LoadingState, { t })
          : h(
              'div',
              { className: 'dswb-p1-grid' },
              h(
                'section',
                { className: 'dswb-big' },
                h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('projects.timeline')), h('span', { className: 'dswb-spacer' }), h('span', { className: 'dswb-pill' }, String(shown.length))),
                shown.length === 0
                  ? h(EmptyState, { text: t('projects.emptyTimeline'), t })
                  : h('ul', { className: 'dswb-p1-timeline' }, ...shown.map((entry) => h(TimelineRow, { key: referenceKeyOf(entry), entry, t, onSelect: (row) => setSelectedKey(referenceKeyOf(row)), selected: selected !== undefined && referenceKeyOf(selected) === referenceKeyOf(entry), openSession }))),
              ),
              h(TimelineEvidence, { entry: selected, t, project, openSession }),
            ),
      )
    }

    // --- F08: editable evidence daily report (UI-07) --------------------------

    const REPORT_GROUPS = [
      { key: 'won', status: 'done', tone: 'ok', heading: 'report.done' },
      { key: 'doing', status: 'active', tone: 'info', heading: 'report.doing' },
      { key: 'blocked', status: 'blocked', tone: 'warn', heading: 'report.blocked' },
      { key: 'confirm', status: 'confirm', tone: 'idle', heading: 'report.confirm' },
    ]

    function cloneGroups(groups) {
      return (Array.isArray(groups) ? groups : []).map((group) => ({
        name: String(group.name ?? ''),
        won: (Array.isArray(group.won) ? group.won : []).map((item) => ({ ...item })),
        doing: (Array.isArray(group.doing) ? group.doing : []).map((item) => ({ ...item })),
        blocked: (Array.isArray(group.blocked) ? group.blocked : []).map((item) => ({ ...item })),
        confirm: (Array.isArray(group.confirm) ? group.confirm : []).map((item) => ({ ...item })),
      }))
    }

    /** Markdown of the *edited* draft, so a copied report matches what the reader saw. */
    function clientReportMarkdown(dayLabel, groups, t) {
      const lines = [`# ${t('report.title')} · ${dayLabel}`, '']
      let any = false
      for (const group of groups) {
        const rows = REPORT_GROUPS.map((section) => [section, group[section.key] ?? []]).filter(([, items]) => items.length > 0)
        if (rows.length === 0) continue
        any = true
        lines.push(`## ${group.name}`, '')
        for (const [section, items] of rows) {
          lines.push(`### ${t(section.heading)}`, '')
          for (const item of items) {
            const marks = []
            if (item.edited === true) marks.push(t('report.editMark'))
            if (item.attribution === 'activity') marks.push(t('report.activityMark'))
            if (item.blockedBy !== undefined && item.blockedBy !== '') marks.push(t('report.blocked'))
            lines.push(`- ${item.title}${marks.length === 0 ? '' : `（${marks.join('，')}）`}`)
          }
          lines.push('')
        }
      }
      if (!any) lines.push(t('report.empty'), '')
      return lines.join('\n')
    }

    function ReportItemRow({ item, group, section, index, t, selected, onSelect, onConfirm, pending, editing, setEditing, saveEdit }) {
      const project = group.name
      return h(
        'li',
        { className: 'dswb-p1-report-row', 'data-selected': selected ? 'true' : undefined },
        h(
          'div',
          { className: 'dswb-p1-report-main' },
          h(
            'button',
            { type: 'button', className: 'dswb-p1-report-title-btn', onClick: () => onSelect(item), 'aria-label': t('report.viewEvidence'), 'aria-pressed': selected === true },
            h(StatusPill, { tone: section.tone, label: t(section.heading) }),
            h('span', { className: 'dswb-p1-report-item' }, editing ? null : h('span', { className: 'dswb-p1-report-title' }, item.title)),
          ),
          editing
            ? h('input', {
                className: 'dswb-p1-report-input',
                defaultValue: item.title,
                'aria-label': t('report.edit'),
                autoFocus: true,
                onKeyDown: (event) => {
                  if (event.key === 'Enter') saveEdit(event.currentTarget.value)
                  if (event.key === 'Escape') setEditing(false)
                },
              })
            : null,
          h('span', { className: 'dswb-p1-report-meta' }, `${project} · ${item.confirmation !== undefined ? t('report.confirmBy') : item.source === 'local' ? t('report.manual') : t('projects.activity')}`),
          h(
            'span',
            { className: 'dswb-p1-report-chips' },
            item.edited === true ? h(StatusPill, { tone: 'info', label: t('report.editMark') }) : null,
            item.attribution === 'activity' ? h(StatusPill, { tone: 'idle', label: t('report.activityMark') }) : null,
            ...(Array.isArray(item.evidence) ? item.evidence.slice(0, 2).map((ref, index) => h(StatusPill, { key: index, tone: 'ok', glyph: ref.sourceType === 'commit' ? 'git' : ref.sourceType === 'test' ? 'test' : 'session', label: ref.sourceType === 'commit' ? t('report.sha') : ref.sourceType === 'test' ? t('report.tests') : t('cost.sessionId') })) : []),
          ),
        ),
        h(
          'span',
          { className: 'dswb-p1-report-actions' },
          editing
            ? h('button', { type: 'button', className: 'dswb-mini', onClick: () => setEditing(false) }, t('report.cancel'))
            : h('button', { type: 'button', className: 'dswb-mini', onClick: () => setEditing(true) }, t('report.edit')),
          item.status === 'done' || item.status === 'active'
            ? null
            : h(
                'button',
                {
                  type: 'button',
                  className: 'dswb-mini dswb-mini-primary',
                  disabled: pending === true,
                  onClick: () => onConfirm(item, project, section.key, index),
                },
                t(pending === true ? 'report.confirming' : 'report.confirmTask'),
              ),
        ),
      )
    }

    function ReportEvidence({ item, t, openSession, timeline }) {
      const refs = Array.isArray(item?.evidence) ? item.evidence : []
      const session = refs.find((ref) => ref.sourceType === 'session')
      const entries = Array.isArray(timeline) ? timeline : []
      const commit = entries.find((entry) => entry.kind === 'commit' && (entry.relatedSessions ?? []).includes(item?.sessionId))
      const test = entries.find((entry) => entry.kind === 'test' && entry.sessionId === item?.sessionId)
      const sha = commit?.short ?? refs.find((ref) => ref.sourceType === 'commit')?.sourceRef?.split(':').pop()?.slice(0, 8)
      const testsLabel = test === undefined ? t('projects.unverified') : test.verified === true ? t('projects.testVerified', { passed: String(test.passed ?? '—'), code: String(test.exitCode ?? 0) }) : t('projects.testUnverified')
      return h(
        'aside',
        { className: 'dswb-big dswb-p1-detail' },
        h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('report.evidence')), h('span', { className: 'dswb-spacer' }), h(StatusPill, { tone: 'ok', glyph: 'check', label: t('projects.verified') })),
        item === undefined
          ? h(EmptyState, { text: t('report.empty'), t })
          : h(
              React.Fragment,
              null,
              h('h3', { className: 'dswb-p1-detail-title' }, truncateText(String(item.title ?? ''), 84)),
              h(
                'dl',
                { className: 'dswb-p1-facts' },
                h(Fact, { label: t('report.sha'), value: sha ?? '—', mono: true }),
                h(Fact, { label: t('report.tests'), value: testsLabel }),
                h(Fact, { label: t('report.verification'), value: t('projects.activity') }),
                h(Fact, { label: t('report.confirmBy'), value: item.confirmation === undefined ? '—' : t('report.localUser', { time: clockOf(item.confirmation.at) }) }),
              ),
              h(
                'div',
                { className: 'dswb-p1-detail-actions' },
                session === undefined ? null : h('button', { type: 'button', className: 'dswb-mini', onClick: () => openSession(session.sourceRef) }, h(Glyph, { name: 'session', size: 12 }), t('projects.openSession')),
                commit === undefined ? null : h('button', { type: 'button', className: 'dswb-mini', onClick: () => openSession(item.sessionId ?? '') }, h(Glyph, { name: 'git', size: 12 }), t('report.openCommit')),
                test === undefined ? null : h('button', { type: 'button', className: 'dswb-mini', onClick: () => openSession(item.sessionId ?? '') }, h(Glyph, { name: 'test', size: 12 }), t('report.openTest')),
              ),
              h('p', { className: 'dswb-p1-detail-note' }, t('report.note')),
            ),
      )
    }

    function ReportPage({ t, day, setDay, todayStart, crumbs, openSession, narrow }) {
      const url = `${REPORT_ROUTE}?day=${Number(day)}&tzOffset=${tzOffsetSeconds()}&locale=${encodeURIComponent(localeTag())}`
      const [state, refresh] = useRoute(url)
      const result = state.data
      const [draft, setDraft] = React.useState([])
      const [editingKey, setEditingKey] = React.useState(undefined)
      const [selected, setSelected] = React.useState(undefined)
      const [copied, setCopied] = React.useState(false)
      const [manual, setManual] = React.useState('')
      const [confirming, setConfirming] = React.useState({})
      /** Lines this page already confirmed, kept across re-renders. */
      const confirmedKeys = React.useRef(new Set())
      /**
       * The draft is this page's own copy of the Host's report: it is rebuilt only
       * when the day changes or the reader asks to restore it, never on every poll.
       * That keeps a just-confirmed or just-edited line from being overwritten by an
       * answer that was already in flight — the busiest way to lose a confirmation.
       */
      const buildForDay = React.useRef(undefined)
      React.useEffect(() => {
        if (result === undefined || buildForDay.current === day) return
        buildForDay.current = day
        const groups = cloneGroups(result.report?.groups)
        setDraft(groups)
        setSelected(REPORT_GROUPS.map((section) => groups[0]?.[section.key]?.[0]).find((item) => item !== undefined))
        setEditingKey(undefined)
        setConfirming({})
      }, [result, day])

      // Counts come from the draft, not the Host's pre-edit totals, so a confirmation
      // shows at once. The keys are the draft's own (`won`/`doing`/`blocked`/`confirm`).
      const countOf = (sectionKey) => draft.reduce((sum, group) => sum + (Array.isArray(group[sectionKey]) ? group[sectionKey].length : 0), 0)
      const totals = { won: countOf('won'), doing: countOf('doing'), blocked: countOf('blocked'), confirm: countOf('confirm') }
      const dayLabel = dateLabel(Number(day) + 12 * 3600_000, { month: 'long', day: 'numeric' })
      const updateItem = (groupIndex, sectionKey, index, patch) => {
        setDraft((previous) =>
          previous.map((group, gi) =>
            gi !== groupIndex ? group : { ...group, [sectionKey]: group[sectionKey].map((item, i) => (i === index ? { ...item, ...patch } : item)) },
          ),
        )
      }
      /**
       * One confirmation per line. A line is identified by its group, section and
       * position in the draft; a click already in flight is ignored and a confirmed
       * line never confirms twice.
       */
      const confirmTask = async (item, groupName, sectionKey, index) => {
        const key = `${groupName}\u0000${sectionKey}\u0000${index}`
        if (confirmedKeys.current.has(key) || confirming[key] === true) return
        const project = Array.isArray(result?.projects) ? result.projects.find((entry) => entry.card?.name === groupName) : undefined
        setConfirming((previous) => ({ ...previous, [key]: true }))
        try {
          await postRoute(TASKS_ROUTE, {
            action: 'add',
            task: { title: item.title, projectId: project?.card?.projectId ?? groupName, sessionId: item.sessionId, state: 'done' },
          })
          confirmedKeys.current.add(key)
          refresh()
          // Reflect the confirmation at once: the line moves to "done" with its confirmer.
          const confirmed = { ...item, status: 'done', attribution: 'direct', confirmation: { by: 'local-user', at: Date.now() }, source: 'local' }
          setDraft((previous) =>
            previous.map((group) => {
              if (group.name !== groupName) return group
              const next = {}
              for (const section of REPORT_GROUPS) {
                next[section.key] = (group[section.key] ?? []).filter((_, position) => !(section.key === sectionKey && position === index))
              }
              next.won = [...next.won, confirmed]
              return { name: group.name, ...next }
            }),
          )
          setSelected(confirmed)
        } catch {
          // The Host keeps its own state; the next read reconciles it.
        } finally {
          setConfirming((previous) => ({ ...previous, [key]: false }))
        }
      }
      const mountedRef = React.useRef(true)
      React.useEffect(() => () => { mountedRef.current = false }, [])
      const copy = async () => {
        const ok = await copyText(clientReportMarkdown(dayLabel, draft, t))
        if (!ok || !mountedRef.current) return
        setCopied(true)
        setTimeout(() => {
          if (mountedRef.current) setCopied(false)
        }, 2200)
      }
      const addManual = () => {
        const text = manual.trim()
        if (text === '') return
        setDraft((previous) => {
          const next = previous.length === 0 ? [{ name: t('page.all'), won: [], doing: [], blocked: [], confirm: [] }] : previous.map((group) => ({ ...group }))
          next[0].confirm = [...(next[0].confirm ?? []), { title: text, status: 'confirm', attribution: 'activity', edited: true, source: 'manual', evidence: [] }]
          return next
        })
        setManual('')
      }
      return h(
        React.Fragment,
        null,
        h(PageHeader, {
          t,
          crumbs,
          title: t('report.title'),
          subtitle: t('report.subtitle', { date: dayLabel, projects: t('page.all'), zone: utcOffsetLabel() }),
          actions: h(React.Fragment, null, h(DayPicker, { day, setDay, todayStart, t }), h('button', { type: 'button', className: 'dswb-primary dswb-p1-copy', onClick: copy }, h(Glyph, { name: copied ? 'check' : 'copy', size: 13 }), copied ? t('report.copied') : t('report.copy')), h(RefreshButton, { t, onClick: refresh, status: state.status })),
        }),
        state.status === 'loading' && result === undefined
          ? h(LoadingState, { t })
          : h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dswb-p1-status-row' },
                ...REPORT_GROUPS.map((section) => h(StatusPill, { key: section.key, tone: section.tone, label: `${t(section.heading)} ${String(totals[section.key] ?? 0)}` })),
              ),
              h(
                'div',
                { className: narrow === true ? 'dswb-p1-stack' : 'dswb-p1-grid' },
                h(
                  'section',
                  { className: 'dswb-big' },
                  h('div', { className: 'dswb-big-head' }, h('h2', { className: 'dswb-big-title' }, t('report.draft')), h('span', { className: 'dswb-spacer' }), h(StatusPill, { tone: 'info', label: t('report.editable') }), draft.length > 0 ? h('button', { type: 'button', className: 'dswb-mini', onClick: () => setDraft(cloneGroups(result?.report?.groups)) }, t('report.reset')) : null),
                  draft.length === 0
                    ? h(EmptyState, { text: t('report.empty'), t, onRetry: state.status === 'error' ? refresh : undefined })
                    : h(
                        'div',
                        { className: 'dswb-p1-report-groups' },
                        ...draft.map((group, gi) =>
                          h(
                            'div',
                            { key: `${group.name}-${gi}`, className: 'dswb-p1-report-group' },
                            h('h3', { className: 'dswb-p1-report-group-name' }, group.name),
                            ...REPORT_GROUPS.map((section) => {
                              const items = group[section.key] ?? []
                              if (items.length === 0) return null
                              return h(
                                'div',
                                { key: section.key, className: 'dswb-p1-report-section' },
                                h('h4', { className: 'dswb-p1-report-section-title' }, t(section.heading)),
                                h(
                                  'ul',
                                  { className: 'dswb-p1-report-list' },
                                  ...items.map((item, index) =>
                                    h(ReportItemRow, {
                                      key: `${section.key}-${index}`,
                                      item,
                                      group,
                                      section,
                                      t,
                                      selected: selected?.title === item.title,
                                      editing: editingKey === `${gi}:${section.key}:${index}`,
                                      setEditing: (value) => setEditingKey(value ? `${gi}:${section.key}:${index}` : undefined),
                                      saveEdit: (value) => {
                                        const text = String(value).trim()
                                        if (text !== '') updateItem(gi, section.key, index, { title: text, edited: true })
                                        setEditingKey(undefined)
                                      },
                                      onSelect: setSelected,
                                      onConfirm: confirmTask,
                                      index,
                                      pending: confirming[`${group.name}\u0000${section.key}\u0000${index}`] === true,
                                    }),
                                  ),
                                ),
                              )
                            }),
                          ),
                        ),
                      ),
                  h(
                    'div',
                    { className: 'dswb-p1-add' },
                    h('input', { className: 'dswb-p1-report-input', value: manual, placeholder: t('report.manual'), 'aria-label': t('report.addItem'), onChange: (event) => setManual(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') addManual() } }),
                    h('button', { type: 'button', className: 'dswb-mini', onClick: addManual }, t('report.addItem')),
                  ),
                ),
                narrow === true ? null : h(ReportEvidence, { item: selected, t, openSession, timeline: (Array.isArray(result?.projects) ? result.projects : []).flatMap((entry) => Array.isArray(entry.timeline) ? entry.timeline : []) }),
              ),
            ),
      )
    }


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

    /** Workbench mascot, inlined so the single client bundle carries it. */
    const MASCOT =
      'data:image/webp;base64,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'

    const CSS = [
      // --- page shell -------------------------------------------------------
      '.dswb-page{background-color:var(--dsw-alias-bg-base);--wb-grad:linear-gradient(135deg,#8ea7ff,#5eead4);--wb-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;width:100%;min-width:0;height:100%;min-height:0;position:relative;color:var(--dsw-alias-label-primary);background:radial-gradient(780px 460px at 8% -12%,color-mix(in srgb,#6f8cff 14%,transparent),transparent 68%),radial-gradient(620px 380px at 100% 110%,color-mix(in srgb,#2dd4bf 9%,transparent),transparent 72%),var(--dsw-alias-bg-base);font-size:14px;line-height:1.6;font-feature-settings:"tnum" 1;display:flex;flex-direction:column;overflow:hidden}',
      '.dswb-page:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent) 1px,transparent 1.2px);background-size:24px 24px;opacity:.2;-webkit-mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 55%,transparent 92%);mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.3) 55%,transparent 92%)}',
      '.dswb-mascot{position:absolute;top:40px;right:0;z-index:0;height:clamp(300px,42vh,440px);aspect-ratio:469/720;background-image:url("' + MASCOT + '");background-size:100% 100%;background-repeat:no-repeat;pointer-events:none;user-select:none;opacity:.4;-webkit-mask-image:linear-gradient(180deg,#000 64%,transparent 98%);mask-image:linear-gradient(180deg,#000 64%,transparent 98%)}',
      '@media (width<=720px){.dswb-mascot{opacity:.22;height:190px}}',
      '@media (width<=520px){.dswb-mascot{display:none}}',
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
      '.dswb-speed-window{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:18px;letter-spacing:.04em}',
      '.dswb-speed-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px}',
      '.dswb-speed-table th{padding:0 8px 6px 0;border-bottom:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:9.5px;font-weight:400;letter-spacing:.06em;text-align:left;text-transform:uppercase}',
      '.dswb-speed-table th:first-child{width:58%}',
      '.dswb-speed-table td{padding:7px 8px 7px 0;border-bottom:.5px solid var(--dsw-alias-border-l1);vertical-align:middle}',
      '.dswb-speed-table tr:last-child td{border-bottom:0}',
      '.dswb-speed-table th:last-child,.dswb-speed-table td:last-child{padding-right:0}',
      '.dswb-speed-model{overflow:hidden;color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-speed-num{text-align:right;font-family:var(--wb-mono);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.dswb-speed-table th.dswb-speed-num{text-align:right;letter-spacing:0}',
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
      '@media (width<=560px){.dswb-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.dswb-card-total{grid-column:1/-1}}',
      '@media (width<=540px){.dswb-head h1{font-size:26px;line-height:34px}.dswb-monogram{width:40px;height:40px;font-size:16px}.dswb-hero-value{font-size:30px;line-height:38px}}',
      // --- overview home: tokens, header, metrics ---------------------------
      '.dswb-home{--wb-ok:#08724c;--wb-warn:#92500a;--wb-err:#ac2b40;--wb-accent:#6241bf;--wb-accent-soft:#efeafe;--wb-ok-soft:color-mix(in srgb,#08724c 10%,transparent);--wb-warn-soft:color-mix(in srgb,#92500a 12%,transparent);--wb-err-soft:color-mix(in srgb,#ac2b40 10%,transparent)}',
      'body[data-ds-dark-theme] .dswb-home{--wb-ok:#5dd9a3;--wb-warn:#f0b66b;--wb-err:#ff8fa0;--wb-accent:#c4b0ff;--wb-accent-soft:#302448;--wb-ok-soft:color-mix(in srgb,#5dd9a3 14%,transparent);--wb-warn-soft:color-mix(in srgb,#f0b66b 16%,transparent);--wb-err-soft:color-mix(in srgb,#ff8fa0 14%,transparent)}',
      '.dswb-home .dswb-eyebrow{letter-spacing:.08em}',
      '.dswb-home-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 20px;padding-top:28px;margin-bottom:18px}',
      '[data-platform=darwin] .dswb-home-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
      '.dswb-home-title{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dswb-home-title h1{margin:0;font-size:28px;font-weight:600;line-height:36px;letter-spacing:-.02em}',
      '.dswb-home-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:19px}',
      '.dswb-home-side{display:flex;align-items:center;gap:10px;flex:none}',
      '.dswb-fresh{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:12px;color:var(--wb-ok);font-size:11.5px;line-height:22px;background:var(--wb-ok-soft)}',
      '.dswb-fresh[data-state=stale]{color:var(--wb-warn);background:var(--wb-warn-soft)}',
      '.dswb-fresh-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:dswb-breathe 2.4s ease-in-out infinite}',
      '.dswb-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:15px;border:.5px solid var(--dsw-alias-border-l3);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dswb-icon-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}',
      '.dswb-icon-btn:disabled{opacity:.5;cursor:default}',
      '.dswb-icon-btn:disabled svg{animation:dswb-spin 1s linear infinite}',
      '.dswb-icon-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}',
      '.dswb-kpi{display:flex;flex-direction:column;gap:2px;min-width:0;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}',
      'button.dswb-kpi{cursor:pointer;transition:border-color .15s,background .15s}',
      'button.dswb-kpi:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}',
      'button.dswb-kpi:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-kpi-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dswb-kpi-value{font-family:var(--wb-mono);font-size:24px;font-weight:600;line-height:32px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dswb-kpi-value[data-tone=muted]{color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:32px}',
      '.dswb-kpi-value[data-tone=alert]{color:var(--wb-err)}',
      '.dswb-kpi-detail{display:flex;flex-wrap:wrap;gap:0 4px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:17px}',
      '.dswb-kpi-detail em{color:var(--wb-warn);font-style:normal}',

      // --- home grid and sections -----------------------------------------
      '.dswb-home-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,1fr);gap:16px;align-items:start}',
      '.dswb-home-main,.dswb-home-aside{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.dswb-big{min-width:0;padding:16px 18px 14px;border-radius:10px;border:.5px solid color-mix(in srgb,var(var(--dsw-alias-label-primary)) 10%,transparent);background:var(--dsw-alias-bg-layer-1)}',
      '.dswb-big-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px}',
      '.dswb-big-title{margin:0;font-size:15px;font-weight:600;line-height:23px}',
      '.dswb-pill{display:inline-flex;align-items:center;min-width:20px;height:20px;padding:0 7px;border-radius:10px;background:color-mix(in srgb,var(var(--dsw-alias-label-tertiary)) 12%,transparent);color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px;font-variant-numeric:tabular-nums;justify-content:center}',
      '.dswb-pill[data-tone=warn]{background:var(--wb-warn-soft);color:var(--wb-warn)}',
      '.dswb-spacer{flex:1}',
      '.dswb-big-hint,.dswb-big-foot{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}',
      '.dswb-big-foot{margin:10px 0 0}',
      '.dswb-link{height:26px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(var(--dsw-alias-label-secondary));font:inherit;font-size:12px;cursor:pointer}',
      '.dswb-link:hover{color:var(--wb-accent)}',
      '.dswb-link:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-quiet{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',

      // --- state badge ------------------------------------------------------
      '.dswb-state{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:5px;font-size:11px;line-height:20px;white-space:nowrap}',
      '.dswb-state[data-tone=ok]{color:var(--wb-ok);background:var(--wb-ok-soft)}',
      '.dswb-state[data-tone=warn]{color:var(--wb-warn);background:var(--wb-warn-soft)}',
      '.dswb-state[data-tone=error]{color:var(--wb-err);background:var(--wb-err-soft)}',
      '.dswb-state[data-tone=muted],.dswb-state[data-tone=idle],.dswb-state[data-tone=unknown]{color:var(--dsw-alias-label-tertiary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}',

      // --- running rows -------------------------------------------------------
      '.dswb-runs-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12.5px}',
      '.dswb-runs-table th{padding:0 10px 6px;border-bottom:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:400;text-align:left}',
      '.dswb-runs-table th:nth-child(1){width:33%}.dswb-runs-table th:nth-child(2){width:15%}.dswb-runs-table th:nth-child(3){width:auto}.dswb-runs-table th:nth-child(4),.dswb-runs-table th:nth-child(5){width:84px}.dswb-runs-table th:nth-child(6){width:40px}',
      '.dswb-runs-table th.dswb-col-num,.dswb-runs-table td.dswb-col-num{text-align:right}',
      '.dswb-runs-table td{padding:10px;border-bottom:.5px solid var(--dsw-alias-border-l1);vertical-align:middle}',
      '.dswb-runs-table tr:last-child td{border-bottom:0}',
      '.dswb-run-row[data-tone=warn]{background:var(--wb-warn-soft)}',
      '.dswb-run-row[data-tone=error]{background:var(--wb-err-soft)}',
      '.dswb-run-link{display:flex;flex-direction:column;gap:1px;min-width:0;max-width:100%;padding:2px 0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:4px}',
      '.dswb-run-link:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-run-link-title{overflow:hidden;font-weight:500;font-size:13px;line-height:19px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-run-link-project{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-run-detail{display:block;overflow:hidden;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-run-elapsed-value{font-family:var(--wb-mono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.dswb-open{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '.dswb-open:hover{color:var(var(--dsw-alias-label-primary));background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}',
      '.dswb-open:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dswb-runs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.dswb-run{position:relative;display:flex;align-items:stretch;gap:6px;min-width:0;padding:2px 4px 2px 2px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);border-left-width:3px;background:var(--dsw-alias-bg-base)}',
      '.dswb-run[data-tone=warn]{border-left-color:var(--wb-warn);background:var(--wb-warn-soft)}',
      '.dswb-run[data-tone=error]{border-left-color:var(--wb-err);background:var(--wb-err-soft)}',
      '.dswb-run[data-tone=ok]{border-left-color:var(--wb-ok)}',
      '.dswb-run[data-tone=unknown]{border-left-color:var(--dsw-alias-label-tertiary);border-left-style:dashed}',
      '.dswb-run-main{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;padding:10px 8px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dswb-run-main:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}',
      '.dswb-run-main:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-run-topline{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.dswb-run-index{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;line-height:15px;opacity:.7}',
      '.dswb-run-title{font-size:13.5px;font-weight:600;line-height:20px;overflow-wrap:anywhere}',
      '.dswb-run-project{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;line-height:15px;overflow-wrap:anywhere}',
      '.dswb-run-metric{display:flex;align-items:flex-end;flex:none;padding:10px 6px 10px 0}',
      '.dswb-run-elapsed{display:inline-flex;flex-direction:column;align-items:flex-end;gap:1px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:15px;white-space:nowrap}',
      '.dswb-run-elapsed-label{font-size:10px}',
      '.dswb-run-elapsed-value{font-family:var(--wb-mono);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dswb-run .dswb-open{align-self:center}',

      // --- attention ---------------------------------------------------------
      '.dswb-alerts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}',
      '.dswb-alert{display:flex;align-items:flex-start;gap:8px;min-width:0;padding:9px 8px;border-radius:8px;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l1);color:var(--wb-err)}',
      '.dswb-alert[data-tone=warn]{color:var(--wb-warn)}',
      '.dswb-alert[data-ack=true]{opacity:.72}',
      '.dswb-alert-main{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}',
      '.dswb-alert-title{color:var(var(--dsw-alias-label-primary));font-size:12.5px;font-weight:600;line-height:18px;overflow-wrap:anywhere}',
      '.dswb-alert-reason{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dswb-alert-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
      '.dswb-alert-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}',
      '.dswb-mini{height:24px;padding:0 8px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;line-height:16px;cursor:pointer;white-space:nowrap}',
      '.dswb-mini:hover{border-color:var(--dsw-alias-label-tertiary);color:var(--dsw-alias-label-primary)}',
      '.dswb-mini:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dswb-mini-primary{border-color:color-mix(in srgb,var(--wb-accent) 55%,transparent);color:var(--wb-accent)}',

      // --- recent ------------------------------------------------------------
      '.dswb-recents{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}',
      '.dswb-recent-row{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 0;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-recent-row:last-child{border-bottom:0}',
      '.dswb-recent-main{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;padding:4px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dswb-recent-main:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}',
      '.dswb-recent-main:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-recent-title{overflow:hidden;font-size:12.5px;line-height:19px;text-overflow:ellipsis;white-space:nowrap}',
      '.dswb-recent-meta{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}',

      // --- offline / detail / tabs ------------------------------------------
      '.dswb-offline{margin-bottom:14px;padding:12px 14px;border-radius:10px;border:.5px solid color-mix(in srgb,var(--wb-warn) 45%,transparent);background:var(--wb-warn-soft)}',
      '.dswb-offline-head{display:flex;align-items:center;gap:8px}',
      '.dswb-offline-title{color:var(--wb-warn);font-size:13px;font-weight:600;line-height:20px}',
      '.dswb-offline-body{margin:4px 0 8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dswb-offline-btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;border:.5px solid color-mix(in srgb,var(--wb-accent) 55%,transparent);background:transparent;color:var(--wb-accent);font:inherit;font-size:12px;cursor:pointer}',
      '.dswb-offline-btn:disabled{opacity:.6;cursor:default}',
      '.dswb-offline-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-detailbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}',
      '.dswb-detailbar-title{margin:0;font-size:16px;font-weight:600;line-height:24px}',
      '.dswb-back{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}',
      '.dswb-back:hover{color:var(--dsw-alias-label-primary)}',
      '.dswb-back:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-evidence-head{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}',
      '.dswb-evidence-key{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px;overflow-wrap:anywhere}',
      '.dswb-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;margin:0 0 12px}',
      '.dswb-fact{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.dswb-fact dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
      '.dswb-fact dd{margin:0;font-family:var(--wb-mono);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dswb-primary{height:32px;padding:0 14px;border-radius:8px;border:.5px solid color-mix(in srgb,var(--wb-accent) 60%,transparent);background:var(--wb-accent-soft);color:var(--wb-accent);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dswb-primary:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-narrow{display:flex;flex-direction:column;gap:14px}',
      '.dswb-tabs{position:sticky;bottom:0;z-index:2;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:8px 12px calc(8px + env(safe-area-inset-bottom));border-top:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}',
      '.dswb-tab{position:relative;display:flex;align-items:center;justify-content:center;gap:4px;min-height:44px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}',
      '.dswb-tab[aria-current=page]{background:var(--wb-accent-soft);color:var(--wb-accent);font-weight:600}',
      '.dswb-tab:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-tab-badge{position:absolute;top:6px;right:18%;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--wb-err);color:#fff;font-size:9.5px;line-height:14px;font-style:normal;text-align:center}',
      '.dswb-home-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;margin-top:18px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}',
      '.dswb-home-foot-time{font-family:var(--wb-mono);font-variant-numeric:tabular-nums}',
      '.dswb-home-body{min-width:0}',

      // --- home responsive ---------------------------------------------------
      '@media (width<=1199px){.dswb-home-grid{grid-template-columns:minmax(0,1fr)}.dswb-home-aside{flex-direction:row;flex-wrap:wrap}.dswb-home-aside>*{flex:1 1 320px}}',
      '@media (width<=767px){.dswb-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dswb-home-aside{flex-direction:column}.dswb-home-head{padding-top:20px}.dswb-home-title h1{font-size:24px;line-height:32px}.dswb-content{padding-bottom:8px}}',
      '@media (width<=479px){.dswb-kpis{gap:8px}.dswb-kpi{padding:10px 12px}.dswb-kpi-value{font-size:20px;line-height:28px}.dswb-kpi-detail{font-size:11px}.dswb-mini{min-height:32px}.dswb-run-main{min-height:44px}.dswb-run-engine{gap:4px}.dswb-big{padding:12px 12px 10px}}',
      '@media (width<=359px){.dswb-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dswb-kpi{padding:8px 10px}.dswb-kpi-value{font-size:18px;line-height:26px}.dswb-content{padding-left:12px;padding-right:12px}}',
      '@media (prefers-reduced-motion:reduce){.dswb-spinner{animation:none}.dswb-eyebrow-dot,.dswb-dot,.dswb-log-dot,.dswb-head,.dswb-hero,.dswb-cards,.dswb-speed,.dswb-log,.dswb-panels,.dswb-refresh:disabled svg,.dswb-fresh-dot{animation:none}}',
      // --- P1: search, cost, projects and the evidence report -------------------
      '.dswb-search-open{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:15px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}',
      '.dswb-search-open:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.dswb-search-open:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-search-kbd{font-family:var(--wb-mono);font-size:10px;padding:1px 5px;border-radius:4px;border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}',
      '.dswb-search-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-start;justify-content:center;padding:9vh 16px 24px;background:var(--dsw-alias-bg-mask);backdrop-filter:blur(3px)}',
      '.dswb-search-dialog{width:min(720px,100%);max-height:82vh;display:flex;flex-direction:column;border-radius:14px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);box-shadow:0 24px 70px -18px rgba(20,15,45,.42);overflow:hidden}',
      '.dswb-search-input-row{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}',
      '.dswb-search-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:16px;line-height:24px}',
      '.dswb-search-input::placeholder{color:var(--dsw-alias-label-quaternary)}',
      '.dswb-search-ime{font-size:11px;color:var(--dsw-alias-brand-primary);white-space:nowrap}',
      '.dswb-search-esc{height:24px;padding:0 8px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-fill);color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:11px;cursor:pointer}',
      '.dswb-search-tools{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-search-toggle,.dswb-search-rebuild{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:6px}',
      '.dswb-search-toggle:hover,.dswb-search-rebuild:hover:not(:disabled){background:var(--dsw-alias-bg-fill);color:var(--dsw-alias-label-primary)}',
      '.dswb-search-rebuild:disabled{opacity:.6;cursor:default}',
      '.dswb-search-active{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
      '.dswb-search-filters{display:flex;flex-direction:column;gap:10px;padding:12px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}',
      '.dswb-search-group{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.dswb-search-group-label{width:44px;flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px}',
      '.dswb-search-chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.dswb-search-chip{height:26px;padding:0 10px;border-radius:13px;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}',
      '.dswb-search-chip[aria-pressed=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-text);font-weight:600}',
      '.dswb-search-chip:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-search-summary{display:flex;align-items:center;gap:8px;padding:9px 16px;color:var(--dsw-alias-label-secondary);font-size:12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-search-index{color:var(--dsw-alias-label-quaternary);font-size:11px;white-space:nowrap}',
      '.dswb-search-results{list-style:none;margin:0;padding:6px;overflow:auto;min-height:60px}',
      '.dswb-search-result{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:9px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dswb-search-result[data-selected=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent)}',
      '.dswb-search-result-glyph{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:8px;background:var(--dsw-alias-bg-fill);color:var(--dsw-alias-label-secondary)}',
      '.dswb-search-result-main{display:flex;flex-direction:column;min-width:0;flex:1}',
      '.dswb-search-result-title{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-search-result-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-search-result-time{font-family:var(--wb-mono);font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dswb-search-result-open{color:var(--dsw-alias-label-quaternary);flex:none}',
      '.dswb-search-none{padding:28px 12px;display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:13px}',
      '.dswb-search-more{padding:6px 16px 10px;display:flex;justify-content:center}',
      '.dswb-search-foot{padding:9px 16px;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-quaternary);font-size:11px}',
      '.dswb-p1-head{margin:0 0 16px}',
      '.dswb-p1-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);font-size:12px;margin-bottom:8px}',
      '.dswb-p1-crumb{border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer}',
      '.dswb-p1-crumb[aria-current=page]{color:var(--dsw-alias-brand-primary);font-weight:600}',
      '.dswb-p1-crumb-sep{margin:0 2px;color:var(--dsw-alias-label-quaternary)}',
      '.dswb-p1-title-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 18px}',
      '.dswb-p1-titles{min-width:0}',
      '.dswb-p1-title{margin:0;font-size:24px;font-weight:600;line-height:32px;letter-spacing:-.02em}',
      '.dswb-p1-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.dswb-p1-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.dswb-p1-day{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:9px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
      '.dswb-p1-day-btn{width:26px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:24px;cursor:pointer;border-radius:7px}',
      '.dswb-p1-day-btn:hover:not(:disabled){background:var(--dsw-alias-bg-fill)}',
      '.dswb-p1-day-btn:disabled{opacity:.35;cursor:default}',
      '.dswb-p1-day-label{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 8px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;border-radius:7px;white-space:nowrap}',
      '.dswb-p1-nav{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 14px;padding:3px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
      '.dswb-p1-nav-item{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dswb-p1-nav-item:hover{background:var(--dsw-alias-bg-fill);color:var(--dsw-alias-label-primary)}',
      '.dswb-p1-nav-item[aria-current=page]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);color:var(--dsw-alias-brand-text);font-weight:600;box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--dsw-alias-brand-primary) 32%,transparent)}',
      '.dswb-p1-nav-item:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-p1-nav-badge{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-error-primary)}',
      // Badges are tints over the card, never opaque blocks: an opaque `*-secondary`
      // token looked like a filled button and carried the wrong emphasis in dark mode.
      '.dswb-p1-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:11px;font-size:11px;line-height:18px;white-space:nowrap;border:.5px solid transparent;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-secondary)}',
      '.dswb-p1-pill[data-tone=ok]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 26%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.dswb-p1-pill[data-tone=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 28%,transparent);color:var(--dsw-alias-state-warning-primary)}',
      '.dswb-p1-pill[data-tone=error]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 26%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.dswb-p1-pill[data-tone=info]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent);color:var(--dsw-alias-brand-text)}',
      '.dswb-p1-pill[data-tone=idle]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-tertiary)}',
      '.dswb-p1-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,1fr);gap:12px;align-items:start}',
      '.dswb-p1-stack{display:flex;flex-direction:column;gap:12px}',
      '.dswb-p1-notes{padding:16px}',
      '.dswb-p1-notes .dswb-big-title{font-size:15px;margin:0 0 10px}',
      '.dswb-p1-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 16px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}',
      '.dswb-p1-loading{display:flex;align-items:center;gap:8px;padding:22px 4px;color:var(--dsw-alias-label-tertiary);font-size:13px}',
      '.dswb-p1-cost-total{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 12px;padding:6px 16px 16px}',
      '.dswb-p1-cost-value{font-family:var(--wb-mono);font-size:32px;font-weight:600;line-height:40px;letter-spacing:-.02em}',
      '.dswb-p1-cost-note{color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.dswb-p1-cost-foot{display:flex;align-items:center;gap:8px;margin:0;padding:10px 16px;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:11px}',
      '.dswb-p1-projects,.dswb-p1-sessions,.dswb-p1-requests,.dswb-p1-timeline,.dswb-p1-report-list{list-style:none;margin:0;padding:0}',
      '.dswb-p1-project,.dswb-p1-session,.dswb-p1-request,.dswb-p1-tl-main,.dswb-p1-report-main{display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;border:0;border-bottom:.5px solid var(--dsw-alias-border-l1);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dswb-p1-project{flex-direction:column;align-items:stretch;gap:7px}',
      '.dswb-p1-project:hover,.dswb-p1-session:hover,.dswb-p1-request:hover,.dswb-p1-tl-main:hover,.dswb-p1-report-main:hover{background:var(--dsw-alias-bg-fill)}',
      '.dswb-p1-project:focus-visible,.dswb-p1-session:focus-visible,.dswb-p1-request:focus-visible,.dswb-p1-tl-main:focus-visible,.dswb-p1-report-main:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dswb-p1-request[data-selected=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dswb-p1-project-top{display:flex;align-items:center;justify-content:space-between;gap:10px}',
      '.dswb-p1-project-name{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600}',
      '.dswb-p1-project-amount{font-family:var(--wb-mono);font-size:14px;font-weight:600}',
      '.dswb-p1-bar{display:block;height:5px;border-radius:3px;background:var(--dsw-alias-bg-fill);overflow:hidden}',
      '.dswb-p1-bar>span{display:block;height:100%;border-radius:3px;background:var(--dsw-alias-brand-primary)}',
      '.dswb-p1-project-meta{display:flex;align-items:center;color:var(--dsw-alias-label-tertiary);font-size:11px}',
      '.dswb-p1-session-glyph,.dswb-p1-tl-glyph{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:8px;background:var(--dsw-alias-bg-fill);color:var(--dsw-alias-label-secondary)}',
      '.dswb-p1-session-main,.dswb-p1-tl-body,.dswb-p1-report-main{display:flex;flex-direction:column;align-items:flex-start;min-width:0;flex:1;gap:2px}',
      '.dswb-p1-session-title,.dswb-p1-tl-label{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-p1-session-meta,.dswb-p1-tl-meta{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.dswb-p1-session-amount,.dswb-p1-request-amount{font-family:var(--wb-mono);font-size:13px;font-weight:600;white-space:nowrap}',
      '.dswb-p1-cost-grid{grid-template-columns:minmax(0,1.35fr) minmax(300px,1fr)}',
      '.dswb-p1-cost-main{display:flex;flex-direction:column;gap:12px;min-width:0}',
      '.dswb-p1-open{height:30px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-size:12px}',
      '.dswb-p1-request-id{font-family:var(--wb-mono);font-size:12.5px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dswb-p1-request-time,.dswb-p1-request-status{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dswb-p1-request-status[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.dswb-p1-request-status[data-tone=warn]{color:var(--dsw-alias-state-error-primary)}',
      '.dswb-p1-detail{padding:0;overflow:hidden}',
      '.dswb-p1-detail .dswb-big-head{padding:12px 16px}',
      '.dswb-p1-detail-value{padding:6px 16px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-p1-detail-amount{display:block;font-family:var(--wb-mono);font-size:30px;font-weight:600;line-height:38px;letter-spacing:-.02em}',
      '.dswb-p1-detail-meta{display:block;font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono)}',
      '.dswb-p1-detail-title{margin:0;padding:14px 16px 0;font-size:14px;font-weight:600;line-height:20px}',
      '.dswb-p1-facts{margin:0;padding:6px 16px 12px}',
      '.dswb-p1-fact{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:.5px solid var(--dsw-alias-border-l1);font-size:12.5px}',
      '.dswb-p1-fact dt{color:var(--dsw-alias-label-tertiary);flex:none}',
      '.dswb-p1-fact dd{margin:0;text-align:right;font-weight:600;overflow-wrap:anywhere}',
      '.dswb-p1-mono{font-family:var(--wb-mono);font-variant-numeric:tabular-nums}',
      '.dswb-p1-price-note,.dswb-p1-warn,.dswb-p1-detail-note{display:flex;align-items:flex-start;gap:6px;margin:0;padding:10px 16px;font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary);border-top:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-p1-warn{color:var(--dsw-alias-state-warning-primary);background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 10%,transparent)}',
      '.dswb-p1-detail .dswb-primary{margin:0 16px 14px;display:inline-flex;align-items:center;gap:6px}',
      '.dswb-p1-detail-actions{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px}',
      '.dswb-p1-proj-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
      '.dswb-p1-proj-card{display:flex;flex-direction:column;gap:8px;width:100%;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dswb-p1-proj-card:hover{border-color:var(--dsw-alias-brand-primary);box-shadow:0 6px 18px -12px rgba(98,65,191,.7)}',
      '.dswb-p1-proj-card:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-p1-proj-top{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.dswb-p1-proj-name{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600}',
      '.dswb-p1-proj-time{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dswb-p1-proj-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dswb-p1-proj-counts{display:flex;flex-wrap:wrap;gap:5px}',
      '.dswb-p1-proj-action{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}',
      '.dswb-p1-proj-git{font-size:10.5px;color:var(--dsw-alias-label-quaternary)}',
      '.dswb-p1-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
      '.dswb-p1-tl-row{display:flex;align-items:center;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-p1-tl-row[data-selected=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dswb-p1-tl-main{flex:1;border:0}',
      '.dswb-p1-tl-glyph[data-kind=commit]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-text)}',
      '.dswb-p1-tl-glyph[data-kind=test]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.dswb-p1-tl-files{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dswb-p1-status-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
      '.dswb-p1-report-group{border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-p1-report-group-name{margin:0;padding:12px 16px 4px;font-size:13px;font-weight:600}',
      '.dswb-p1-report-section-title{margin:0;padding:6px 16px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary)}',
      '.dswb-p1-report-row{display:flex;align-items:center;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dswb-p1-report-row[data-selected=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dswb-p1-report-main{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;flex:1;padding:10px 8px 10px 16px}',
      '.dswb-p1-report-title-btn{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;max-width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}',
      '.dswb-p1-report-title-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dswb-p1-report-item{min-width:0}',
      '.dswb-p1-report-title{font-size:13.5px;font-weight:600}',
      '.dswb-p1-report-meta{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.dswb-p1-report-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}',
      '.dswb-p1-report-actions{display:flex;flex-direction:column;gap:4px;padding:8px 12px;flex:none}',
      '.dswb-p1-report-input{min-width:0;width:100%;padding:5px 8px;border-radius:7px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}',
      '.dswb-p1-report-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:0}',
      '.dswb-p1-add{display:flex;align-items:center;gap:8px;padding:12px 16px}',
      '.dswb-p1-copy{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;font-size:12px;white-space:nowrap}',
      '.dswb-p1-narrow-menu{display:flex;flex-direction:column;margin-bottom:12px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);overflow:hidden}',
      '.dswb-p1-narrow-link{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border:0;border-bottom:.5px solid var(--dsw-alias-border-l1);background:transparent;color:inherit;font:inherit;font-size:13.5px;text-align:left;cursor:pointer;min-height:44px}',
      '.dswb-p1-narrow-link:last-child{border-bottom:0}',
      '@media (width<=1199px){.dswb-p1-grid,.dswb-p1-cost-grid{grid-template-columns:minmax(0,1fr)}}',
      '@media (width<=767px){.dswb-p1-title{font-size:21px;line-height:29px}.dswb-p1-nav{overflow:auto;flex-wrap:nowrap}.dswb-p1-nav-item{white-space:nowrap}.dswb-search-open-text{display:none}.dswb-p1-report-actions{flex-direction:row}.dswb-p1-cost-value{font-size:26px}}',
      '@media (width<=419px){.dswb-search-open{padding:0 8px}.dswb-search-kbd{display:none}.dswb-p1-fact{font-size:11.5px}.dswb-p1-proj-grid{grid-template-columns:minmax(0,1fr)}}',
      '.dswb-search-dialog[data-narrow=true]{position:fixed;inset:0;width:100%;max-height:none;border-radius:0;border:0}',
      '.dswb-search-overlay:has(.dswb-search-dialog[data-narrow=true]){padding:0;align-items:stretch}',
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

      const summarize = (sessionId) => {
        const workspace = ctx.get('uiWorkspace')
        if (workspace !== undefined && typeof workspace.openSession === 'function') {
          workspace.openSession(sessionId)
          return
        }
        // Fallback: the runtime's own selection API (used when the workspace service is absent).
        const sessions = ctx.get('sessions')
        if (sessions !== undefined && typeof sessions.open === 'function') sessions.open(sessionId)
      }

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ openSession: summarize }),
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
