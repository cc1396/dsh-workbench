# DSH 工作台 · PRD V0.9 实施计划

> 依据：《DSH 开发者工作台插件需求文档 V0.9》+ UI-01～UI-08 设计稿
> 基线：`dsh-workbench` 1.3.1（`e97518d`），未提交的 client.js 实验改动已备份到 `.tmp-prd/` 并 `git stash`
> 更新：2026-11-06

## 0. 现状结论（读代码 + 读日志后）

| 层 | 现状 | 与 PRD 的差距 |
|---|---|---|
| Host 数据 | 只读 `sessionController.list()` 的 `running` 标记 + 自己重放 JSONL 事件 | 拿不到实时状态、审批/提问、投影数据；`running` 过时几十分钟也会被当成“执行中”；金额按 Session 总量记在今天，跨日/跨请求无法归因 |
| 状态模型 | 只有「进行中 / 已完成」两态 | 缺 等待用户 / 执行中 / 可能卡住 / 执行异常 / 已结束 / 取消 / 状态未知 六态及判定依据 |
| 需要关注 | 无 | P0 缺失：待处理入口、去重、确认/暂缓、与宿主事件对齐 |
| 归因 | Session 级粗略金额，CNY 硬编码 | 缺项目 → Session → 请求、覆盖率、“不可估算”、多币种、价目版本 |
| 界面 | 钱包带 / 码表 / 月历日报 / 任务两卡，单栏堆叠，320px 下挤压 | 缺首页信息层级（关注 > 运行 > 统计）、360px 卡式布局、双主题令牌、快捷键、断线快照视图 |

关键发现（已在本机真实 Session 日志上验证）：

- `~/.dsh/storages/session_projcache` 为每个 Session 缓存了完整投影：`tokenUsage`（未缓存输入/缓存读/缓存写/输出，互斥四桶）、`sessionStats`（轮/步、TTFT、decode、`pendingCalls`）、`turnOutline`、`modelSelection`、`approvalState`、`userQuestions`。Host 侧通过 `ctx.sessionProjections.snapshot(session)` 一次拿到，不必再自己扫日志算 Token。
- `session.v4.jsonl.zstd` 为分块追加；未 flush 时只能解出表头 —— 所以持久日志不能作为状态来源，实时状态必须读 live `ctx.sessions.get(id).events`。
- 当前 build 的事件目录里**不存在** `approval/asked|resolved`、`question/asked` 等宿主事件名；审批等待在客户端由 `SessionSummary.pendingInteraction`（`approval | plan-review | question`）承载 —— 需要在 Desktop 实机确认 Host 侧可得性，缺失时按 PRD 表 10 降级并显示能力缺口。

## 1. 已完成（Host 侧，工作区未提交）

新增两个纯函数模块，`index.js` 接上组装与新路由：

- `sessions.js`（514 行）—— F02 状态归一化 + F03 关注项规则
  - `projectSession(events, inherited, { running, updatedAt, now })`：按优先级判定 `waiting → stuck → running → unknown(failed/cancelled/ended)`，输出 `state / activity / sinceStart / lastAction / pending / lastEnd / turnTokens / speed / toolFailures` 与判定依据。
  - 关键规则：新轮清空上一轮临时状态；已闭合轮忽略迟到流帧；Agent 空闲时未解决请求仍显示等待用户；子任务只按自身终止定性。
  - 阈值常量集中：`IDLE_GRACE_MS=120s`、`STUCK_AFTER_MS=10min`、`BACKOFF_GRACE_MS=2min`、同工具 10 分钟内失败 3 次。
  - `alertsOf()` 产出带稳定键的关注项：`local|sessionId|type|triggerScope`（同一条审批重放 3 次 = 1 条）。
- `ledger.js`（415 行）—— F05 请求账本
  - 四桶计价 `priceOf()`，`splitCache()` 满足 A03 验收例（1000 输入、400 命中 → 600 未缓存 + 400 命中）。
  - `allotDays()` 按结算时间分日：最后一轮尾差归上一段交互，其余按“当日最后事件”归日，跨日 Session 用逐轮 Token 时间线对账，**日合计不超过 Session 自身合计**。
  - `buildLedger()` 输出今日金额/覆盖率/项目汇总/7 日趋势/待补 Token；缺价 → `unpriced` 降覆盖率、标“不可估算”。
