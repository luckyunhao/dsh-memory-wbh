    // ── 共享 UI 状态 ────────────────────────────────────────────────────────
    const ui = {
      // 默认直接进入工作台：它铺满整个 DSH 窗口，原生界面放在「退出工作台」后面。
      open: true,
      listeners: new Set(),
      setOpen(next) {
        if (this.open === next) return;
        this.open = next;
        for (const listener of [...this.listeners]) {
          try { listener(); } catch {}
        }
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      },
    };

    function useOpen() {
      return React.useSyncExternalStore(ui.subscribe.bind(ui), () => ui.open, () => false);
    }

    // ── 桌面版右上角原生窗口按钮（最小化/最大化/关闭）皮肤同步 ──────────────
    // DSH 的 preload 会用一个探测节点读取 body 上的 --dsw-specific-sidebar-fill
    // 和 --dsw-alias-label-primary，再通过 windows-appearance IPC 设置
    // Windows titleBarOverlay 的颜色。工作台打开时临时覆盖这两个变量，
    // 让原生按钮区域变成工作台的深色背景 + 浅色图标；关闭时恢复。
    const DESKTOP_CAPTION_KEYS = ['--dsw-specific-sidebar-fill', '--dsw-alias-label-primary'];
    const DESKTOP_CAPTION_VALUES = [THEME.captionBg, THEME.text];
    const desktopCaptionState = { saved: null };

    function syncDesktopCaption(active) {
      if (typeof document === 'undefined' || !document.body) return;
      const root = document.documentElement;
      // 只在 Windows 桌面壳里生效（preload 会写这个标记）；web 预览不做任何事。
      if (!root || !root.hasAttribute('data-windows-titlebar')) return;
      const body = document.body;
      if (active) {
        if (desktopCaptionState.saved === null) {
          desktopCaptionState.saved = DESKTOP_CAPTION_KEYS.map((key) => body.style.getPropertyValue(key));
        }
        DESKTOP_CAPTION_KEYS.forEach((key, index) => {
          body.style.setProperty(key, DESKTOP_CAPTION_VALUES[index]);
        });
        // 修改 body style 会触发 preload 的 MutationObserver，从而重新发送颜色。
        body.classList.add('wb-native-caption');
      } else {
        if (desktopCaptionState.saved !== null) {
          DESKTOP_CAPTION_KEYS.forEach((key, index) => {
            const previous = desktopCaptionState.saved[index];
            if (previous) body.style.setProperty(key, previous);
            else body.style.removeProperty(key);
          });
          desktopCaptionState.saved = null;
        }
        body.classList.remove('wb-native-caption');
      }
    }

    // ── 自绘窗口按钮（桌面版，配合 app.asar 去掉原生 titleBarOverlay）─────────
    const WIN_CONTROL_STYLE = `
.wb-wincontrols{position:fixed;top:0;right:0;z-index:1300;display:flex;height:40px;-webkit-app-region:no-drag;user-select:none}
.wb-wincontrols button{width:46px;height:40px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;padding:0;color:var(--dsw-alias-label-primary,#0f1115);cursor:default;transition:background .12s,color .12s}
.wb-wincontrols button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,139,170,.12));color:var(--dsw-alias-label-primary,#0f1115)}
.wb-wincontrols button:active{background:var(--dsw-alias-interactive-bg-active,rgba(127,139,170,.2))}
.wb-wincontrols .wc-close:hover{background:#e81123;color:#fff}
.wb-wincontrols.is-wb button{color:#e8eefc}
.wb-wincontrols.is-wb button:hover{background:rgba(255,255,255,.08);color:#fff}
.wb-wincontrols.is-wb .wc-close:hover{background:#e81123;color:#fff}
`;

    function WinIcon({ name }) {
      const common = { width: 10, height: 10, viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', strokeWidth: 1 };
      if (name === 'min') return h('svg', common, h('path', { d: 'M1 5.5h8' }));
      if (name === 'max') return h('svg', common, h('rect', { x: 1.5, y: 1.5, width: 7, height: 7 }));
      if (name === 'restore') return h('svg', common, h('path', { d: 'M3 2.5h4.5V7' }), h('rect', { x: 1.5, y: 3.5, width: 4.5, height: 4.5 }));
      return h('svg', common, h('path', { d: 'M2 2l6 6M8 2L2 8' }));
    }

    function WindowControls() {
      const api = typeof window !== 'undefined' ? window.dshWindowControls : undefined;
      const open = useOpen();
      const [maximized, setMaximized] = React.useState(false);
      React.useEffect(() => {
        if (!api || typeof api.getState !== 'function') return undefined;
        let alive = true;
        api.getState().then((state) => {
          if (alive && state && typeof state.maximized === 'boolean') setMaximized(state.maximized);
        }).catch(() => {});
        const off = typeof api.onState === 'function'
          ? api.onState((value) => setMaximized(Boolean(value)))
          : undefined;
        return () => {
          alive = false;
          if (typeof off === 'function') off();
        };
      }, [api]);
      if (!api) return null;
      const run = (fn) => {
        try {
          const result = fn();
          if (result && typeof result.then === 'function') {
            result.then((state) => {
              if (state && typeof state.maximized === 'boolean') setMaximized(state.maximized);
            }).catch(() => {});
          }
        } catch {}
      };
      return h(React.Fragment, null,
        h('style', null, WIN_CONTROL_STYLE),
        h('div', { className: `wb-wincontrols${open ? ' is-wb' : ''}`, 'aria-label': '窗口控制' },
          h('button', { type: 'button', title: '最小化', 'aria-label': '最小化', onClick: () => run(() => api.minimize()) }, h(WinIcon, { name: 'min' })),
          h('button', { type: 'button', title: maximized ? '还原' : '最大化', 'aria-label': maximized ? '还原' : '最大化', onClick: () => run(() => api.toggleMaximize()) }, h(WinIcon, { name: maximized ? 'restore' : 'max' })),
          h('button', { type: 'button', className: 'wc-close', title: '关闭', 'aria-label': '关闭', onClick: () => run(() => api.close()) }, h(WinIcon, { name: 'close' })),
        ),
      );
    }
