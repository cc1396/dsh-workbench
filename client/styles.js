/**
 * The panel's stylesheet.
 *
 * Colour comes from the Host's alias tokens, so the panel follows both themes without
 * a second palette. Badges use translucent tints over the surface rather than opaque
 * state fills, which is what made a "0% coverage" badge look like a solid button.
 */
export const CSS = `
.wb-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;--wb-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;--wb-ok:var(--dsw-alias-state-success-primary);--wb-warn:var(--dsw-alias-state-warning-primary);--wb-err:var(--dsw-alias-state-error-primary);--wb-accent:var(--dsw-alias-brand-primary)}
.wb-scroll{flex:1;min-height:0;overflow:auto}
.wb-content{padding:28px 24px 24px;max-width:1240px;margin:0 auto}
.wb-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px}
.wb-eyebrow{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase}
.wb-h1{margin:2px 0 0;font-size:26px;font-weight:600;line-height:34px;letter-spacing:-.02em}
.wb-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.wb-head-side{display:flex;align-items:center;gap:8px}
.wb-fresh{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:12px;font-size:11.5px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-secondary)}
.wb-fresh[data-state=ready] i{background:var(--wb-ok)}
.wb-fresh[data-state=stale] i{background:var(--wb-warn)}
.wb-fresh[data-state=cached] i{background:var(--wb-accent)}
.wb-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.wb-icon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:15px;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.wb-icon:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.wb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.wb-metric{display:flex;flex-direction:column;gap:2px;min-width:0;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}
button.wb-metric{cursor:pointer}
button.wb-metric:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}
.wb-metric-label{color:var(--dsw-alias-label-tertiary);font-size:12px}
.wb-metric-value{font-family:var(--wb-mono);font-size:24px;font-weight:600;line-height:32px;font-variant-numeric:tabular-nums}
.wb-metric-value[data-tone=alert]{color:var(--wb-err)}
.wb-metric-value[data-tone=default]{color:var(--dsw-alias-label-primary)}
.wb-metric-detail{color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:17px}
.wb-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr);gap:12px;align-items:start}
.wb-main,.wb-aside{display:flex;flex-direction:column;gap:12px;min-width:0}
.wb-panel{min-width:0;padding:14px 16px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.wb-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.wb-panel-title{margin:0;font-size:14px;font-weight:600;line-height:22px}
.wb-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 7px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-secondary);font-family:var(--wb-mono);font-size:11px}
.wb-fill{flex:1}
.wb-hint{color:var(--dsw-alias-label-tertiary);font-size:11px}
.wb-rows,.wb-alerts{list-style:none;margin:0;padding:0}
.wb-row{border-bottom:.5px solid var(--dsw-alias-border-l1)}
.wb-row:last-child{border-bottom:0}
.wb-row-main{display:flex;align-items:center;gap:10px;width:100%;padding:9px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.wb-row-main:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.wb-row-body{display:flex;flex-direction:column;flex:1;min-width:0;gap:1px}
.wb-row-title{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-row-project{color:var(--dsw-alias-label-tertiary);font-family:var(--wb-mono);font-size:10.5px}
.wb-row-detail{color:var(--dsw-alias-label-secondary);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-row-amount{font-family:var(--wb-mono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.wb-row-open{color:var(--dsw-alias-label-tertiary)}
.wb-badge{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:5px;font-size:11px;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-secondary)}
.wb-badge[data-tone=ok]{background:color-mix(in srgb,var(--wb-ok) 13%,transparent);color:var(--wb-ok)}
.wb-badge[data-tone=warn]{background:color-mix(in srgb,var(--wb-warn) 14%,transparent);color:var(--wb-warn)}
.wb-badge[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 13%,transparent);color:var(--wb-err)}
.wb-alert{display:flex;flex-direction:column;gap:6px;padding:9px 10px;margin-bottom:6px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--wb-warn) 6%,transparent)}
.wb-alert[data-tone=error]{background:color-mix(in srgb,var(--wb-err) 6%,transparent)}
.wb-alert-body{display:flex;flex-direction:column;gap:1px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:0}
.wb-alert-title{font-size:12.5px;font-weight:600}
.wb-alert-meta{color:var(--dsw-alias-label-tertiary);font-size:11px}
.wb-alert-actions{display:flex;flex-wrap:wrap;gap:4px}
.wb-mini{height:26px;padding:0 9px;border-radius:6px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.wb-mini:hover{border-color:var(--dsw-alias-label-tertiary);color:var(--dsw-alias-label-primary)}
.wb-mini-primary{border-color:color-mix(in srgb,var(--wb-accent) 55%,transparent);color:var(--wb-accent)}
.wb-caps{padding-bottom:12px}
.wb-caps-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.wb-caps-list li{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.wb-caps-list li[data-tone=warn]{color:var(--wb-warn)}
.wb-caps-value{margin-left:auto;font-family:var(--wb-mono);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.wb-empty{padding:20px 4px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}
.wb-stub{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:40px 20px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}
.wb-stub-title{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;margin:0}
.wb-detabar,.wb-detailbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.wb-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;margin:10px 0}
.wb-fact dt{color:var(--dsw-alias-label-tertiary);font-size:11px}
.wb-fact dd{margin:0;font-size:12.5px;font-family:var(--wb-mono);overflow-wrap:anywhere}
.wb-detail-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.wb-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:16px;color:var(--dsw-alias-label-tertiary);font-size:11px}
@media (width<=1199px){.wb-grid{grid-template-columns:minmax(0,1fr)}}
@media (width<=767px){.wb-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.wb-content{padding:20px 14px 16px}.wb-h1{font-size:22px;line-height:30px}}
@media (width<=419px){.wb-metric{padding:10px 12px}.wb-metric-value{font-size:19px;line-height:26px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`