- `index.js`
  - 扫描队列（并发 4、预算 `scanBudgetMs`）+ 对 Running 优先读取，一次投影喂给状态、关注项、账本、最近结束（口径只算一次）。
  - `GET /api/workbench/status` 返回 `overview / states / running / recent / alerts / ledger / capabilities / freshness`，旧字段（`account/usage/speed/worklog/tasks`）保留。
  - `POST /api/workbench/alerts`：`ack | snooze | solve`，按 `alertKey` 幂等，持久化到 `$DSH_HOME/workbench/alerts.json`。
  - 计价配置修正：原来的 `priceFor()` 永远取默认价，`prices.models` 实际不生效 —— 已改为按模型取价，缺价即“不可估算”。

冒烟结果（3 个构造 Session：审批等待 / 工具运行 / 失败结束）：状态、关注项（失败优先）、去重键都正确；同时发现两个待修 bug（`states.counts` 被对象键覆盖、`running` 卡片里 `state` 仍是嵌套对象）—— 已列入 §2 第 1 项。

## 2. 剩余工作

### 第 1 阶段 · P0 收尾（Host，约 0.5 天）

1. 修复冒烟暴露的问题：`stateSummary` 键覆盖、`publicSession` 中 `state`/`running` 展平、`recordAlert: true` 的首次发现持久化、`recent` 取最新轮结束时间而非 `updatedAt`。
2. 把 `pendingInteraction` 接入判定：Host 若能拿到 `SessionSummary.pendingInteraction`，则 `approval/plan-review/question` → 等待用户（强证据）；拿不到则在 `capabilities.alertsWait='degraded'`。
3. 主/子 Session：`origin==='subagent'` 不进入运行列表与关注项，只在父 Session 的详情里计数（PRD F02）。
4. 提供 `GET /api/workbench/summarize` 的旁路：日报草稿改用 `sessionStats/llmMs/toolMs`。

测试（`node --test`，与现有 7 个测试一起跑）：

- A01：等待、工具运行、失败重试、取消、结束依次回放，穿插迟到流帧 → 断言 6 态优先级与 `lastEnd`。
- A02：同一条审批事件重放 3 次 → 1 条；解决事件后同一次快照里徽标与列表同时消失。
- A03：1000 输入（400 命中）、失败重试、缺价、多币种、跨日 → 逐项对账“精确汇总 = 独立计算”。
- 卡住：长工具（10 分钟内仍有活动）、退避（`pendingCalls` 未返回且 < 2 分钟）不误报。

### 第 2 阶段 · P0 界面（约 1.5 天）

- 首页重排：页首（LOCAL / 日期 / 时区 / 同步时间 / 刷新）→ 指标（今日估算费用+覆盖率、运行中+等待数、待处理+失败·等待、生成速度 P50「样本不足」）→ 需要关注（失败 > 等待 > 推断）→ 运行中的 Session（按 等待 > 可能卡住 > 执行中，同组按最后活动倒序，ID 破平）→ 最近结束（7 天 20 条）。
- 卡片字段：标题、工作区、状态徽标（图标+颜色+文字）、最后动作+相对时间、当前轮耗时、今日估算；展开详情：Session ID、轮次、模型、Token、工具次数、判定依据、更新时间。
- 打开原 Session 一律走宿主 `uiWorkspace.openSession(id)`；失败时给“复制 ID + 宿主搜索”。
- 断线态（UI-08）：保留最后快照、时间、状态未知、“重新连接”，恢复后先补事件再开实时标识。
- 主题：浅/深/跟随系统，令牌按 PRD §07 表；容器断点 1200 / 768 / 420 / 320；360px 首屏可打开第一条任务；主要触控目标 44px；Tab/Enter、初始焦点与返回焦点、礼貌播报、`prefers-reduced-motion`。
- 局部失败：模块级错误只降级该模块；权限拒绝提示去宿主设置检查。

### 第 3 阶段 · P1（约 2 天）

- F07 搜索：⌘K 命令面板，索引标题/项目/模型/状态/日期/ID，中文包含匹配、英文不分大小写，输入法合成结束再提交，↑↓/Enter/Esc，默认 10 条、分页 20 条。
- F05 详情页：项目 → Session → 请求，保留日期/币种/返回位置；请求行显示 provider、model、结算时间、Token 分项、价目版本、金额、归属来源。
- F04 项目进展 + 证据日报：项目卡片、今日时间线、Git 只读采集（按项目显式开启）、草稿分组（已完成/进行中/阻塞/待确认）、“人工编辑”标记与证据引用、复制 Markdown。
- P1 推断规则：可能卡住、工具连续失败默认开；费用阈值/费用突增默认关，设置页可见；规则不可用时标明原因。

