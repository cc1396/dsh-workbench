# 发布到 DSH 插件市场（Git 源，无需 npm）

## 机制

DSH 的「插件市场」由**索引 URL** 驱动：应用不内置任何索引源，用户添加索引源后，
**插件 → 发现** 才会拉取并展示条目。索引是一份静态 JSON（格式 1），可以由 GitHub Pages 托管。

条目的安装来源支持两种：`npm` 和 `git`。本仓库使用 **git**，因此不需要 npm 账号：

```
source: { type: "git", url: "https://github.com/cc1396/dsh-workbench", commit: "<40 位 SHA>", path: "dist" }
```

对应安装参数：

```
git+https://github.com/cc1396/dsh-workbench.git#<commit>&path:/dist
```

## 一、构建可安装目录

```bash
node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.0.0 --out dist
```

脚本会复制运行时文件、把包名同步写进 `package.json` / `cordis.patch.yml` / `client.js` 的模块 id，
并做语法检查。产物约 18 KB，只含：

```
README.md  client.js  cordis.patch.yml  icon.svg  index.js  locale/*.json  package.json
```

## 二、提交并记录 commit

```bash
git add dist && git commit -m "release: v1.0.0"
git rev-parse HEAD          # 这个 SHA 就是索引里的 commit
git push
```

索引要求 40 位小写 SHA，且该 commit 必须已经在远端（Pages/安装端会去拉这个 commit）。

## 三、更新索引

索引文件有两份，内容一致：

- `docs/index.json` —— GitHub Pages 实际对外提供的那份；
- `publish/index.example.json` —— 仓库里的模板。

把条目的版本段改成：

```jsonc
"versions": [
  {
    "version": "1.0.0",
    "publishTimestamp": 1793355271,          // Unix 秒，不是毫秒
    "source": {
      "type": "git",
      "url": "https://github.com/cc1396/dsh-workbench",
      "commit": "<上一步的 40 位 SHA>",
      "path": "dist"
    },
    "engines": { "dsh": "^0.2.1-rc.5" }
  }
]
```

`icon` 保持相对路径 `icon.svg`（与索引同目录），会自动解析为
`https://cc1396.github.io/dsh-workbench/icon.svg`。

提交并推送后，Pages 约 1 分钟刷新：

```
https://cc1396.github.io/dsh-workbench/index.json
```

## 四、用户安装

**插件 → 发现 → 添加索引源**，填入上面的索引地址；条目出现后点**安装**。

也可以写进 profile 配置（`plugin-market` 行的 `indexes` 数组），适合团队统一下发。

## 五、发新版本

1. `node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.1.0 --out dist`
2. 提交 `dist/`，拿到新 commit SHA；
3. 在索引的 `versions` 数组**追加**新条目（DSH 会按 SemVer 降序展示），`publishTimestamp` 用当前 Unix 秒；
4. 推送。

git 源的版本是 commit 固定的，所以「有新版本」提示不会自动出现——用户刷新「发现」后，
若索引里新增了更高版本，条目会显示新版本，但升级仍需先卸载再安装。

## 六、注意事项

- **安装目录里的包名必须与索引 `name` 一致**（`cc1396-dsh-workbench`）。仓库根目录是本地开发身份
  `@local/dsh-workbench`，所以 git 源必须用 `path: "dist"` 指向构建目录。
- 索引地址用 HTTPS，**不能重定向**，不能带凭据或 `#fragment`。
- 索引没有签名；用户安装前会看到信任提示，Host 代码以宿主权限运行。
- 不要与本机 `link:` 版共存：两者使用同一个 bundle patch 行 id（`dsh-workbench`），会冲突。

## 附：改用 npm（可选）

若以后想走 npm，仓库已保留 `publish/package.publish.json` 与 `prepare.mjs`：

```bash
node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.0.0 --out publish/dist
cd publish/dist && npm publish
```

然后把索引条目的 `source` 换成 `{ "type": "npm" }`。npm 的好处是市场能显示版本更新，
坏处是需要 npm 账号与 `NPM_TOKEN`。
