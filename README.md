# DSH Workbench

A global Workbench panel for the DSH Web UI. It adds a **工作台 / Workbench** entry to the
left sidebar that opens a page with:

- **问候与任务摘要** — a time-of-day greeting (with the signed-in account name when
  available) and one sentence with the running and completed counts.
- **账户余额与已用占比** — one hero card: the current DeepSeek wallet balance, the
  estimated cumulative spend, and a donut showing the used share
  (`spend ÷ (balance + spend)`), with the recharge/bonus split, the combined base and
  the cumulative token count. Signed-out and unavailable states replace the ring with a
  muted placeholder while the spend figures stay visible.
- **今日消耗 / 今日 Token / 任务总数** — metric cards; the task card carries a running /
  completed legend and a dashed ring. Tokens are folded from every Session log and the
  amounts estimated from a configurable price table.
- **进行中的任务 / 最近完成的任务** — two side-by-side card panels. Each Session is a
  task card with its folder, status and relative time; running cards carry a spinner
  and every card opens its Session. A panel without rows shows an illustrated empty state.

## How it is built

| Half | File | Responsibility |
| --- | --- | --- |
| Host | `index.js` | One authenticated read-only route, `GET /api/workbench/status`, riding the shared `/api` Fetch channel. Folds Session-log usage with a per-Session cache, reads the optional DeepSeek account wallet, and returns the snapshot. |
| Client | `client.js` | Registers the `workbench` main panel and its `sidebar.panellist` entry, registers the `dsh.workbench` dictionaries, and renders the snapshot. |

The Client polls every 15 s (4 s after a failure) and re-reads when the page becomes
visible. The Host caches each Session fold by `SessionSummary.updatedAt`, caches the wallet
for a minute, and bounds the log scan (`maxScanSessions`, `scanBudgetMs`) so a large corpus
never stalls a request; unfinished work is reported as pending and continued by the next
poll. Forked Sessions skip their inherited event prefix so shared history is counted once.

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
not Platform billing records; the balance itself comes from the DeepSeek account.

## Publishing

This package is installed locally as a `link:` bundle. To distribute it, build a publishable
copy under a name you own, push it to npm (or a Git tag), and list it in a market index:

```bash
node publish/prepare.mjs --name cc1396-dsh-workbench --version 1.0.0
cd publish/dist && npm publish
```

Then host a format-1 index next to an `icon.svg` and add its URL under **Plugins → Discover**.
The full walkthrough, index schema, and caveats live in [publish/README.md](publish/README.md).
