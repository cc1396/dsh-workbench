# 发布到 DSH 插件市场

## 先弄清机制（很重要）

DSH 的「插件市场」是**索引驱动**的，不是内置商店：

- 应用本身**不打包任何官方索引源**，也不会主动请求市场；只有当用户添加了索引源 URL 后，**插件 → 发现** 才会展示内容。
- 索引源是一个静态 JSON 文档（格式 1），由你（或任何第三方）托管在 HTTPS 上。
- 「官方 / Official」分组是**随 DSH 安装一起提供的组合包**，不是公开提交入口；本版本没有任何官方的第三方收录接口。
- 所以“发布”的完整链路是：**npm 包（或 git 仓库） → 索引 JSON → 托管索引 → 用户添加索引 URL → 安装**。

> 本插件当前是本机 `link:` 安装的 `@local/dsh-workbench`，它只能在你的 profile 里用。要给别人安装，必须换成你能控制的 npm 包名（或 git 地址）。

## 一、准备发布副本

选一个你拥有的 npm 包名（如 `cc1396-dsh-workbench`；**不要**用 `@deepseek-ai/*`，那是官方 scope，你无法发布）：

```bash
node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.0.0 --out publish/dist
```

脚本会：

- 复制运行时文件（`index.js`、`client.js`、`cordis.patch.yml`、`locale/`、`icon.svg`、`README.md`）；
- 用 `publish/package.publish.json` 生成 `package.json`（去掉 `private`，加上 `license`/`repository`/`engines.dsh` 等）；
- 把**包名**同步改写进三处：manifest、`cordis.patch.yml` 的 `name`、`client.js` 里 `__ModuleLoader__` 的 `id`；
- 对两个 JS 文件跑 `node --check`。

## 二、发布到 npm

```bash
cd publish/dist
npm login            # 首次
npm publish            # 名字未加 scope，默认就是 public
```

包本身没有运行时依赖，体积约 18 KB。发布前建议 `npm pack --dry-run` 确认 `files` 清单
（应恰好是 `README.md`、`client.js`、`cordis.patch.yml`、`icon.svg`、`index.js`、`locale/*.json`、`package.json`）。

> 本机 `~/.npm` 缓存里有 root 所有的文件时，`npm publish` 会以 `EPERM` 失败：
> `sudo chown -R $(id -u):$(id -g) ~/.npm`，或临时 `npm publish --cache /tmp/npm-cache`。

如果只想像 git 分发，可以跳过 npm，直接把仓库地址和提交 SHA 写进索引（见下）。

## 三、生成索引 JSON

复制 `publish/index.example.json`，改这几处：

| 字段 | 说明 |
|---|---|
| `plugins[].name` | 必须与 npm 包名完全一致 |
| `plugins[].title` / `description` | 字符串或 `{ "en": "...", "zh": "..." }`，**必须含 `en`** |
| `plugins[].icon` | 相对索引 URL 的路径（同目录放 `icon.svg`），或 HTTPS URL，或 ≤32 KiB 的 `data:` URL |
| `versions[].version` | 精确 SemVer，不能是范围 |
| `versions[].publishTimestamp` | Unix **秒**（不是毫秒） |
| `versions[].engines.dsh` | DSH 兼容范围，例如 `^0.2.1-rc.5`（当前运行时版本） |
| `plugins[].metadata.category` / `labels` | 只能引用顶层 `metadata.categories` / `labels` 里声明过的 id |

来源二选一：

```jsonc
// npm
"source": { "type": "npm" }
// 私有 registry（安装时会先问它）
"source": { "type": "npm", "registry": "https://npm.example.com/" }

// git：commit 必须是 40 位小写 SHA；path 是包所在目录（可选）
"source": {
  "type": "git",
  "url": "https://github.com/cc1396/dsh-workbench",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "path": "packages/workbench"
}
```

`index.example.json` 已用 DSH 自带的 `parseMarketIndex`（`@deepseek-ai/dsh-plugin-market-index`）校验通过，
相对 `icon` 也会按索引 URL 正确解析。

改完索引后不必自己找校验器：DSH 在添加/读取索引源时会按同一套规则校验，并在「索引源」对话框里
给出出错值的 JSON 路径（如 `$.plugins[0].versions[0].version`）。

## 四、托管索引并让用户添加

- 本仓库已带 `docs/index.json` + `docs/icon.svg`：在仓库 Settings → Pages 里选择 **Deploy from a branch → main / “/docs”**，索引地址即 `https://cc1396.github.io/dsh-workbench/index.json`。
- 索引地址用 **HTTPS** 最稳妥（本地自测可用 `http://127.0.0.1:8000/index.json`；HTTPS 页面加载 http 索引会被混合内容拦截）；**不能有重定向**，不能带凭据或 `#fragment`（query 允许，但没必要）。
- 常见托管：GitHub Pages、`raw.githubusercontent.com`、任意静态站点/CDN。
- 用户端：**插件 → 发现 → 添加索引源**，粘贴索引 URL；随后条目出现，点**安装**。
- 也可以写进 profile 配置（`plugin-market` 行的 `indexes: ["https://…/index.json"]`），适合团队统一下发。

## 五、版本更新

1. 改版本号并重新发布：`npm version patch`（或直接改）后 `npm publish`；
2. 在索引的 `versions` 数组里**追加**新版本（DSH 会自行按 SemVer 降序排列）；
3. 用户刷新「发现」会看到**有新版本**；DSH 不支持原地升级，需要先卸载再安装。

## 六、限制与注意事项

- **兼容性**：市场只认索引里的 `engines.dsh` 和包声明的 DSH peer 依赖；不匹配时显示“不兼容”。版本豁免可以强行安装，但风险自负。
- **索引无签名**：索引内容只是市场声明，真正安装什么由包自己的 manifest 决定；用户安装前会看到信任提示。
- **Host 代码以宿主权限运行**：这是插件的固有风险，发布页应如实说明权限与网络行为。
- **不要与本机 link 版共存**：发布的包与 `@local/dsh-workbench` 使用同一个 bundle patch 行 id（`dsh-workbench`）。自测发布版之前，先在插件页卸载/禁用本机 link 版，避免两行冲突。
- **官方收录**：本版本没有公开的官方目录提交入口；若要进入 DeepSeek 随附目录，需要走 DeepSeek 的发布流程（以官方文档为准），Harness 内没有对应操作。

## 目录内容

| 文件 | 用途 |
|---|---|
| `prepare.mjs` | 生成发布副本并同步三处包名 |
| `package.publish.json` | 发布用 manifest 模板（占位名 `cc1396-dsh-workbench`） |
| `index.example.json` | 格式 1 的市场索引示例（已通过官方校验器） |