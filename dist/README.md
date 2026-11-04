# DSH Workbench

A global Workbench panel for the DSH Web UI. It adds a **工作台 / Workbench** entry to the
left sidebar that opens a page with:

- **问候与任务摘要** — a time-of-day greeting (with the signed-in account name when
  available) and one sentence with the running and completed counts.
- **账户余额与已用占比** — a compact wallet strip: the current DeepSeek wallet balance,
  the recharge/bonus split, a slim used-share bar (`spend ÷ (balance + spend)`), and a
  dense facts row with the estimated cumulative spend, combined base, token count,
  cache-hit rate, runway estimated from the previous 6-day average, and effective price
  per million tokens. Signed-out and unavailable states replace the balance with a muted
  placeholder while the spend figures stay visible.
- **今日消耗 / 今日 Token / 任务总数** — metric cards; the spend card compares today
  with the previous 6-day average, and the task card carries a running / completed
  legend. Tokens are folded from every Session log and the amounts estimated from a
  configurable price table.
- **码数** — a current readout for the latest completed request, plus a throughput table over the last 7 days: median, aggregate and P90 decode speed
  (from `step/start → assistant/message` timing), output tokens and request counts, a
  per-model breakdown, and the latest requests with duration and tok/s. Samples below
  1 tok/s are dropped so retries and idle timeouts do not drag the numbers down.
- **工作记录** — a month calendar over the last 31 days with month arrows; each day
  shows its workspace projects and the first generated item, and the selected day
  opens below the grid. The panel shows only project names and generated
  work items; intents, commands, files and counts are never rendered. **Generate
  today's report** sends the day's per-project material (goals, actions, outcomes) to
  the configured model once per project and renders 2-4 concrete work items per
  project. Today's report is generated automatically when the panel opens; a stored
  summary answers instantly without a model call. Results persist in
  `$DSH_HOME/workbench/summaries.json` (40 days, atomic writes) and can be copied as a
  Markdown report. **Regenerate** bypasses both the memory and the disk cache. The
  report follows the DSH interface language: a Chinese interface asks for Chinese
  items, an English interface for English items. Nothing is summarized during polling.
- **仪表视觉** — the panel uses a deliberately instrument-like language: monospace
  readouts, micro-labels (`WALLET`, `THROUGHPUT`, `RUNNING`), numbered metric cards, a
  gradient accent and flat task rows with a status rail, rather than a generic card grid.
- **进行中的任务 / 最近完成的任务** — two side-by-side card panels. Each Session is a
  task card with its folder, status, relative time, estimated cost, token count and tool
  calls; a running card also shows its latest tool action ("Reading `client.js` · 1 min
  ago") and a spinner. When today's report exists, each card also carries the first
  generated work item for its own workspace. Every card opens its Session; a panel
  without rows shows an illustrated empty state.

## How it is built

| Half | File | Responsibility |
| --- | --- | --- |
| Host | `index.js` | `GET /api/workbench/status` on the shared `/api` Fetch channel folds Session-log usage (totals, 7 daily buckets, per-step throughput, per-task tools and latest action, per-day project records) and reads the optional DeepSeek wallet. An on-demand `POST /api/workbench/summarize` calls `ctx.llm.stream` once per project for one day's work items, cached by day + material hash. |
| Client | `client.js` | Registers the `workbench` main panel and its `sidebar.panellist` entry, registers the `dsh.workbench` dictionaries, and renders the snapshot. |

The Client polls every 15 s (4 s after a failure) and re-reads when the page becomes
visible. The Host caches each Session fold by `SessionSummary.updatedAt`, caches the wallet
for a minute, and bounds the log scan (`maxScanSessions`, `scanBudgetMs`) so a large corpus
never stalls a request; unfinished work is reported as pending and continued by the next
poll. Forked Sessions skip their inherited event prefix so shared history is counted once.
Generating one report makes one `ctx.llm.stream` call per project with the configured model;
the 15 s poll never calls the model. Results are cached in Host memory by day + material
hash. Only the latest tool call of a Session is parsed into an action label, so a long
log costs the same as a short one. Throughput pairs each assistant message with its step start and
keeps only the last 7 days of samples; merging drops samples outside the current window,
so nothing is double-counted. A finished Session is folded once; across midnight its
cached day buckets are shifted into the new 7-day window instead of being folded again.

## Configuration

The bundle patch (`cordis.patch.yml`) is the user-owned layer; edit it in the profile to
tune the panel. Values are optional and defensive defaults apply.

```yaml
- insert:
    - id: dsh-workbench
      name: '@local/dsh-workbench'
      config:
        maxRunningTasks: 8      # rows in the running list
        maxRecentTasks: 8       # rows in the recent list
        maxScanSessions: 60     # Session logs folded per request
        scanBudgetMs: 4000      # time budget for one request
        balanceTtlMs: 60000     # Platform wallet cache
        prices:
          default: { input: 2, output: 8, cacheRead: 0.5 }
          models:
            deepseek-chat: { input: 2, output: 8, cacheRead: 0.5 }
            deepseek-reasoner: { input: 4, output: 16, cacheRead: 1 }
```

Prices are CNY per 1,000,000 tokens. Session logs keep cache-miss input, cache-hit input
and output apart, so the estimate prices them as `input`, `cacheRead` and `output`; the
token count shown is their sum. Amounts are local estimates derived from the Session logs,
not Platform billing records; the balance itself comes from the DeepSeek account. The
7-day comparison uses the same estimate on both sides, so its ratio stays meaningful even
when the price table is only approximate.

## Publishing

The bundle ships through a **Git market source** — no npm account is involved:

```bash
node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.0.0 --out dist
```

1. commit `dist/` (the ready-to-install package, ~18 KB);
2. point the market index at that commit — `source: { type: "git", url, commit, path: "dist" }`;
3. push: GitHub Pages serves the index at
   `https://cc1396.github.io/dsh-workbench/index.json`.

Consumers add that URL under **Plugins → Discover**; the install fetches
`git+https://github.com/cc1396/dsh-workbench.git#<commit>&path:/dist`.

Every release repeats the loop with a new commit. The full walkthrough, the index schema,
and the optional npm path live in [publish/README.md](publish/README.md).