### 第 4 阶段 · 验收与发布（约 0.5 天）

- A04 宽度 320/360/420/768/1200/1440 × 双主题 × 键盘逐一走查。
- `node publish/prepare.mjs --name cc1396-dsh-workbench --version 2.0.0 --out dist`，更新 `docs/index.json` 版本与 commit。
- 更新 README（六态说明、计价配置、隐私与保留期）、`cordis.patch.yml`（新增 `currency`、`rules.*`、`stuckAfterMs`）。
- Git 提交分三个 commit：`feat(host): session states, attention items and request ledger`、`feat(client): workbench overview per PRD V0.9`、`docs: implementation notes`。

## 3. 风险与需要你确认的点

1. **审批事件可得性**：当前 build 的 Host 事件目录没有 `approval/asked`；“等待用户”的 P0 主路径依赖能否读到 `pendingInteraction`。若不可得，按 PRD 表 10 降级为“需在宿主侧补投影”。
2. **价目来源**：`prices.models` 配置是估算的唯一口径，缺模型的 Session 会拉低覆盖率；建议先确认你要对比的第一个可计价 provider。
3. **多币种**：`deepseekAccount` 余额可能是 CNY/USD，本地记录只有一种计价币种；分栏展示取决于你配置的 `currency`。
4. **P2 暂不做**：账务读取（F08 实际扣费）、精确定位历史事件锚点 —— 依赖宿主能力，按版本矩阵留空。
5. 目前工作区有未提交的 `index.js` 修改和两个新模块；确认方案后我按上面的阶段继续推进，每阶段跑测试并提交。
---

## 4. 本次交付（2026-11-06，V0.9 的 P0 + 主要 P1）

### Host 侧（新增 3 个纯函数模块 + 5 条路由）

| 模块 | 内容 |
|---|---|
| `sessions.js` | 六态归一化、轮次优先级、迟到流帧、子任务归属、P0/P1 关注项与稳定去重键（原有） |
| `ledger.js` | `allotByDay()` 无窗口精确分日、`buildRequestDetail()` 按 step 拆请求 + 会话补差 + 价目版本（新增） |
| `search.js` | `searchSessions()` 精确/前缀/包含/ID 排序与多维筛选、只读 `git log` 解析、仓库根探测（新增） |
| `progress.js` | 项目卡片、时间线、四类日报分组、`reportMarkdown()`（新增） |
| `store.js` | `$DSH_HOME/workbench/` 下的任务与项目偏好 JSON 原子存储（新增） |

新增路由：`GET/POST /api/workbench/search`（元数据检索）、`GET /api/workbench/requests`
（项目 → Session → 请求）、`GET/POST /api/workbench/tasks`（本地任务与人工确认）、
`GET/POST /api/workbench/report`（项目进展/证据日报，POST 仅用于按项目显式启用 Git 证据）。
状态快照新增 `search.rows`（仅元数据）与 `tasks_local`。

### Client 侧（`client.js`）

- `SearchPalette`：⌘/Ctrl+K、输入法合成、四维筛选、键盘导航与焦点恢复、分页、窄窗全高视图（UI-05）。
- `CostLanding` / `CostProjectPage` / `CostSessionPage` + `RequestDetail`：三级钻取与请求详情（UI-06）。
- `ProjectsPage` / `ProjectTimelinePage`：项目卡、时间线筛选、证据详情、Git 启用开关（F04）。
- `ReportPage`：可编辑草稿、人工编辑标记、证据引用、确认完成、复制 Markdown、日期切换（UI-07）。
- `PageNav` / `PageHeader` / `DayPicker` / 状态徽标；KPI 卡片改为跳转到对应页面。
- 修复 `.dswb-page` 缺少 `flex-direction:column` 导致窄窗 Tab 栏被挤到右侧列的问题。

### 验证

- `node --test test/*.test.mjs`：**36 个测试全通过**（含 A01/A02/A03/A05/A06、搜索排序、
  请求拆分、任务确认、日报证据与 Git 开关）。
- `qa/shot.mjs` + `qa/shot-cdp.mjs`：1440 / 1200 / 768 / 420 / 360 / 320px × 浅色/暗黑截图走查；
  CDP 覆盖设备尺寸以验证 headless Chrome 的 500px 最小窗口限制。
