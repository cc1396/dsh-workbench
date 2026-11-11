# DSH 开发者工作台

一块常驻 DSH Web UI 的工作台面板，回答三个问题：**今天花了多少、哪些会话在跑、什么需要我处理。**

## 做什么

- **今日概览** —— 今日估算费用（人民币）与计价覆盖率、运行中的会话数、待处理事项数、生成速度。
- **运行中的 Session** —— 等待用户 / 执行中 / 可能卡住，按需要处理的优先级排序。
- **需要关注** —— 明确等待（审批、提问）与终止失败，可确认、暂缓或**关闭**；关闭表示该条后续不再提醒，只有之后出现新的失败或等待才会重新出现。
- **最近结束** —— 近 7 天结束的会话。
- **宿主能力** —— 面板底部列出宿主实际能提供的能力；缺哪一项就显示「不可用」，而不是静默显示 0。

## 结构

Host 与 Client 各按职责分层，每一层只回答一个问题，接口显式且有测试覆盖。

```
index.js           入口，转发到 src/
src/
  host.js          唯一接触 DSH 的地方（sessionQuery / sessionProjections / sessions / agents）
  facts.js         从投影推导会话事实，不重放日志
  pricing.js       价目表与金额，人民币，缺省行兜底
  ledger.js        按天拆分用量，契约明确且总和恒等于会话总量
  alerts.js        关注项规则、稳定键、去重与关闭
  snapshot.js      唯一的快照形状（schema 3），所有视图读同一份事实
  actions.js       唯一的写操作：确认 / 暂缓 / 关闭关注项
  store.js         本地 JSON 存储（原子写入）
client.js          模块加载器适配，转发到 client/
client/
  text.js          中英文字典（键完全一致）
  format.js        格式化，人民币，不做币种参数
  api.js           快照读取与 schema 校验
  hooks.js         快照轮询与本地缓存
  components.js    小部件：状态徽标、指标卡、列表行
  alerts.js        关注项的两个视图
  panel.js         面板装配
  styles.js        样式，跟随宿主双主题
```

### 三条显式契约

1. **快照版本**：`schema: 3`。两端不一致时客户端明确报错，而不是渲染空白。
2. **按天拆分**：每个 step 按自身事件时间归日；无法定位的用量归属到本次快照当天，**绝不丢弃**；总和恒等于会话总量。
3. **价目兜底**：未列出的模型使用 `prices.default`，覆盖率保持 100%，不会因为新模型让整日金额变 0。

## 安装

1. **插件 → 发现**，添加索引源 `https://cc1396.github.io/dsh-workbench/index.json`；
2. 安装「工作台」，重载插件或重启 DSH；侧栏出现「工作台」。

## 配置

见 [`cordis.patch.yml`](cordis.patch.yml)：扫描预算、最近结束条数、价目表（元 / 每百万 Token）与价目版本。
金额是本地估算，不是平台账单；请按实际定价修改 `prices.models`。

## 开发

```bash
node --test test/*.test.mjs     # Host 契约、纯函数、客户端契约
node qa/interact.mjs            # 浏览器交互：渲染、关闭、键盘、360px 布局
node qa/shot.mjs --snap v3 --out qa/out/panel.png --width 1440 --theme dark
node publish/prepare.mjs --name cc1396-dsh-workbench --version 3.0.0 --out dist
```

`qa/` 用本地静态服务器 + DevTools 协议驱动真实 `client.js`，不依赖 `file://`，可精确设置 320/360px 视口。

## 隐私

数据全部来自本地宿主，按 profile 隔离；关注项的确认/暂缓/关闭保存在 `$DSH_HOME/workbench/alerts.json`。
不保存对话原文、工具入参输出、绝对路径或代码片段。
