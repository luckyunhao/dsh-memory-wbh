    // ── 样式 ────────────────────────────────────────────────────────────────
    const STYLE = `.wb-overlay{
  --wb-bg:${THEME.bg};--wb-bg-soft:${THEME.bgSoft};--wb-bg-deep:${THEME.bgDeep};--wb-bg-panel:${THEME.bgPanel};
  --wb-card:${THEME.card};--wb-card-soft:${THEME.cardSoft};--wb-card-strong:${THEME.cardStrong};
  --wb-border:${THEME.border};--wb-border-strong:${THEME.borderStrong};
  --wb-text:${THEME.text};--wb-text-strong:${THEME.textStrong};--wb-muted:${THEME.muted};--wb-dim:${THEME.dim};--wb-on-accent:${THEME.onAccent};
  --wb-accent:${THEME.accent};--wb-accent-hover:${THEME.accentHover};--wb-accent-soft:${THEME.accentSoft};--wb-accent-border:${THEME.accentBorder};
  --wb-cyan:${THEME.cyan};--wb-cyan-deep:${THEME.cyanDeep};--wb-green:${THEME.green};
  --wb-purple:${THEME.purple};--wb-purple-soft:${THEME.purpleSoft};--wb-violet:${THEME.violet};
  --wb-pink:${THEME.pink};--wb-pink-deep:${THEME.pinkDeep};--wb-orange:${THEME.orange};--wb-orange-deep:${THEME.orangeDeep};
  --wb-red:${THEME.red};--wb-red-soft:${THEME.redSoft};--wb-red-deep:${THEME.redDeep};
  --wb-warn-bg:${THEME.warnBg};--wb-warn-border:${THEME.warnBorder};--wb-warn-text:${THEME.warnText};
}

/* 全局字体：统一微软雅黑 */
.wb-overlay{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif!important}
.wb-overlay *{font-family:inherit!important}
.wb-overlay code,.wb-overlay pre,.wb-overlay kbd{font-family:Consolas,"Courier New",monospace!important}
.wb-overlay{position:fixed;inset:0;z-index:1200;background:var(--wb-bg);display:flex;align-items:stretch;justify-content:stretch;padding:0;font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;color:var(--wb-text-strong)}
.wb-shell button,.wb-shell input,.wb-shell textarea,.wb-shell select{font-family:inherit}
.wb-shell{position:relative;display:flex;width:100vw;height:100vh;background:var(--wb-bg);border:0;border-radius:0;overflow:hidden;box-shadow:none;background-image:linear-gradient(rgba(37,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.06) 1px,transparent 1px);background-size:32px 32px}
.wb-nav{width:198px;flex:0 0 198px;background:linear-gradient(180deg,var(--wb-card),var(--wb-bg-soft));border-right:1px solid var(--wb-border);padding:18px 12px 14px;display:flex;flex-direction:column;gap:14px}
.wb-logo{display:flex;align-items:center;gap:10px;padding:4px 6px 14px;border-bottom:1px solid var(--wb-border)}
.wb-logo-mark{width:34px;height:34px;background:var(--wb-accent);color:var(--wb-on-accent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;letter-spacing:0;border-radius:3px;box-shadow:3px 3px 0 rgba(37,99,235,.18)}
.wb-logo-text{font-family:Consolas,"Courier New",monospace;font-size:14px;line-height:1.15;letter-spacing:1px;color:var(--wb-text-strong)}
.wb-nav-list{display:flex;flex-direction:column;gap:6px}
.wb-nav-item{position:relative;display:grid;grid-template-columns:24px 1fr;grid-template-rows:auto auto;column-gap:6px;align-items:center;border:0;background:transparent;color:var(--wb-dim);text-align:left;padding:8px 8px 8px 6px;cursor:pointer;border-radius:2px;transition:background .15s,color .15s,transform .15s}
.wb-nav-item:hover{background:var(--wb-card-soft);color:var(--wb-text-strong)}
.wb-nav-item.is-active{background:var(--wb-accent);color:var(--wb-on-accent);transform:skewX(-3deg);box-shadow:4px 4px 0 rgba(37,99,235,.16)}
.wb-nav-item.is-active > *{transform:skewX(3deg)}
.wb-nav-ico{grid-row:1;display:flex;align-items:center;justify-content:center;width:24px;height:20px;opacity:.78}
.wb-nav-ico svg{width:16px;height:16px}
.wb-nav-title{font-size:14px;font-weight:700;grid-row:1;letter-spacing:.5px}
.wb-nav-sub{grid-column:2;grid-row:2;font-size:11px;opacity:.62;letter-spacing:.5px;font-family:Consolas,monospace}
.wb-nav-foot{margin-top:auto;border-top:1px solid var(--wb-border);padding-top:10px}
.wb-engine{display:flex;align-items:center;gap:6px;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;color:var(--wb-accent)}
.wb-engine i{width:6px;height:6px;border-radius:50%;background:var(--wb-accent);box-shadow:0 0 8px var(--wb-accent)}
.wb-engine small{color:var(--wb-dim);margin-left:auto;font-size:11px}
.wb-exit{margin-top:8px;width:100%;border:1px solid var(--wb-border-strong);background:transparent;color:var(--wb-dim);font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;padding:6px 7px;cursor:pointer;border-radius:1px;text-align:left;display:flex;align-items:center;justify-content:space-between}
.wb-exit:hover{border-color:var(--wb-pink-deep);color:var(--wb-pink-deep)}
.wb-nav-note{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-top:6px;letter-spacing:.5px}
.wb-main{flex:1;min-width:0;display:flex;flex-direction:column;background:rgba(255,255,255,.82)}
.wb-topbar{position:relative;height:52px;flex:0 0 52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--wb-border);background:rgba(255,255,255,.92);-webkit-app-region:drag}
.wb-topbar button,.wb-topbar input{-webkit-app-region:no-drag}
/* 顶栏拖拽区会盖住固定的窗口按钮：在顶栏内部挖一块 no-drag，点击才能落到按钮上。 */
.wb-topbar-cutout{position:absolute;top:0;right:0;width:184px;height:100%;-webkit-app-region:no-drag;pointer-events:none;background:transparent}
body.wb-native-caption [data-windows-menu]{display:none!important}
body.wb-native-caption [data-window-drag]{display:none!important}
body.wb-native-caption .wb-topbar.wb-topbar-native-gap{padding-right:184px}
html[data-fullscreen] body.wb-native-caption .wb-topbar.wb-topbar-native-gap{padding-right:20px}
.wb-crumb{font-family:Consolas,monospace;font-size:12px;letter-spacing:1.5px;color:var(--wb-text-strong)}
.wb-crumb-local{color:var(--wb-accent)}
.wb-crumb-sub{color:var(--wb-dim)}
.wb-top-actions{display:flex;align-items:center;gap:9px}
.wb-live{display:inline-flex;align-items:center;gap:5px;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;color:var(--wb-accent);white-space:nowrap}
.wb-live i{width:5px;height:5px;border-radius:50%;background:var(--wb-accent);box-shadow:0 0 6px var(--wb-accent)}
.wb-live-top{color:var(--wb-cyan-deep)}
.wb-live-top i{background:var(--wb-cyan-deep);box-shadow:0 0 6px var(--wb-cyan-deep)}
.wb-live.is-muted{color:var(--wb-dim)}
.wb-live.is-muted i{background:var(--wb-dim);box-shadow:none}
.wb-live.is-error{color:var(--wb-red-soft)}
.wb-live.is-error i{background:var(--wb-red-soft);box-shadow:0 0 6px var(--wb-red-soft)}
.wb-icon-btn{width:28px;height:28px;border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-dim);border-radius:3px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.wb-icon-btn:hover{color:var(--wb-accent);border-color:var(--wb-accent)}
.wb-close{width:28px;height:28px;border:1px solid var(--wb-border-strong);background:transparent;color:var(--wb-dim);font-size:18px;line-height:1;cursor:pointer;border-radius:3px}
.wb-close:hover{color:var(--wb-pink-deep);border-color:var(--wb-pink-deep)}
.wb-scroll{flex:1;min-height:0;overflow:auto;position:relative;scrollbar-color:var(--wb-border-strong) var(--wb-bg)}
.wb-overview,.wb-page{padding:26px 30px 44px;max-width:1600px;margin:0 auto}
.wb-hero{position:relative;padding:8px 0 18px;overflow:hidden}
.wb-hero-glow{position:absolute;right:-80px;top:-120px;width:360px;height:360px;background:radial-gradient(circle,rgba(37,99,235,.22),transparent 68%);pointer-events:none}
.wb-hero-eyebrow,.wb-eyebrow{font-family:Consolas,monospace;font-size:11px;letter-spacing:2px;color:var(--wb-cyan-deep)}
.wb-hero-title{font-size:46px;line-height:1.12;font-weight:900;letter-spacing:2px;margin:12px 0 8px;color:var(--wb-text-strong);text-shadow:3px 3px 0 rgba(37,99,235,.22)}
.wb-hero-accent{color:var(--wb-purple);position:relative;display:inline-block;text-shadow:3px 3px 0 rgba(219,39,119,.18)}
.wb-hero-accent::after{content:'';position:absolute;left:0;right:8px;bottom:-4px;height:2px;background:repeating-linear-gradient(90deg,var(--wb-pink-deep) 0 8px,transparent 8px 14px)}
.wb-hero-sub{color:var(--wb-dim);font-size:14px;margin:12px 0 20px;letter-spacing:.3px}
.wb-hero-stats{max-width:640px}
.wb-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wb-stat{border:1px solid var(--wb-border);background:linear-gradient(180deg,var(--wb-card-soft),var(--wb-card));padding:12px 14px;border-radius:2px;position:relative;overflow:hidden}
.wb-stat::before{content:'';position:absolute;left:0;top:0;width:100%;height:2px;background:linear-gradient(90deg,var(--wb-accent),transparent)}
.wb-stat-value{font-family:Consolas,"Courier New",monospace;font-size:28px;font-weight:700;line-height:1}
.wb-stat-label{font-size:12px;color:var(--wb-dim);margin-top:6px;letter-spacing:1px}
.wb-search-wrap{margin:18px 0 24px}
.wb-search{display:flex;align-items:center;gap:8px;border:1px solid var(--wb-border-strong);background:var(--wb-card);padding:9px 12px;border-radius:2px}
.wb-search:focus-within{border-color:var(--wb-purple);box-shadow:0 0 0 2px rgba(37,99,235,.12)}
.wb-search-icon{color:var(--wb-purple);display:flex}
.wb-search-input{flex:1;background:transparent;border:0;outline:none;color:var(--wb-text-strong);font-size:13px;font-family:inherit}
.wb-search-input::placeholder{color:var(--wb-dim)}
.wb-search-clear{background:transparent;border:0;color:var(--wb-dim);cursor:pointer;font-size:16px}
.wb-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.wb-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-muted);font-size:12px;padding:5px 10px;border-radius:2px;cursor:pointer;letter-spacing:.5px}
.wb-chip:hover{border-color:var(--wb-accent);color:var(--wb-text-strong)}
.wb-chip.is-active{background:var(--wb-accent);border-color:var(--wb-accent);color:var(--wb-on-accent)}
.wb-chip-dot{width:5px;height:5px;border-radius:1px;display:inline-block}
.wb-section{margin-top:26px}
.wb-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}
.wb-section-title{font-size:20px;font-weight:800;margin:4px 0 0;letter-spacing:1px}
.wb-link{border:0;background:transparent;color:var(--wb-cyan-deep);font-size:12px;font-family:Consolas,monospace;cursor:pointer;letter-spacing:1px;display:inline-flex;align-items:center;gap:4px}
.wb-link:hover{color:var(--wb-accent)}
.wb-project-list{display:flex;flex-direction:column;gap:12px}
.wb-project{display:flex;gap:18px;border:1px solid var(--wb-border);border-left:2px solid var(--wb-accent);background:linear-gradient(120deg,var(--wb-card),var(--wb-card));padding:16px 18px;border-radius:2px;position:relative;overflow:hidden}
.wb-project::after{content:'';position:absolute;right:-40px;bottom:-70px;width:180px;height:180px;border:1px solid rgba(37,99,235,.18);border-radius:50%;pointer-events:none}
.wb-project.is-active{background:linear-gradient(120deg,var(--wb-bg),var(--wb-card))}
.wb-project-main{flex:1;min-width:0}
.wb-project-eyebrow{display:flex;align-items:center;gap:6px;font-family:Consolas,monospace;font-size:11px;letter-spacing:1.5px;color:var(--wb-purple)}
.wb-project-title{font-size:21px;font-weight:800;margin:8px 0 6px;letter-spacing:.5px}
.wb-project-summary{font-size:13px;line-height:1.65;color:var(--wb-muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.wb-project-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.wb-project-side{width:190px;flex:0 0 190px;border-left:1px dashed var(--wb-border-strong);padding-left:14px;display:flex;flex-direction:column;align-items:center;gap:6px}
.wb-ring{position:relative;width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--wb-accent) var(--p,0%),var(--wb-border) 0);display:flex;align-items:center;justify-content:center}
.wb-ring::before{content:'';position:absolute;inset:6px;border-radius:50%;background:var(--wb-card)}
.wb-ring span{position:relative;z-index:1;font-family:Consolas,monospace;font-size:13px;color:var(--wb-accent)}
.wb-project-count{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);letter-spacing:1px}
.wb-action{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--wb-muted);line-height:1.45;width:100%}
.wb-action.is-done{color:var(--wb-dim);text-decoration:line-through}
.wb-check{width:13px;height:13px;border:1px solid var(--wb-border-strong);flex:0 0 13px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:var(--wb-accent);margin-top:1px}
.wb-action.is-done .wb-check{border-color:var(--wb-accent)}
.wb-project-empty{border:1px dashed var(--wb-border-strong);padding:22px;text-align:center;color:var(--wb-dim);background:rgba(241,245,249,.8)}
.wb-project-empty p{margin:8px 0 0;font-size:13px}
.wb-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wb-card-grid-wide{grid-template-columns:repeat(4,minmax(0,1fr))}
.wb-card{display:flex;flex-direction:column;text-align:left;border:1px solid var(--wb-border);border-top:1px solid var(--wb-border-strong);background:linear-gradient(180deg,var(--wb-card-soft),var(--wb-card));padding:12px 13px 11px;border-radius:2px;cursor:pointer;min-height:142px;transition:border-color .15s,transform .15s,background .15s;color:var(--wb-text-strong)}
.wb-card:hover{border-color:var(--wb-accent);transform:translateY(-2px);background:linear-gradient(180deg,var(--wb-bg),var(--wb-card))}
.wb-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.wb-card-type{display:inline-flex;align-items:center;gap:5px;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;color:var(--wb-muted);text-transform:uppercase}
.wb-type-dot{width:5px;height:5px;border-radius:1px;display:inline-block}
.wb-card-index{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim)}
.wb-card-title{font-size:14px;font-weight:700;line-height:1.4;margin:9px 0 5px;letter-spacing:.2px}
.wb-card-summary{font-size:12px;line-height:1.55;color:var(--wb-muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:1}
.wb-card-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:9px}
.wb-tags{display:flex;flex-wrap:wrap;gap:4px}
.wb-tag{font-family:Consolas,monospace;font-size:11px;border:1px solid var(--wb-border-strong);color:var(--wb-dim);padding:1px 5px;border-radius:1px;letter-spacing:.3px}
.wb-card-date{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);white-space:nowrap}
.wb-quick{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:24px;padding-top:16px;border-top:1px solid var(--wb-border)}
.wb-muted{color:var(--wb-dim);font-size:12px}
.wb-block{display:block;font-weight:400;margin-top:3px}
.wb-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-text-strong);padding:7px 12px;border-radius:2px;font-size:12px;font-family:Consolas,monospace;letter-spacing:.5px;cursor:pointer;white-space:nowrap}
.wb-btn:hover:not(:disabled){border-color:var(--wb-accent);color:var(--wb-accent)}
.wb-btn:disabled{opacity:.4;cursor:not-allowed}
.wb-btn-primary{background:var(--wb-accent);border-color:var(--wb-accent);color:var(--wb-on-accent);font-weight:700}
.wb-btn-primary:hover:not(:disabled){background:var(--wb-accent-hover);border-color:var(--wb-accent-hover);color:var(--wb-on-accent)}
.wb-btn-danger{color:var(--wb-red-deep);border-color:var(--wb-red-deep)}
.wb-btn-block{width:100%;justify-content:center}
.wb-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:18px}
.wb-page-title{font-size:30px;font-weight:900;letter-spacing:1px;margin:6px 0 0}
.wb-detail{position:absolute;inset:0;background:var(--wb-bg);z-index:5;overflow:auto;padding:22px 30px 50px}
.wb-detail-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.wb-detail-actions{display:flex;gap:7px}
.wb-detail-eyebrow{display:flex;align-items:center;gap:6px;font-family:Consolas,monospace;font-size:11px;letter-spacing:1.5px;color:var(--wb-purple)}
.wb-detail-title{font-size:32px;font-weight:900;line-height:1.2;margin:10px 0 8px;letter-spacing:.5px}
.wb-detail-path{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-bottom:10px;overflow-wrap:anywhere}
.wb-detail-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:18px}
.wb-detail-actions-list{border:1px solid var(--wb-border);background:var(--wb-card);padding:12px 14px;margin-bottom:18px;display:flex;flex-direction:column;gap:6px}
.wb-detail-section{border-top:1px solid var(--wb-border);padding-top:14px;margin-top:14px}
.wb-detail-h{font-size:14px;color:var(--wb-accent);margin:0 0 8px;font-family:Consolas,monospace;letter-spacing:1px;text-transform:uppercase}
.wb-detail-foot{margin-top:26px;font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim)}
.wb-md{font-size:14px;line-height:1.8;color:var(--wb-text-strong);overflow-wrap:anywhere}
.wb-md-h{font-size:14px;color:var(--wb-text-strong);margin:12px 0 5px}
.wb-p{margin:5px 0}
.wb-li{display:flex;gap:7px;margin:3px 0}
.wb-dot{color:var(--wb-accent);flex:0 0 auto}
.wb-gap{height:6px}
.wb-code{background:var(--wb-card);border:1px solid var(--wb-border);color:var(--wb-accent);padding:10px 12px;font-size:12px;overflow:auto;line-height:1.6;font-family:Consolas,monospace;border-radius:2px}
.wb-inline-code{background:var(--wb-card-soft);color:var(--wb-cyan-deep);padding:1px 4px;font-size:12px;font-family:Consolas,monospace}
.wb-md a{color:var(--wb-cyan-deep);text-decoration:none}
.wb-md a:hover{text-decoration:underline}
.wb-task{display:flex;gap:6px;align-items:flex-start;margin:3px 0}
.wb-task .wb-check{margin-top:2px}
.wb-task .is-done{color:var(--wb-dim);text-decoration:line-through}
.wb-expert-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wb-expert{position:relative;border:1px solid var(--wb-border);background:linear-gradient(150deg,var(--wb-card-soft),var(--wb-card));padding:16px;border-radius:2px;overflow:hidden;min-height:190px;display:flex;flex-direction:column}
.wb-expert::before{content:'';position:absolute;left:0;top:0;width:3px;height:100%;background:var(--expert)}
.wb-expert-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.wb-expert-mark{font-family:Consolas,monospace;font-size:26px;font-weight:700;color:var(--expert);line-height:1}
.wb-expert-kind{font-family:Consolas,monospace;font-size:11px;letter-spacing:1.5px;color:var(--wb-dim)}
.wb-expert-title{font-size:16px;font-weight:800;margin-bottom:6px}
.wb-expert-desc{font-size:12px;line-height:1.6;color:var(--wb-muted);flex:1;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.wb-expert-foot{display:flex;justify-content:flex-end;margin-top:12px}
.wb-btn-expert{color:var(--expert);border-color:var(--expert)}
.wb-btn-expert:hover{background:var(--expert);color:var(--wb-on-accent)}
.wb-style-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wb-style{position:relative;border:1px solid var(--wb-border);background:linear-gradient(150deg,var(--wb-card-soft),var(--wb-card));padding:16px;border-radius:2px;display:flex;flex-direction:column;gap:8px;min-height:180px}
.wb-style::before{content:'';position:absolute;left:0;top:0;width:3px;height:100%;background:var(--style)}
.wb-style-head{display:flex;align-items:center;justify-content:space-between}
.wb-style-no{font-family:Consolas,monospace;font-size:24px;font-weight:700;color:var(--style);line-height:1}
.wb-style-title{font-size:17px;font-weight:800}
.wb-style-desc{font-size:12px;line-height:1.6;color:var(--wb-muted);flex:1}
.wb-style .wb-btn-expert{margin-top:auto;align-self:flex-start}
.wb-monitor-grid{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:12px}
.wb-monitor-card{border:1px solid var(--wb-border);background:var(--wb-card);padding:14px;border-radius:2px}
.wb-bar-row{display:grid;grid-template-columns:46px 1fr 28px;align-items:center;gap:8px;margin:7px 0}
.wb-bar-label{font-size:12px;color:var(--wb-muted)}
.wb-bar-track{height:8px;background:var(--wb-card-soft);border:1px solid var(--wb-border)}
.wb-bar-fill{height:100%;min-width:0}
.wb-bar-value{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);text-align:right}
.wb-mt{margin-top:14px}
.wb-agent{display:flex;height:100%;min-height:0}
.wb-tape{width:196px;flex:0 0 196px;border-right:1px solid var(--wb-border);background:var(--wb-card);padding:12px 10px;display:flex;flex-direction:column;gap:8px;overflow:auto}
.wb-tape-head{display:flex;align-items:center;justify-content:space-between}
.wb-tape-new{border:1px solid var(--wb-accent);background:transparent;color:var(--wb-accent);font-family:Consolas,monospace;font-size:12px;letter-spacing:1px;padding:7px 8px;cursor:pointer;border-radius:1px;text-align:left}
.wb-tape-new:hover{background:var(--wb-accent);color:var(--wb-on-accent)}
.wb-tape-label{font-family:Consolas,monospace;font-size:11px;letter-spacing:1.2px;color:var(--wb-dim);margin-top:6px;text-transform:uppercase}
.wb-tape-workspace{border:1px solid var(--wb-border);background:var(--wb-card);padding:7px 8px;font-family:Consolas,monospace;font-size:11px;color:var(--wb-cyan-deep);letter-spacing:.5px}
.wb-tape-list{display:flex;flex-direction:column;gap:4px}
.wb-tape-item{text-align:left;border:1px solid transparent;border-left:2px solid var(--wb-border);background:transparent;color:var(--wb-muted);padding:7px 8px;cursor:pointer;border-radius:1px}
.wb-tape-item:hover{background:var(--wb-card-soft);color:var(--wb-text-strong)}
.wb-tape-item.is-active{border-color:var(--wb-accent);background:var(--wb-card-soft);color:var(--wb-text-strong)}
.wb-tape-item-title{font-size:12px;font-weight:600;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wb-tape-item-meta{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-top:3px}
.wb-tape-foot{margin-top:auto;border-top:1px solid var(--wb-border);padding-top:8px}
.wb-chat{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.wb-chat-head{height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--wb-border)}
.wb-chat-head-meta{display:flex;align-items:center;gap:10px}
.wb-model-label{font-family:Consolas,monospace;font-size:11px;color:var(--wb-cyan-deep);border:1px solid var(--wb-border);padding:1px 6px}
.wb-chat-log{flex:1;min-height:0;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.wb-chat-note{border:1px dashed var(--wb-border-strong);color:var(--wb-dim);font-size:12px;padding:12px;text-align:center}
.wb-chat-warn{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;background:var(--wb-warn-bg);border-bottom:1px solid var(--wb-warn-border);color:var(--wb-warn-text);font-size:12px}
.wb-chat-warn-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.wb-chat-warn-text span{color:var(--wb-warn-text);font-size:11px}
.wb-approval,.wb-question{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;width:min(680px,calc(100vw - 48px));background:var(--wb-card);border:1px solid var(--wb-warn-border);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.55);padding:14px 16px;display:flex;flex-direction:column;gap:10px;color:var(--wb-text)}
.wb-approval-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wb-approval-tool{font-family:Consolas,monospace;font-size:12px;color:var(--wb-cyan)}
.wb-approval-reason{font-size:13px;line-height:1.6;color:var(--wb-text)}
.wb-approval-error{color:var(--wb-red-soft);font-size:12px}
.wb-approval-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.wb-question-list{display:flex;flex-direction:column;gap:12px;max-height:50vh;overflow:auto}
.wb-question-item{border-top:1px solid var(--wb-border);padding-top:10px;display:flex;flex-direction:column;gap:6px}
.wb-question-header{font-size:11px;color:var(--wb-dim);letter-spacing:1px}
.wb-question-title{font-size:14px;font-weight:700}
.wb-question-detail{margin:0;max-height:150px;overflow:auto;white-space:pre-wrap;background:var(--wb-bg-panel);border:1px solid var(--wb-border);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--wb-muted)}
.wb-question-options{display:flex;flex-direction:column;gap:6px}
.wb-question-option{text-align:left;border:1px solid var(--wb-border);background:var(--wb-card-soft);color:var(--wb-text);padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;flex-direction:column;gap:2px;font-family:inherit}
.wb-question-option:hover{border-color:var(--wb-accent)}
.wb-question-option.is-selected{border-color:var(--wb-accent);background:rgba(37,99,235,.18)}
.wb-question-option small{color:var(--wb-muted)}
.wb-question-custom{margin-top:2px}
.wb-compose-stack{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.wb-compose-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wb-tool-btn{border:1px solid var(--wb-border);background:var(--wb-card-soft);color:var(--wb-muted);font-size:11px;font-family:inherit;padding:3px 8px;border-radius:6px;cursor:pointer}
.wb-tool-btn:hover{border-color:var(--wb-accent);color:var(--wb-text)}
.wb-compose-hint{font-size:11px;color:var(--wb-dim);margin-left:auto}
.wb-compose-row{display:flex;gap:8px;align-items:flex-end}
.wb-attach-row{display:flex;gap:6px;flex-wrap:wrap}
.wb-attach-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--wb-border);background:var(--wb-card-soft);border-radius:8px;padding:3px 6px 3px 4px;max-width:240px}
.wb-attach-thumb{width:26px;height:26px;object-fit:cover;border-radius:5px;display:block}
.wb-attach-icon{width:26px;height:26px;display:grid;place-items:center;font-size:14px;background:var(--wb-bg-panel);border-radius:5px}
.wb-attach-name{font-size:11px;color:var(--wb-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-attach-remove{border:0;background:transparent;color:var(--wb-dim);cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.wb-attach-remove:hover{color:var(--wb-red-soft)}
.wb-msg-attachments{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.wb-msg-attach{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--wb-border-strong);background:var(--wb-card-soft);border-radius:6px;padding:2px 6px;font-size:11px;color:var(--wb-muted)}
.wb-msg-attach-thumb{width:40px;height:40px;object-fit:cover;border-radius:4px;display:block}
.wb-tool-chip{cursor:pointer;background:transparent;font-family:inherit}
.wb-tool-chip.is-open{border-color:var(--wb-accent);color:var(--wb-accent)}
.wb-tool-detail{margin-top:6px;border:1px solid var(--wb-border);background:var(--wb-bg-panel);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.wb-tool-detail-row{display:flex;gap:8px;align-items:flex-start;font-size:11px;color:var(--wb-muted)}
.wb-tool-detail-kind{flex:0 0 28px;color:var(--wb-cyan)}
.wb-tool-detail code{white-space:pre-wrap;word-break:break-all;color:var(--wb-text);font-family:Consolas,monospace}
.wb-stream-caret{display:inline-block;margin-left:2px;color:var(--wb-accent);animation:wb-blink 1s steps(2,start) infinite}
@keyframes wb-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.wb-picker-overlay{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:24px}
.wb-picker-panel{width:min(620px,92vw);max-height:76vh;overflow:auto;background:var(--wb-card);border:1px solid var(--wb-border-strong);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.6);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.wb-picker-head{display:flex;align-items:center;justify-content:space-between}
.wb-picker-search{width:100%}
.wb-picker-list{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto}
.wb-picker-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;border:1px solid transparent;background:transparent;color:var(--wb-text);padding:7px 9px;border-radius:7px;cursor:pointer;font-family:inherit}
.wb-picker-item:hover{background:var(--wb-card-soft);border-color:var(--wb-border)}
.wb-picker-item-name{font-size:13px}
.wb-picker-item-path{font-size:11px;color:var(--wb-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.wb-msg{max-width:86%;border:1px solid var(--wb-border);background:var(--wb-card);padding:9px 11px;border-radius:2px}
.wb-msg.is-user{align-self:flex-end;background:var(--wb-card-soft);border-color:var(--wb-border-strong)}
.wb-msg.is-assistant{align-self:flex-start}
.wb-msg-role{font-family:Consolas,monospace;font-size:11px;letter-spacing:1.5px;color:var(--wb-dim);margin-bottom:4px}
.wb-msg-body{font-size:13px;line-height:1.7;color:var(--wb-text-strong);overflow-wrap:anywhere}
.wb-msg.is-user .wb-msg-body{white-space:pre-wrap}
.wb-msg-body .wb-md{font-size:13px;line-height:1.7}
.wb-msg-body .wb-md-h{font-size:14px;margin:8px 0 3px}
.wb-msg-body .wb-p{margin:3px 0}
.wb-tool-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
.wb-tool-chip{font-family:Consolas,monospace;font-size:11px;border:1px solid var(--wb-border-strong);color:var(--wb-cyan-deep);padding:1px 5px;border-radius:1px}
.wb-chat-compose{border-top:1px solid var(--wb-border);padding:10px 12px;display:flex;gap:8px;align-items:flex-end}
.wb-chat-input{flex:1;background:var(--wb-card);border:1px solid var(--wb-border-strong);color:var(--wb-text-strong);padding:8px 10px;font-size:13px;line-height:1.6;resize:none;outline:none;border-radius:2px;font-family:inherit}
.wb-chat-input:focus{border-color:var(--wb-accent)}
.wb-chat-input:disabled{opacity:.5;cursor:not-allowed}
.wb-chat-hint{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);padding:0 12px 8px;letter-spacing:.5px}
.wb-style-actions{display:flex;gap:6px;margin-top:auto;flex-wrap:wrap}
.wb-media-wrap{margin-top:10px}
.wb-media-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;border-bottom:1px solid var(--wb-border);padding-bottom:10px}
.wb-media-dir{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-top:4px;overflow-wrap:anywhere}
.wb-media-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.wb-media-card{text-align:left;border:1px solid var(--wb-border);background:var(--wb-card);border-radius:2px;padding:0 0 9px;cursor:pointer;color:var(--wb-text-strong);overflow:hidden}
.wb-media-card:hover{border-color:var(--wb-pink-deep);transform:translateY(-1px)}
.wb-media-thumb-wrap{position:relative;background:var(--wb-bg)}
.wb-media-thumb{width:100%;height:130px;object-fit:cover;display:block;background:var(--wb-bg)}
.wb-media-audio{display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--wb-pink-deep)}
.wb-media-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30px;height:30px;background:var(--wb-pink-deep);color:var(--wb-on-accent);display:flex;align-items:center;justify-content:center;border-radius:1px;box-shadow:0 0 18px rgba(219,39,119,.5)}
.wb-media-name{font-size:12px;font-weight:600;padding:7px 9px 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-media-meta{font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);padding:0 9px}
.wb-media-empty{border:1px dashed var(--wb-border-strong);padding:26px;text-align:center;color:var(--wb-dim);font-size:12px;margin-top:12px}
.wb-media-empty p{margin:8px 0 0}
.wb-lightbox{position:fixed;inset:0;z-index:40;background:rgba(241,245,249,.96);display:flex;align-items:center;justify-content:center;padding:24px}
.wb-lightbox-panel{width:min(960px,92vw);max-height:92vh;background:var(--wb-card);border:1px solid var(--wb-border-strong);display:flex;flex-direction:column;overflow:hidden}
.wb-lightbox-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--wb-border)}
.wb-lightbox-media{max-width:100%;max-height:70vh;object-fit:contain;background:#000;display:block;margin:0 auto}
.wb-lightbox-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-top:1px solid var(--wb-border)}
@media (max-width:1100px){.wb-tape{display:none}.wb-media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.wb-news-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-bottom:1px solid var(--wb-border);padding-bottom:16px;margin-bottom:18px}
.wb-news-title-main{font-size:30px;font-weight:900;line-height:1.2;margin:8px 0 6px;letter-spacing:.5px}
.wb-news-title-main span{color:var(--wb-purple)}
.wb-news-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.wb-news-item{display:flex;gap:10px;text-decoration:none;color:inherit;border-bottom:1px solid var(--wb-border);padding:9px 0;transition:background .15s}
.wb-news-item:hover{background:var(--wb-card-soft)}
.wb-news-thumb{width:64px;height:48px;flex:0 0 64px;object-fit:cover;border-radius:2px;background:var(--wb-card-soft)}
.wb-news-fallback{display:flex;align-items:center;justify-content:center;font-family:Consolas,monospace;font-size:12px;color:var(--wb-cyan-deep);border:1px solid var(--wb-border)}
.wb-news-body{min-width:0;flex:1}
.wb-news-title{font-size:13px;line-height:1.5;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wb-news-meta{display:flex;justify-content:space-between;gap:8px;font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-top:4px}
.wb-news-empty{padding:24px 0;color:var(--wb-dim);font-size:12px}
.wb-graph-stats{display:flex;gap:16px;font-family:Consolas,monospace;font-size:12px;color:var(--wb-dim);margin-bottom:10px}
.wb-graph-canvas{border:1px solid var(--wb-border);background:radial-gradient(circle at 50% 40%,var(--wb-card-soft),var(--wb-bg) 70%);border-radius:2px;height:560px;overflow:hidden}
.wb-graph-svg{width:100%;height:100%;display:block}
.wb-edge{stroke:var(--wb-border-strong);stroke-width:.8;opacity:.65}
.wb-node{cursor:pointer}
.wb-node circle{stroke:var(--wb-on-accent);stroke-width:1.5}
.wb-node:hover circle{stroke:var(--wb-accent);stroke-width:2.5}
.wb-node-label{font-size:11px;fill:var(--wb-dim);pointer-events:none;user-select:none}
.wb-legend{display:flex;gap:14px;flex-wrap:wrap;font-family:Consolas,monospace;font-size:11px;color:var(--wb-dim);margin-top:10px}
.wb-legend-item{display:inline-flex;align-items:center;gap:5px}
.wb-legend-item i{width:7px;height:7px;border-radius:1px;display:inline-block}
/* .wb-settings 使用 .wb-page 的 1600px 上限，不再单独压到 900px */
.wb-settings-card{border:1px solid var(--wb-border);background:var(--wb-card);padding:14px 16px;margin-bottom:12px;border-radius:2px}
.wb-settings-h{font-size:14px;color:var(--wb-accent);margin:0 0 10px;font-family:Consolas,monospace;letter-spacing:1px}
.wb-switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px dashed var(--wb-border);font-size:13px}
.wb-switch-row:last-of-type{border-bottom:0}
.wb-switch{width:36px;height:20px;accent-color:var(--wb-accent);cursor:pointer}
.wb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.wb-field{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--wb-muted);margin:8px 0}
.wb-field-col{flex-direction:column;align-items:stretch;gap:6px}
.wb-field .wb-input{max-width:220px}
.wb-input{background:var(--wb-bg);border:1px solid var(--wb-border-strong);color:var(--wb-text-strong);padding:7px 9px;border-radius:2px;font-size:13px;font-family:inherit;outline:none}
.wb-input:focus{border-color:var(--wb-accent)}
.wb-textarea{width:100%;box-sizing:border-box;resize:vertical;font-family:Consolas,monospace;font-size:12px;line-height:1.6}
.wb-kv{display:grid;grid-template-columns:80px 1fr;gap:6px 10px;margin:0;font-size:12px}
.wb-kv dt{color:var(--wb-dim)}
.wb-kv dd{margin:0;color:var(--wb-muted);overflow-wrap:anywhere;font-family:Consolas,monospace;font-size:11px}
.wb-kv-tight{grid-template-columns:52px 1fr;font-size:12px}
.wb-kv-tight span:nth-child(odd){color:var(--wb-dim)}
.wb-kv-tight span:nth-child(even){color:var(--wb-text-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-settings-foot{display:flex;justify-content:flex-end;margin-top:8px}
.wb-right{width:318px;flex:0 0 318px;border-left:1px solid var(--wb-border);background:linear-gradient(180deg,var(--wb-card),var(--wb-bg-soft));padding:16px 14px;display:flex;flex-direction:column;gap:12px;overflow:auto}
.wb-right-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--wb-border);padding-bottom:10px;padding-right:146px}
.wb-goal{border:1px solid var(--wb-accent-border);background:linear-gradient(160deg,var(--wb-card-soft),var(--wb-card) 70%);padding:12px;border-radius:2px}
.wb-goal-label{font-family:Consolas,monospace;font-size:11px;letter-spacing:1.5px;color:var(--wb-accent)}
.wb-goal-value{font-size:14px;font-weight:700;line-height:1.5;margin:7px 0 8px;color:var(--wb-text-strong);min-height:20px}
.wb-goal-input{width:100%;box-sizing:border-box;background:var(--wb-bg);border:1px solid var(--wb-border-strong);color:var(--wb-text-strong);padding:6px 8px;font-size:12px;outline:none;border-radius:1px}
.wb-goal-input:focus{border-color:var(--wb-accent)}
.wb-goal-save{margin-top:7px;width:100%;border:0;background:var(--wb-accent);color:var(--wb-on-accent);font-family:Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:1px;padding:6px;cursor:pointer;border-radius:1px}
.wb-right-block{border-top:1px solid var(--wb-border);padding-top:10px}
.wb-right-title{font-family:Consolas,monospace;font-size:11px;letter-spacing:1.2px;color:var(--wb-purple);margin-bottom:8px;text-transform:uppercase}
.wb-right-empty{font-size:12px;color:var(--wb-dim);padding:4px 0}
.wb-right-actions{display:flex;gap:6px;flex-wrap:wrap}
.wb-todo{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--wb-muted);line-height:1.45;margin:4px 0}
.wb-todo-dot{width:5px;height:5px;flex:0 0 5px;border-radius:50%;background:var(--wb-dim);margin-top:5px}
.wb-todo-dot.is-in_progress{background:var(--wb-accent);box-shadow:0 0 5px var(--wb-accent)}
.wb-todo-dot.is-completed{background:var(--wb-cyan-deep)}
.wb-run{display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:Consolas,monospace;font-size:11px;color:var(--wb-muted);padding:3px 0;border-bottom:1px dotted var(--wb-border)}
.wb-run-name{color:var(--wb-cyan-deep);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-run-time{color:var(--wb-dim);flex:0 0 auto}
.wb-empty{padding:36px 20px;text-align:center;color:var(--wb-dim);font-size:13px}
.wb-spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--wb-border-strong);border-top-color:var(--wb-accent);border-radius:50%;animation:wb-spin .8s linear infinite;vertical-align:-2px}
@keyframes wb-spin{to{transform:rotate(360deg)}}
.wb-toast{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);background:var(--wb-card-soft);border:1px solid var(--wb-border-strong);color:var(--wb-text-strong);padding:8px 14px;font-size:12px;border-radius:2px;box-shadow:0 10px 30px rgba(15,23,42,.5);max-width:80%;z-index:20}
.wb-toast.is-error{border-color:var(--wb-red-deep);color:var(--wb-red-deep)}
.wb-toast.is-success{border-color:var(--wb-accent);color:var(--wb-accent)}
.wb-modal{position:absolute;inset:0;background:rgba(15,23,42,.25);z-index:10;display:flex;align-items:center;justify-content:center;padding:24px}
.wb-modal-panel{width:min(620px,90%);max-height:86%;overflow:auto;background:var(--wb-card);border:1px solid var(--wb-border-strong);padding:18px 18px 16px;border-radius:2px;box-shadow:0 20px 60px rgba(15,23,42,.6)}
.wb-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.wb-modal-head h2{font-size:17px;margin:0}
.wb-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.wb-launch{display:flex;align-items:center;gap:7px;width:100%;border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-accent);padding:6px 9px;border-radius:2px;font-size:12px;font-family:Consolas,monospace;letter-spacing:.5px;cursor:pointer;text-align:left}
.wb-launch:hover,.wb-launch.is-open{border-color:var(--wb-accent);background:var(--wb-card-soft);box-shadow:0 0 0 1px rgba(37,99,235,.15) inset}
.wb-launch-mark{width:20px;height:20px;background:var(--wb-accent);color:var(--wb-on-accent);display:flex;align-items:center;justify-content:center;border-radius:1px;flex:0 0 20px}
.wb-launch-text{flex:1}
.wb-launch-dot{width:5px;height:5px;border-radius:50%;background:var(--wb-accent);box-shadow:0 0 6px var(--wb-accent)}
@media (max-width:1200px){.wb-right{display:none}.wb-card-grid-wide{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:900px){.wb-shell{height:96vh}.wb-nav{width:64px;flex:0 0 64px}.wb-logo-text,.wb-nav-title,.wb-nav-sub,.wb-nav-note,.wb-engine span,.wb-engine small{display:none}.wb-nav-item{grid-template-columns:1fr;text-align:center}.wb-nav-ico{grid-row:auto;justify-content:center;width:auto}.wb-nav-title{display:none}.wb-card-grid,.wb-card-grid-wide,.wb-expert-grid,.wb-news-grid,.wb-stats{grid-template-columns:1fr}.wb-project{flex-direction:column}.wb-project-side{width:100%;border-left:0;border-top:1px dashed var(--wb-border-strong);padding-left:0;padding-top:10px;flex-direction:row;flex-wrap:wrap;justify-content:flex-start}}
/* 字体与字距对齐原生 DSH：Segoe UI / 微软雅黑，不再用夸张的字母间距 */
.wb-crumb{letter-spacing:.5px}
.wb-hero-eyebrow,.wb-eyebrow{letter-spacing:1px}
.wb-logo-text{letter-spacing:.5px}
.wb-nav-title{letter-spacing:.2px}
.wb-nav-sub{letter-spacing:.3px}
.wb-exit{letter-spacing:.5px}
.wb-nav-note{letter-spacing:.3px}
.wb-live{letter-spacing:.5px}
.wb-hero-title{letter-spacing:1px}
.wb-right-title{letter-spacing:.5px}
.wb-goal-label{letter-spacing:.5px}
.wb-detail-h{letter-spacing:.5px}
.wb-field-tight{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:12px}
.wb-field-tight>span{flex:0 0 62px;color:var(--wb-dim)}
.wb-field-tight .wb-input{flex:1;min-width:0;font-size:12px;padding:5px 6px}
.wb-usage{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px;color:var(--wb-muted)}
.wb-usage strong{color:var(--wb-text-strong);font-weight:600;font-variant-numeric:tabular-nums}
.wb-account-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--wb-muted);padding:3px 0}
.wb-account-row strong{color:var(--wb-accent);font-size:14px;font-variant-numeric:tabular-nums}
.wb-account-note{font-size:11px;color:var(--wb-dim);line-height:1.45;margin-top:4px}
.wb-btn-mini{margin-top:7px;padding:5px 8px;font-size:11px}
/* 浅色科技风：标签/芯片/账户强调 */
.wb-tag{background:var(--wb-card-soft);border-color:var(--wb-accent-border);color:var(--wb-accent)}
.wb-chip{background:var(--wb-card);border-color:var(--wb-border);color:var(--wb-muted)}
.wb-chip:hover{border-color:var(--wb-accent-soft);color:var(--wb-text-strong)}
.wb-search{background:var(--wb-card);border-color:var(--wb-border)}
.wb-account-row:nth-of-type(2) strong{color:var(--wb-orange-deep)}
.wb-lightbox-media{background:var(--wb-card-soft)}
.wb-code{background:var(--wb-bg);border-color:var(--wb-border);color:var(--wb-accent)}

/* ===== 参考图深色科技风 ===== */
.wb-overlay{background:var(--wb-bg);color:var(--wb-text)}
.wb-shell{background:var(--wb-bg);background-image:linear-gradient(rgba(59,130,246,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.075) 1px,transparent 1px);background-size:36px 36px}
.wb-nav{background:linear-gradient(180deg,var(--wb-bg-soft),var(--wb-bg-deep));border-right:1px solid var(--wb-border)}
.wb-main{background:rgba(8,13,22,.78)}
.wb-topbar{background:rgba(9,14,24,.92);border-bottom:1px solid var(--wb-border);box-shadow:0 1px 0 rgba(59,130,246,.18)}
.wb-right{background:linear-gradient(180deg,var(--wb-bg-soft),var(--wb-bg-deep));border-left:1px solid var(--wb-border)}
.wb-scroll{scrollbar-color:var(--wb-border-strong) var(--wb-bg)}
.wb-logo-mark{background:linear-gradient(135deg,var(--wb-cyan),var(--wb-accent-hover));color:var(--wb-on-accent);border-radius:9px;box-shadow:0 0 22px rgba(34,211,238,.28)}
.wb-logo-text{color:var(--wb-on-accent)}
.wb-nav-item{color:var(--wb-muted);border-radius:9px;transform:none}
.wb-nav-item:hover{background:var(--wb-card-soft);color:var(--wb-text)}
.wb-nav-item.is-active{background:linear-gradient(135deg,var(--wb-accent),var(--wb-purple));color:var(--wb-on-accent);transform:none;box-shadow:0 10px 24px rgba(37,99,235,.28),inset 0 0 0 1px rgba(255,255,255,.08)}
.wb-nav-item.is-active > *{transform:none}
.wb-nav-item.is-active .wb-nav-sub{color:rgba(255,255,255,.78)}
.wb-nav-ico{color:var(--wb-dim)}
.wb-nav-item.is-active .wb-nav-ico{color:rgba(255,255,255,.9)}
.wb-nav-sub{color:var(--wb-dim)}
.wb-nav-foot{border-top:1px solid var(--wb-border)}
.wb-exit{border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-exit:hover{border-color:var(--wb-accent-hover);color:var(--wb-cyan)}
.wb-nav-note{color:var(--wb-muted)}
.wb-crumb{color:var(--wb-text)}
.wb-crumb-local{color:var(--wb-green)}
.wb-crumb-sub{color:var(--wb-dim)}
.wb-live{color:var(--wb-cyan)}
.wb-live i{background:var(--wb-cyan);box-shadow:0 0 8px var(--wb-cyan)}
.wb-live-top{color:var(--wb-cyan)}
.wb-live-top i{background:var(--wb-cyan);box-shadow:0 0 8px var(--wb-cyan)}
.wb-live.is-muted{color:var(--wb-dim)}
.wb-live.is-muted i{background:var(--wb-dim);box-shadow:none}
.wb-live.is-error{color:var(--wb-red)}
.wb-live.is-error i{background:var(--wb-red);box-shadow:0 0 8px var(--wb-red)}
.wb-icon-btn{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-icon-btn:hover{color:var(--wb-cyan);border-color:var(--wb-accent-hover)}
.wb-close{border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-close:hover{color:var(--wb-red);border-color:var(--wb-red)}
.wb-hero-eyebrow,.wb-eyebrow{color:var(--wb-cyan)}
.wb-hero-title{color:var(--wb-on-accent);text-shadow:0 0 36px rgba(59,130,246,.18)}
.wb-hero-accent{background:linear-gradient(90deg,var(--wb-cyan),var(--wb-violet));-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}
.wb-hero-accent::after{background:repeating-linear-gradient(90deg,var(--wb-green) 0 8px,transparent 8px 14px)}
.wb-hero-sub{color:var(--wb-muted)}
.wb-hero-glow{background:radial-gradient(circle,rgba(59,130,246,.28),transparent 68%)}
.wb-stat,.wb-project,.wb-card,.wb-expert,.wb-style,.wb-settings-card,.wb-goal,.wb-right-block,.wb-media-card{background:var(--wb-card);border:1px solid var(--wb-border);border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.22)}
.wb-stat{background:linear-gradient(180deg,var(--wb-card-soft),var(--wb-bg-panel))}
.wb-stat::before{background:linear-gradient(90deg,var(--wb-cyan),var(--wb-accent-hover),transparent)}
.wb-stat-value{color:var(--wb-on-accent)}
.wb-stat-label{color:var(--wb-muted)}
.wb-section-title,.wb-card-title,.wb-project-title,.wb-media-name,.wb-detail-title,.wb-news-title,.wb-modal-head h2{color:var(--wb-on-accent)}
.wb-muted,.wb-card-summary,.wb-project-summary,.wb-media-meta,.wb-news-meta,.wb-news-empty,.wb-media-empty,.wb-project-empty,.wb-right-empty,.wb-kv,.wb-kv-tight span:nth-child(odd){color:var(--wb-muted)}
.wb-kv-tight span:nth-child(even){color:var(--wb-text)}
.wb-card,.wb-card:hover{background:var(--wb-card);border-color:var(--wb-border)}
.wb-card:hover{border-color:var(--wb-accent-hover);box-shadow:0 12px 30px rgba(37,99,235,.18)}
.wb-project{border-left:3px solid var(--wb-green)}
.wb-project.is-active{background:linear-gradient(120deg,var(--wb-card-soft),var(--wb-bg-panel))}
.wb-project-side{border-left:1px dashed var(--wb-border-strong)}
.wb-project-eyebrow,.wb-detail-eyebrow{color:var(--wb-violet)}
.wb-project-empty{background:rgba(15,23,38,.6);border-color:var(--wb-border-strong)}
.wb-ring{background:conic-gradient(var(--wb-green) var(--p,0%),var(--wb-border) 0)}
.wb-ring span{color:var(--wb-green)}
.wb-check{border-color:var(--wb-border-strong);color:var(--wb-green)}
.wb-action.is-done .wb-check{border-color:var(--wb-green)}
.wb-tag{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.35);color:var(--wb-accent-soft);border-radius:5px}
.wb-chip{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-chip:hover{border-color:var(--wb-accent-hover);color:var(--wb-text)}
.wb-link{color:var(--wb-cyan)}
.wb-link:hover{color:var(--wb-green)}
.wb-btn{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-btn:hover:not(:disabled){border-color:var(--wb-accent-hover);color:var(--wb-cyan)}
.wb-btn-primary{background:linear-gradient(135deg,var(--wb-accent),var(--wb-purple));border-color:transparent;color:var(--wb-on-accent);box-shadow:0 8px 20px rgba(37,99,235,.28)}
.wb-btn-primary:hover:not(:disabled){background:linear-gradient(135deg,var(--wb-accent-hover),var(--wb-violet));border-color:transparent;color:var(--wb-on-accent)}
.wb-btn-danger{color:var(--wb-red);border-color:var(--wb-red)}
.wb-search{background:var(--wb-card);border-color:var(--wb-border-strong);border-radius:9px}
.wb-search:focus-within{border-color:var(--wb-accent-hover);box-shadow:0 0 0 3px rgba(59,130,246,.16)}
.wb-search-icon{color:var(--wb-cyan)}
.wb-search-clear{color:var(--wb-muted)}
.wb-input{background:var(--wb-bg-panel);border-color:var(--wb-border-strong);color:var(--wb-text);border-radius:8px}
.wb-input:focus{border-color:var(--wb-accent-hover);box-shadow:0 0 0 3px rgba(59,130,246,.14)}
.wb-field-tight>span{color:var(--wb-muted)}
.wb-field-tight .wb-input{background:var(--wb-bg-panel);color:var(--wb-text)}
.wb-settings-card{background:var(--wb-card);border-color:var(--wb-border);border-radius:12px}
.wb-settings-h{color:var(--wb-green)}
.wb-switch-row{border-bottom-color:var(--wb-border);color:var(--wb-text)}
.wb-switch-row small{color:var(--wb-muted)}
.wb-goal{background:linear-gradient(135deg,rgba(37,99,235,.9),rgba(124,58,237,.9));border-color:rgba(147,197,253,.25);border-radius:12px}
.wb-goal-label{color:var(--wb-accent-soft)}
.wb-goal-value{color:var(--wb-on-accent)}
.wb-goal-input{background:rgba(7,11,18,.45);border-color:rgba(255,255,255,.18);color:var(--wb-on-accent)}
.wb-goal-input::placeholder{color:rgba(255,255,255,.55)}
.wb-goal-save{background:var(--wb-card);color:var(--wb-accent);border-radius:8px}
.wb-right-title{color:var(--wb-purple-soft)}
.wb-right-head{border-bottom-color:var(--wb-border)}
.wb-right-block{border-top:0;padding:12px;margin-top:10px}
.wb-right-block:first-of-type{margin-top:0}
.wb-account-row{color:var(--wb-muted)}
.wb-account-row strong{color:var(--wb-green)}
.wb-account-row:nth-of-type(2) strong{color:var(--wb-orange)}
.wb-account-note{color:var(--wb-dim)}
.wb-usage{color:var(--wb-muted)}
.wb-usage strong{color:var(--wb-text)}
.wb-tape{background:var(--wb-bg-soft)}
.wb-tape-head,.wb-chat-head{border-bottom:1px solid var(--wb-border)}
.wb-tape-label{color:var(--wb-dim)}
.wb-tape-workspace{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-cyan);border-radius:8px}
.wb-tape-new{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-muted);border-radius:8px}
.wb-tape-new:hover{background:linear-gradient(135deg,var(--wb-accent),var(--wb-purple));border-color:transparent;color:var(--wb-on-accent)}
.wb-tape-list{gap:6px}
.wb-tape-item{background:transparent;border:1px solid transparent;border-radius:9px;color:var(--wb-muted)}
.wb-tape-item:hover{background:var(--wb-card-soft)}
.wb-tape-item.is-active{background:linear-gradient(135deg,rgba(37,99,235,.22),rgba(124,58,237,.18));border-color:var(--wb-accent-hover);box-shadow:0 8px 20px rgba(37,99,235,.14)}
.wb-tape-item-title{color:var(--wb-text)}
.wb-tape-item-meta{color:var(--wb-dim)}
.wb-chat{background:transparent}
.wb-msg-role{color:var(--wb-dim)}
.wb-msg.is-user .wb-msg-body{background:var(--wb-card-soft);border:1px solid var(--wb-border-strong);border-radius:10px}
.wb-msg.is-assistant .wb-msg-body{background:var(--wb-card);border:1px solid var(--wb-border);border-radius:10px}
.wb-msg-body{color:var(--wb-text)}
.wb-chat-input{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-text);border-radius:10px}
.wb-chat-input:focus{border-color:var(--wb-accent-hover);box-shadow:0 0 0 3px rgba(59,130,246,.14)}
.wb-chat-hint{color:var(--wb-dim)}
.wb-model-label{color:var(--wb-muted)}
.wb-news-hero{border-bottom-color:var(--wb-border)}
.wb-news-title-main{color:var(--wb-on-accent)}
.wb-news-title-main span{color:var(--wb-violet)}
.wb-news-item{border-bottom-color:var(--wb-card-strong)}
.wb-news-item:hover{background:var(--wb-card)}
.wb-news-thumb{background:var(--wb-card-soft);border-radius:8px}
.wb-news-fallback{background:rgba(34,211,238,.08);border-color:var(--wb-border-strong);color:var(--wb-cyan);border-radius:8px}
.wb-news-title{color:var(--wb-text)}
.wb-news-meta{color:var(--wb-dim)}
.wb-graph-canvas{background:radial-gradient(circle at 50% 40%,var(--wb-bg-panel),var(--wb-bg) 70%);border-color:var(--wb-border);border-radius:12px}
.wb-graph-stats{color:var(--wb-muted)}
.wb-edge{stroke:var(--wb-border-strong)}
.wb-node circle{stroke:var(--wb-bg)}
.wb-node-label{fill:var(--wb-muted)}
.wb-legend{color:var(--wb-dim)}
.wb-media-card{background:var(--wb-card);color:var(--wb-text);border-color:var(--wb-border)}
.wb-media-card:hover{border-color:var(--wb-accent-hover)}
.wb-media-thumb-wrap,.wb-media-thumb{background:var(--wb-bg-panel)}
.wb-media-meta{color:var(--wb-dim)}
.wb-media-empty{background:rgba(15,23,38,.6);border-color:var(--wb-border-strong)}
.wb-lightbox{background:rgba(3,7,14,.92)}
.wb-lightbox-panel{background:var(--wb-card);border-color:var(--wb-border-strong);border-radius:12px}
.wb-lightbox-head,.wb-lightbox-foot{border-color:var(--wb-border)}
.wb-lightbox-media{background:var(--wb-bg)}
.wb-modal{background:rgba(3,7,14,.72)}
.wb-modal-panel{background:var(--wb-card);border-color:var(--wb-border-strong);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.55)}
.wb-toast{background:var(--wb-card);border-color:var(--wb-border-strong);color:var(--wb-text);border-radius:9px;box-shadow:0 12px 32px rgba(0,0,0,.45)}
.wb-toast.is-success{border-color:var(--wb-cyan);color:var(--wb-cyan)}
.wb-toast.is-error{border-color:var(--wb-red);color:var(--wb-red-soft)}
.wb-detail{background:var(--wb-bg)}
.wb-detail-h{color:var(--wb-green)}
.wb-code{background:var(--wb-bg-panel);border-color:var(--wb-border);color:var(--wb-green);border-radius:8px}
.wb-inline-code{background:rgba(34,211,238,.1);color:var(--wb-cyan);border-radius:4px}
.wb-md a{color:var(--wb-cyan)}
.wb-wincontrols.is-wb button{color:var(--wb-text)}
.wb-wincontrols.is-wb button:hover{background:rgba(255,255,255,.08);color:var(--wb-on-accent)}
.wb-wincontrols.is-wb .wc-close:hover{background:#e81123;color:var(--wb-on-accent)}
/* 聊天消息在深色下：外层透明，气泡由 body 承载 */
.wb-msg{background:transparent;border:0;padding:0}
.wb-msg.is-user,.wb-msg.is-assistant{background:transparent;border:0}
.wb-msg-body{padding:9px 11px;border-radius:10px;color:var(--wb-text);background:var(--wb-card);border:1px solid var(--wb-border)}
.wb-msg.is-user .wb-msg-body{background:var(--wb-card-soft);border-color:var(--wb-border-strong)}
.wb-md{color:var(--wb-text)}
.wb-md-h{color:var(--wb-on-accent)}
.wb-tool-chip{border-color:var(--wb-border-strong);color:var(--wb-cyan);background:rgba(34,211,238,.08);border-radius:5px}
.wb-chat-note{border-color:var(--wb-border-strong);color:var(--wb-muted)}
.wb-chat-warn{background:rgba(234,88,12,.12);border-bottom-color:rgba(234,88,12,.35);color:var(--wb-warn-text)}
.wb-chat-warn-text span{color:var(--wb-warn-text);opacity:.85}
.wb-chat-compose{border-top-color:var(--wb-border)}
.wb-model-label{border-color:var(--wb-border-strong);color:var(--wb-cyan);border-radius:6px}
.wb-scroll::-webkit-scrollbar,.wb-right::-webkit-scrollbar,.wb-tape-list::-webkit-scrollbar{width:9px;height:9px}
.wb-scroll::-webkit-scrollbar-track,.wb-right::-webkit-scrollbar-track{background:var(--wb-bg)}
.wb-scroll::-webkit-scrollbar-thumb,.wb-right::-webkit-scrollbar-thumb{background:var(--wb-border-strong);border-radius:5px}
.wb-scroll::-webkit-scrollbar-thumb:hover,.wb-right::-webkit-scrollbar-thumb:hover{background:var(--wb-accent-hover)}
/* 工作区按钮/弹窗 */
.wb-workspace-btn{position:relative;width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 26px 8px 9px;background:var(--wb-card);border:1px solid var(--wb-border-strong);border-radius:8px;color:var(--wb-text);cursor:pointer;text-align:left;transition:border-color .15s,background .15s}
.wb-workspace-btn:hover{border-color:var(--wb-accent-hover);background:var(--wb-card-soft)}
.wb-workspace-name{font-size:12px;font-weight:700;color:var(--wb-cyan);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-workspace-path{font-size:10px;color:var(--wb-dim);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-workspace-chev{position:absolute;right:8px;top:9px;color:var(--wb-dim);font-size:12px}
.wb-workspace-panel{width:min(760px,94vw);max-height:86%}
.wb-workspace-list{display:flex;flex-direction:column;gap:8px;margin:12px 0;max-height:420px;overflow:auto}
.wb-workspace-item{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--wb-border-strong);border-radius:9px;background:var(--wb-bg-panel);color:var(--wb-text);text-align:left;cursor:pointer}
.wb-workspace-item:hover:not(:disabled){border-color:var(--wb-accent-hover);background:var(--wb-card-soft)}
.wb-workspace-item.is-current{border-color:var(--wb-accent-hover);background:rgba(37,99,235,.14)}
.wb-workspace-item:disabled{opacity:.55;cursor:not-allowed}
.wb-workspace-item strong{font-size:13px}
.wb-workspace-item small{font-size:11px;color:var(--wb-muted);overflow-wrap:anywhere}
.wb-workspace-item em{font-size:10px;color:var(--wb-dim);font-style:normal}
.wb-workspace-add{display:flex;align-items:center;gap:10px;margin-top:10px;border-top:1px solid var(--wb-border);padding-top:12px}
/* 代码工作视图 */
.wb-code-toggle{border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-muted);border-radius:7px;font-size:11px;padding:3px 8px;cursor:pointer;white-space:nowrap}
.wb-code-toggle:hover,.wb-code-toggle.is-open{border-color:var(--wb-cyan);color:var(--wb-cyan)}
.wb-code-panel{flex:0 0 300px;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--wb-border);background:var(--wb-bg-panel)}
.wb-code-head{height:38px;flex:0 0 38px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid var(--wb-border)}
.wb-code-title{font-size:12px;font-weight:700;color:var(--wb-cyan);letter-spacing:.5px;white-space:nowrap}
.wb-code-path{font-size:10px;color:var(--wb-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.wb-code-actions{display:flex;gap:6px;flex:0 0 auto}
.wb-code-body{flex:1;min-height:0;display:flex}
.wb-code-tree{flex:1;min-width:0;overflow:auto;padding:8px 6px;font-family:Consolas,"Courier New",monospace;font-size:11px}
.wb-tree-row{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;cursor:pointer;white-space:nowrap;color:var(--wb-muted)}
.wb-tree-row:hover{background:var(--wb-card-soft)}
.wb-tree-row.is-file{cursor:default}
.wb-tree-caret{width:10px;flex:0 0 10px;color:var(--wb-dim)}
.wb-tree-kind{width:12px;flex:0 0 12px;color:var(--wb-dim)}
.wb-tree-kind.is-dir{color:var(--wb-cyan)}
.wb-tree-name{overflow:hidden;text-overflow:ellipsis}
.wb-tree-size{margin-left:auto;color:var(--wb-muted);font-size:10px;padding-left:8px}
.wb-tree-children{border-left:1px solid var(--wb-border);margin-left:8px}
.wb-tree-empty{color:var(--wb-dim);padding:4px 6px}
.wb-code-analysis{width:220px;flex:0 0 220px;border-left:1px solid var(--wb-border);padding:10px;overflow:auto}
.wb-code-stats{display:grid;grid-template-columns:1fr auto;gap:3px 8px;font-size:11px;color:var(--wb-muted);margin-bottom:10px}
.wb-code-stats strong{color:var(--wb-text);font-variant-numeric:tabular-nums}
.wb-code-progress-label{display:flex;justify-content:space-between;font-size:10px;color:var(--wb-dim);margin-top:8px}
.wb-code-progress{height:5px;border-radius:3px;background:var(--wb-card-strong);overflow:hidden;margin-top:4px}
.wb-code-progress i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--wb-cyan),var(--wb-accent-hover));transition:width .25s}
.wb-code-sub{font-size:10px;color:var(--wb-dim);margin-top:8px}
.wb-code-types{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.wb-code-types span{font-size:9px;border:1px solid var(--wb-border-strong);border-radius:4px;padding:1px 4px;color:var(--wb-accent-soft);background:rgba(59,130,246,.08)}
.wb-code-error{font-size:10px;color:var(--wb-red-soft);margin-top:8px;line-height:1.4}
/* 代码视图增强：默认展开、更大的树与进度 */
.wb-chat-log{min-height:120px}
.wb-code-panel{flex:0 0 320px}
.wb-code-tree{font-size:12px}
.wb-tree-row{padding:4px 6px}
.wb-tree-root{display:flex;align-items:center;gap:6px;padding:4px 6px;border-bottom:1px dashed var(--wb-border);margin-bottom:4px}
.wb-tree-root-mark{color:var(--wb-green)}
.wb-tree-root-name{font-weight:700;color:var(--wb-text);white-space:nowrap}
.wb-tree-root-path{margin-left:auto;color:var(--wb-muted);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-tree-root-list{border-left:1px solid var(--wb-border);margin-left:8px;padding-left:4px}
.wb-code-analysis{width:250px;flex:0 0 250px;font-size:12px}
.wb-code-analysis-title{font-size:11px;font-weight:700;color:var(--wb-green);letter-spacing:1px;margin-bottom:8px}
.wb-code-progress-label{font-size:11px}
.wb-code-progress{height:7px}
.wb-code-stats{font-size:12px}
.wb-code-stats strong{font-size:13px}
.wb-code-exec{margin-top:14px;border-top:1px solid var(--wb-border);padding-top:10px}
.wb-code-exec-title{font-size:11px;font-weight:700;color:var(--wb-green);letter-spacing:1px;margin-bottom:6px}
.wb-exec-root{font-size:11px;color:var(--wb-text);margin-bottom:4px}
.wb-exec-node{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--wb-muted);padding:2px 0}
.wb-exec-branch{color:var(--wb-muted);font-family:Consolas,monospace}
.wb-exec-name{color:var(--wb-accent-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.wb-exec-time{font-size:9px;color:var(--wb-muted)}
.wb-exec-empty{font-size:10px;color:var(--wb-dim);line-height:1.4}
.wb-code-panel.is-full{position:fixed;left:198px;right:0;bottom:0;height:min(60vh,560px);z-index:1250;flex:none;border-top:1px solid var(--wb-accent-hover);box-shadow:0 -20px 50px rgba(0,0,0,.45)}
.wb-code-panel.is-full .wb-code-tree{font-size:12px}
.wb-code-panel.is-full .wb-code-analysis{width:300px;flex:0 0 300px}
@keyframes wbPulse{0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes wbSpin{to{transform:rotate(360deg)}}
.wb-code-live{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:var(--wb-cyan);white-space:nowrap}
.wb-code-live i{width:6px;height:6px;border-radius:50%;background:var(--wb-cyan);animation:wbPulse 1.2s infinite}
.wb-code-live.is-thinking{color:var(--wb-green)}
.wb-code-live.is-thinking i{background:var(--wb-green)}
.wb-exec-thinking{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--wb-green);padding:3px 0}
.wb-exec-spinner{width:8px;height:8px;border:2px solid rgba(198,255,74,.25);border-top-color:var(--wb-green);border-radius:50%;animation:wbSpin .8s linear infinite;flex:0 0 8px}
.wb-exec-latest{font-size:10px;color:var(--wb-muted);line-height:1.5;margin-top:8px;border-left:2px solid var(--wb-accent-hover);padding-left:6px;overflow-wrap:anywhere}
.wb-exec-latest span{color:var(--wb-dim)}
@keyframes wbIndeterminate{0%{left:-35%}100%{left:100%}}
.wb-code-progress.is-running{position:relative}
.wb-code-progress.is-running i{width:35%!important;position:absolute;animation:wbIndeterminate 1.1s ease-in-out infinite}
/* 代码视图左侧：工作过程 / 文件树 */
.wb-code-left{flex:1;min-width:0;display:flex;flex-direction:column}
.wb-code-tabs{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--wb-border);flex:0 0 auto}
.wb-code-tab{border:1px solid var(--wb-border-strong);background:var(--wb-card);color:var(--wb-muted);border-radius:6px;font-size:11px;padding:3px 8px;cursor:pointer}
.wb-code-tab:hover{border-color:var(--wb-accent-hover);color:var(--wb-text)}
.wb-code-tab.is-active{border-color:var(--wb-cyan);color:var(--wb-cyan);background:rgba(34,211,238,.08)}
.wb-code-tab-count{margin-left:auto;font-size:10px;color:var(--wb-muted)}
.wb-process{flex:1;min-height:0;overflow:auto;padding:8px 10px;font-size:12px;line-height:1.65}
.wb-proc-turn{font-size:11px;font-weight:700;color:var(--wb-green);margin:8px 0 4px;letter-spacing:.5px}
.wb-proc-item{display:flex;align-items:flex-start;gap:6px;padding:2px 0}
.wb-proc-role{flex:0 0 32px;font-size:10px;color:var(--wb-dim);line-height:1.8}
.wb-proc-text{color:var(--wb-muted);overflow-wrap:anywhere}
.wb-proc-item.is-user .wb-proc-text,.wb-proc-item.is-assistant .wb-proc-text{color:var(--wb-text)}
.wb-proc-branch{color:var(--wb-muted);font-family:Consolas,monospace;flex:0 0 10px}
.wb-proc-tool{color:var(--wb-cyan);font-family:Consolas,monospace;font-size:11px;white-space:nowrap}
.wb-proc-args{margin-left:4px;color:var(--wb-accent-soft);font-family:Consolas,monospace;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.wb-proc-result{color:var(--wb-muted);font-size:11px;overflow-wrap:anywhere}
.wb-proc-item.is-result.is-error .wb-proc-result{color:var(--wb-red-soft)}
.wb-proc-command{color:var(--wb-green);font-family:Consolas,monospace;font-size:11px;overflow-wrap:anywhere}
.wb-proc-meta{font-size:10px;color:var(--wb-dim);padding:2px 0 2px 38px}
.wb-proc-thinking{display:flex;align-items:center;gap:6px;color:var(--wb-green);font-size:11px;padding:4px 0 4px 38px}
.wb-proc-empty{color:var(--wb-dim);padding:10px;font-size:12px;line-height:1.6}
/* 最左侧导航：蓝色粗体（含 Workbench） */
.wb-logo-text{color:var(--wb-accent-soft)!important;font-weight:800!important}
.wb-nav-item{color:var(--wb-accent-soft);font-weight:700}
.wb-nav-ico{color:var(--wb-accent-hover);opacity:1}
.wb-nav-title{color:var(--wb-accent-soft);font-weight:800}
.wb-nav-sub{color:var(--wb-muted);font-weight:500;opacity:1}
.wb-nav-item:hover{color:var(--wb-accent-soft)}
.wb-nav-item.is-active{background:rgba(59,130,246,.14);color:var(--wb-accent-soft);border:1px solid rgba(59,130,246,.55);box-shadow:inset 0 0 18px rgba(37,99,235,.14);transform:none}
.wb-nav-item.is-active .wb-nav-title,.wb-nav-item.is-active .wb-nav-ico{color:var(--wb-accent-soft);opacity:1}
.wb-nav-item.is-active .wb-nav-sub{color:var(--wb-muted);opacity:1}
.wb-nav-item.is-active > *{transform:none}
.wb-exit{color:var(--wb-accent-soft);font-weight:700;border-color:var(--wb-accent-hover)}
.wb-exit:hover{color:var(--wb-accent-soft);border-color:var(--wb-accent-soft)}
.wb-nav-note{color:var(--wb-accent-hover);font-weight:700}
/* 监控页：实时仪表盘 */
.wb-monitor-page{max-width:1600px}
.wb-monitor-actions{display:flex;gap:8px;align-items:center}
.wb-monitor-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:4px 0 14px}
.wb-monitor-stat{background:var(--wb-card);border:1px solid var(--wb-border);border-radius:12px;padding:11px 13px;display:flex;flex-direction:column;gap:4px;box-shadow:0 10px 28px rgba(0,0,0,.18)}
.wb-monitor-stat-label{font-size:10px;color:var(--wb-dim);letter-spacing:1px}
.wb-monitor-stat-value{font-size:15px;font-weight:800;color:var(--wb-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-monitor-stat-value.is-ok{color:var(--wb-green)}
.wb-monitor-stat-value.is-running{color:var(--wb-cyan)}
.wb-monitor-stat-value.is-muted{color:var(--wb-muted)}
.wb-monitor-stat small{font-size:10px;color:var(--wb-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-monitor-layout{display:grid;grid-template-columns:1.35fr 1fr;gap:12px;align-items:start}
.wb-monitor-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.wb-monitor-card{background:var(--wb-card);border:1px solid var(--wb-border);border-radius:12px;padding:14px;box-shadow:0 10px 28px rgba(0,0,0,.18)}
.wb-monitor-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.wb-monitor-card-title{font-size:12px;font-weight:800;color:var(--wb-purple-soft);letter-spacing:.5px}
.wb-monitor-count{font-size:10px;color:var(--wb-dim)}
.wb-monitor-process{max-height:360px;overflow:auto;padding-right:4px;font-size:11px;line-height:1.6}
.wb-monitor-sub{font-size:11px;color:var(--wb-purple-soft);margin:10px 0 4px;font-weight:700}
.wb-monitor-usage{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:12px;color:var(--wb-muted)}
.wb-monitor-usage strong{color:var(--wb-text);font-variant-numeric:tabular-nums}
.wb-monitor-account-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--wb-muted);padding:3px 0}
.wb-monitor-account-row strong{color:var(--wb-green);font-size:14px;font-variant-numeric:tabular-nums}
.wb-monitor-account-row:nth-of-type(2) strong{color:var(--wb-orange)}
.wb-monitor-health{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--wb-muted);margin-bottom:8px}
.wb-monitor-health i{width:7px;height:7px;border-radius:50%;background:var(--wb-green);box-shadow:0 0 8px var(--wb-green)}
.wb-monitor-health.is-error i{background:var(--wb-red);box-shadow:0 0 8px var(--wb-red)}
.wb-monitor-health.is-muted i{background:var(--wb-dim);box-shadow:none}
.wb-monitor-card .wb-kv dt{color:var(--wb-dim)}
.wb-monitor-card .wb-kv dd{color:var(--wb-text)}
.wb-bar-label{color:var(--wb-muted)}
.wb-bar-value{color:var(--wb-muted)}
.wb-bar-track{height:8px;background:var(--wb-card-strong);border:1px solid var(--wb-border-strong);border-radius:4px;overflow:hidden}
.wb-bar-fill{height:100%;border-radius:4px}
@media (max-width:1100px){.wb-monitor-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.wb-monitor-layout{grid-template-columns:1fr}}

/* 确认弹窗 */
.wb-confirm-panel{width:min(520px,92%)}
.wb-confirm-text{font-size:13px;line-height:1.7;color:var(--wb-muted);margin:10px 0 0}
/* 卡片待复核徽标 */
.wb-card-badges{display:flex;align-items:center;gap:6px}
.wb-review-status{font-size:10px;padding:2px 6px;border-radius:999px;border:1px solid var(--wb-border-strong);color:var(--wb-muted);white-space:nowrap}
.wb-review-status.is-pending{color:var(--wb-orange);border-color:var(--wb-orange-deep);background:rgba(234,88,12,.1)}
/* 记忆审核 */
.wb-review{margin:18px 0 10px;border:1px solid var(--wb-border);border-radius:12px;background:var(--wb-card);padding:16px}
.wb-review-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
.wb-review-title{font-size:16px;font-weight:800;color:var(--wb-text);margin:3px 0 4px}
.wb-review-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.wb-review-empty{padding:14px;border:1px dashed var(--wb-border-strong);border-radius:8px;color:var(--wb-dim);font-size:12px}
.wb-review-list{display:flex;flex-direction:column;gap:8px}
.wb-review-item{display:flex;align-items:center;gap:12px;justify-content:space-between;border:1px solid var(--wb-border);border-radius:10px;padding:11px 12px;background:var(--wb-card-soft)}
.wb-review-item-main{min-width:0}
.wb-review-item-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wb-review-item-title{border:0;background:transparent;padding:0;color:var(--wb-text);font-size:13px;font-weight:700;cursor:pointer;text-align:left}
.wb-review-item-title:hover{color:var(--wb-accent-soft)}
.wb-review-item-summary{font-size:12px;color:var(--wb-muted);margin:5px 0;line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.wb-review-item-meta{display:flex;gap:10px;font-size:10px;color:var(--wb-dim);flex-wrap:wrap}
.wb-review-item-actions{display:flex;gap:6px;flex-shrink:0}
.wb-review-hint{font-size:11px;color:var(--wb-dim);line-height:1.6;margin-top:8px}
.wb-review-dup-head{margin-top:20px;padding-top:16px;border-top:1px solid var(--wb-border)}
.wb-review-groups{display:flex;flex-direction:column;gap:10px}
.wb-review-group{border:1px solid var(--wb-border);border-radius:10px;padding:10px 12px;background:var(--wb-card-soft)}
.wb-review-group-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.wb-review-group-score{font-size:11px;color:var(--wb-orange)}
.wb-review-group-item{display:flex;align-items:flex-start;gap:9px;padding:7px 8px;border-radius:7px;cursor:pointer;border:1px solid transparent}
.wb-review-group-item.is-keep{border-color:var(--wb-accent-border);background:rgba(37,99,235,.06)}
.wb-review-group-main{display:flex;flex-direction:column;gap:3px;min-width:0}
.wb-review-group-main strong{font-size:12px;color:var(--wb-text)}
.wb-review-group-main small{font-size:11px;color:var(--wb-muted);line-height:1.5}
.wb-review-keep{margin-left:auto;font-size:10px;color:var(--wb-accent-soft);white-space:nowrap}
/* 问记忆库 */
.wb-ask{margin:14px 0 4px;border:1px solid var(--wb-border);border-radius:12px;background:linear-gradient(180deg,var(--wb-card),var(--wb-card-soft));padding:15px 16px}
.wb-ask-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}
.wb-ask-title{font-size:15px;font-weight:800;color:var(--wb-text);margin:3px 0}
.wb-ask-row{display:flex;gap:8px}
.wb-ask-input{flex:1;min-width:0}
.wb-ask-loading{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--wb-muted);padding:12px 2px}
.wb-ask-empty{font-size:12px;color:var(--wb-dim);padding:10px 2px 2px}
.wb-ask-error{margin-top:10px;font-size:12px;color:var(--wb-red);border:1px solid var(--wb-red-deep);border-radius:8px;padding:9px 10px}
.wb-ask-answer{margin-top:12px;border-top:1px solid var(--wb-border);padding-top:12px}
.wb-ask-answer-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.wb-ask-cites{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.wb-ask-cites-title{font-size:11px;color:var(--wb-dim)}
.wb-ask-cite{display:grid;grid-template-columns:34px 1fr;gap:2px 8px;text-align:left;border:1px solid var(--wb-border);background:var(--wb-card-soft);border-radius:8px;padding:7px 9px;cursor:pointer;color:var(--wb-text)}
.wb-ask-cite:hover{border-color:var(--wb-accent-border)}
.wb-ask-cite-index{grid-row:1/3;color:var(--wb-accent-soft);font-weight:800;font-size:12px}
.wb-ask-cite-title{font-size:12px;font-weight:700}
.wb-ask-cite-path{font-size:10px;color:var(--wb-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 文件预览与 diff */
.wb-preview-panel{position:absolute;inset:18px;display:flex;flex-direction:column;background:var(--wb-bg-deep);border:1px solid var(--wb-border-strong);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}
.wb-preview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 15px;border-bottom:1px solid var(--wb-border);background:var(--wb-card)}
.wb-preview-title-wrap{min-width:0;display:flex;flex-direction:column;gap:3px}
.wb-preview-title{font-size:14px;color:var(--wb-text)}
.wb-preview-path{font-size:10px;color:var(--wb-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-preview-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.wb-preview-body{flex:1;min-height:0;overflow:auto;padding:12px 15px;background:var(--wb-bg-deep)}
.wb-preview-code,.wb-diff{margin:0;font-family:Consolas,"Courier New",monospace;font-size:12px;line-height:1.6;color:var(--wb-text);white-space:pre;tab-size:2}
.wb-diff-line{padding:0 4px;border-left:3px solid transparent;white-space:pre}
.wb-diff-line.is-add{background:rgba(16,185,129,.13);border-left-color:var(--wb-green)}
.wb-diff-line.is-del{background:rgba(239,68,68,.13);border-left-color:var(--wb-red)}
.wb-diff-line.is-meta{color:var(--wb-accent-soft);background:rgba(37,99,235,.08)}
.wb-preview-empty{display:flex;align-items:center;gap:8px;color:var(--wb-dim);font-size:12px;padding:12px 2px}
.wb-preview-error{color:var(--wb-red);font-size:12px;line-height:1.6;padding:10px 2px}
.wb-preview-foot{display:flex;align-items:center;gap:12px;padding:8px 15px;border-top:1px solid var(--wb-border);font-size:10px;color:var(--wb-dim);background:var(--wb-card)}
.wb-preview-warn{color:var(--wb-orange)}
/* 成本 */
.wb-cost-strong{color:var(--wb-green)!important}
.wb-cost-over{color:var(--wb-red)!important}
.wb-cost-bar{height:6px;background:var(--wb-card-strong);border:1px solid var(--wb-border-strong);border-radius:3px;overflow:hidden;margin:6px 0}
.wb-cost-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--wb-green),var(--wb-cyan))}
.wb-cost-bar i.is-over{background:linear-gradient(90deg,var(--wb-orange),var(--wb-red))}
@media (max-width:900px){.wb-review-head{flex-direction:column}.wb-review-item{flex-direction:column;align-items:stretch}.wb-ask-row{flex-direction:column}.wb-preview-panel{inset:8px}}

`;