- `node publish/prepare.mjs --name cc1396-dsh-workbench --version 2.0.0 --out dist` 通过，
  `package.json` / `publish/package.publish.json` / `prepare.mjs` 已包含全部 Host 模块。

### 仍未做（按 PRD 版本矩阵留到 V1.2 / P2）

1. F08 账户账务读取（实际扣费、充值余额、赠送额度）——依赖 provider 授权与请求级账务关联。
2. F06 模型性能独立页（TTFT P50/P90、失败率、缓存命中率、工具等待），首页仅有速度 P50 摘要。
3. F03 费用阈值 / 费用突增规则与设置页；P1 规则阈值目前集中在 `sessions.js` 常量。
4. F07 正文全文索引与精确事件锚点；当前只打开 Session 根，索引仅元数据。
5. 系统通知、锁屏摘要、团队数据共享、自动修复与批量控制（另行立项）。
6. 实机宿主能力矩阵回放：目标桌面版本、`pendingInteraction` 可得性、价目快照来源仍需集成负责人锁定。

---

## 5. 自查修复（同日）

对第 4 节的交付做了一轮浏览器级自查，发现并修复：

1. **日报计数显示 `NaN`**：draft 的分组键是 `won/doing/blocked/confirm`，而计数用状态名 `done/active` 读取；已改为按分组键计数，并且计数取自 draft 本身（确认后立即变化）。
2. **确认完成不生效**：调试过程中一次重写把 `confirmedKeys` 的声明删掉，处理器抛 `ReferenceError` 却没有空 catch 暴露出来，
   点击既无效果也无提示。已恢复声明，并在 `test/client.test.mjs` 里加了「处理器引用的标识符必须在同一函数体内声明」的回归测试。
   同一条回归还禁止调试用全局标记、校验字典键齐全、禁止把 `<input>` 嵌进 `<button>`。
3. **行内控件嵌套**：日报行的输入框曾嵌在 `<button>` 里（HTML 非法）。现在行体是 `div`，标题是独立按钮，输入框与之并列。
4. **重复确认**：连续点击会写入多条 `done` 任务；现在按「分组 + 分区 + 位置」识别行，点击进行中忽略、已确认不再重复，并显示「确认中…」。
5. **草稿被轮询覆盖**：`useRoute` 的轮询与 `refresh()` 会让在确认前发出的读覆盖刚确认的草稿。现在 draft 只在**日期变化**或「恢复生成稿」时重建，
   确认与编辑直接落在这份本地副本上。
6. **窄窗布局**：`.dswb-page` 缺 `flex-direction: column`，360px 下底部 Tab 被挤成右侧竖列。

验证手段本身也修了两处，否则断言会失真：

- `qa/shot.mjs` 的 `--window-size` 在 headless Chrome 里最小 500px，新增 `qa/shot-cdp.mjs` 用 CDP 覆盖设备尺寸才真正测到 320/360px。
- 同一 `file://` 文件只改 hash **不会**重新加载，`qa/interact.mjs` 每次切换视图前先导航到 `about:blank`；否则断言会跑在上一页上。

最终状态：`node --test` **40/40**；`node qa/interact.mjs` **17/17**（确认落库与计数、编辑焦点与保存、⌘K 打开/筛选/方向键/Esc、320px 无横向溢出）。

---

## 6. 根因修复：面板全空（2026-11-09）

现象：所有面板（概览、消耗归因、项目、日报、关注）一个数据都没有，重启 DSH 后依旧。
诊断结论：**数据在磁盘上（7 个 Session 日志、50 份投影），但 Host 读不到它们**，快照本身是空的。

### 根因（三处叠加，都是"服务名凭证"问题）

1. **`inject` 声明了不存在的服务**。`inject: ['connection', 'sessionController']`，而本机 DSH
   （CLI `0.1.0-rc.6`）的真实服务是 `ctx.sessionQuery` / `ctx.sessions` / `ctx.agents` /
   `ctx.sessionProjections`，**没有任何包注册 `sessionController`**。这个服务名从 1.3.1 基线就存在，
   我一直照抄而没有向宿主核实——这是本次事故的根。现在 `inject` 只声明真实存在的 `connection`，
   其余服务在调用时按名解析，缺失即降级为空数据而不是挂载失败。

