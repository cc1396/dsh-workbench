# Visual QA

Render the real `client.js` in headless Chrome against a fixture snapshot, without
starting the DSH Host. The page shims `window.__ModuleLoader__`, `ctx.locale`,
`ctx.slots` and the `/api/workbench/*` routes.

```bash
/Users/apple/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node qa/mocksnapshot.mjs > qa/scenarios/home.json
node qa/shot.mjs --snap home --out qa/out/home.png --width 1440 --theme light \
  --path '{"detail":{"kind":"overview"}}'
```

`--path` is a URL-encoded JSON object that becomes `window.__dswbHome`; use it to
pin a page (`"detail":{"kind":"cost"|"costProject"|"costSession"|"projects"|"projectTimeline"|"report"}`),
the narrow tab, or `"search":true` for the command palette.

`qa/shot-cdp.mjs` takes the same flags but overrides the device metrics through the
DevTools protocol, which is required for the 320/360px breakpoints (headless Chrome
clamps `--window-size` to 500px).

The two files under `vendor/` are the production UMD builds of React and ReactDOM,
copied from `~/.dsh/profiles/node_modules/{react,react-dom}/umd/`. No network access
is needed at render time.
