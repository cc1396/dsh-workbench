# DSH 开发者工作台 · Workbench

一块常驻 DSH Web UI 的开发者工作台。用一屏回答三件事：**哪些 Session 要处理、钱花在哪、今天每个项目留下了什么可核验的证据**。

V2 按《DSH 开发者工作台插件需求文档 V0.9》实现 P0 + 主要 P1：

- **今日概览** —— 今日估算费用与计价覆盖率、运行中、待处理、生成速度 P50；
  码表只列出**每个模型的速率**；
  关注项优先于运行列表，运行列表优先于统计。宽屏双栏，窄窗 2×2 指标 + 任务卡 + 底部 Tab。
- **Session 六态** —— 等待用户 / 执行中 / 可能卡住 / 执行异常 / 已结束 / 已取消 / 状态未知，
  每行显示判定依据、最后动作、相对时间、本轮耗时与今日估算；断线保留最后快照并提供重连。
- **需要关注** —— 明确等待与终止失败（P0）、可能卡住与工具连续失败（P1），
  稳定键去重，确认 / 暂缓只影响本地关注项，处理仍在原 Session 内完成。
- **消耗归因** —— 项目 → Session → 请求三级钻取。请求行显示 provider、model、结算时间、
  Token 四分项、价目版本、估算金额与归属来源；缺价 / 缺用量显示「不可估算」并降低覆盖率，
  多币种分栏，估算与平台账务分别显示。
- **⌘/Ctrl+K 全局搜索** —— 本地元数据索引（标题、项目别名、模型、状态、日期、ID），
  中文包含匹配、英文大小写不敏感，输入法合成结束再提交，↑/↓ 选择、Enter 打开、Esc 返回并恢复焦点；
  多维筛选取交集、同维多选取并集，默认 10 条、分页 20 条，窄窗全高视图。
- **项目工作进展** —— 按项目聚合今日活动、任务状态计数与证据数；今日时间线可按
  会话 / 文件 / 提交 / 测试筛选，区分「直接关联」与「项目活动」。Git 只读采集按项目显式启用，
  只读 `git log` 的 SHA、主题、作者与相对路径，不读取 diff 内容。
- **开发日报** —— 按本地日期生成可编辑草稿，按已完成 / 进行中 / 阻塞 / 待确认分组；
  每条保留来源 ID、来源类型、时间与关联级别，可从草稿回到证据。人工新增或改写标为「人工编辑」，
  可显式确认任务完成，预览并复制 Markdown。单次提交或测试通过只作证据，不虚报成果。
- **双主题与响应式** —— 浅色 / 暗黑 / 跟随系统令牌；320 / 360 / 420 / 768 / 1200 / 1440px
  断点；主要触控目标 ≥44px，语义按钮与表头，Tab/Enter 可达，弹层管理初始焦点与返回焦点。

## 安装

**前置条件**：DSH Web 版（`^0.2.1-rc.5`）。

1. 打开 **插件 → 发现**，添加索引源 `https://cc1396.github.io/dsh-workbench/index.json`；
2. 找到「工作台 / Workbench」，点 **安装**；
3. 重载插件或重启 DSH，Host 侧路由才会生效；侧栏出现「工作台」。

本地开发时，`@local/dsh-workbench` 通过 pnpm `link:` 指向本仓库，改完 `client.js` 重载页面即可。

## 配置

配置项在 profile 的 [`cordis.patch.yml`](cordis.patch.yml)：

| 配置 | 说明 |
|---|---|
| `prices.default` / `prices.models` | 每百万 Token 单价（未缓存输入 / 缓存命中 / 缓存写 / 输出）。缺模型的 Session 显示「不可估算」并降低覆盖率。 |
| `prices.ref` | 价目版本标识，显示在请求详情里；改价后建议同时更新。 |
| `currency` | 本地估算的币种（默认 `CNY`）；金额是估算，不是平台账单。 |
| `rules.stuck` / `rules.toolFailures` | P1 推断规则，默认开；`costThreshold` / `costSpike` 默认关，需基线验证后开启。 |
| `maxScanSessions` / `scanBudgetMs` | 每次快照扫描的 Session 上限与时间预算，超出部分下次轮询继续。 |

Git 与测试证据默认关闭，在「项目工作进展 → 某项目 → 启用 Git 证据」按项目显式开启；
系统通知、正文全文索引未启用，索引只含结构化元数据，不保存对话原文、工具入参输出、
绝对路径、环境变量或代码片段。

## 数据与隐私

- 全部数据来自本地 Session 日志与 Host 投影，按 profile 隔离；所有金额都是本地估算。
- 关注项确认、本地任务与项目偏好保存在 `$DSH_HOME/workbench/`（只读/可手动删除）。
- 建议本地索引保留 90 天；删除源 Session 或撤销授权后，清理派生数据。
- 深链只使用宿主允许的 `uiWorkspace.openSession(id)`，URL 不含原文或凭据。

## 开发

```bash
node --test test/*.test.mjs                 # 40 个单测：状态、去重、计价、搜索、日报、路由、客户端回归
node qa/interact.mjs                        # 浏览器交互验证：确认、编辑、⌘K、焦点、320px 溢出
node qa/mocksnapshot.mjs > qa/scenarios/home.json
node qa/shot.mjs --snap home --out qa/out/home.png --width 1440 --theme light
node qa/shot-cdp.mjs --snap home --out qa/out/360.png --width 360 --theme light
node publish/prepare.mjs --name cc1396-dsh-workbench --version 2.0.0 --out dist
```

`qa/shot-cdp.mjs` 通过 CDP 覆盖设备尺寸，用于验证 headless Chrome 无法直接设置的 320/360px 断点。
发布流程见 [publish/README.md](publish/README.md)，源码：https://github.com/cc1396/dsh-workbench