2. **读取用了错误的签名**。`sessionController.list({}, signal)` 是虚构的；真实契约是
   `sessionQuery.listSessions(signal)` → `[{ header:{id,cwd,createdAt}, live, persisted }]`，
   `readSession(id)` → `{ session, events }`。新增 `listSessions` / `readSessionEvents` 适配层，
   同时兼容 `sessions.list()` / `sessions.get()`。

3. **非 live 会话完全不可见**。`read()` 只读 `ctx.sessions.get()`，而 `ctx.sessions` 只持有**当前活着**的
   Session；所有已结束的、以及重启后的全部会话都不在里面 → 无事件、无投影 → 无法定性、无金额、无历史。
   现在 `read()` 在 live 缺失时回退到持久化日志（`readSession`），投影值缺失时回退到 fold 已读到的
   `total` 用量与模型路由。

### 顺带修复

- **运行中但日志未落盘的会话被判成 `ended`**。DSH 的 `session.v4.jsonl.zstd` 是分块追加，新会话在
  flush 前没有 committed 事件；`projectSession([])` 因此判成"已结束"。现在 live Agent 的存在优先于空日志，
  显示「执行中」（静默超过阈值仍进 `stuck`）。
- **`updatedAt` 为 0**：真实 `SessionHeader` 没有 `updatedAt`，退化为 0 会让所有会话按"远古时间"排序。
  改为回退 `createdAt`。
- **快照失败不再返回 500**：路由捕获异常后返回结构完整的空快照 + 原因，面板显示自己的空态而不是白屏。

### 验证

- `node --test` **42/42**，其中两条是本次根因的回归：
  「插件在没有 `sessionController` 的真实宿主上能挂载」、
  「catalog 只给 SessionHeader 时仍能产出状态/金额/历史」。
- 测试 harness 从虚构的 `sessionController` 换成真实的 `sessionQuery` + `agents` 契约。
- 用真实 Header 形状做端到端：`running: 2（执行中）/ recent: 1 / 计价覆盖 100% / 今日 ¥0.01`，
  并渲染成截图核对（`qa/scenarios/real.json`）。
- 健康会话（10 秒前有活动）判为「执行中」而非「可能卡住」；有已落盘用量的运行中会话能正确计价。

### 教训

之前所有验证都跑在**我自己造的假服务**上，所以三次自查都没碰到这条链。这次把假服务换成
真实文档契约，第一次运行就 40 条测试全红——那正是线上现象。

---

## 7. 金额与配色修正（2026-11-09，2.0.2）

截图反馈的四个问题，逐条定位并修复：

| 现象 | 根因 | 修复 |
|---|---|---|
| 所有金额 `¥0.00`、覆盖 0%、「不可估算」 | **`tokensOf()` 只认 `*Tokens` 后缀**，而调用方传的是已规范化的内部字段名（`uncachedInput`/`cacheReadInput`/`output`），二次规范化把它们全部清零 → 账本恒为空 | `tokensOf()` 同时接受两种命名（内部名放最后，避免 `outputTokens: 0` 遮住内部 `output`） |
| 同上（运行中/新会话也无法计价） | **`allotDays()` 在没有事件时丢弃全部 Token**；`session.v4.jsonl.zstd` 分块追加，新会话在 flush 前没有 committed 事件 → 当天无金额 | 无时间线时把投影里的 Token 归到请求的那一天，而不是丢掉 |
| 模型不在价目表 → 整行不可估算 | `priceFor()` 对未列出的模型返回 `undefined`，没有回退到 `prices.default`（PRD F05 规定默认价表兜底） | `priceFor()` 回退到 `defaultPrice`；机器上真实模型（`codearts/…`、`deepseek-flash`、`workbuddy-ai/…`）已补入价目表 |
| **按钮底色**：`计价覆盖 0%` 却是绿色实心 + ✓ | 徽标用不透明 `state-success-secondary` 底色，且覆盖率**不设阈值**一律按成功渲染 | 徽标改为 `color-mix` 半透明描边底；新增 `CoveragePill`：100% 才绿，<100% 琥珀警示，无样本灰色 |
| 金额显示 `$` / `USD` | 插件自带 patch 写了 `currency: USD`，live profile 条目没有 `config` 却吃到了该值 | 代码默认锁 `CNY`，`currencySymbol()`/`formatMoney()` 不再接受币种参数；界面文案统一「人民币／¥ · 元」；两份 `cordis.patch.yml` 都写死 `currency: CNY` |

新增回归：`tokensOf` 两种形状、`allotDays` 无事件、默认价表兜底、无 `$` 残留、覆盖率徽标阈值。
最终 `node --test` **45/45**，`qa/interact.mjs` 全通过；真实投影数据算出 **¥117.61 / 覆盖 100%**。

---

## 8. 码表精简（2026-11-11，2.0.3）

需求：**码表只需要记录每个模型的速率**。

`SpeedCard` 从「当前速度 + 周中位/P90/合计 + 输出/请求数 + 今日中位 + 最近请求列表」精简为
**两列表格：模型 / 速率**（P50，`samples` 为 0 时显示「暂无样本」）。同一改动清掉了随之失效的
11 个字典键 × 2 语言（22 条）与 22 条 CSS 规则，避免留下渲染不到的代码。
`node --test` **46/46**，新增一条回归断言码表只渲染 model/rate。

---

## 9. 关注项可取消（2026-11-11，2.0.4）

反馈：关注卡片上需要一个「取消」。原有按钮只有确认 / 暂缓 30 分钟 / 查看证据 / 打开原 Session。

- `POST /api/workbench/alerts` 早已接受 `action: 'solve'`，但 `alertStateOf()` 读的是 `solvedAt` 与
  `dismissedAt` 都没参与判定，等于**取消无效**。现在 `solve` 同时写 `solvedAt` 与 `dismissedAt`，
  且 `dismissedAt >= triggeredAt` 时直接判为 `solved`：取消是用户的决定，条件未变时不再回到列表。
- 只有出现**新状态**（新一轮失败、新的等待）或规则以新键重新触发时才再次出现。
- 客户端新增「取消」按钮，点击后立刻标记为 `solved`（本地徽标与列表同一视图更新），再落库。

回归：`dismissing an item clears it from pending for good, and a new failure reopens it`
（取消后下一轮轮询仍为 `solved`、pending 计数归零；出现新一轮失败时重新打开）。
浏览器实测：2 条关注 → 点「取消」→ 1 条、导航徽标变 1。`node --test` **48/48**。

---

## 10. 进入工作台的等待（2026-11-11，2.0.5）

反馈：每次进入工作台都要重新加载，等待很久。

先量了真实数据：本机 `~/.dsh/sessions` 有 **57 个日志、32.5 MB**，其中最大的一个 4.5 MB，
含 **3925 个 appended zstd 帧 / 8172 个事件** —— 单文件解码就要 **116 ms**。全量语料
（55 个 Session、46167 个事件）光解码就约 **1 秒**。

三处修正：

1. **同一份日志被解码两次**。`foldSession()` 和 `read()` 各自调用 `readSessionEvents()`；
   现在一次 cut 内用 `logOf()` 共享结果。
2. **fold 缓存只在内存里**，每次重启/重挂载都全量重扫 —— 这正是"每次都要等"的直接原因。
   新增 `$DSH_HOME/workbench/folds.json`（`store.js`）：按 Session 存 `updatedAt` + 折叠结果，
   `apply()` 时先 seed，`updatedAt` 未变就跳过解码；写入节流 10 秒、异步不阻塞响应。
   真实语料实测：冷启动 **194 ms → 热重启 126 ms**，金额/运行中/最近结束完全一致。
3. **首次渲染仍要等 Host 回包**。客户端把上一份快照写进 `sessionStorage`，再次进入时
   **先画缓存**（标记为缓存，不算离线），Host 的新快照到达后再无闪烁替换。
   实测：Host 故意慢 1.8 秒时，第二次进入 450 ms 就有完整数据（原来 2600 ms 才有）。
   新鲜度以浏览器写入时间为准，超过 10 分钟不再复用。

回归：`the fold cache survives a restart…`（热重启与冷启动结果一致）、
`a revisit paints the last snapshot…`。`node --test` **49/49**，浏览器交互全通过。

---

## 11. 今日估算费用为 0 的排查（2026-11-11，2.0.6）

先确认数据存在：今天的日志里有 **83 条带用量的 assistant 消息、241 万 Token**，
用真实投影跑同一条链路，金额应为 **¥12~13**。

修复与加固：

1. **`ledger.today` 读的是不存在的字段**。`buildLedger()` 返回的是 `sessions` / `amount`，
   而快照写了 `today: ledger.today` —— 恒为 `undefined`。改为显式组装当天摘要
   （金额、覆盖率、日键、会话数、Token 数）。
2. **零金额不再静默**。快照新增 `overview.today` 与 `capabilities.today`：
   `{ source: {projection|fold: n}, withTokens, activeToday, eventsRead, eventsEmpty, tokens }`。
   今日金额为 0 但有活动时，指标卡直接显示原因，例如
   「今日 2 个会话有活动但未计入费用 · 无用量来源 · 0 tok」，而不是干巴巴的 `¥0.00`。
   这样下一次能一眼判断是「用量来源缺失」还是「真的没有用量」。
3. 回归：`ledger.today is the day summary the cost page reads…`。

**说明**：本机 GUI 需 `dsh web` 打印的带令牌 URL 才能访问，我拿不到你的真实响应，
因此这一版的重点是**把不可见的原因变可见**。请在重启后看指标卡的副标题：
- 若显示「无用量来源」→ 投影与日志都没给出 Token（我会改读投影行）；
- 若显示具体来源与 tok 数但仍 ¥0.00 → 价目表未生效（我会改为内置默认价表兜底）。

`node --test` **51/51**，浏览器交互全通过。

---

## 12. 结构性重构（2026-11-11，3.0.0）

七个修复提交都指向同一个结构问题：**数据流靠层层兜底堆叠、宿主接口靠猜、两端字段靠约定**。
按此重建，**代码量 10098 → 2403 行（-76%）**，功能范围按确认收窄为「概览 + 需要关注」。

### 分层

| 层 | 职责 | 关键约束 |
|---|---|---|
| `src/host.js` | 唯一接触 DSH 的文件 | 只用文档化服务：`sessionQuery.listSessions(signal)` / `readSession(id)` / `sessionProjections.snapshot(session)` / `sessions` / `agents`；缺服务即降级，不抛错，不 `inject` |
| `src/facts.js` | 从投影推导会话事实 | 不重放日志；Token 四种命名一处归一；失败态取自 `turn/end`（投影没有该字段） |
| `src/pricing.js` | 价目与金额 | 人民币唯一；`prices.default` 兜底；不再接受币种参数 |
| `src/ledger.js` | 按天拆分 | 三条显式规则：step 按自身时间归日 / 无法定位的用量归本次快照当天 / 总和恒等于会话总量 |
| `src/alerts.js` | 关注项 | 稳定键去重；取消（dismiss）优先于条件 |
| `src/snapshot.js` | 唯一快照形状 | `schema: 3`；所有视图读同一份事实 |
| `src/actions.js` | 唯一写操作 | 确认 / 暂缓 / 取消 |
| `client/*` | 浏览器端 9 个模块 | 字典键一致、金额只渲染人民币、schema 不匹配明确报错、缓存首屏不算断线 |

### 这次修掉的真实缺陷

1. **失败态永远不出现**：`closedState()` 依赖 `sessionStats.lastTurnFailed`，而投影里没有该字段 → 所有失败会话都显示「已结束」。改为从日志的 `turn/end` 推导，并区分取消（用户行为）与失败。
2. **无活动会话从界面消失**：既不运行又无结束时间的会话不在任何列表里。现在按最后活动时间进入「最近结束」。
3. **未列模型不进账**：`priceFor` 不回退默认价表 → 新模型让整日金额为 0 且覆盖率 0。现在回退且覆盖率保持 100%。
4. **无事件会话金额为 0**：日志未落盘时丢弃全部 Token。现在归属到快照当天。
5. **旧测试是假的**：整套测试跑在虚构的 `sessionController` 上，所以一直绿灯。新 fixture 只提供文档化服务，第一条用例即断言「没有 sessionController 也能挂载」。

### 验证

- `node --test` **27/27**（11 条宿主契约、9 条纯函数、7 条两端契约）
- `node qa/interact.mjs` **11/11**（渲染、取消、键盘可达、360px 单列且无横向滚动、无页面异常）
- 真实语料（55 个 Session、4.6 万事件）：**今日 ¥65.62、覆盖 100%、1 条失败告警、耗时 30 ms**
- QA harness 重写为本地静态服务器 + CDP：不再受 `file://` 相对导入与 500px 窗口下限的限制

### 收窄的范围（按确认移除）

搜索、消耗归因、项目进展、证据日报四个 P1 页面及其路由一并移除（`/search`、`/requests`、`/report`、`/tasks`）。
宿主侧代码仍在 git 历史中（`2.0.6`），需要时可在新分层上重新实现，而不是恢复旧的耦合实现。
