window.__ModuleLoader__.load({
  id: 'dsh-memory-kb',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const API = '/dsh-memory-kb/api';

    // ── 主题色板（唯一来源：CSS 变量与 JS 调色板都从这里取值）──────────────
    const THEME = {
      bg: '#070b12',
      bgSoft: '#0a101a',
      bgDeep: '#080d15',
      bgPanel: '#0b1220',
      captionBg: '#080c18',
      card: '#0f1726',
      cardSoft: '#111b2c',
      cardStrong: '#162033',
      border: '#1e2b40',
      borderStrong: '#25324a',
      text: '#e8eefc',
      textStrong: '#f8fafc',
      muted: '#94a3b8',
      dim: '#64748b',
      onAccent: '#ffffff',
      accent: '#2563eb',
      accentHover: '#3b82f6',
      accentSoft: '#93c5fd',
      accentBorder: 'rgba(59,130,246,.35)',
      cyan: '#22d3ee',
      cyanDeep: '#0891b2',
      green: '#c6ff4a',
      purple: '#7c3aed',
      purpleSoft: '#a78bfa',
      violet: '#8b5cf6',
      pink: '#f472b6',
      pinkDeep: '#db2777',
      orange: '#fb923c',
      orangeDeep: '#ea580c',
      red: '#ff4d5e',
      redSoft: '#ff8a95',
      redDeep: '#dc2626',
      warnBg: 'rgba(234,88,12,.12)',
      warnBorder: 'rgba(234,88,12,.35)',
      warnText: '#fdba74',
    };

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

    // ── 基础工具 ────────────────────────────────────────────────────────────
    async function api(path, options = {}) {
      const response = await fetch(API + path, {
        cache: 'no-store',
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    }

    function fmtDate(value, withTime = false) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('zh-CN', withTime
        ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { month: '2-digit', day: '2-digit' });
    }

    function fmtTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    function fmtAge(value) {
      if (!value) return '';
      const diff = Date.now() - Number(value);
      if (!Number.isFinite(diff) || diff < 0) return '';
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes} 分钟`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} 小时`;
      return `${Math.floor(hours / 24)} 天`;
    }

    function truncate(text, max) {
      const value = String(text ?? '');
      return value.length <= max ? value : value.slice(0, max - 1).trimEnd() + '…';
    }

    // ── 成本估算 ────────────────────────────────────────────────────────────
    const DEFAULT_COST_RATES = { cacheRead: 0.2, input: 2, output: 3 };
    function costRates(settings) {
      const num = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
      };
      return {
        cacheRead: num(settings?.priceCacheRead, DEFAULT_COST_RATES.cacheRead),
        input: num(settings?.priceInput, DEFAULT_COST_RATES.input),
        output: num(settings?.priceOutput, DEFAULT_COST_RATES.output),
        dailyBudget: num(settings?.dailyBudget, 0),
      };
    }
    /** 按 token × 单价（元/百万 token）估算成本，单位元。 */
    function estimateUsageCost(usage, settings) {
      if (!usage) return null;
      const rates = costRates(settings);
      const cacheReadTokens = Number(usage.cacheReadTokens || 0);
      const inputTokens = Number(usage.uncachedInputTokens || 0) + Number(usage.cacheWriteTokens || 0);
      const outputTokens = Number(usage.outputTokens || 0);
      const cacheRead = (cacheReadTokens / 1e6) * rates.cacheRead;
      const input = (inputTokens / 1e6) * rates.input;
      const output = (outputTokens / 1e6) * rates.output;
      return { cacheRead, input, output, total: cacheRead + input + output, rates };
    }
    function fmtMoney(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '—';
      return `¥${n.toFixed(n >= 1 ? 2 : 4)}`;
    }
    function downloadText(filename, text, mime = 'text/markdown;charset=utf-8') {
      const blob = new Blob([String(text ?? '')], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || 'download.txt';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    const TYPE_META = {
      project: { label: '项目', color: THEME.accentHover },
      preference: { label: '偏好', color: THEME.cyan },
      decision: { label: '决策', color: THEME.violet },
      fact: { label: '事实', color: THEME.accentSoft },
      reference: { label: '参考', color: THEME.pink },
      knowledge: { label: '知识', color: THEME.violet },
      skill: { label: '技能', color: THEME.green },
      news: { label: '新闻', color: THEME.orange },
      profile: { label: '偏好', color: THEME.cyan },
      memory: { label: '记忆', color: THEME.accentSoft },
      tag: { label: '标签', color: THEME.dim },
    };

    const TAG_LABELS = { project: '项目', fact: '事实', preference: '偏好', decision: '决策', reference: '参考', knowledge: '知识', skill: '技能', news: '新闻' };
    function tagLabel(tag) { return TAG_LABELS[tag] || tag; }

    function typeMeta(item) {
      return TYPE_META[item?.type] || TYPE_META[item?.kind] || TYPE_META.fact;
    }

    function useUiSession(uiSession) {
      const [state, setState] = React.useState({ sessionId: null, session: null });
      React.useEffect(() => {
        const store = uiSession?.adapter?.current;
        if (!store || typeof store.getSnapshot !== 'function') return undefined;
        const read = () => {
          try {
            const binding = store.getSnapshot();
            const session = binding?.hooks?.session ?? null;
            let snapshot = null;
            try { if (session && typeof session.getSnapshot === 'function') snapshot = session.getSnapshot(); } catch {}
            const candidate = (snapshot && typeof snapshot === 'object' && 'sessionId' in snapshot ? snapshot.sessionId : undefined)
              ?? (typeof binding?.key === 'string' ? binding.key : undefined)
              ?? (typeof binding?.props?.sessionId === 'string' ? binding.props.sessionId : undefined);
            const sessionId = typeof candidate === 'string' && candidate ? candidate : null;
            setState((previous) => previous.sessionId === sessionId && previous.session === session ? previous : { sessionId, session });
          } catch {
            setState((previous) => (previous.sessionId === null && previous.session === null ? previous : { sessionId: null, session: null }));
          }
        };
        read();
        const stop = typeof store.subscribe === 'function' ? store.subscribe(read) : undefined;
        return typeof stop === 'function' ? stop : undefined;
      }, [uiSession]);
      return state;
    }

    /** 读取 live session 的投影（tokenUsage / modelSelection / permissions）。 */
    function readProjection(session, key) {
      try {
        return session?.projections?.faceOf?.(key)?.getSnapshot?.() ?? null;
      } catch {
        return null;
      }
    }

    function routesKey(routes) {
      return Array.isArray(routes) ? routes.map((route) => `${route?.provider}\0${route?.model}`).join('|') : '';
    }

    /** 用量投影每次轮询都是新对象；按字段比较，避免无变化也触发整页重渲染。 */
    function sameUsage(a, b) {
      if (a === b) return true;
      if (!a || !b) return false;
      return a.uncachedInputTokens === b.uncachedInputTokens
        && a.outputTokens === b.outputTokens
        && a.totalTokens === b.totalTokens
        && a.cacheReadTokens === b.cacheReadTokens
        && a.cacheWriteTokens === b.cacheWriteTokens
        && a.reasoningTokens === b.reasoningTokens
        && routesKey(a.routes) === routesKey(b.routes);
    }

    function sameModelSelection(a, b) {
      if (a === b) return true;
      if (!a || !b) return false;
      return a.provider === b.provider && a.model === b.model && a.reasoningEffort === b.reasoningEffort;
    }

    // ── Markdown 渲染（不注入 HTML）─────────────────────────────────────────
    function inline(text, keyPrefix) {
      const nodes = [];
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
      let last = 0;
      let match;
      let index = 0;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const token = match[0];
        const key = `${keyPrefix}-${index++}`;
        if (token.startsWith('**')) nodes.push(h('strong', { key }, token.slice(2, -2)));
        else if (token.startsWith('`')) nodes.push(h('code', { key, className: 'wb-inline-code' }, token.slice(1, -1)));
        else {
          const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
          if (link) nodes.push(h('a', { key, href: link[2], target: '_blank', rel: 'noreferrer noopener' }, link[1]));
          else nodes.push(token);
        }
        last = match.index + token.length;
      }
      if (last < text.length) nodes.push(text.slice(last));
      return nodes;
    }

    function Markdown({ text, className }) {
      const lines = String(text || '').split(/\r?\n/);
      const blocks = [];
      let code = null;
      let codeLines = [];
      lines.forEach((line, index) => {
        if (/^```/.test(line.trim())) {
          if (code === null) { code = true; codeLines = []; }
          else {
            blocks.push(h('pre', { key: `code-${index}`, className: 'wb-code' }, codeLines.join('\n')));
            code = null; codeLines = [];
          }
          return;
        }
        if (code) { codeLines.push(line); return; }
        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
          blocks.push(h(`h${Math.min(6, heading[1].length + 2)}`, { key: `h-${index}`, className: 'wb-md-h' }, inline(heading[2], `h-${index}`)));
          return;
        }
        const task = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
        if (task) {
          blocks.push(h('div', { key: `t-${index}`, className: 'wb-task' },
            h('span', { className: `wb-check${task[1].toLowerCase() === 'x' ? ' is-done' : ''}` }, task[1].toLowerCase() === 'x' ? '✓' : ''),
            h('span', { className: task[1].toLowerCase() === 'x' ? 'is-done' : '' }, inline(task[2], `t-${index}`)),
          ));
          return;
        }
        const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
        if (bullet) {
          blocks.push(h('div', { key: `b-${index}`, className: 'wb-li' }, h('span', { className: 'wb-dot' }, '•'), h('span', null, inline(bullet[1], `b-${index}`))));
          return;
        }
        if (!line.trim()) { blocks.push(h('div', { key: `s-${index}`, className: 'wb-gap' })); return; }
        blocks.push(h('p', { key: `p-${index}`, className: 'wb-p' }, inline(line, `p-${index}`)));
      });
      if (code !== null) blocks.push(h('pre', { key: 'code-tail', className: 'wb-code' }, codeLines.join('\n')));
      return h('div', { className: className || 'wb-md' }, blocks);
    }

    /** 把 "## 标题" 拆成小节，用于项目卡/知识卡的结构化展示。 */
    function parseSections(content) {
      const lines = String(content || '').split(/\r?\n/);
      const sections = [];
      let current = { title: '正文', body: [] };
      for (const line of lines) {
        const match = /^##\s+(.+?)\s*$/.exec(line.trim());
        if (match) {
          if (current.body.some((item) => item.trim())) sections.push(current);
          current = { title: match[1], body: [] };
        } else {
          current.body.push(line);
        }
      }
      if (current.body.some((item) => item.trim())) sections.push(current);
      return sections.map((section) => ({ title: section.title, body: section.body.join('\n').trim() }));
    }

    function nextActionsOf(content) {
      const sections = parseSections(content);
      const section = sections.find((item) => /下一步|行动|next/i.test(item.title));
      if (!section) return [];
      return section.body.split(/\r?\n/).map((line) => {
        const match = /^\s*[-*]\s+(?:\[([ xX])\]\s*)?(.*)$/.exec(line);
        if (!match) return null;
        return { done: String(match[1] ?? '').toLowerCase() === 'x', text: match[2].trim() };
      }).filter(Boolean).slice(0, 8);
    }

    // ── 基础控件 ────────────────────────────────────────────────────────────
    function Icon({ name, size = 14 }) {
      const paths = {
        search: [h('circle', { key: 'c', cx: 11, cy: 11, r: 7 }), h('path', { key: 'p', d: 'M21 21l-4.3-4.3' })],
        close: [h('path', { key: 'p', d: 'M6 6l12 12M18 6L6 18' })],
        refresh: [h('path', { key: 'p', d: 'M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6' })],
        arrow: [h('path', { key: 'p', d: 'M5 12h14M13 6l6 6-6 6' })],
        brain: [h('path', { key: 'p', d: 'M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5.8V16a3 3 0 0 0 3 3h1v1h4v-1h1a3 3 0 0 0 3-3v-2.2A3 3 0 0 0 18 8V7a3 3 0 0 0-3-3h-1V3H9v1Z' })],
        spark: [h('path', { key: 'p', d: 'M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z' })],
        grid: [h('path', { key: 'p', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' })],
        graph: [h('circle', { key: 'c1', cx: 6, cy: 12, r: 2.4 }), h('circle', { key: 'c2', cx: 18, cy: 6, r: 2.4 }), h('circle', { key: 'c3', cx: 18, cy: 18, r: 2.4 }), h('path', { key: 'p', d: 'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6' })],
        bag: [h('path', { key: 'p', d: 'M6 8h12l1 12H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2' })],
        news: [h('path', { key: 'p', d: 'M5 5h14v14H5zM8 9h8M8 13h8M8 17h5' })],
        gears: [h('circle', { key: 'c', cx: 12, cy: 12, r: 3 }), h('path', { key: 'p', d: 'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1' })],
        chat: [h('path', { key: 'p', d: 'M4 5.5h16v10.5H9.5L4 20V5.5Z' }), h('path', { key: 'l', d: 'M8 10h8M8 13h5' })],
        bolt: [h('path', { key: 'p', d: 'M13 2 4.5 13.5H10l-1 8.5L18.5 10H13l1-8Z' })],
        cpu: [h('path', { key: 'p', d: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3' })],
        activity: [h('path', { key: 'p', d: 'M3 12h4l2.5-6 5 12 2.5-6h4' })],
        list: [h('path', { key: 'p', d: 'M4 6l1.2 1.2L7.5 4.8M4 12l1.2 1.2 2.3-2.4M4 18l1.2 1.2 2.3-2.4M11 6h9M11 12h9M11 18h6' })],
        copy: [h('path', { key: 'p', d: 'M8 8h11v11H8zM5 16V5h11' })],
        play: [h('path', { key: 'p', d: 'M8 5l11 7-11 7V5Z' })],
      };
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
      }, paths[name] || paths.spark);
    }

    function Button({ children, onClick, kind = 'ghost', disabled, title, icon }) {
      return h('button', {
        type: 'button',
        className: `wb-btn wb-btn-${kind}`,
        onClick,
        disabled,
        title,
      }, icon ? h(Icon, { name: icon }) : null, children);
    }

    function Tag({ children, color }) {
      return h('span', { className: 'wb-tag', style: color ? { color, borderColor: color } : undefined }, children);
    }

    function ConfirmModal({ title, message, confirmLabel = '确定', cancelLabel = '取消', danger = false, onConfirm, onCancel, children }) {
      return h('div', { className: 'wb-modal wb-confirm-modal', onMouseDown: onCancel },
        h('div', { className: 'wb-modal-panel wb-confirm-panel', onMouseDown: (event) => event.stopPropagation() },
          h('div', { className: 'wb-modal-head' },
            h('h2', null, title),
            h('button', { type: 'button', className: 'wb-close', onClick: onCancel, 'aria-label': '关闭' }, '×'),
          ),
          message ? h('p', { className: 'wb-confirm-text' }, message) : null,
          children || null,
          h('div', { className: 'wb-modal-foot' },
            h(Button, { onClick: onCancel }, cancelLabel),
            h(Button, { kind: danger ? 'danger' : 'primary', onClick: onConfirm }, confirmLabel),
          ),
        ),
      );
    }

    function Empty({ children }) {
      return h('div', { className: 'wb-empty' }, children);
    }

    function Spinner() {
      return h('span', { className: 'wb-spinner', 'aria-label': '加载中' });
    }

    function useToast() {
      const [toast, setToast] = React.useState(null);
      const timer = React.useRef(null);
      const show = React.useCallback((message, type = 'info') => {
        setToast({ message, type });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 4200);
      }, []);
      React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
      return [toast, show];
    }

    // ── 导航 ────────────────────────────────────────────────────────────────
    const NAV = [
      { key: 'agent', icon: 'chat', title: '会话', sub: '对话与执行' },
      { key: 'knowledge', icon: 'brain', title: '记忆库', sub: '沉淀与召回' },
      { key: 'experts', icon: 'bolt', title: '调用状态', sub: '技能与工具' },
      { key: 'styles', icon: 'cpu', title: '输出模型', sub: '风格与声线' },
      { key: 'monitor', icon: 'activity', title: '运行状态', sub: '用量与轨迹' },
      { key: 'news', icon: 'news', title: '实时新闻', sub: '资讯与工具' },
      { key: 'projects', icon: 'list', title: '进度与计划', sub: '项目与下一步' },
      { key: 'graph', icon: 'graph', title: '关系网络', sub: '记忆图谱' },
      { key: 'overview', icon: 'grid', title: 'Workbench', sub: '总览' },
      { key: 'settings', icon: 'gears', title: '设置', sub: '本地引擎' },
    ];

    function navOf(key) {
      return NAV.find((item) => item.key === key) || NAV[0];
    }

    // ── 卡片 ────────────────────────────────────────────────────────────────
    function TypeDot({ item }) {
      const meta = typeMeta(item);
      return h('span', { className: 'wb-type-dot', style: { background: meta.color } });
    }

    function Card({ item, index, total, onOpen, accent }) {
      const meta = typeMeta(item);
      const reviewable = ['memory', 'knowledge', 'profile'].includes(item.kind);
      const pending = reviewable && (!item.status || /待人工复核|待复核|pending/i.test(item.status));
      return h('button', {
        type: 'button',
        className: `wb-card${accent ? ' is-accent' : ''}`,
        onClick: () => onOpen(item),
        style: accent ? { '--card-accent': accent } : undefined,
      },
      h('div', { className: 'wb-card-top' },
        h('span', { className: 'wb-card-type' }, h(TypeDot, { item }), meta.label),
        h('span', { className: 'wb-card-badges' },
          pending ? h('span', { className: 'wb-review-status is-pending' }, '待复核') : null,
          h('span', { className: 'wb-card-index' }, `${String((index ?? 0) + 1).padStart(2, '0')}/${String(total ?? 0).padStart(2, '0')}`),
        ),
      ),
      h('div', { className: 'wb-card-title' }, item.title),
      h('div', { className: 'wb-card-summary' }, item.summary || ''),
      h('div', { className: 'wb-card-foot' },
        h('div', { className: 'wb-tags' }, (item.tags || []).slice(0, 4).map((tag) => h(Tag, { key: tag }, tagLabel(tag)))),
        h('span', { className: 'wb-card-date' }, fmtDate(item.createdAt)),
      ),
      );
    }

    function ProjectCard({ item, onOpen, active }) {
      const actions = nextActionsOf(item.content);
      const done = actions.filter((action) => action.done).length;
      const pct = actions.length > 0 ? Math.round((done / actions.length) * 100) : 0;
      return h('div', { className: `wb-project${active ? ' is-active' : ''}` },
        h('div', { className: 'wb-project-main' },
          h('div', { className: 'wb-project-eyebrow' }, h(TypeDot, { item }), '项目 / ', active ? '进行中' : '归档'),
          h('div', { className: 'wb-project-title' }, item.title),
          h('div', { className: 'wb-project-summary' }, item.summary || ''),
          h('div', { className: 'wb-project-foot' },
            h('div', { className: 'wb-tags' }, (item.tags || []).slice(0, 4).map((tag) => h(Tag, { key: tag }, tagLabel(tag)))),
            h('button', { type: 'button', className: 'wb-link', onClick: () => onOpen(item) }, '打开项目上下文 ', h(Icon, { name: 'arrow', size: 12 })),
          ),
        ),
        h('div', { className: 'wb-project-side' },
          h('div', { className: 'wb-ring', style: { '--p': `${pct}%` } }, h('span', null, `${pct}%`)),
          h('div', { className: 'wb-project-count' }, `${done}/${actions.length || 0} 行动`),
          actions.slice(0, 3).map((action, index) => h('div', { key: index, className: `wb-action${action.done ? ' is-done' : ''}` },
            h('span', { className: 'wb-check' }, action.done ? '✓' : ''),
            h('span', null, truncate(action.text, 36)),
          )),
        ),
      );
    }

    function ExpertCard({ item, index, onCopy, onInvoke }) {
      const colors = [THEME.green, THEME.cyan, THEME.violet, THEME.pink, THEME.orange];
      const color = colors[index % colors.length];
      const tags = (item.tags || []).filter((tag) => tag !== 'skill');
      return h('div', { className: 'wb-expert', style: { '--expert': color } },
        h('div', { className: 'wb-expert-head' },
          h('div', { className: 'wb-expert-mark' }, String(index + 1).padStart(2, '0')),
          h('div', { className: 'wb-expert-kind' }, 'SKILL · 技能'),
        ),
        h('div', { className: 'wb-expert-title' }, item.title),
        h('div', { className: 'wb-expert-desc' }, item.summary || ''),
        h('div', { className: 'wb-tags' }, tags.slice(0, 4).map((tag) => h(Tag, { key: tag, color }, tagLabel(tag)))),
        h('div', { className: 'wb-expert-foot' },
          h('button', { type: 'button', className: 'wb-btn wb-btn-expert', onClick: () => onInvoke(item) }, h(Icon, { name: 'spark', size: 12 }), '在对话中调用'),
          h('button', { type: 'button', className: 'wb-btn', onClick: () => onCopy(item) }, h(Icon, { name: 'copy', size: 12 }), '复制指令'),
        ),
      );
    }

    // ── 详情 ────────────────────────────────────────────────────────────────
    function EntryDetail({ entry, onClose, onDelete, onCopyPath, showToast }) {
      const sections = parseSections(entry.content || '');
      const actions = nextActionsOf(entry.content || '');
      return h('div', { className: 'wb-detail' },
        h('div', { className: 'wb-detail-head' },
          h('button', { type: 'button', className: 'wb-btn wb-btn-ghost', onClick: onClose }, '← 返回'),
          h('div', { className: 'wb-detail-actions' },
            h(Button, { onClick: () => { navigator.clipboard?.writeText(entry.path || ''); onCopyPath?.(); }, icon: 'copy' }, '复制路径'),
            h(Button, { kind: 'danger', onClick: onDelete }, '移到回收站'),
          ),
        ),
        h('div', { className: 'wb-detail-eyebrow' }, h(TypeDot, { item: entry }), typeMeta(entry).label, ' · ', fmtDate(entry.createdAt, true)),
        h('h1', { className: 'wb-detail-title' }, entry.title),
        h('div', { className: 'wb-detail-path' }, entry.path || ''),
        h('div', { className: 'wb-detail-tags' },
          (entry.tags || []).map((tag) => h(Tag, { key: tag }, tagLabel(tag))),
          ['memory', 'knowledge', 'profile'].includes(entry.kind)
            ? h(ReviewStatusTag, { status: entry.status || entry.meta?.['状态'] || '' })
            : null,
          entry.meta?.['来源'] ? h('span', { className: 'wb-muted' }, entry.meta['来源']) : null,
        ),
        actions.length > 0 ? h('div', { className: 'wb-detail-actions-list' },
          h('div', { className: 'wb-eyebrow' }, '下一步'),
          actions.map((action, index) => h('div', { key: index, className: `wb-action${action.done ? ' is-done' : ''}` },
            h('span', { className: 'wb-check' }, action.done ? '✓' : ''),
            h('span', null, action.text),
          )),
        ) : null,
        sections.length > 0 ? sections.map((section, index) => h('section', { key: index, className: 'wb-detail-section' },
          h('h3', { className: 'wb-detail-h' }, section.title),
          h(Markdown, { text: section.body }),
        )) : h(Markdown, { text: entry.content || entry.summary || '' }),
        h('div', { className: 'wb-detail-foot' }, '更新于 ', fmtDate(entry.updatedAt || entry.createdAt, true)),
        showToast ? null : null,
      );
    }

    function NewCardModal({ onClose, onSave, saving }) {
      const [form, setForm] = React.useState({ type: 'fact', title: '', summary: '', content: '', tags: '' });
      const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
      return h('div', { className: 'wb-modal', onMouseDown: onClose },
        h('div', { className: 'wb-modal-panel', onMouseDown: (event) => event.stopPropagation() },
          h('div', { className: 'wb-modal-head' }, h('h2', null, '新建知识卡片'), h('button', { type: 'button', className: 'wb-close', onClick: onClose }, '×')),
          h('label', { className: 'wb-field' }, h('span', null, '类型'),
            h('select', { className: 'wb-input', value: form.type, onChange: (event) => patch('type', event.target.value) },
              ['fact', 'preference', 'decision', 'project', 'reference', 'knowledge'].map((type) => h('option', { key: type, value: type }, TYPE_META[type]?.label || type)),
            ),
          ),
          h('label', { className: 'wb-field' }, h('span', null, '标题'), h('input', { className: 'wb-input', value: form.title, onChange: (event) => patch('title', event.target.value), placeholder: '一句话标题' })),
          h('label', { className: 'wb-field' }, h('span', null, '结论'), h('textarea', { className: 'wb-input wb-textarea', rows: 3, value: form.summary, onChange: (event) => patch('summary', event.target.value), placeholder: '结果、数字、路径或口径' })),
          h('label', { className: 'wb-field' }, h('span', null, '正文（可选，可用 ## 分节）'), h('textarea', { className: 'wb-input wb-textarea', rows: 6, value: form.content, onChange: (event) => patch('content', event.target.value), placeholder: '## 项目目标\n...\n## 下一步行动\n- [ ] ...' })),
          h('label', { className: 'wb-field' }, h('span', null, '标签（逗号分隔）'), h('input', { className: 'wb-input', value: form.tags, onChange: (event) => patch('tags', event.target.value), placeholder: 'NetPulse, 报表' })),
          h('div', { className: 'wb-modal-foot' },
            h(Button, { onClick: onClose }, '取消'),
            h(Button, { kind: 'primary', onClick: () => onSave(form), disabled: saving || !form.title.trim() || !form.summary.trim() }, saving ? '保存中…' : '保存卡片'),
          ),
        ),
      );
    }

    // ── 概览 ────────────────────────────────────────────────────────────────
    function Stats({ stats }) {
      const items = [
        { value: stats.total || 0, label: '总条目', color: THEME.text },
        { value: stats.counts.memory || 0, label: '记忆', color: THEME.accentSoft },
        { value: stats.counts.skill || 0, label: '技能', color: THEME.green },
        { value: stats.counts.news || 0, label: '新闻', color: THEME.orange },
      ];
      return h('div', { className: 'wb-stats' }, items.map((item) => h('div', { key: item.label, className: 'wb-stat' },
        h('div', { className: 'wb-stat-value', style: { color: item.color } }, String(item.value)),
        h('div', { className: 'wb-stat-label' }, item.label),
      )));
    }

    function SearchRow({ query, setQuery, filter, setFilter, chips }) {
      return h('div', { className: 'wb-search-wrap' },
        h('div', { className: 'wb-search' },
          h('span', { className: 'wb-search-icon' }, h(Icon, { name: 'search', size: 14 })),
          h('input', { className: 'wb-search-input', value: query, onChange: (event) => setQuery(event.target.value), placeholder: '搜索标题、标签或正文…' }),
          query ? h('button', { type: 'button', className: 'wb-search-clear', onClick: () => setQuery('') }, '×') : null,
        ),
        h('div', { className: 'wb-chips' }, chips.map((chip) => h('button', {
          key: chip.key,
          type: 'button',
          className: `wb-chip${filter === chip.key ? ' is-active' : ''}`,
          onClick: () => setFilter(chip.key),
        }, chip.dot ? h('span', { className: 'wb-chip-dot', style: { background: chip.dot } }) : null, chip.label))),
      );
    }

    const CHIPS = [
      { key: 'all', label: '全部', dot: THEME.green },
      { key: 'project', label: '项目', dot: THEME.accentHover },
      { key: 'knowledge', label: '知识', dot: THEME.violet },
      { key: 'fact', label: '记忆', dot: THEME.accentSoft },
      { key: 'skill', label: '技能', dot: THEME.green },
      { key: 'news', label: '新闻', dot: THEME.orange },
      { key: 'preference', label: '偏好', dot: THEME.cyan },
    ];

    function filterEntries(entries, filter) {
      if (!filter || filter === 'all') return entries;
      return entries.filter((item) => item.kind === filter || item.type === filter);
    }

    function Overview({ overview, entries, query, setQuery, filter, setFilter, onOpen, onTab, onDistill, onNews, busy, sessionId }) {
      const projects = entries.filter((item) => item.type === 'project' || item.kind === 'project');
      const recent = entries.slice(0, 8);
      const memory = overview?.stats?.counts?.memory ?? 0;
      return h('div', { className: 'wb-overview' },
        h('section', { className: 'wb-hero' },
          h('div', { className: 'wb-hero-glow' }),
          h('div', { className: 'wb-hero-eyebrow' }, 'Workbench / 本地引擎'),
          h('h1', { className: 'wb-hero-title' }, '你的 Workbench，', h('br'), h('span', { className: 'wb-hero-accent' }, '正在生长。')),
          h('p', { className: 'wb-hero-sub' }, '记忆、知识卡片、技能和新闻，全部在本地生长。'),
          h('div', { className: 'wb-hero-stats' }, h(Stats, { stats: overview?.stats || { total: 0, counts: {} } })),
        ),
        h(SearchRow, { query, setQuery, filter, setFilter, chips: CHIPS }),
        h('section', { className: 'wb-section' },
          h('div', { className: 'wb-section-head' },
            h('div', null, h('span', { className: 'wb-eyebrow' }, '进行中'), h('h2', { className: 'wb-section-title' }, '当前工作')),
            h('button', { type: 'button', className: 'wb-link', onClick: () => onTab('projects') }, '打开全部 ', h(Icon, { name: 'arrow', size: 12 })),
          ),
          projects.length === 0
            ? h('div', { className: 'wb-project-empty' }, h('span', { className: 'wb-eyebrow' }, '暂无进行中的项目'), h('p', null, '还没有项目卡。对话里出现项目目标、决策或下一步时，会自动生成。'))
            : h('div', { className: 'wb-project-list' }, projects.slice(0, 3).map((project, index) => h(ProjectCard, { key: project.id, item: project, onOpen, active: index === 0 }))),
        ),
        h('section', { className: 'wb-section' },
          h('div', { className: 'wb-section-head' },
            h('div', null, h('span', { className: 'wb-eyebrow' }, '最近卡片'), h('h2', { className: 'wb-section-title' }, '最近的卡片')),
            h('button', { type: 'button', className: 'wb-link', onClick: () => onTab('knowledge') }, '进入记忆库 ', h(Icon, { name: 'arrow', size: 12 })),
          ),
          recent.length === 0
            ? h('div', { className: 'wb-project-empty' }, h('span', { className: 'wb-eyebrow' }, '暂无内容'), h('p', null, '还没有卡片。聊几轮，或者点右侧「沉淀本次对话」。'))
            : h('div', { className: 'wb-card-grid' }, recent.map((item, index) => h(Card, { key: item.id, item, index, total: recent.length, onOpen }))),
        ),
        h('div', { className: 'wb-quick' },
          h(Button, { kind: 'primary', onClick: onDistill, disabled: busy === 'distill' || !sessionId, icon: 'spark' }, busy === 'distill' ? '沉淀中…' : '沉淀本次对话'),
          h(Button, { onClick: onNews, disabled: busy === 'news', icon: 'refresh' }, busy === 'news' ? '抓取中…' : '抓取新闻'),
          h('span', { className: 'wb-muted' }, memory > 0 ? `已有 ${memory} 条长期记忆` : '还没有长期记忆'),
        ),
      );
    }

    // ── 知识库 / 项目 / 专家 ────────────────────────────────────────────────
    function Knowledge({
      entries, query, setQuery, filter, setFilter, onOpen, onNew, media, mediaLoading, onMediaOpen, onMediaRefresh,
      review, reviewLoading, busy, sessionId, onReview, onMerge, onRefreshReview, onToast,
    }) {
      const list = filterEntries(entries, filter);
      const pending = review?.items?.length ?? 0;
      const chips = [
        ...CHIPS,
        { key: 'review', label: pending ? `待复核 ${pending}` : '待复核', dot: THEME.orange },
        { key: 'media', label: '素材', dot: THEME.pink },
      ];
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '记忆库'), h('h1', { className: 'wb-page-title' }, '记忆库')),
          filter === 'media' ? null : h(Button, { kind: 'primary', onClick: onNew, icon: 'spark' }, '新建卡片'),
        ),
        h(SearchRow, { query, setQuery, filter, setFilter, chips }),
        h(AskMemory, { sessionId, onOpen, onToast }),
        filter === 'review'
          ? h(ReviewQueue, {
              review,
              loading: reviewLoading,
              busy,
              onReview,
              onMerge,
              onOpen,
              onRefresh: onRefreshReview,
            })
          : filter === 'media'
            ? h(MediaGrid, { media, loading: mediaLoading, onOpen: onMediaOpen, onRefresh: onMediaRefresh })
            : list.length === 0
              ? h(Empty, null, '没有匹配的卡片。')
              : h('div', { className: 'wb-card-grid wb-card-grid-wide' }, list.map((item, index) => h(Card, { key: item.id, item, index, total: list.length, onOpen }))),
      );
    }

    function Projects({ entries, onOpen }) {
      const list = entries.filter((item) => item.type === 'project' || item.kind === 'project');
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '进度与计划'), h('h1', { className: 'wb-page-title' }, '进度与计划')),
        ),
        list.length === 0
          ? h(Empty, null, '还没有项目卡。对话里出现项目目标、决策或下一步时，会自动生成。')
          : h('div', { className: 'wb-project-list' }, list.map((item, index) => h(ProjectCard, { key: item.id, item, onOpen, active: index === 0 }))),
      );
    }

    function Experts({ entries, onCopy, onInvoke }) {
      const list = entries.filter((item) => item.kind === 'skill');
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '调用状态'), h('h1', { className: 'wb-page-title' }, '调用状态')),
          h('span', { className: 'wb-muted' }, '从对话里沉淀出的可复用技能，可直接发送到当前对话。'),
        ),
        list.length === 0
          ? h(Empty, null, '还没有可复用技能。把可重复的流程沉淀一次，或让 Agent 调用 skill_create。')
          : h('div', { className: 'wb-expert-grid' }, list.map((item, index) => h(ExpertCard, { key: item.id, item, index, onCopy, onInvoke }))),
      );
    }

    // ── 记忆审核 + 问记忆库 ─────────────────────────────────────────────────
    function ReviewStatusTag({ status }) {
      const pending = !status || /待人工复核|待复核|pending/i.test(status);
      return h('span', { className: `wb-review-status${pending ? ' is-pending' : ''}` },
        pending ? '待复核' : '已确认');
    }

    function ReviewEditModal({ item, saving, onClose, onSave }) {
      const [form, setForm] = React.useState({
        title: item.title || '',
        summary: item.summary || '',
        tags: (item.tags || []).filter((tag) => tag !== item.type).join('、'),
      });
      const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
      return h(ConfirmModal, {
        title: '编辑记忆',
        confirmLabel: saving ? '保存中…' : '保存并确认',
        onCancel: onClose,
        onConfirm: () => { if (form.title.trim() && form.summary.trim() && !saving) onSave(form); },
      },
        h('label', { className: 'wb-field' }, h('span', null, '标题'),
          h('input', { className: 'wb-input', value: form.title, onChange: (event) => patch('title', event.target.value) })),
        h('label', { className: 'wb-field' }, h('span', null, '结论'),
          h('textarea', { className: 'wb-input wb-textarea', rows: 4, value: form.summary, onChange: (event) => patch('summary', event.target.value) })),
        h('label', { className: 'wb-field' }, h('span', null, '标签（逗号分隔）'),
          h('input', { className: 'wb-input', value: form.tags, onChange: (event) => patch('tags', event.target.value) })),
        h('div', { className: 'wb-review-hint' }, '正文其它小节保持不变；保存后状态会改为「已人工确认」。'),
      );
    }

    function ReviewQueue({ review, loading, busy, onReview, onMerge, onOpen, onRefresh }) {
      const items = review?.items || [];
      const groups = review?.duplicates || [];
      const [edit, setEdit] = React.useState(null);
      const [removing, setRemoving] = React.useState(null);
      const [keepChoice, setKeepChoice] = React.useState({});
      const [bulk, setBulk] = React.useState(false);
      const [merging, setMerging] = React.useState('');
      const [editing, setEditing] = React.useState(false);
      const [acting, setActing] = React.useState(false);
      const busyNow = Boolean(busy) || bulk || Boolean(merging) || editing || acting;

      const runReview = async (ids, action, payload) => {
        if (busyNow) return;
        setActing(true);
        try { await onReview(ids, action, payload); }
        finally { setActing(false); }
      };

      const confirmAll = async () => {
        if (items.length === 0 || busyNow) return;
        setBulk(true);
        try { await onReview(items.map((item) => item.id), 'confirm'); }
        finally { setBulk(false); }
      };

      const saveEdit = async (form) => {
        if (!edit) return;
        setEditing(true);
        try {
          await onReview([edit.id], 'update', {
            title: form.title,
            summary: form.summary,
            tags: form.tags,
          });
          setEdit(null);
        } finally { setEditing(false); }
      };

      const mergeGroup = async (group) => {
        const keepId = keepChoice[group.items[0]?.id] || group.items[0]?.id;
        const dropIds = group.items.map((item) => item.id).filter((id) => id !== keepId);
        if (!keepId || dropIds.length === 0) return;
        setMerging(keepId);
        try { await onMerge(keepId, dropIds); }
        finally { setMerging(''); }
      };

      return h('div', { className: 'wb-review' },
        h('div', { className: 'wb-review-head' },
          h('div', null,
            h('span', { className: 'wb-eyebrow' }, '记忆审核'),
            h('div', { className: 'wb-review-title' }, '待人工复核'),
            h('div', { className: 'wb-muted' }, `自动沉淀的记忆需要确认后才会被视为可信；近重复条目可以合并。`),
          ),
          h('div', { className: 'wb-review-actions' },
            h(Button, { onClick: onRefresh, disabled: busyNow, icon: 'refresh' }, loading ? '刷新中…' : '刷新'),
            h(Button, { kind: 'primary', onClick: confirmAll, disabled: items.length === 0 || busyNow },
              bulk ? '确认中…' : `全部确认（${items.length}）`),
          ),
        ),
        items.length === 0
          ? h('div', { className: 'wb-review-empty' }, '没有待复核的记忆。')
          : h('div', { className: 'wb-review-list' }, items.map((item) => h('div', { key: item.id, className: 'wb-review-item' },
              h('div', { className: 'wb-review-item-main' },
                h('div', { className: 'wb-review-item-top' },
                  h('button', { type: 'button', className: 'wb-review-item-title', onClick: () => onOpen?.(item) }, item.title),
                  h(ReviewStatusTag, { status: item.status }),
                ),
                h('div', { className: 'wb-review-item-summary' }, item.summary || '（无结论）'),
                h('div', { className: 'wb-review-item-meta' },
                  h('span', null, item.type || item.kind),
                  item.source ? h('span', null, item.source) : null,
                  item.createdAt ? h('span', null, fmtDate(item.createdAt, true)) : null,
                ),
              ),
              h('div', { className: 'wb-review-item-actions' },
                h('button', { type: 'button', className: 'wb-btn wb-btn-primary wb-btn-mini', disabled: busyNow, onClick: () => runReview([item.id], 'confirm') }, '确认'),
                h('button', { type: 'button', className: 'wb-btn wb-btn-mini', disabled: busyNow, onClick: () => setEdit(item) }, '编辑'),
                h('button', { type: 'button', className: 'wb-btn wb-btn-mini wb-btn-danger', disabled: busyNow, onClick: () => setRemoving(item) }, '删除'),
              ),
            ))),
        h('div', { className: 'wb-review-head wb-review-dup-head' },
          h('div', null,
            h('span', { className: 'wb-eyebrow' }, '近重复'),
            h('div', { className: 'wb-review-title' }, `重复候选（${groups.length} 组）`),
            h('div', { className: 'wb-muted' }, '按标题与结论的 token 相似度计算；合并会保留一条并把其余移入回收站。'),
          ),
        ),
        groups.length === 0
          ? h('div', { className: 'wb-review-empty' }, '没有发现近重复条目。')
          : h('div', { className: 'wb-review-groups' }, groups.map((group, groupIndex) => {
              const firstId = group.items[0]?.id;
              const selected = keepChoice[firstId] || firstId;
              return h('div', { key: `group-${groupIndex}`, className: 'wb-review-group' },
                h('div', { className: 'wb-review-group-head' },
                  h('span', { className: 'wb-review-group-score' }, `相似度 ${(Number(group.score) * 100).toFixed(0)}%`),
                  h('button', {
                    type: 'button',
                    className: 'wb-btn wb-btn-mini',
                    disabled: busyNow,
                    onClick: () => mergeGroup(group),
                  }, merging === firstId ? '合并中…' : '合并保留项'),
                ),
                group.items.map((item) => h('label', { key: item.id, className: `wb-review-group-item${selected === item.id ? ' is-keep' : ''}` },
                  h('input', {
                    type: 'radio',
                    name: `keep-${groupIndex}`,
                    checked: selected === item.id,
                    onChange: () => setKeepChoice((current) => ({ ...current, [firstId]: item.id })),
                  }),
                  h('span', { className: 'wb-review-group-main' },
                    h('strong', null, item.title),
                    h('small', null, item.summary || ''),
                  ),
                  selected === item.id ? h('span', { className: 'wb-review-keep' }, '保留') : null,
                )),
              );
            })),
        edit ? h(ReviewEditModal, {
          item: edit,
          saving: editing,
          onClose: () => setEdit(null),
          onSave: saveEdit,
        }) : null,
        removing ? h(ConfirmModal, {
          title: '删除这条记忆？',
          message: `《${removing.title}》会移入 .trash，INDEX.md 中的链接也会移除。`,
          confirmLabel: '移到回收站',
          danger: true,
          onCancel: () => setRemoving(null),
          onConfirm: async () => {
            const target = removing;
            setRemoving(null);
            await runReview([target.id], 'reject');
          },
        }) : null,
      );
    }

    // ── 问记忆库（RAG）─────────────────────────────────────────────────────
    function AskMemory({ sessionId, onOpen, onToast }) {
      const [question, setQuestion] = React.useState('');
      const [answer, setAnswer] = React.useState(null);
      const [asking, setAsking] = React.useState(false);
      const ask = async () => {
        const value = question.trim();
        if (!value || asking) return;
        setAsking(true);
        setAnswer(null);
        try {
          const data = await api('/ask-memory', {
            method: 'POST',
            body: JSON.stringify({ question: value, sessionId, limit: 6 }),
          });
          setAnswer(data);
        } catch (error) {
          setAnswer({ ok: false, error: String(error?.message || error) });
          onToast?.(`问记忆库失败：${error.message}`, 'error');
        } finally { setAsking(false); }
      };
      const citations = answer?.citations || [];
      return h('section', { className: 'wb-ask' },
        h('div', { className: 'wb-ask-head' },
          h('div', null,
            h('span', { className: 'wb-eyebrow' }, '问记忆库'),
            h('div', { className: 'wb-ask-title' }, '检索 + 引用回答'),
            h('div', { className: 'wb-muted' }, '从记忆、知识和技能里检索 Top 6，再让当前模型基于资料回答。'),
          ),
        ),
        h('div', { className: 'wb-ask-row' },
          h('input', {
            className: 'wb-input wb-ask-input',
            placeholder: '例如：上次 ACL 加固的目标网段是什么？',
            value: question,
            onChange: (event) => setQuestion(event.target.value),
            onKeyDown: (event) => {
              if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
              if (event.key === 'Enter') { event.preventDefault(); ask(); }
            },
          }),
          h(Button, { kind: 'primary', onClick: ask, disabled: asking || !question.trim(), icon: 'spark' },
            asking ? '检索中…' : '提问'),
        ),
        asking
          ? h('div', { className: 'wb-ask-loading' }, h(Spinner), ' 正在检索记忆并请求模型…')
          : answer
            ? answer.ok === false
              ? h('div', { className: 'wb-ask-error' }, answer.error || '提问失败')
              : h('div', { className: 'wb-ask-answer' },
                  h('div', { className: 'wb-ask-answer-head' },
                    h('span', { className: 'wb-eyebrow' }, '回答'),
                    answer.route ? h('span', { className: 'wb-muted' }, `${answer.route.provider}/${answer.route.model}`) : null,
                    answer.truncated ? h('span', { className: 'wb-review-status is-pending' }, '输出被截断') : null,
                  ),
                  h(Markdown, { text: answer.answer || '' }),
                  citations.length
                    ? h('div', { className: 'wb-ask-cites' },
                        h('div', { className: 'wb-ask-cites-title' }, `引用 ${citations.length} 条`),
                        citations.map((citation) => h('button', {
                          key: citation.id,
                          type: 'button',
                          className: 'wb-ask-cite',
                          onClick: () => onOpen?.({ ...citation, kind: citation.kind || 'memory' }),
                        },
                          h('span', { className: 'wb-ask-cite-index' }, `[${citation.index}]`),
                          h('span', { className: 'wb-ask-cite-title' }, citation.title),
                          h('span', { className: 'wb-ask-cite-path' }, citation.path || ''),
                        )),
                      )
                    : null,
                )
            : h('div', { className: 'wb-ask-empty' }, '输入一个问题，让记忆库带着出处回答。'),
      );
    }

    // ── 代码工作视图（工作区文件树 + 分析/进度）────────────────────────────
    function fmtBytes(bytes) {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) return '';
      if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
      if (n >= 1024) return `${Math.round(n / 1024)} KB`;
      return `${Math.round(n)} B`;
    }

    // ── 实时事件（B2：直接用 clientSession.eventSource，不再轮询 HTTP）────────
    function textOfBlocks(content) {
      if (!Array.isArray(content)) return '';
      return content
        .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('\n')
        .trim();
    }

    /** 文件引用插入语法：有空白/引号时用 @\"path\"。 */
    function fileMention(path, kind) {
      const value = kind === 'directory' ? `${path}/` : String(path || '');
      return /[\s"]/.test(value) ? `@"${value}"` : `@${value}`;
    }

    function attachmentsOfContent(content) {
      if (!Array.isArray(content)) return [];
      const out = [];
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        if (block.type === 'image') {
          out.push({
            kind: 'image',
            name: block.name || '图片',
            url: block.data ? `data:${block.mediaType || 'image/png'};base64,${block.data}` : '',
          });
        } else if (block.type === 'file') {
          out.push({
            kind: 'file',
            name: block.name || block.file?.name || '附件',
          });
        }
      }
      return out;
    }

    /** 拼接当前活跃 attempt 的 text-delta，实现 token 级流式显示。 */
    function streamingTextOfEntries(entries) {
      let text = '';
      let attempt = null;
      for (const entry of entries || []) {
        if (!entry || entry.type !== 'transient') continue;
        const event = entry.event;
        if (!event || event.type !== 'assistant/live-chunk') continue;
        const chunk = event.data?.chunk;
        if (!chunk) continue;
        const attemptId = event.data?.attemptId ?? 'live';
        if (attempt !== null && attemptId !== attempt) text = '';
        attempt = attemptId;
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text;
      }
      return text;
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const comma = result.indexOf(',');
          resolve(comma === -1 ? result : result.slice(comma + 1));
        };
        reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
    }

    function mergeAssistantTools(out) {
      const merged = [];
      for (const message of out) {
        const previous = merged[merged.length - 1];
        if (message.role === 'assistant' && !message.text && message.tools?.length && previous?.role === 'assistant') {
          previous.tools = [...new Set([...(previous.tools || []), ...message.tools])];
          continue;
        }
        merged.push(message);
      }
      return merged;
    }

    function liveEventsOf(entries) {
      const out = [];
      for (const entry of entries || []) {
        if (!entry) continue;
        if (entry.type && entry.type !== 'event') continue; // transient 流式行不参与持久时间线
        if (entry.event) out.push(entry.event);
      }
      return out;
    }

    function messagesFromLiveEvents(entries, limit = 120) {
      const out = [];
      for (const event of liveEventsOf(entries)) {
        const data = event.data ?? {};
        if (event.type === 'user/message') {
          // 只显示真人输入；召回/系统注入不进聊天气泡。
          if (data.source?.kind !== 'user') continue;
          const text = textOfBlocks(data.content);
          const attachments = attachmentsOfContent(data.content);
          if (text || attachments.length) {
            out.push({
              role: 'user',
              id: data.id ?? '',
              text: truncate(text, 6000),
              ...(attachments.length ? { attachments } : {}),
            });
          }
        } else if (event.type === 'assistant/message') {
          const message = data.message ?? {};
          const content = Array.isArray(message.content) ? message.content : [];
          const text = textOfBlocks(content);
          const tools = content.filter((block) => block && block.type === 'tool-call').map((block) => block.name).filter(Boolean);
          if (!text && tools.length === 0) continue;
          out.push({
            role: 'assistant',
            id: message.id ?? '',
            text: truncate(text, 12000),
            tools: [...new Set(tools)],
          });
        }
      }
      return mergeAssistantTools(out).slice(-limit);
    }

    function compactValue(value, limit) {
      if (value == null) return '';
      if (typeof value === 'string') return truncate(value, limit);
      if (Array.isArray(value)) {
        const text = textOfBlocks(value);
        if (text) return truncate(text, limit);
      }
      try { return truncate(JSON.stringify(value), limit); } catch { return truncate(String(value), limit); }
    }

    function processFromLiveEvents(entries, limit = 160) {
      const events = liveEventsOf(entries).slice(-limit);
      let turn = 0;
      let step = 0;
      let lastTool = '';
      const toolNames = new Map();
      const out = [];
      for (const event of events) {
        const data = event.data ?? {};
        if (event.type === 'turn/start' && Number.isFinite(Number(data.turn))) turn = Number(data.turn);
        if (event.type === 'step/start' && Number.isFinite(Number(data.step))) step = Number(data.step);
        const ts = Number(event.time) || Date.now();
        const base = { type: event.type, ts, turn, step };
        switch (event.type) {
          case 'turn/start':
          case 'step/start':
            out.push({ ...base });
            break;
          case 'user/message': {
            if (data.source?.kind !== 'user') break;
            const text = textOfBlocks(data.content);
            if (text) out.push({ ...base, role: 'user', text: truncate(text, 500) });
            break;
          }
          case 'assistant/message': {
            const message = data.message ?? {};
            const content = Array.isArray(message.content) ? message.content : [];
            const text = textOfBlocks(content);
            const tools = content.filter((block) => block?.type === 'tool-call').map((block) => block.name).filter(Boolean);
            if (text || tools.length) out.push({ ...base, role: 'assistant', text: truncate(text, 500), tools: [...new Set(tools)] });
            break;
          }
          case 'tool/call':
            lastTool = String(data.name ?? 'tool');
            if (data.callId) toolNames.set(String(data.callId), lastTool);
            out.push({ ...base, toolName: lastTool, args: compactValue(data.arguments, 300) });
            break;
          case 'tool/result': {
            // 事件本身不带工具名：用 callId 回查，再退回上一个 tool/call。
            const callId = String(data.message?.toolCallId ?? data.toolCallId ?? data.callId ?? '');
            const name = (data.name ?? data.toolName ?? data.tool ?? toolNames.get(callId) ?? lastTool) || 'tool';
            const result = data.result ?? data.content ?? data.output ?? data.text ?? data.message?.content ?? data.message ?? '';
            const isError = data.isError === true || data.message?.isError === true
              || data.status === 'error' || data.error !== undefined;
            out.push({ ...base, toolName: String(name), result: compactValue(result, 400), isError });
            break;
          }
          case 'command/run':
            out.push({ ...base, command: compactValue(data.command ?? data.text ?? data.name, 300) });
            break;
          case 'command/done':
            out.push({ ...base, commandResult: compactValue(data.result ?? data.output, 300), isError: data.isError === true || data.status === 'error' });
            break;
          case 'todo/write':
            out.push({ ...base, todos: Array.isArray(data.todos) ? data.todos.length : 0 });
            break;
          case 'working-directory/change':
            out.push({ ...base, cwd: String(data.cwd ?? '') });
            break;
          case 'turn/end':
            out.push({ ...base, reason: data.reason?.kind ?? String(data.reason ?? '') });
            break;
          case 'subagent/descriptor':
            out.push({ ...base, subagent: String(data.name ?? data.title ?? data.id ?? '') });
            break;
          case 'approval/asked':
            out.push({ ...base, approval: String(data.kind ?? data.title ?? 'approval') });
            break;
          default:
            break;
        }
      }
      return out;
    }

    /** 工作过程时间线：CodeView 与 Monitor 共用（A18 去重）。 */
    function processRows(processItems, { thinking = false, extended = false } = {}) {
      const rows = [];
      let lastTurn = null;
      processItems.forEach((item, index) => {
        const key = `${item.type}-${item.ts}-${index}`;
        if (item.turn && item.turn !== lastTurn) {
          rows.push(h('div', { key: `turn-${item.turn}-${index}`, className: 'wb-proc-turn' }, `第 ${item.turn} 轮`));
          lastTurn = item.turn;
        }
        switch (item.type) {
          case 'turn/start':
            break;
          case 'user/message':
            rows.push(h('div', { key, className: 'wb-proc-item is-user' },
              h('span', { className: 'wb-proc-role' }, '你'),
              h('span', { className: 'wb-proc-text' }, item.text || ''),
            ));
            break;
          case 'assistant/message':
            rows.push(h('div', { key, className: 'wb-proc-item is-assistant' },
              h('span', { className: 'wb-proc-role' }, '助手'),
              h('span', { className: 'wb-proc-text' },
                item.text || (item.tools?.length ? `工具：${item.tools.join('、')}` : '…')),
            ));
            break;
          case 'tool/call':
            rows.push(h('div', { key, className: 'wb-proc-item is-tool' },
              h('span', { className: 'wb-proc-branch' }, '├'),
              h('span', { className: 'wb-proc-tool' }, item.toolName || 'tool'),
              item.args ? h('span', { className: 'wb-proc-args' }, item.args) : null,
            ));
            break;
          case 'tool/result':
            rows.push(h('div', { key, className: `wb-proc-item is-result${item.isError ? ' is-error' : ''}` },
              h('span', { className: 'wb-proc-branch' }, '↳'),
              h('span', { className: 'wb-proc-result' }, item.result || (item.isError ? '工具失败' : '完成')),
            ));
            break;
          case 'command/run':
            rows.push(h('div', { key, className: 'wb-proc-item is-command' },
              h('span', { className: 'wb-proc-branch' }, '$'),
              h('span', { className: 'wb-proc-command' }, item.command || 'command'),
            ));
            break;
          case 'command/done':
            rows.push(h('div', { key, className: 'wb-proc-meta' }, item.isError ? '命令失败' : '命令完成'));
            break;
          case 'todo/write':
            rows.push(h('div', { key, className: 'wb-proc-meta' }, `待办更新 · ${item.todos} 项`));
            break;
          case 'working-directory/change':
            rows.push(h('div', { key, className: 'wb-proc-meta' }, `工作目录 → ${item.cwd}`));
            break;
          case 'turn/end':
            rows.push(h('div', { key, className: 'wb-proc-meta' }, `第 ${item.turn} 轮结束${item.reason ? ` · ${item.reason}` : ''}`));
            break;
          case 'step/start':
            rows.push(h('div', { key, className: 'wb-proc-meta' }, `步骤 ${item.step} 开始`));
            break;
          case 'subagent/descriptor':
            if (extended) rows.push(h('div', { key, className: 'wb-proc-meta' }, `子代理 · ${item.subagent || ''}`));
            break;
          case 'approval/asked':
            if (extended) rows.push(h('div', { key, className: 'wb-proc-meta' }, `等待审批 · ${item.approval || ''}`));
            break;
          default:
            break;
        }
      });
      if (thinking) {
        rows.push(h('div', { key: 'thinking', className: 'wb-proc-thinking' },
          h('span', { className: 'wb-exec-spinner' }), '后台工作中…'));
      }
      return rows;
    }

    /** 文件预览：内容 / git diff / 复制 / 在资源管理器中打开。 */
    function FilePreview({ preview, tab, onTab, diffState, onLoadDiff, onClose, onCopy, onReveal }) {
      if (!preview) return null;
      const value = preview.value || {};
      const diff = diffState?.data || null;
      const diffLines = diff?.diff ? String(diff.diff).split(/\r?\n/) : [];
      const renderDiff = () => {
        if (diffState?.loading) return h('div', { className: 'wb-preview-empty' }, h(Spinner), ' 读取 diff…');
        if (diffState?.error) return h('div', { className: 'wb-preview-error' }, diffState.error);
        if (!diff) return h('div', { className: 'wb-preview-empty' }, '切换到 Diff 时读取工作区改动。');
        if (diff.notGit) return h('div', { className: 'wb-preview-empty' }, diff.error || '当前工作区不是 git 仓库。');
        if (diff.ok === false) return h('div', { className: 'wb-preview-error' }, diff.error || '生成 diff 失败。');
        if (diff.clean) return h('div', { className: 'wb-preview-empty' }, '该文件没有未提交的改动。');
        if (diff.untracked) {
          const lines = String(value.text || '').split(/\r?\n/);
          return h('pre', { className: 'wb-diff' }, lines.map((line, index) => h('div', {
            key: `add-${index}`,
            className: 'wb-diff-line is-add',
          }, `+ ${line}`)));
        }
        return h('pre', { className: 'wb-diff' }, diffLines.map((line, index) => {
          const className = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')
            ? 'is-meta'
            : line.startsWith('+') ? 'is-add' : line.startsWith('-') ? 'is-del' : '';
          return h('div', { key: `diff-${index}`, className: `wb-diff-line ${className}`.trim() }, line || ' ');
        }));
      };
      return h('div', { className: 'wb-modal wb-preview-modal', onMouseDown: onClose },
        h('div', { className: 'wb-preview-panel', onMouseDown: (event) => event.stopPropagation() },
          h('div', { className: 'wb-preview-head' },
            h('div', { className: 'wb-preview-title-wrap' },
              h('span', { className: 'wb-eyebrow' }, '文件预览'),
              h('strong', { className: 'wb-preview-title' }, preview.name || preview.path),
              h('span', { className: 'wb-preview-path' }, preview.path),
            ),
            h('div', { className: 'wb-preview-actions' },
              h('button', { type: 'button', className: `wb-code-tab${tab === 'content' ? ' is-active' : ''}`, onClick: () => onTab('content') }, '内容'),
              h('button', { type: 'button', className: `wb-code-tab${tab === 'diff' ? ' is-active' : ''}`, onClick: () => { onTab('diff'); onLoadDiff(); } }, 'Diff'),
              h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onCopy, disabled: !value.text }, '复制内容'),
              h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onReveal }, '打开目录'),
              h('button', { type: 'button', className: 'wb-close', onClick: onClose, 'aria-label': '关闭预览' }, '×'),
            ),
          ),
          h('div', { className: 'wb-preview-body' },
            preview.loading
              ? h('div', { className: 'wb-preview-empty' }, h(Spinner), ' 读取文件…')
              : preview.error
                ? h('div', { className: 'wb-preview-error' }, preview.error)
                : tab === 'diff'
                  ? renderDiff()
                  : h('pre', { className: 'wb-preview-code' }, value.text || '（空文件）'),
          ),
          h('div', { className: 'wb-preview-foot' },
            h('span', null, value.size ? fmtBytes(value.size) : ''),
            h('span', null, value.lines ? `${value.lines} 行` : ''),
            value.eof === false ? h('span', { className: 'wb-preview-warn' }, '已截断（前 1500 行）') : null,
            h('span', { className: 'wb-muted' }, '只读预览'),
          ),
        ),
      );
    }

    function CodeView({
      sessionId, cwd, getWorkspaceFiles, session, chat, sending, running,
      processItems = [], processError = '', onClose, onToast,
    }) {
      const [levels, setLevels] = React.useState({});
      const [expanded, setExpanded] = React.useState(() => new Set());
      const [loading, setLoading] = React.useState(() => new Set());
      const [error, setError] = React.useState('');
      const [refreshTick, setRefreshTick] = React.useState(0);
      const [full, setFull] = React.useState(false);
      const [processView, setProcessView] = React.useState('process');
      const [preview, setPreview] = React.useState(null);
      const [previewTab, setPreviewTab] = React.useState('content');
      const [diffState, setDiffState] = React.useState({ loading: false, data: null, error: '' });
      const processRef = React.useRef(null);

      const loadLevel = React.useCallback(async (path) => {
        if (!path || !sessionId) return;
        const api = typeof getWorkspaceFiles === 'function' ? getWorkspaceFiles() : null;
        if (!api?.list) {
          setError('代码视图初始化中…');
          return;
        }
        setLoading((prev) => new Set(prev).add(path));
        try {
          const result = await api.list(sessionId, path);
          if (!result?.ok) throw new Error(result?.error?.message || result?.error?.code || '读取目录失败');
          setLevels((prev) => ({ ...prev, [path]: result.value?.entries || [] }));
          setError('');
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      }, [getWorkspaceFiles, sessionId]);

      React.useEffect(() => {
        setLevels({});
        setExpanded(new Set());
        setError('');
        if (cwd) loadLevel(cwd);
      }, [cwd, sessionId, refreshTick, loadLevel]);

      React.useEffect(() => {
        if (!cwd || levels[cwd] || error !== '代码视图初始化中…') return undefined;
        const timer = setInterval(() => loadLevel(cwd), 1200);
        return () => clearInterval(timer);
      }, [cwd, levels, error, loadLevel]);

      // 工作区文件变化后自动刷新根目录与已展开目录，让代码视图跟着后台写文件实时变化。
      React.useEffect(() => {
        if (!cwd) return undefined;
        const timer = setInterval(() => {
          if (document.hidden) return;
          if (!loading.size) loadLevel(cwd);
          for (const path of expanded) {
            if (!loading.has(path)) loadLevel(path);
          }
        }, 3000);
        return () => clearInterval(timer);
      }, [cwd, expanded, loading, loadLevel]);

      // 工作过程由 Workbench 统一轮询后下发（B3），这里只负责滚动。
      React.useEffect(() => {
        const el = processRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [processItems.length, sending, running]);

      const toggle = (path) => {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
        if (!levels[path]) loadLevel(path);
      };

      const openPreview = React.useCallback(async (path, entry) => {
        const name = entry?.name || String(path).split(/[\\/]/).pop() || path;
        setPreview({ path, name, loading: true, error: '', value: null });
        setPreviewTab('content');
        setDiffState({ loading: false, data: null, error: '' });
        const fileApi = typeof getWorkspaceFiles === 'function' ? getWorkspaceFiles() : null;
        if (!fileApi?.read) {
          setPreview((current) => ({ ...current, loading: false, error: '文件读取服务不可用（workspaceFiles.read）' }));
          return;
        }
        const signal = new AbortController().signal;
        const attempts = [
          () => fileApi.read(sessionId, path, { offset: 1, limit: 1500 }, signal),
          () => fileApi.read(sessionId, path, {}, signal),
          () => fileApi.read(sessionId, path, signal),
          () => fileApi.read(sessionId, path),
        ];
        let lastError = null;
        for (const attempt of attempts) {
          try {
            const result = await attempt();
            if (result?.ok === false) throw new Error(result.error?.message || result.error?.code || '读取文件失败');
            const value = result?.value ?? result;
            setPreview({ path, name, loading: false, error: '', value: value || {} });
            return;
          } catch (failure) {
            lastError = failure;
          }
        }
        setPreview((current) => ({
          ...current,
          loading: false,
          error: String(lastError?.message || lastError || '读取文件失败'),
        }));
      }, [getWorkspaceFiles, sessionId]);

      const loadDiff = React.useCallback(async () => {
        if (!preview?.path) return;
        setDiffState((current) => (current.loading ? current : { ...current, loading: true, error: '' }));
        try {
          const data = await api('/workspace/diff', {
            method: 'POST',
            body: JSON.stringify({ sessionId, path: preview.path }),
          });
          setDiffState({ loading: false, data, error: '' });
        } catch (failure) {
          setDiffState({ loading: false, data: null, error: String(failure?.message || failure) });
        }
      }, [preview?.path, sessionId]);

      const revealPreview = React.useCallback(async () => {
        if (!preview?.path) return;
        try {
          const data = await api('/workspace/reveal', {
            method: 'POST',
            body: JSON.stringify({ sessionId, path: preview.path }),
          });
          if (!data.ok) throw new Error(data.error || '打开失败');
          onToast?.('已在资源管理器中打开', 'success');
        } catch (failure) {
          onToast?.(`打开目录失败：${failure.message}`, 'error');
        }
      }, [preview?.path, sessionId, onToast]);

      const copyPreview = React.useCallback(() => {
        const text = preview?.value?.text || '';
        navigator.clipboard?.writeText(text);
        onToast?.('文件内容已复制', 'success');
      }, [preview?.value, onToast]);

      const sortEntries = (entries) => [...entries].sort((a, b) => {
        const ad = a.type === 'directory' ? 0 : 1;
        const bd = b.type === 'directory' ? 0 : 1;
        if (ad !== bd) return ad - bd;
        return String(a.name).localeCompare(String(b.name), 'zh-CN', { numeric: true, sensitivity: 'base' });
      });
      const childPath = (parent, name) => `${String(parent).replace(/[/\\]+$/, '')}/${name}`;

      const renderLevel = (path, depth) => {
        if (!levels[path]) {
          return h('div', { className: 'wb-tree-empty', style: { paddingLeft: `${depth * 14 + 18}px` } },
            loading.has(path) ? '读取中…' : '点击加载');
        }
        const entries = levels[path];
        if (entries.length === 0) {
          return h('div', { className: 'wb-tree-empty', style: { paddingLeft: `${depth * 14 + 18}px` } }, '空目录');
        }
        return sortEntries(entries).map((entry) => {
          const full = childPath(path, entry.name);
          const isDir = entry.type === 'directory';
          return h(React.Fragment, { key: full },
            h('div', {
              className: `wb-tree-row${isDir ? ' is-dir' : ' is-file'}`,
              style: { paddingLeft: `${depth * 14}px` },
              onClick: isDir ? () => toggle(full) : () => openPreview(full, entry),
            },
              h('span', { className: 'wb-tree-caret' }, isDir ? (expanded.has(full) ? '▾' : '▸') : ''),
              h('span', { className: `wb-tree-kind${isDir ? ' is-dir' : ''}` }, isDir ? '▣' : '▤'),
              h('span', { className: 'wb-tree-name' }, entry.name),
              entry.type === 'file' && entry.size ? h('span', { className: 'wb-tree-size' }, fmtBytes(entry.size)) : null,
            ),
            isDir && expanded.has(full) ? h('div', { className: 'wb-tree-children' }, renderLevel(full, depth + 1)) : null,
          );
        });
      };

      const allEntries = Object.values(levels).flat();
      const files = allEntries.filter((entry) => entry.type === 'file');
      const fileCount = files.length;
      const dirTotal = allEntries.filter((entry) => entry.type === 'directory').length;
      const totalSize = files.reduce((sum, entry) => sum + (Number(entry.size) || 0), 0);
      const extCounts = (() => {
        const counts = {};
        for (const file of files) {
          const name = String(file.name || '');
          const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '其他';
          counts[ext] = (counts[ext] || 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      })();
      const todos = session?.todos || [];
      const done = todos.filter((todo) => ['done', 'completed', 'success'].includes(todo.status)).length;
      const taskPct = todos.length ? Math.round((done / todos.length) * 100) : 0;
      const loadedDirs = Object.keys(levels).length;
      const scanning = loading.size > 0;
      const scanPct = scanning ? Math.min(90, Math.round((loadedDirs / Math.max(1, loadedDirs + loading.size)) * 100)) : 100;
      const thinking = Boolean(sending || running);
      const assistantMessages = (chat?.messages || []).filter((message) => message.role === 'assistant');
      const liveToolNames = [];
      for (const message of assistantMessages) for (const tool of (message.tools || [])) liveToolNames.push(tool);
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      const latestText = latestAssistant?.text ? latestAssistant.text.replace(/\s+/g, ' ').slice(0, 90) : '';
      const recentTools = session?.recentTools || [];
      const execTools = liveToolNames.length
        ? liveToolNames.slice(-8).map((name) => ({ name }))
        : recentTools.slice(-8).map((tool) => ({ name: tool.name, at: tool.at }));

      const renderProcess = () => {
        if (processItems.length === 0) {
          return h('div', { className: 'wb-proc-empty' },
            processError ? `读取工作过程失败：${processError}` : '等待后台工作过程…');
        }
        return processRows(processItems, { thinking, extended: true });
      };

      return h(React.Fragment, null,
        h('section', { className: `wb-code-panel${full ? ' is-full' : ''}` },
        h('div', { className: 'wb-code-head' },
          h('span', { className: 'wb-code-title' }, '代码工作视图'),
          h('span', { className: 'wb-code-path' }, cwd || '未选择工作区'),
          h('span', { className: `wb-code-live${thinking ? ' is-thinking' : ''}` }, h('i'), thinking ? '思考中…' : '实时'),
          h('div', { className: 'wb-code-actions' },
            h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: () => setFull((value) => !value) }, full ? '还原' : '放大'),
            h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: () => setRefreshTick((value) => value + 1) }, '刷新'),
            onClose ? h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onClose }, '收起') : null,
          ),
        ),
        h('div', { className: 'wb-code-body' },
          h('div', { className: 'wb-code-left' },
            h('div', { className: 'wb-code-tabs' },
              h('button', { type: 'button', className: `wb-code-tab${processView === 'process' ? ' is-active' : ''}`, onClick: () => setProcessView('process') }, '工作过程'),
              h('button', { type: 'button', className: `wb-code-tab${processView === 'tree' ? ' is-active' : ''}`, onClick: () => setProcessView('tree') }, '文件树'),
              h('span', { className: 'wb-code-tab-count' }, processView === 'process' ? `${processItems.length} 条` : `${dirTotal + fileCount} 项`),
            ),
            processView === 'process'
              ? h('div', { className: 'wb-process', ref: processRef }, renderProcess())
              : h('div', { className: 'wb-code-tree' },
                  cwd ? h(React.Fragment, null,
                    h('div', { className: 'wb-tree-root' },
                      h('span', { className: 'wb-tree-root-mark' }, '▣'),
                      h('span', { className: 'wb-tree-root-name' }, cwd.split(/[\\/]/).filter(Boolean).pop() || cwd),
                      h('span', { className: 'wb-tree-root-path' }, cwd),
                    ),
                    h('div', { className: 'wb-tree-root-list' }, renderLevel(cwd, 0)),
                  ) : h('div', { className: 'wb-tree-empty' }, '没有工作目录；请点击左侧「当前工作区」选择目录'),
                ),
          ),
          h('div', { className: 'wb-code-analysis' },
            h('div', { className: 'wb-code-analysis-title' }, '代码分析'),
            h('div', { className: 'wb-code-stats' },
              h('span', null, '目录'), h('strong', null, String(dirTotal)),
              h('span', null, '文件'), h('strong', null, String(fileCount)),
              h('span', null, '体积'), h('strong', null, fmtBytes(totalSize) || '—'),
            ),
            h('div', { className: 'wb-code-progress-label' },
              h('span', null, '扫描进度'),
              h('span', null, scanning ? '读取中…' : `${loadedDirs} 层`),
            ),
            h('div', { className: 'wb-code-progress' }, h('i', { style: { width: `${scanPct}%` } })),
            h('div', { className: 'wb-code-progress-label' },
              h('span', null, '任务进度'),
              h('span', null, thinking ? '执行中…' : (todos.length ? `${done}/${todos.length}` : (session?.turn ? `第 ${session.turn} 轮` : '待命'))),
            ),
            h('div', { className: `wb-code-progress${thinking && !todos.length ? ' is-running' : ''}` },
              h('i', { style: { width: `${todos.length ? taskPct : (thinking ? 0 : 100)}%` } })),
            h('div', { className: 'wb-code-sub' }, `最近工具 ${execTools.length} 次`),
            extCounts.length
              ? h('div', { className: 'wb-code-types' }, extCounts.map(([ext, count]) => h('span', { key: ext }, ext === '其他' ? `其他 ${count}` : `.${ext} ${count}`)))
              : null,
            h('div', { className: 'wb-code-exec' },
              h('div', { className: 'wb-code-exec-title' }, '执行分析'),
              h('div', { className: 'wb-exec-root' }, `第 ${session?.turn ?? 0} 轮 · ${execTools.length} 次工具调用`),
              thinking ? h('div', { className: 'wb-exec-thinking' }, h('span', { className: 'wb-exec-spinner' }), '正在思考…') : null,
              execTools.length
                ? execTools.map((tool, index) => h('div', { key: `${tool.name}-${index}`, className: 'wb-exec-node' },
                    h('span', { className: 'wb-exec-branch' }, index === execTools.length - 1 ? '└' : '├'),
                    h('span', { className: 'wb-exec-name' }, tool.name),
                    tool.at ? h('span', { className: 'wb-exec-time' }, fmtTime(tool.at)) : null,
                  ))
                : (!thinking ? h('div', { className: 'wb-exec-empty' }, '暂无工具调用；发起任务后显示执行树') : null),
              latestText ? h('div', { className: 'wb-exec-latest' }, h('span', null, '最近分析：'), latestText) : null,
            ),
            error ? h('div', { className: 'wb-code-error' }, error) : null,
          ),
        ),
      ),
      preview ? h(FilePreview, {
        preview,
        tab: previewTab,
        onTab: setPreviewTab,
        diffState,
        onLoadDiff: loadDiff,
        onClose: () => setPreview(null),
        onCopy: copyPreview,
        onReveal: revealPreview,
      }) : null,
      );
    }

    /** 发送/激活失败时识别「会话被原生写句柄占用」。 */
    function isWriterHeldError(error) {
      const code = String(error?.code ?? error?.error?.code ?? '');
      const message = String(error?.message ?? error?.error?.message ?? error ?? '');
      return code === 'session/writer-held'
        || message.includes('already owned by an active write handle')
        || message.includes('writer-held')
        || message.includes('write handle');
    }

    // ── AGENT（项目带 + 对话 + 附件/@引用/斜杠指令）────────────────────────────
    function Agent({
      sessions, currentSessionId, chatSessionId, onSelect, chat, sending, onSend, onNew, modelLabel, onActivate, canSend,
      writerHeld, onNewSession, workspaceTitle, workspacePath, onOpenWorkspace, codeOpen, onToggleCode, codeView,
      sessionId, cwd, getRemote, getWorkspaceFiles, processItems, onToast, onExport, exporting,
    }) {
      const [draft, setDraft] = React.useState('');
      const [attachments, setAttachments] = React.useState([]);
      const [openTool, setOpenTool] = React.useState('');
      const [refOpen, setRefOpen] = React.useState(false);
      const [refQuery, setRefQuery] = React.useState('');
      const [refItems, setRefItems] = React.useState([]);
      const [refBusy, setRefBusy] = React.useState(false);
      const [refError, setRefError] = React.useState('');
      const [cmdOpen, setCmdOpen] = React.useState(false);
      const [cmdItems, setCmdItems] = React.useState([]);
      const [cmdBusy, setCmdBusy] = React.useState(false);
      const [cmdError, setCmdError] = React.useState('');
      const logRef = React.useRef(null);
      const fileRef = React.useRef(null);
      const attachmentsRef = React.useRef(attachments);
      attachmentsRef.current = attachments;

      React.useEffect(() => {
        const el = logRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [chat?.messages?.length, sending]);

      React.useEffect(() => () => {
        for (const attachment of attachmentsRef.current) {
          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        }
      }, []);

      const addFiles = (fileList) => {
        const files = [...(fileList || [])];
        if (files.length === 0) return;
        const next = [];
        for (const file of files) {
          if (!file) continue;
          if (file.size > 20 * 1024 * 1024) {
            onToast?.(`文件超过 20MB，已跳过：${file.name || '未命名文件'}`, 'error');
            continue;
          }
          const kind = /^image\//.test(file.type) ? 'image' : 'file';
          next.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            name: file.name || (kind === 'image' ? '图片' : '附件'),
            kind,
            previewUrl: kind === 'image' ? URL.createObjectURL(file) : '',
          });
        }
        if (next.length > 0) setAttachments((prev) => [...prev, ...next]);
      };

      const removeAttachment = (id) => {
        setAttachments((prev) => prev.filter((attachment) => {
          if (attachment.id === id && attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
          return attachment.id !== id;
        }));
      };

      const send = async () => {
        const text = draft.trim();
        if ((!text && attachments.length === 0) || sending) return;
        const payload = attachments.slice();
        setDraft('');
        setAttachments([]);
        const ok = await onSend(text, payload);
        if (ok === false) {
          setDraft(text);
          setAttachments(payload);
        } else {
          // 延迟回收：本地回显还会短暂用到 blob URL，等事件落库后再释放。
          for (const attachment of payload) {
            if (attachment.previewUrl) {
              setTimeout(() => URL.revokeObjectURL(attachment.previewUrl), 15000);
            }
          }
        }
      };

      const insertMention = (mention) => {
        setDraft((prev) => `${prev}${prev && !/\s$/.test(prev) ? ' ' : ''}${mention} `);
      };

      const loadReferences = React.useCallback(async (query) => {
        if (!canSend || !sessionId) return;
        setRefBusy(true);
        setRefError('');
        try {
          const remote = typeof getRemote === 'function' ? getRemote() : null;
          let items = [];
          if (remote?.fileReferences?.list) {
            const result = await remote.fileReferences.list(sessionId, query || '', new AbortController().signal);
            if (result?.ok && Array.isArray(result.value)) items = result.value;
            else if (result && !result.ok) throw new Error(result.error?.message || '文件搜索失败');
          }
          if (items.length === 0 && typeof getWorkspaceFiles === 'function') {
            const api = getWorkspaceFiles();
            const result = await api?.list?.(sessionId, cwd || '');
            if (result?.ok) {
              items = (result.value?.entries || []).map((entry) => ({
                path: `${String(cwd || '').replace(/[/\\]+$/, '')}/${entry.name}`,
                kind: entry.type === 'directory' ? 'directory' : 'file',
                name: entry.name,
              }));
            }
          }
          setRefItems(items);
        } catch (error) {
          setRefError(String(error?.message || error));
          setRefItems([]);
        } finally {
          setRefBusy(false);
        }
      }, [canSend, sessionId, getRemote, getWorkspaceFiles, cwd]);

      React.useEffect(() => {
        if (!refOpen) return undefined;
        const timer = setTimeout(() => { loadReferences(refQuery); }, 180);
        return () => clearTimeout(timer);
      }, [refOpen, refQuery, loadReferences]);

      const openReferences = () => {
        setRefOpen(true);
        setRefQuery('');
        loadReferences('');
      };

      const openCommands = async () => {
        setCmdOpen(true);
        setCmdError('');
        setCmdBusy(true);
        try {
          const remote = typeof getRemote === 'function' ? getRemote() : null;
          const result = await remote?.commands?.list?.(sessionId);
          if (!result?.ok) throw new Error(result?.error?.message || '指令列表不可用');
          setCmdItems(Array.isArray(result.value) ? result.value : []);
        } catch (error) {
          setCmdError(String(error?.message || error));
          setCmdItems([]);
        } finally {
          setCmdBusy(false);
        }
      };

      const toolDetail = (tool) => {
        const related = (processItems || [])
          .filter((item) => item.toolName === tool && (item.type === 'tool/call' || item.type === 'tool/result'));
        const call = [...related].reverse().find((item) => item.type === 'tool/call');
        const result = [...related].reverse().find((item) => item.type === 'tool/result');
        const items = [call, result].filter(Boolean);
        if (items.length === 0) return h('span', { className: 'wb-muted' }, '暂无调用详情');
        return items.map((item, index) => h('div', { key: index, className: 'wb-tool-detail-row' },
          h('span', { className: 'wb-tool-detail-kind' }, item.type === 'tool/call' ? '调用' : '结果'),
          h('code', null, item.type === 'tool/call' ? (item.args || '') : (item.result || '')),
        ));
      };

      const list = [...(sessions || [])];
      if (currentSessionId && !list.some((session) => session.id === currentSessionId)) {
        list.unshift({ id: currentSessionId, title: '当前会话', turn: 0, live: Boolean(chat?.live) });
      }
      const canAttach = Boolean(canSend && sessionId);
      return h('div', { className: 'wb-agent' },
        h('aside', { className: 'wb-tape' },
          h('div', { className: 'wb-tape-head' }, h('span', { className: 'wb-eyebrow' }, '会话'), h('span', { className: 'wb-live' }, h('i'), '实时')),
          h('button', { type: 'button', className: 'wb-tape-new', onClick: onNew }, '+ 新会话'),
          h('div', { className: 'wb-tape-label' }, '当前工作区'),
          h('button', {
            type: 'button',
            className: 'wb-workspace-btn',
            title: workspacePath || '选择工作区',
            onClick: onOpenWorkspace,
          },
            h('span', { className: 'wb-workspace-name' }, workspaceTitle || '选择工作区'),
            h('span', { className: 'wb-workspace-path' }, workspacePath || '点击选择目录'),
            h('span', { className: 'wb-workspace-chev' }, '▾'),
          ),
          h('div', { className: 'wb-tape-label' }, '会话导航'),
          h('div', { className: 'wb-tape-list' }, list.map((session) => h('button', {
            key: session.id,
            type: 'button',
            className: `wb-tape-item${session.id === chatSessionId ? ' is-active' : ''}`,
            onClick: () => onSelect(session.id),
          },
          h('div', { className: 'wb-tape-item-title' }, typeof session.title === 'string' && session.title ? session.title : '未命名会话'),
          h('div', { className: 'wb-tape-item-meta' }, `${session.turn || 0} 轮 · ${session.id === currentSessionId ? '当前 · 可发送' : session.live ? '活跃' : '只读'}`),
          ))),
        ),
        h('section', { className: 'wb-chat' },
          h('div', { className: 'wb-chat-head' },
            h('span', { className: 'wb-eyebrow' }, '会话'),
            h('div', { className: 'wb-chat-head-meta' },
              modelLabel ? h('span', { className: 'wb-model-label' }, modelLabel) : null,
              !chat?.live && !canSend && chat?.messages?.length
                ? h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: onActivate, disabled: sending }, sending ? '激活中…' : '尝试激活')
                : null,
              h('button', {
                type: 'button',
                className: 'wb-btn wb-btn-mini',
                onClick: onExport,
                disabled: exporting || !chat?.messages?.length,
                title: '导出当前会话为 Markdown',
              }, exporting ? '导出中…' : '导出'),
              h('button', {
                type: 'button',
                className: `wb-code-toggle${codeOpen ? ' is-open' : ''}`,
                onClick: onToggleCode,
              }, codeOpen ? '收起代码' : '代码视图'),
              h('span', { className: 'wb-muted' }, chat?.live ? '实时会话' : canSend ? '当前会话 · 可直接发送' : (chat?.messages?.length ? '历史会话 · 只读' : '会话未激活')),
            ),
          ),
          writerHeld ? h('div', { className: 'wb-chat-warn' },
            h('div', { className: 'wb-chat-warn-text' },
              h('strong', null, '该会话被原生写句柄占用'),
              h('span', null, '从这里发送会失败；开一个新会话可以继续，原会话内容不会丢。'),
            ),
            h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: onNewSession }, '新建会话继续'),
          ) : null,
          h('div', { className: 'wb-chat-log', ref: logRef },
            !chat?.live ? h('div', { className: 'wb-chat-note' }, chat?.note || '会话未激活：请先在 DSH 主对话里发一条消息。') : null,
            (chat?.messages || []).map((message, index) => message.role === 'user'
              ? h('div', { key: `${message.id}-${index}`, className: 'wb-msg is-user' },
                  h('div', { className: 'wb-msg-role' }, '你'),
                  h('div', { className: 'wb-msg-body' }, message.text || ''),
                  message.attachments?.length
                    ? h('div', { className: 'wb-msg-attachments' }, message.attachments.map((attachment, attIndex) => h('span', {
                        key: `${attachment.name}-${attIndex}`,
                        className: 'wb-msg-attach',
                      },
                        attachment.kind === 'image' && attachment.url
                          ? h('img', { className: 'wb-msg-attach-thumb', src: attachment.url, alt: attachment.name || '图片' })
                          : null,
                        h('span', null, attachment.name || (attachment.kind === 'image' ? '图片' : '附件')),
                      )))
                    : null,
                )
              : h('div', { key: `${message.id}-${index}`, className: 'wb-msg is-assistant' },
                  h('div', { className: 'wb-msg-role' }, '助手'),
                  h('div', { className: 'wb-msg-body' },
                    h(Markdown, { text: message.text || '' }),
                    message.streaming ? h('span', { className: 'wb-stream-caret' }, '▍') : null,
                  ),
                  message.tools?.length
                    ? h('div', { className: 'wb-tool-row' }, message.tools.map((tool) => {
                        const key = `${message.id}-${tool}`;
                        return h('button', {
                          key,
                          type: 'button',
                          className: `wb-tool-chip${openTool === key ? ' is-open' : ''}`,
                          onClick: () => setOpenTool((prev) => (prev === key ? '' : key)),
                        }, tool);
                      }))
                    : null,
                  openTool && openTool.startsWith(`${message.id}-`)
                    ? h('div', { className: 'wb-tool-detail' }, toolDetail(openTool.slice(String(message.id).length + 1)))
                    : null,
                )),
            sending ? h('div', { className: 'wb-msg is-assistant' },
              h('div', { className: 'wb-msg-role' }, '助手'),
              h('div', { className: 'wb-msg-body wb-muted' }, '正在思考…'),
            ) : null,
          ),
          codeView || null,
          h('div', { className: 'wb-chat-compose' },
            h('input', {
              ref: fileRef,
              type: 'file',
              multiple: true,
              style: { display: 'none' },
              onChange: (event) => { addFiles(event.target.files); event.target.value = ''; },
            }),
            h('div', { className: 'wb-compose-stack' },
              h('div', { className: 'wb-compose-tools' },
                canAttach ? h('button', { type: 'button', className: 'wb-tool-btn', onClick: () => fileRef.current?.click() }, '附件') : null,
                canAttach ? h('button', { type: 'button', className: 'wb-tool-btn', onClick: openReferences }, '@ 文件') : null,
                canAttach ? h('button', { type: 'button', className: 'wb-tool-btn', onClick: openCommands }, '/ 指令') : null,
                h('span', { className: 'wb-compose-hint' }, canAttach ? '支持图片粘贴与拖拽 · @ 引用工作区文件' : '历史会话只读'),
              ),
              attachments.length
                ? h('div', { className: 'wb-attach-row' }, attachments.map((attachment) => h('div', { key: attachment.id, className: 'wb-attach-chip' },
                    attachment.kind === 'image' && attachment.previewUrl
                      ? h('img', { className: 'wb-attach-thumb', src: attachment.previewUrl, alt: attachment.name })
                      : h('span', { className: 'wb-attach-icon' }, '📎'),
                    h('span', { className: 'wb-attach-name' }, attachment.name),
                    h('button', { type: 'button', className: 'wb-attach-remove', onClick: () => removeAttachment(attachment.id) }, '×'),
                  )))
                : null,
              h('div', { className: 'wb-compose-row' },
                h('textarea', {
                  className: 'wb-chat-input',
                  rows: 2,
                  value: draft,
                  disabled: !canSend,
                  placeholder: canSend ? '读取当前项目上下文，告诉我最重要的下一步。' : '历史会话只读；切回当前会话即可发送。',
                  onChange: (event) => setDraft(event.target.value),
                  onPaste: (event) => {
                    const files = [...(event.clipboardData?.files || [])];
                    if (files.length > 0) { event.preventDefault(); addFiles(files); }
                  },
                  onKeyDown: (event) => {
                    // 中文输入法选词时的回车不能当成发送。
                    if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  },
                }),
                h('button', {
                  type: 'button',
                  className: 'wb-btn wb-btn-primary',
                  onClick: send,
                  disabled: (!draft.trim() && attachments.length === 0) || sending || !canSend,
                }, sending ? '…' : '发送 ↑'),
              ),
            ),
          ),
          h('div', { className: 'wb-chat-hint' }, '回车发送 · 上档键+回车换行 · 可粘贴截图或拖入文件'),
        ),
        refOpen ? h('div', { className: 'wb-picker-overlay', onMouseDown: () => setRefOpen(false) },
          h('div', { className: 'wb-picker-panel', onMouseDown: (event) => event.stopPropagation() },
            h('div', { className: 'wb-picker-head' },
              h('strong', null, '引用工作区文件'),
              h('button', { type: 'button', className: 'wb-close', onClick: () => setRefOpen(false) }, '×'),
            ),
            h('input', {
              className: 'wb-input wb-picker-search',
              autoFocus: true,
              placeholder: '搜索文件或目录…',
              value: refQuery,
              onChange: (event) => setRefQuery(event.target.value),
            }),
            refError ? h('div', { className: 'wb-approval-error' }, refError) : null,
            h('div', { className: 'wb-picker-list' },
              refBusy
                ? h('div', { className: 'wb-right-empty' }, '搜索中…')
                : refItems.length === 0
                  ? h('div', { className: 'wb-right-empty' }, '没有匹配文件')
                  : refItems.slice(0, 60).map((item, index) => {
                      const path = item.path || item.name || '';
                      const kind = item.kind || item.type || 'file';
                      const mention = item.mention || fileMention(path, kind);
                      return h('button', {
                        key: `${path}-${index}`,
                        type: 'button',
                        className: 'wb-picker-item',
                        onClick: () => { insertMention(mention); setRefOpen(false); },
                      },
                        h('span', { className: 'wb-picker-item-name' }, item.name || item.label || path),
                        h('span', { className: 'wb-picker-item-path' }, path),
                      );
                    }),
            ),
          )) : null,
        cmdOpen ? h('div', { className: 'wb-picker-overlay', onMouseDown: () => setCmdOpen(false) },
          h('div', { className: 'wb-picker-panel', onMouseDown: (event) => event.stopPropagation() },
            h('div', { className: 'wb-picker-head' },
              h('strong', null, '斜杠指令'),
              h('button', { type: 'button', className: 'wb-close', onClick: () => setCmdOpen(false) }, '×'),
            ),
            cmdError ? h('div', { className: 'wb-approval-error' }, cmdError) : null,
            h('div', { className: 'wb-picker-list' },
              cmdBusy
                ? h('div', { className: 'wb-right-empty' }, '读取中…')
                : cmdItems.length === 0
                  ? h('div', { className: 'wb-right-empty' }, '没有可用指令')
                  : cmdItems.map((item) => h('button', {
                      key: item.name || item.command,
                      type: 'button',
                      className: 'wb-picker-item',
                      onClick: () => { insertMention(`/${item.name || item.command} `); setCmdOpen(false); },
                    },
                      h('span', { className: 'wb-picker-item-name' }, `/${item.name || item.command}`),
                      item.description ? h('span', { className: 'wb-picker-item-path' }, item.description) : null,
                    )),
            ),
          )) : null,
      );
    }

    // ── 素材墙 ──────────────────────────────────────────────────────────────
    function mediaSize(bytes) {
      if (!Number.isFinite(bytes)) return '';
      if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    function MediaGrid({ media, loading, onOpen, onRefresh }) {
      const items = media?.items || [];
      return h('div', { className: 'wb-media-wrap' },
        h('div', { className: 'wb-media-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '素材 / 媒体'), h('div', { className: 'wb-media-dir' }, media?.dir || '素材目录未设置')),
          h(Button, { onClick: onRefresh, disabled: loading, icon: 'refresh' }, loading ? '刷新中…' : '刷新素材'),
        ),
        items.length === 0
          ? h('div', { className: 'wb-media-empty' }, h('span', { className: 'wb-eyebrow' }, '暂无素材'), h('p', null, '把图片/视频放进素材目录，就会出现在这里。默认目录：~/.dsh/memory-kb/media'))
          : h('div', { className: 'wb-media-grid' }, items.map((item) => h('button', {
              key: item.rel,
              type: 'button',
              className: 'wb-media-card',
              onClick: () => onOpen(item),
            },
            h('div', { className: 'wb-media-thumb-wrap' },
              item.kind === 'image'
                ? h('img', { className: 'wb-media-thumb', src: item.url, alt: item.name, loading: 'lazy' })
                : item.kind === 'video'
                  ? h('video', { className: 'wb-media-thumb', src: item.url, muted: true, preload: 'metadata' })
                  : h('div', { className: 'wb-media-thumb wb-media-audio' }, '♪'),
              item.kind === 'video' ? h('span', { className: 'wb-media-play' }, h(Icon, { name: 'play', size: 16 })) : null,
            ),
            h('div', { className: 'wb-media-name' }, item.name),
            h('div', { className: 'wb-media-meta' }, `${mediaSize(item.size)} · ${item.kind === 'video' ? '视频' : item.kind === 'image' ? '图片' : '音频'} · ${fmtDate(new Date(item.mtime).toISOString())}`),
          ))),
      );
    }

    function MediaLightbox({ item, onClose }) {
      if (!item) return null;
      return h('div', { className: 'wb-lightbox', onMouseDown: onClose },
        h('div', { className: 'wb-lightbox-panel', onMouseDown: (event) => event.stopPropagation() },
          h('div', { className: 'wb-lightbox-head' },
            h('span', { className: 'wb-media-name' }, item.name),
            h('button', { type: 'button', className: 'wb-close', onClick: onClose, 'aria-label': '关闭预览' }, '×'),
          ),
          item.kind === 'image'
            ? h('img', { className: 'wb-lightbox-media', src: item.url, alt: item.name })
            : item.kind === 'video'
              ? h('video', { className: 'wb-lightbox-media', src: item.url, controls: true, autoPlay: true })
              : h('audio', { className: 'wb-lightbox-media', src: item.url, controls: true, autoPlay: true }),
          h('div', { className: 'wb-lightbox-foot' },
            h('span', { className: 'wb-muted' }, `${mediaSize(item.size)} · ${item.rel}`),
            h('a', { className: 'wb-btn', href: item.url, target: '_blank', rel: 'noreferrer noopener' }, '打开原文件'),
          ),
        ),
      );
    }

    // ── 风格 / 监控 ─────────────────────────────────────────────────────────
    const STYLE_PRESETS = [
      {
        name: '严谨技术风',
        desc: '结论先行，随后给实测证据：命令输出、文件大小、接口返回、日志；未验证的明确标注。',
        prompt: '请用严谨技术风回答：先给结论，再列实测证据（命令输出/文件大小/接口返回/日志），未验证的内容明确写“未验证”，禁止“应该/大概”。',
        color: THEME.green,
      },
      {
        name: '自媒体口播风',
        desc: '短句、节奏快、有钩子；先抛冲突或结果，再解释，适合短视频口播。',
        prompt: '请用自媒体口播风回答：短句、节奏快，开头先抛冲突或结果，再解释关键点，最后给一句可记住的总结。',
        color: THEME.pink,
      },
      {
        name: '简洁汇报风',
        desc: '一页纸、结论先行、分点；只保留决策需要的信息，不展开过程。',
        prompt: '请用简洁汇报风回答：一页纸、结论先行、分点，只保留决策需要的信息，控制在 5 个要点内。',
        color: THEME.accentSoft,
      },
      {
        name: '深度分析风',
        desc: '拆前提、列方案、对比代价与风险；给出推荐路线和回退方式。',
        prompt: '请用深度分析风回答：拆解前提，列出至少两个方案，对比代价与风险，给出推荐路线和回退方式。',
        color: THEME.cyan,
      },
    ];

    function Styles({ onCopy, onInvoke }) {
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '输出模型'), h('h1', { className: 'wb-page-title' }, '输出模型')),
          h('span', { className: 'wb-muted' }, '复制或直接发送到当前对话，切换回答风格。'),
        ),
        h('div', { className: 'wb-style-grid' }, STYLE_PRESETS.map((style, index) => h('div', { key: style.name, className: 'wb-style', style: { '--style': style.color } },
          h('div', { className: 'wb-style-head' },
            h('span', { className: 'wb-style-no' }, String(index + 1).padStart(2, '0')),
            h('span', { className: 'wb-eyebrow' }, '输出风格'),
          ),
          h('div', { className: 'wb-style-title' }, style.name),
          h('div', { className: 'wb-style-desc' }, style.desc),
          h('div', { className: 'wb-style-actions' },
            h('button', { type: 'button', className: 'wb-btn wb-btn-expert', onClick: () => onInvoke(style.prompt, style.name) }, h(Icon, { name: 'spark', size: 12 }), '在对话中使用'),
            h('button', { type: 'button', className: 'wb-btn', onClick: () => onCopy(style.prompt, style.name) }, h(Icon, { name: 'copy', size: 12 }), '复制指令'),
          ),
        ))),
      );
    }

    function Monitor({
      overview, entries, session, sessionId, sessions, running, usage, permissionValue,
      modelLabel, account, accountLoading, onAccountRefresh, settings,
      workspaceTitle, workspacePath, workspaceCount, health, onRefresh, onOpenCodeView,
      processItems = [], processError = '',
    }) {
      const stats = overview?.stats || { counts: {}, tags: [] };
      const counts = {};
      for (const entry of entries || []) counts[entry.type || entry.kind] = (counts[entry.type || entry.kind] || 0) + 1;
      const rows = [
        { key: 'project', label: '项目' },
        { key: 'fact', label: '事实' },
        { key: 'preference', label: '偏好' },
        { key: 'decision', label: '决策' },
        { key: 'reference', label: '参考' },
        { key: 'skill', label: '技能' },
        { key: 'news', label: '新闻' },
      ].map((row) => ({ ...row, value: counts[row.key] || 0, color: (TYPE_META[row.key] || TYPE_META.fact).color }));
      const max = Math.max(1, ...rows.map((row) => row.value));
      const liveCount = (sessions || []).filter((item) => item.live).length;
      const totalSessions = (sessions || []).length;
      const recentTools = session?.recentTools || [];
      const cacheRead = usage?.cacheReadTokens || 0;
      const uncached = usage?.uncachedInputTokens || 0;
      const outputTokens = usage?.outputTokens || 0;
      const cacheWrite = usage?.cacheWriteTokens || 0;
      const promptTotal = cacheRead + uncached + cacheWrite;
      const hitRate = promptTotal ? `${((cacheRead / promptTotal) * 100).toFixed(1)}%` : '—';
      const fmtTokens = (value) => Number(value || 0).toLocaleString('zh-CN');
      const permissionLabels = {
        'read-only': '仅可查看',
        'workspace-write': '工作区内修改',
        'danger-full-access': '完全权限',
        auto: '自动审查',
      };
      const permissionLabel = permissionLabels[permissionValue] || permissionValue || '未识别';
      const healthLabel = health === null ? '检测中…' : health ? '插件服务正常' : '插件服务未连接';
      const healthClass = health === null ? 'is-muted' : health ? '' : 'is-error';
      const [refreshing, setRefreshing] = React.useState(false);
      const processRef = React.useRef(null);

      React.useEffect(() => {
        const el = processRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [processItems.length, running]);

      const currentSession = (sessions || []).find((item) => item.id === sessionId) || null;
      const sessionTitle = (typeof session?.title === 'string' && session.title) || currentSession?.title || '未识别';
      const processTurn = processItems.reduce((max, item) => Math.max(max, Number(item.turn) || 0), 0);
      const sessionTurn = Math.max(Number(session?.turn) || 0, processTurn);
      const processTools = processItems
        .filter((item) => item.type === 'tool/call')
        .map((item) => ({ name: item.toolName, at: item.ts }));
      const toolRows = (recentTools.length ? recentTools : processTools).slice(-5).reverse();
      const sessionLive = Boolean(session?.exists || currentSession?.live);
      const liveStatus = running ? '思考中' : sessionLive ? '实时' : '只读';
      const liveStatusTone = running ? 'is-running' : sessionLive ? 'is-ok' : 'is-muted';
      const cost = usage ? estimateUsageCost(usage, settings) : null;
      const perTurnCost = cost && sessionTurn > 0 ? cost.total / sessionTurn : null;
      const budget = Math.max(0, Number(settings?.dailyBudget) || 0);
      const todayUsed = Number(account?.todayUsage) || 0;
      const budgetPct = budget > 0 ? Math.min(100, (todayUsed / budget) * 100) : 0;
      const budgetOver = budget > 0 && todayUsed >= budget;

      const refreshAll = async () => {
        setRefreshing(true);
        try { await onRefresh?.(); } catch {}
        finally { setRefreshing(false); }
      };

      const renderProcess = () => {
        if (processItems.length === 0) {
          return h('div', { className: 'wb-proc-empty' },
            processError ? `读取工作过程失败：${processError}` : '等待后台工作过程…');
        }
        return processRows(processItems, { thinking: running, extended: false });
      };

      const stat = (label, value, tone = '', sub = '') => h('div', { className: 'wb-monitor-stat' },
        h('span', { className: 'wb-monitor-stat-label' }, label),
        h('strong', { className: `wb-monitor-stat-value ${tone}`.trim() }, value),
        sub ? h('small', null, sub) : null,
      );

      return h('div', { className: 'wb-page wb-monitor-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '运行状态'), h('h1', { className: 'wb-page-title' }, '运行状态')),
          h('div', { className: 'wb-monitor-actions' },
            h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: refreshAll, disabled: refreshing }, refreshing ? '刷新中…' : '刷新'),
            h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onOpenCodeView }, '代码视图'),
          ),
        ),
        h('div', { className: 'wb-monitor-stats' },
          stat('运行状态', liveStatus, liveStatusTone),
          stat('当前模型', modelLabel || '未选择'),
          stat('权限', permissionLabel),
          stat('工作区', workspaceTitle || '未选择', '', workspacePath || ''),
        ),
        h('div', { className: 'wb-monitor-layout' },
          h('div', { className: 'wb-monitor-col wb-monitor-main' },
            h('div', { className: 'wb-monitor-card wb-monitor-process-card' },
              h('div', { className: 'wb-monitor-card-head' },
                h('span', { className: 'wb-monitor-card-title' }, '运行轨迹'),
                h('span', { className: `wb-code-live${running ? ' is-thinking' : ''}` }, h('i'), running ? '思考中…' : '实时'),
                h('span', { className: 'wb-monitor-count' }, `${processItems.length} 条`),
              ),
              h('div', { className: 'wb-monitor-process', ref: processRef }, renderProcess()),
            ),
            h('div', { className: 'wb-monitor-card' },
              h('div', { className: 'wb-monitor-card-head' }, h('span', { className: 'wb-monitor-card-title' }, '条目分布')),
              rows.map((row) => h('div', { key: row.key, className: 'wb-bar-row' },
                h('span', { className: 'wb-bar-label' }, row.label),
                h('div', { className: 'wb-bar-track' }, h('div', { className: 'wb-bar-fill', style: { width: `${(row.value / max) * 100}%`, background: row.color } })),
                h('span', { className: 'wb-bar-value' }, String(row.value)),
              )),
            ),
          ),
          h('div', { className: 'wb-monitor-col wb-monitor-side' },
            h('div', { className: 'wb-monitor-card' },
              h('div', { className: 'wb-monitor-card-head' }, h('span', { className: 'wb-monitor-card-title' }, '会话与工作区')),
              h('dl', { className: 'wb-kv' },
                h('dt', null, '当前会话'), h('dd', null, sessionTitle),
                h('dt', null, '状态'), h('dd', null, liveStatus),
                h('dt', null, '轮次'), h('dd', null, String(sessionTurn)),
                h('dt', null, '缓冲事件'), h('dd', null, String(Math.max(Number(session?.bufferCount) || 0, processItems.length))),
                h('dt', null, '会话总数'), h('dd', null, `${totalSessions}（实时 ${liveCount}）`),
                h('dt', null, '工作区'), h('dd', null, `${workspaceCount}（当前 ${workspaceTitle || '—'}）`),
              ),
              h('div', { className: 'wb-monitor-sub' }, '最近工具'),
              toolRows.length === 0
                ? h('div', { className: 'wb-right-empty' }, '还没有工具调用。')
                : toolRows.map((tool, index) => h('div', { key: index, className: 'wb-run' },
                    h('span', { className: 'wb-run-name' }, tool.name),
                    h('span', { className: 'wb-run-time' }, fmtTime(tool.at)),
                  )),
            ),
            h('div', { className: 'wb-monitor-card' },
              h('div', { className: 'wb-monitor-card-head' }, h('span', { className: 'wb-monitor-card-title' }, '用量与账户')),
              h('div', { className: 'wb-monitor-usage' },
                h('span', null, '缓存命中'), h('strong', null, fmtTokens(cacheRead)),
                h('span', null, '未缓存输入'), h('strong', null, fmtTokens(uncached)),
                h('span', null, '输出'), h('strong', null, fmtTokens(outputTokens)),
                h('span', null, '缓存命中率'), h('strong', null, hitRate),
              ),
              h('div', { className: 'wb-monitor-sub' }, '成本估算'),
              cost
                ? h('div', { className: 'wb-monitor-usage' },
                    h('span', null, '本会话估算'), h('strong', { className: 'wb-cost-strong' }, fmtMoney(cost.total)),
                    h('span', null, '每轮平均'), h('strong', null, fmtMoney(perTurnCost)),
                    h('span', null, '今日实际（账本）'), h('strong', null, account?.ok && account.todayUsage != null ? fmtMoney(todayUsed) : '—'),
                    budget > 0 ? h('span', null, '日预算') : null,
                    budget > 0 ? h('strong', { className: budgetOver ? 'wb-cost-over' : '' }, `${fmtMoney(todayUsed)} / ${fmtMoney(budget)}`) : null,
                  )
                : h('div', { className: 'wb-right-empty' }, '暂无用量；对话后显示估算。'),
              budget > 0
                ? h('div', { className: 'wb-cost-bar' }, h('i', { className: budgetOver ? 'is-over' : '', style: { width: `${budgetPct}%` } }))
                : null,
              cost ? h('div', { className: 'wb-account-note' },
                `按输入 ¥${cost.rates.input} / 缓存命中 ¥${cost.rates.cacheRead} / 输出 ¥${cost.rates.output} 每百万 token 估算；今日实际为账户账本扣费，差额可能来自其它会话或插件自身调用。`) : null,
              h('div', { className: 'wb-monitor-sub' }, 'DeepSeek 账户'),
              account?.ok
                ? h(React.Fragment, null,
                    h('div', { className: 'wb-monitor-account-row' },
                      h('span', null, '当前余额'),
                      h('strong', null, `¥${Number(account.totalBalance || 0).toFixed(2)}`),
                    ),
                    h('div', { className: 'wb-monitor-account-row' },
                      h('span', null, '今日已用'),
                      h('strong', null, account.todayUsage == null ? '—' : `¥${Number(account.todayUsage).toFixed(2)}`),
                    ),
                  )
                : h('div', { className: 'wb-right-empty' }, account?.error || '读取中…'),
              h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onAccountRefresh, disabled: accountLoading },
                accountLoading ? '刷新中…' : '刷新余额'),
            ),
            h('div', { className: 'wb-monitor-card' },
              h('div', { className: 'wb-monitor-card-head' }, h('span', { className: 'wb-monitor-card-title' }, '引擎状态')),
              h('div', { className: `wb-monitor-health ${healthClass}`.trim() }, h('i'), healthLabel),
              h('dl', { className: 'wb-kv' },
                h('dt', null, '总条目'), h('dd', null, String(stats.total ?? 0)),
                h('dt', null, '最近沉淀'), h('dd', null, stats.lastDistill ? fmtDate(stats.lastDistill.at, true) : '暂无'),
                h('dt', null, '最近新闻'), h('dd', null, stats.lastNews ? fmtDate(stats.lastNews.at, true) : '暂无'),
                h('dt', null, '自动沉淀'), h('dd', null, stats.autoDistill ? '开启' : '关闭'),
                h('dt', null, '自动召回'), h('dd', null, stats.autoRecall ? '开启' : '关闭'),
                h('dt', null, '记忆目录'), h('dd', null, overview?.settings?.memoryDir || stats.memoryDir || '—'),
              ),
              h('div', { className: 'wb-monitor-sub' }, '热门标签'),
              h('div', { className: 'wb-tags' }, (stats.tags || []).slice(0, 14).map((tag) => h(Tag, { key: tag.name }, `${tagLabel(tag.name)} ${tag.count}`))),
            ),
          ),
        ),
      );
    }

    // ── 新闻 ────────────────────────────────────────────────────────────────
    function News({ news, digest, onRefresh, busy }) {
      const items = news?.items || [];
      // 用词边界匹配，避免 training/detail 里的 "ai" 被误判为 AI 新闻。
      const left = items.filter((item) => item.category !== 'dev' && !/\b(AI|GPT|LLM|Agent)\b|模型/i.test(item.title));
      const right = items.filter((item) => item.category === 'dev' || /\b(AI|GPT|LLM|Agent)\b|模型/i.test(item.title));
      const column = (title, list) => h('div', { className: 'wb-news-col' },
        h('div', { className: 'wb-eyebrow' }, title),
        list.length === 0 ? h('div', { className: 'wb-news-empty' }, '暂无条目') : list.slice(0, 14).map((item) => h('a', {
          key: `${item.title}-${item.link}`,
          className: 'wb-news-item',
          href: item.link || '#',
          target: '_blank',
          rel: 'noreferrer noopener',
        },
        item.image ? h('img', { className: 'wb-news-thumb', src: item.image, alt: '', loading: 'lazy' }) : h('span', { className: 'wb-news-thumb wb-news-fallback' }, item.source?.match(/[一-鿿]/)?.[0] || '新闻'),
        h('div', { className: 'wb-news-body' },
          h('div', { className: 'wb-news-title' }, item.title),
          h('div', { className: 'wb-news-meta' }, h('span', null, item.source), h('span', null, fmtDate(item.publishedAt, true))),
        ),
        )),
      );
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-news-hero' },
          h('div', null,
            h('span', { className: 'wb-eyebrow' }, '实时新闻'),
            h('h1', { className: 'wb-news-title-main' }, '近三天，', h('span', null, '人工智能世界发生了什么。')),
            h('p', { className: 'wb-muted' }, digest ? `最新简报：${digest.title}` : '还没有新闻简报，点右侧刷新抓取。'),
          ),
          h(Button, { kind: 'primary', onClick: onRefresh, disabled: busy, icon: 'refresh' }, busy ? '抓取中…' : '刷新抓取'),
        ),
        h('div', { className: 'wb-news-grid' },
          column('人工智能行业资讯', left),
          column('工具与模型动向', right),
        ),
      );
    }

    // ── 图谱 ────────────────────────────────────────────────────────────────
    function layoutGraph(data) {
      const nodes = (data.nodes || []).map((node, index) => {
        const angle = (index / Math.max(1, data.nodes.length)) * Math.PI * 2;
        const radius = 220 + (index % 7) * 26;
        return { ...node, x: 500 + Math.cos(angle) * radius, y: 320 + Math.sin(angle) * radius, vx: 0, vy: 0 };
      });
      const byId = new Map(nodes.map((node) => [node.id, node]));
      const links = (data.links || []).filter((link) => byId.has(link.source) && byId.has(link.target));
      for (let step = 0; step < 160; step += 1) {
        const alpha = 1 - step / 160;
        for (let i = 0; i < nodes.length; i += 1) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j += 1) {
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            const distance = Math.max(8, Math.hypot(dx, dy));
            const force = (6200 / (distance * distance)) * alpha;
            dx /= distance; dy /= distance;
            a.vx += dx * force; a.vy += dy * force;
            b.vx -= dx * force; b.vy -= dy * force;
          }
        }
        for (const link of links) {
          const a = byId.get(link.source);
          const b = byId.get(link.target);
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distance = Math.max(8, Math.hypot(dx, dy));
          const force = (distance - 115) * 0.006 * alpha;
          dx /= distance; dy /= distance;
          a.vx += dx * force; a.vy += dy * force;
          b.vx -= dx * force; b.vy -= dy * force;
        }
        for (const node of nodes) {
          node.vx += (500 - node.x) * 0.0015 * alpha;
          node.vy += (320 - node.y) * 0.0015 * alpha;
          node.vx *= 0.82; node.vy *= 0.82;
          node.x = Math.max(24, Math.min(976, node.x + node.vx));
          node.y = Math.max(24, Math.min(616, node.y + node.vy));
        }
      }
      if (nodes.length > 1) {
        const xs = nodes.map((node) => node.x);
        const ys = nodes.map((node) => node.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const scale = Math.min(920 / Math.max(1, maxX - minX), 560 / Math.max(1, maxY - minY), 2.2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        for (const node of nodes) {
          node.x = 500 + (node.x - cx) * scale;
          node.y = 320 + (node.y - cy) * scale;
        }
      }
      return { nodes, links };
    }

    const GRAPH_COLORS = { memory: THEME.accentSoft, knowledge: THEME.violet, skill: THEME.green, news: THEME.orange, profile: THEME.cyan, tag: THEME.dim };

    function GraphTab({ graph, loading, onRefresh, onOpen }) {
      const layout = React.useMemo(() => layoutGraph(graph || { nodes: [], links: [] }), [graph]);
      return h('div', { className: 'wb-page wb-graph-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '关系网络'), h('h1', { className: 'wb-page-title' }, '关系网络')),
          h(Button, { onClick: onRefresh, disabled: loading, icon: 'refresh' }, loading ? '刷新中…' : '刷新'),
        ),
        h('div', { className: 'wb-graph-stats' },
          h('span', null, `${layout.nodes.length} 个节点`),
          h('span', null, `${layout.links.length} 条边`),
          h('span', { className: 'wb-muted' }, graph?.truncated ? `共 ${graph.total} 条，已截断` : '全部条目已展示'),
        ),
        h('div', { className: 'wb-graph-canvas' },
          h('svg', { viewBox: '0 0 1000 640', className: 'wb-graph-svg', role: 'img', 'aria-label': '知识图谱' },
            layout.links.map((link, index) => {
              const a = layout.nodes.find((node) => node.id === link.source);
              const b = layout.nodes.find((node) => node.id === link.target);
              if (!a || !b) return null;
              return h('line', { key: `l-${index}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, className: 'wb-edge' });
            }),
            layout.nodes.map((node) => h('g', {
              key: node.id,
              className: 'wb-node',
              onClick: () => node.kind !== 'tag' && onOpen(node),
            },
            h('circle', { cx: node.x, cy: node.y, r: node.kind === 'tag' ? 4.5 : 7.5, fill: GRAPH_COLORS[node.kind] || THEME.dim }),
            h('text', { x: node.x + 10, y: node.y + 3, className: 'wb-node-label' }, truncate(node.label, 20)),
            )),
          ),
        ),
        h('div', { className: 'wb-legend' }, Object.entries({ memory: '记忆', knowledge: '知识', skill: '技能', news: '新闻', profile: '偏好', tag: '标签' }).map(([kind, label]) => h('span', { key: kind, className: 'wb-legend-item' },
          h('i', { style: { background: GRAPH_COLORS[kind] } }), label,
        ))),
      );
    }

    // ── 设置 ────────────────────────────────────────────────────────────────
    function parseSources(text) {
      return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const [name, url, category] = line.split('|').map((part) => part.trim());
        return { name: name || url, url, category: category || 'tech' };
      }).filter((source) => /^https?:\/\//.test(source.url || ''));
    }

    function formatSources(sources) {
      return (sources || []).map((source) => `${source.name} | ${source.url} | ${source.category || 'tech'}`).join('\n');
    }

    function Settings({ onToast, onSaved }) {
      const [settings, setSettings] = React.useState(null);
      const [saving, setSaving] = React.useState(false);
      React.useEffect(() => {
        api('/settings').then((data) => setSettings({ ...data.settings, sourcesText: formatSources(data.settings.newsSources) }))
          .catch((error) => onToast(`读取设置失败：${error.message}`, 'error'));
      }, [onToast]);
      const patch = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
      const save = async () => {
        setSaving(true);
        try {
          const payload = {
            autoDistill: Boolean(settings.autoDistill),
            autoRecall: Boolean(settings.autoRecall),
            recallLimit: Number(settings.recallLimit),
            maxMemoriesPerTurn: Number(settings.maxMemoriesPerTurn),
            newsEnabled: Boolean(settings.newsEnabled),
            newsIntervalHours: Number(settings.newsIntervalHours),
            newsMaxItemsPerSource: Number(settings.newsMaxItemsPerSource),
            provider: settings.provider || '',
            model: settings.model || '',
            newsSources: parseSources(settings.sourcesText ?? ''),
            dailyBudget: Number(settings.dailyBudget) || 0,
            priceCacheRead: Number(settings.priceCacheRead) || 0,
            priceInput: Number(settings.priceInput) || 0,
            priceOutput: Number(settings.priceOutput) || 0,
          };
          const data = await api('/settings', { method: 'POST', body: JSON.stringify(payload) });
          setSettings({ ...data.settings, sourcesText: formatSources(data.settings.newsSources) });
          onToast('设置已保存并立即生效', 'success');
          onSaved?.();
        } catch (error) {
          onToast(`保存失败：${error.message}`, 'error');
        } finally { setSaving(false); }
      };
      if (!settings) return h(Empty, null, h(Spinner), ' 读取设置…');
      const toggle = (key, label, hint) => h('label', { className: 'wb-switch-row' },
        h('span', null, h('strong', null, label), hint ? h('small', { className: 'wb-muted wb-block' }, hint) : null),
        h('input', { type: 'checkbox', checked: Boolean(settings[key]), onChange: (event) => patch(key, event.target.checked), className: 'wb-switch' }),
      );
      const number = (key, label, min, max) => h('label', { className: 'wb-field' },
        h('span', null, label),
        h('input', { type: 'number', className: 'wb-input', min, max, value: settings[key], onChange: (event) => patch(key, Number(event.target.value)) }),
      );
      return h('div', { className: 'wb-page wb-settings' },
        h('div', { className: 'wb-page-head' }, h('div', null, h('span', { className: 'wb-eyebrow' }, '设置'), h('h1', { className: 'wb-page-title' }, '本地引擎设置'))),
        h('section', { className: 'wb-settings-card' },
          h('h3', { className: 'wb-settings-h' }, '自动能力'),
          toggle('autoDistill', '自动沉淀', '每轮对话结束自动抽记忆；关闭后仍可用 /memory distill。'),
          toggle('autoRecall', '自动召回', '用户发消息时检索相关记忆，附在下一个步骤。'),
          h('div', { className: 'wb-grid2' }, number('recallLimit', '每次召回条数', 1, 10), number('maxMemoriesPerTurn', '每轮最多沉淀', 0, 8)),
        ),
        h('section', { className: 'wb-settings-card' },
          h('h3', { className: 'wb-settings-h' }, '新闻'),
          toggle('newsEnabled', '启用新闻抓取', '桌面版运行期间定时抓取新闻源，并生成中文简报。'),
          h('div', { className: 'wb-grid2' }, number('newsIntervalHours', '抓取间隔（小时）', 1, 168), number('newsMaxItemsPerSource', '每个源最多条数', 1, 60)),
          h('label', { className: 'wb-field wb-field-col' },
            h('span', null, '新闻源（每行：名称 | 链接 | 分类）'),
            h('textarea', { className: 'wb-input wb-textarea', rows: 7, value: settings.sourcesText ?? '', onChange: (event) => patch('sourcesText', event.target.value) }),
          ),
        ),
        h('section', { className: 'wb-settings-card' },
          h('h3', { className: 'wb-settings-h' }, '模型路由'),
          h('p', { className: 'wb-muted' }, '留空则自动使用当前会话的提供方和模型。'),
          h('div', { className: 'wb-grid2' },
            h('label', { className: 'wb-field' }, h('span', null, '提供方'), h('input', { className: 'wb-input', value: settings.provider || '', onChange: (event) => patch('provider', event.target.value), placeholder: 'deepseek-account' })),
            h('label', { className: 'wb-field' }, h('span', null, '模型'), h('input', { className: 'wb-input', value: settings.model || '', onChange: (event) => patch('model', event.target.value), placeholder: 'deepseek-flash' })),
          ),
        ),
        h('section', { className: 'wb-settings-card' },
          h('h3', { className: 'wb-settings-h' }, '成本估算'),
          h('p', { className: 'wb-muted' }, '单价单位：元 / 百万 token。默认按 DeepSeek V3.2 价目；模型不同可自行调整。日预算填 0 表示不提醒。'),
          h('div', { className: 'wb-grid2' },
            number('dailyBudget', '日预算（元）', 0, 100000),
            number('priceInput', '未缓存输入单价', 0, 1000),
          ),
          h('div', { className: 'wb-grid2' },
            number('priceCacheRead', '缓存命中单价', 0, 1000),
            number('priceOutput', '输出单价', 0, 1000),
          ),
        ),
        h('section', { className: 'wb-settings-card' },
          h('h3', { className: 'wb-settings-h' }, '目录'),
          h('dl', { className: 'wb-kv' },
            h('dt', null, '记忆'), h('dd', null, settings.memoryDir),
            h('dt', null, '技能'), h('dd', null, settings.skillsDir),
            h('dt', null, '插件状态'), h('dd', null, settings.pluginDir),
          ),
        ),
        h('div', { className: 'wb-settings-foot' }, h(Button, { kind: 'primary', onClick: save, disabled: saving }, saving ? '保存中…' : '保存设置')),
      );
    }

    // ── 右侧记忆中心 ────────────────────────────────────────────────────────
    function MemoryCenter({
      session, sessionLabel, overview, busy, onDistill, onNews, onRefresh, onGoal, sessionId,
      account, accountLoading, onAccountRefresh,
      modelGroups, modelSelection, currentModel, currentEffort, currentEfforts,
      permissionValue, usage, onSwitchModel, onSwitchPermission, modelStatus, modelError,
      settings, onExport, exporting,
    }) {
      const [goal, setGoal] = React.useState(session?.goal || '');
      React.useEffect(() => { setGoal(session?.goal || ''); }, [session?.goal, sessionId]);
      const todos = session?.todos || [];
      const tools = session?.recentTools || [];
      const last = session?.lastDistill || overview?.stats?.lastDistill;
      const liveSession = Boolean(session?.exists);
      const sessionState = liveSession ? '实时会话' : (sessionId ? '只读会话' : '无会话');
      const permissionOptions = [
        { id: 'read-only', label: '仅可查看' },
        { id: 'workspace-write', label: '工作区内修改' },
        { id: 'danger-full-access', label: '完全权限' },
        { id: 'auto', label: '自动审查（实验）' },
      ];
      const modelValue = modelSelection ? `${modelSelection.provider}::${modelSelection.model}` : '';
      const fmtTokens = (value) => Number(value || 0).toLocaleString('zh-CN');
      const promptTotal = (usage?.uncachedInputTokens || 0) + (usage?.cacheReadTokens || 0) + (usage?.cacheWriteTokens || 0);
      const cacheRate = promptTotal > 0 ? `${(((usage?.cacheReadTokens || 0) / promptTotal) * 100).toFixed(1)}%` : '—';
      const hasUsage = Boolean(usage && (usage.cacheReadTokens || usage.uncachedInputTokens || usage.outputTokens || usage.cacheWriteTokens));
      const cost = hasUsage ? estimateUsageCost(usage, settings) : null;
      const currentEffortName = (currentEfforts || []).find((effort) => effort.id === currentEffort)?.name || currentEffort;
      return h('aside', { className: 'wb-right' },
        h('div', { className: 'wb-right-head' },
          h('span', { className: 'wb-eyebrow' }, '实时信号'),
          h('span', { className: `wb-live${liveSession ? '' : ' is-muted'}` }, h('i'), sessionState),
        ),
        h('div', { className: 'wb-goal' },
          h('div', { className: 'wb-goal-label' }, '当前目标'),
          h('div', { className: 'wb-goal-value' }, goal || '尚未设定'),
          h('input', {
            className: 'wb-goal-input',
            value: goal,
            onChange: (event) => setGoal(event.target.value),
            placeholder: '这一轮要完成什么？',
          }),
          h('button', { type: 'button', className: 'wb-goal-save', onClick: () => onGoal(goal), disabled: !sessionId }, '保存目标'),
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, 'DeepSeek 账户'),
          account?.ok
            ? h(React.Fragment, null,
                h('div', { className: 'wb-account-row' },
                  h('span', null, '当前余额'),
                  h('strong', null, `¥${Number(account.totalBalance || 0).toFixed(2)}`),
                ),
                h('div', { className: 'wb-account-row' },
                  h('span', null, '今日已用'),
                  h('strong', null, account.todayUsage == null ? '—' : `¥${Number(account.todayUsage).toFixed(2)}`),
                ),
                h('div', { className: 'wb-account-note' }, account.note || ''),
                account.startedAt ? h('div', { className: 'wb-account-note' }, `记账起点：${fmtTime(account.startedAt)}`) : null,
                h('div', { className: 'wb-account-note' },
                  `余额来源：${account.balanceSource === 'apikey' ? 'API 密钥' : account.balanceSource === 'account' ? 'DSH 账号' : 'Workbench 记账'}`),
              )
            : h('div', { className: 'wb-right-empty' }, account?.error || '读取中…'),
          h('button', { type: 'button', className: 'wb-btn wb-btn-mini', onClick: onAccountRefresh, disabled: accountLoading },
            accountLoading ? '刷新中…' : '刷新余额'),
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '会话控制'),
          h('label', { className: 'wb-field-tight' },
            h('span', null, '模型'),
            h('select', {
              className: 'wb-input',
              value: modelValue,
              disabled: !liveSession || modelGroups.length === 0,
              onChange: (event) => {
                const [provider, model] = event.target.value.split('::');
                const group = modelGroups.find((entry) => entry.id === provider);
                const picked = group?.models?.find((entry) => entry.id === model);
                if (provider && model) {
                  onSwitchModel({
                    provider,
                    model,
                    ...(picked?.reasoning?.defaultEffort ? { reasoningEffort: picked.reasoning.defaultEffort } : {}),
                  });
                }
              },
            },
              modelGroups.length === 0
                ? h('option', { value: '' }, modelStatus === 'error' ? '模型目录不可用' : '加载中…')
                : null,
              !modelSelection && modelGroups.length
                ? h('option', { value: '' }, '请选择模型')
                : null,
              modelSelection && !modelGroups.some((group) => group.id === modelSelection.provider
                && (group.models || []).some((model) => model.id === modelSelection.model))
                ? h('option', { value: modelValue }, `${modelSelection.provider}/${modelSelection.model}`)
                : null,
              modelGroups.map((group) => h('optgroup', { key: group.id, label: group.name || group.id },
                (group.models || []).map((model) => h('option', {
                  key: model.id,
                  value: `${group.id}::${model.id}`,
                }, model.name || model.id)),
              )),
            ),
          ),
          currentEfforts.length ? h('label', { className: 'wb-field-tight' },
            h('span', null, '推理强度'),
            h('select', {
              className: 'wb-input',
              value: currentEffort,
              disabled: !liveSession,
              onChange: (event) => {
                if (!modelSelection) return;
                onSwitchModel({
                  provider: modelSelection.provider,
                  model: modelSelection.model,
                  reasoningEffort: event.target.value,
                });
              },
            }, currentEfforts.map((effort) => h('option', { key: effort.id, value: effort.id }, effort.name || effort.id))),
          ) : null,
          h('label', { className: 'wb-field-tight' },
            h('span', null, '权限'),
            h('select', {
              className: 'wb-input',
              value: permissionValue,
              disabled: !liveSession || !permissionValue,
              onChange: (event) => onSwitchPermission(event.target.value),
            },
              !permissionValue ? h('option', { value: '' }, '读取中…') : null,
              permissionValue && !permissionOptions.some((option) => option.id === permissionValue)
                ? h('option', { value: permissionValue }, permissionValue)
                : null,
              permissionOptions.map((option) => h('option', { key: option.id, value: option.id }, option.label)),
            ),
          ),
          currentModel ? h('div', { className: 'wb-account-note' },
            `当前：${currentModel.name || currentModel.id}${currentEffortName ? ` · ${currentEffortName}` : ''}`) : null,
          !liveSession ? h('div', { className: 'wb-right-empty' }, '历史会话只读；新建会话后可切换模型和权限。') : null,
          modelError ? h('div', { className: 'wb-right-empty' }, `模型目录：${modelError}`) : null,
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '会话用量'),
          hasUsage
            ? h('div', { className: 'wb-usage' },
                h('span', null, '缓存命中'), h('strong', null, fmtTokens(usage.cacheReadTokens)),
                h('span', null, '未缓存输入'), h('strong', null, fmtTokens(usage.uncachedInputTokens)),
                h('span', null, '输出'), h('strong', null, fmtTokens(usage.outputTokens)),
                usage.cacheWriteTokens ? h('span', null, '缓存写入') : null,
                usage.cacheWriteTokens ? h('strong', null, fmtTokens(usage.cacheWriteTokens)) : null,
                h('span', null, '缓存命中率'), h('strong', null, cacheRate),
                cost ? h('span', null, '本会话估算') : null,
                cost ? h('strong', { className: 'wb-cost-strong' }, fmtMoney(cost.total)) : null,
              )
            : h('div', { className: 'wb-right-empty' }, liveSession ? '暂无用量；对话后会显示缓存命中' : '历史会话不提供实时用量。'),
          cost ? h('div', { className: 'wb-account-note' },
            `估算单价：输入 ¥${cost.rates.input}、缓存命中 ¥${cost.rates.cacheRead}、输出 ¥${cost.rates.output} / 百万 token`) : null,
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '记忆中心'),
          h('div', { className: 'wb-kv wb-kv-tight' },
            h('span', null, '会话'), h('span', null,
              (typeof session?.title === 'string' && session.title)
                || (typeof sessionLabel === 'string' && sessionLabel)
                || (sessionId ? `${sessionId.slice(0, 18)}…` : '未识别')),
            h('span', null, '轮次'), h('span', null, String(session?.turn ?? 0)),
            h('span', null, '缓冲事件'), h('span', null, String(session?.bufferCount ?? 0)),
            h('span', null, '最近沉淀'), h('span', null, last ? fmtDate(last.at, true) : '暂无'),
          ),
          h('button', { type: 'button', className: 'wb-btn wb-btn-primary wb-btn-block', onClick: onDistill, disabled: busy === 'distill' || !sessionId },
            busy === 'distill' ? '沉淀中…' : '沉淀本次对话'),
          h('button', { type: 'button', className: 'wb-btn wb-btn-block', onClick: onExport, disabled: exporting || !sessionId },
            exporting ? '导出中…' : '导出会话 Markdown'),
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '任务队列'),
          todos.length === 0
            ? h('div', { className: 'wb-right-empty' }, '没有排队任务。')
            : todos.slice(0, 8).map((todo, index) => h('div', { key: index, className: 'wb-todo' },
              h('span', { className: `wb-todo-dot is-${todo.status || 'pending'}` }),
              h('span', null, truncate(todo.content, 42)),
            )),
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '运行记录'),
          tools.length === 0
            ? h('div', { className: 'wb-right-empty' }, '还没有工具调用。')
            : tools.slice(0, 5).map((tool, index) => h('div', { key: index, className: 'wb-run' },
              h('span', { className: 'wb-run-name' }, tool.name),
              h('span', { className: 'wb-run-time' }, fmtTime(tool.at)),
            )),
        ),
        h('div', { className: 'wb-right-block' },
          h('div', { className: 'wb-right-title' }, '快速操作'),
          h('div', { className: 'wb-right-actions' },
            h(Button, { onClick: onNews, disabled: busy === 'news', icon: 'news' }, busy === 'news' ? '抓取中…' : '抓取新闻'),
            h(Button, { onClick: onRefresh, icon: 'refresh' }, '刷新'),
          ),
        ),
      );
    }

    // ── 内嵌审批 / 提问（C1）────────────────────────────────────────────────
    // 不重新注册 waterfall，而是读取 uiSession.sessionStatus 里已经发布出来的
    // PendingApproval / PendingQuestion 对象，在工作台里直接渲染并回答。

    function interactionReason(pending) {
      const pick = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');
      return pick(pending?.reason) || pick(pending?.displayReason) || '';
    }

    function ApprovalCard({ pending, onExit }) {
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const answer = async (outcome) => {
        if (busy || pending.answerable === false) return;
        setBusy(true);
        setError('');
        try {
          await pending.answer(outcome);
        } catch (err) {
          setError(err?.message || String(err));
          setBusy(false);
        }
      };
      const reason = interactionReason(pending);
      return h('div', { className: 'wb-approval' },
        h('div', { className: 'wb-approval-head' },
          h('span', { className: 'wb-eyebrow' }, '等待审批'),
          h('span', { className: 'wb-approval-tool' }, pending.toolName || '工具'),
        ),
        h('div', { className: 'wb-approval-reason' },
          reason || `工具 ${pending.toolName || ''} 请求越权执行，是否允许这一次？`),
        error ? h('div', { className: 'wb-approval-error' }, error) : null,
        h('div', { className: 'wb-approval-actions' },
          onExit ? h('button', { type: 'button', className: 'wb-btn', onClick: onExit }, '退出工作台处理') : null,
          h('button', { type: 'button', className: 'wb-btn', onClick: () => answer('rejected'), disabled: busy }, busy ? '…' : '拒绝'),
          h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: () => answer('allowed-once'), disabled: busy }, busy ? '…' : '允许一次'),
        ),
      );
    }

    function normalizeQuestions(pending) {
      const list = Array.isArray(pending?.questions) ? pending.questions : [];
      return list
        .filter((question) => question && typeof question.id === 'string' && typeof question.question === 'string')
        .map((question) => ({
          id: question.id,
          question: question.question,
          header: typeof question.header === 'string' ? question.header : '',
          detail: typeof question.detail === 'string' ? question.detail : '',
          multiSelect: question.multiSelect === true,
          options: Array.isArray(question.options)
            ? question.options.filter((option) => option && typeof option.label === 'string')
            : [],
        }));
    }

    function QuestionCard({ pending, onExit }) {
      const questions = React.useMemo(() => normalizeQuestions(pending), [pending]);
      const [drafts, setDrafts] = React.useState({});
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      React.useEffect(() => { setDrafts({}); setError(''); setBusy(false); }, [pending]);
      const stateOf = (id) => drafts[id] ?? { selected: [], custom: '' };
      const patch = (id, next) => setDrafts((prev) => ({ ...prev, [id]: { ...stateOf(id), ...next } }));
      const toggle = (question, label) => {
        const current = stateOf(question.id);
        const selected = question.multiSelect
          ? (current.selected.includes(label)
              ? current.selected.filter((item) => item !== label)
              : [...current.selected, label])
          : [label];
        patch(question.id, { selected, ...(question.multiSelect ? {} : { custom: '' }) });
      };
      const submit = async () => {
        if (busy) return;
        const missing = questions.find((question) => {
          const state = stateOf(question.id);
          return state.selected.length === 0 && !state.custom.trim();
        });
        if (missing) { setError('请先回答全部问题（可填“其他”）。'); return; }
        setBusy(true);
        setError('');
        try {
          await pending.answer({
            answers: questions.map((question) => {
              const state = stateOf(question.id);
              const custom = state.custom.trim();
              return {
                id: question.id,
                selected: custom && !question.multiSelect ? [] : state.selected,
                ...(custom ? { custom } : {}),
              };
            }),
          });
        } catch (err) {
          setError(err?.message || String(err));
          setBusy(false);
        }
      };
      if (questions.length === 0) return null;
      return h('div', { className: 'wb-question' },
        h('div', { className: 'wb-approval-head' },
          h('span', { className: 'wb-eyebrow' }, '等待回答'),
          h('span', { className: 'wb-approval-tool' }, `${questions.length} 个问题`),
        ),
        h('div', { className: 'wb-question-list' }, questions.map((question) => {
          const state = stateOf(question.id);
          return h('div', { key: question.id, className: 'wb-question-item' },
            question.header ? h('div', { className: 'wb-question-header' }, question.header) : null,
            h('div', { className: 'wb-question-title' }, question.question),
            question.detail ? h('pre', { className: 'wb-question-detail' }, question.detail) : null,
            question.options.length
              ? h('div', { className: 'wb-question-options' }, question.options.map((option) => h('button', {
                  key: option.label,
                  type: 'button',
                  className: `wb-question-option${state.selected.includes(option.label) ? ' is-selected' : ''}`,
                  onClick: () => toggle(question, option.label),
                },
                  h('span', null, option.label),
                  option.description ? h('small', null, option.description) : null,
                )))
              : null,
            h('input', {
              className: 'wb-input wb-question-custom',
              value: state.custom,
              placeholder: question.options.length ? '其他回答（可选）' : '输入回答',
              onChange: (event) => patch(question.id, { custom: event.target.value }),
            }),
          );
        })),
        error ? h('div', { className: 'wb-approval-error' }, error) : null,
        h('div', { className: 'wb-approval-actions' },
          onExit ? h('button', { type: 'button', className: 'wb-btn', onClick: onExit }, '退出工作台处理') : null,
          h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: submit, disabled: busy }, busy ? '提交中…' : '提交回答'),
        ),
      );
    }

    /** 读取当前主会话的 pendingInteraction 并渲染；工作台关闭时原生界面接管。 */
    function PendingInteractionHost({ uiSession, sessionId, onExit }) {
      const [pending, setPending] = React.useState(null);
      React.useEffect(() => {
        const status = uiSession?.sessionStatus;
        if (!status || typeof status.getSnapshot !== 'function' || !sessionId) {
          setPending(null);
          return undefined;
        }
        const read = () => {
          try {
            const row = status.getSnapshot()?.get?.(sessionId);
            const next = row?.pendingInteraction ?? null;
            setPending((prev) => (prev === next ? prev : next));
          } catch {
            setPending(null);
          }
        };
        read();
        const stop = typeof status.subscribe === 'function' ? status.subscribe(read) : undefined;
        return () => { if (typeof stop === 'function') stop(); };
      }, [uiSession, sessionId]);
      if (!pending) return null;
      if (Array.isArray(pending.questions) && pending.questions.length > 0) {
        return h(QuestionCard, { pending, onExit });
      }
      if (pending.toolName) return h(ApprovalCard, { pending, onExit });
      return null;
    }

    // ── 主容器 ──────────────────────────────────────────────────────────────
    function Workbench({ uiSession, getModelDirectories, getWorkspaceServices, getWorkspaceFiles, getRemote, getFileUpload }) {
      const open = useOpen();
      const [tab, setTab] = React.useState('agent');
      const [overview, setOverview] = React.useState(null);
      const [entries, setEntries] = React.useState([]);
      const [session, setSession] = React.useState(null);
      const [news, setNews] = React.useState(null);
      const [graph, setGraph] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const [graphLoading, setGraphLoading] = React.useState(false);
      const [busy, setBusy] = React.useState('');
      const [query, setQuery] = React.useState('');
      const [filter, setFilter] = React.useState('all');
      const [selected, setSelected] = React.useState(null);
      const [detail, setDetail] = React.useState(null);
      const [showNew, setShowNew] = React.useState(false);
      const [savingNew, setSavingNew] = React.useState(false);
      const [toast, showToast] = useToast();
      const [sessions, setSessions] = React.useState([]);
      const [chatSessionId, setChatSessionId] = React.useState(null);
      /** 用户手动点过项目带后，不再自动跟随当前会话。 */
      const chatPinned = React.useRef(false);
      const [chat, setChat] = React.useState(null);
      const [sendingChat, setSendingChat] = React.useState(false);
      /** 选中的会话被原生写句柄占用时置位，AGENT 头部给出「新建会话继续」。 */
      const [writerHeld, setWriterHeld] = React.useState(false);
      /** 项目带里选中的历史会话详情：右侧栏与代码视图跟随 chatSessionId。 */
      const [historySession, setHistorySession] = React.useState(null);
      /** B3：工作过程只在这里轮询一次，CodeView 与 Monitor 共用。 */
      const [processState, setProcessState] = React.useState({ items: [], error: '', sessionId: null });
      /** B2：当前实时会话的 clientSession.eventSource 快照（历史尾部 + 实时事件）。 */
      const [liveEntries, setLiveEntries] = React.useState({ sessionId: null, entries: [] });
      /** 发送后、事件落库前的本地回显，避免输入后消息迟迟不出现。 */
      const [pendingEcho, setPendingEcho] = React.useState('');
      const [pendingEchoAttachments, setPendingEchoAttachments] = React.useState([]);
      const [media, setMedia] = React.useState(null);
      const [mediaLoading, setMediaLoading] = React.useState(false);
      const [lightbox, setLightbox] = React.useState(null);
      const [health, setHealth] = React.useState(null);
      const { sessionId, session: clientSession } = useUiSession(uiSession);
      const [sessionSignals, setSessionSignals] = React.useState({ usage: null, permission: '', modelSelection: null, running: false });
      const [modelDirectory, setModelDirectory] = React.useState(null);
      const [modelCatalog, setModelCatalog] = React.useState({ groups: [], current: null, status: 'idle', error: '' });
      const [account, setAccount] = React.useState(null);
      const [accountLoading, setAccountLoading] = React.useState(false);
      const [workspaceState, setWorkspaceState] = React.useState({ items: [], current: null, cwd: '' });
      const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
      const [workspaceBusy, setWorkspaceBusy] = React.useState(false);
      const [codeOpen, setCodeOpen] = React.useState(true);
      const [review, setReview] = React.useState(null);
      const [reviewLoading, setReviewLoading] = React.useState(false);
      const [exporting, setExporting] = React.useState(false);
      const [exitConfirm, setExitConfirm] = React.useState(false);
      /** 日预算提醒每天只弹一次。 */
      const budgetWarned = React.useRef('');

      const loadAll = React.useCallback(async () => {
        setLoading(true);
        try {
          const [ov, list, ses, nw, sess, md, rev] = await Promise.all([
            api('/overview').catch(() => null),
            api('/entries?limit=300').catch(() => ({ items: [] })),
            sessionId ? api(`/session?id=${encodeURIComponent(sessionId)}`).catch(() => null) : Promise.resolve(null),
            api('/news/items').catch(() => ({ items: [] })),
            api('/sessions').catch(() => ({ sessions: [] })),
            api('/media/list').catch(() => ({ items: [] })),
            api('/review').catch(() => null),
          ]);
          if (ov) setOverview(ov);
          setEntries(list.items || []);
          setSession(ses);
          setNews(nw);
          setSessions(sess.sessions || []);
          setMedia(md);
          if (rev) setReview(rev);
        } catch (error) {
          showToast(`读取失败：${error.message}`, 'error');
        } finally { setLoading(false); }
      }, [sessionId, showToast]);

      const checkHealth = React.useCallback(async () => {
        try {
          const data = await api('/health');
          setHealth(Boolean(data && data.ok));
        } catch {
          setHealth(false);
        }
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        checkHealth();
        const timer = setInterval(checkHealth, 30000);
        return () => clearInterval(timer);
      }, [open, checkHealth]);

      const readSignals = React.useCallback(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        const next = {
          usage: readProjection(clientSession, 'tokenUsage'),
          permission: readProjection(clientSession, 'permissions')?.currentValue || '',
          modelSelection: readProjection(clientSession, 'modelSelection'),
          running: Boolean(clientSession?.getSnapshot?.()?.running),
        };
        setSessionSignals((prev) => (
          sameUsage(prev.usage, next.usage)
          && sameModelSelection(prev.modelSelection, next.modelSelection)
          && prev.permission === next.permission
          && prev.running === next.running
            ? prev
            : next
        ));
      }, [clientSession]);

      React.useEffect(() => {
        if (!open) return undefined;
        readSignals();
        const timer = setInterval(readSignals, 2000);
        return () => clearInterval(timer);
      }, [open, readSignals]);

      const readWorkspaces = React.useCallback(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        let next;
        try {
          const services = typeof getWorkspaceServices === 'function' ? getWorkspaceServices() : {};
          const items = services.workspaces?.list?.getSnapshot?.()?.items || [];
          const current = items.find((item) => (item.sessionIds || []).includes(sessionId)) || null;
          const cwd = services.sessions?.list?.getSnapshot?.()?.byId?.[sessionId]?.cwd || current?.path || '';
          next = { items, current, cwd };
        } catch {
          next = { items: [], current: null, cwd: '' };
        }
        setWorkspaceState((prev) => {
          const same = prev.cwd === next.cwd
            && (prev.current?.workspaceId ?? '') === (next.current?.workspaceId ?? '')
            && prev.items.length === next.items.length
            && prev.items.every((item, index) => {
              const other = next.items[index];
              return item.workspaceId === other?.workspaceId
                && item.title === other?.title
                && item.path === other?.path
                && (item.sessionIds?.length ?? 0) === (other?.sessionIds?.length ?? 0);
            });
          return same ? prev : next;
        });
      }, [getWorkspaceServices, sessionId]);

      React.useEffect(() => {
        if (!open) return undefined;
        readWorkspaces();
        const timer = setInterval(readWorkspaces, 2000);
        return () => clearInterval(timer);
      }, [open, readWorkspaces]);

      React.useEffect(() => {
        if (!open || !sessionId || typeof getModelDirectories !== 'function') {
          setModelDirectory(null);
          return undefined;
        }
        let alive = true;
        let timer = null;
        const attach = () => {
          try {
            const service = getModelDirectories();
            if (service?.directoryFor) {
              const directory = service.directoryFor(sessionId);
              if (alive) setModelDirectory(directory);
              return true;
            }
          } catch {}
          return false;
        };
        if (!attach()) {
          timer = setInterval(() => {
            if (attach() && timer) {
              clearInterval(timer);
              timer = null;
            }
          }, 1500);
        }
        return () => {
          alive = false;
          if (timer) clearInterval(timer);
        };
      }, [open, sessionId, getModelDirectories]);

      const loadModelCatalog = React.useCallback(async () => {
        if (!modelDirectory) return;
        try {
          const snapshot = await modelDirectory.load();
          setModelCatalog({
            groups: snapshot?.groups || [],
            current: snapshot?.current || null,
            status: snapshot?.status || 'ready',
            error: snapshot?.error || '',
          });
        } catch (error) {
          setModelCatalog((state) => ({ ...state, status: 'error', error: error.message }));
        }
      }, [modelDirectory]);

      React.useEffect(() => {
        if (open && modelDirectory) loadModelCatalog();
      }, [open, modelDirectory, loadModelCatalog]);

      const loadAccount = React.useCallback(async () => {
        setAccountLoading(true);
        try { setAccount(await api('/account')); }
        catch (error) { setAccount({ ok: false, error: error.message }); }
        finally { setAccountLoading(false); }
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        loadAccount();
        const timer = setInterval(loadAccount, 60000);
        return () => clearInterval(timer);
      }, [open, loadAccount]);

      // 日预算提醒：账本今日实际扣费达到设置值后，每天提醒一次。
      React.useEffect(() => {
        if (!open || !overview?.settings || !account?.ok) return;
        const budget = Number(overview.settings.dailyBudget) || 0;
        const used = Number(account.todayUsage);
        if (!(budget > 0) || !Number.isFinite(used)) return;
        const key = `${new Date().toISOString().slice(0, 10)}:${budget}`;
        if (used >= budget && budgetWarned.current !== key) {
          budgetWarned.current = key;
          showToast(`今日已用 ${fmtMoney(used)}，已达到日预算 ${fmtMoney(budget)}`, 'error');
        }
      }, [open, overview, account, showToast]);

      const loadReview = React.useCallback(async () => {
        setReviewLoading(true);
        try { setReview(await api('/review')); }
        catch (error) { showToast(`读取审核队列失败：${error.message}`, 'error'); }
        finally { setReviewLoading(false); }
      }, [showToast]);

      const reviewAction = React.useCallback(async (ids, action, payload = {}) => {
        const list = Array.isArray(ids) ? ids : [ids];
        if (list.length === 0) return;
        try {
          const result = await api('/review', {
            method: 'POST',
            body: JSON.stringify({ ids: list, action, ...payload }),
          });
          if (!result.ok) {
            const failure = (result.results || []).find((item) => !item.ok);
            throw new Error(failure?.error || '操作失败');
          }
          showToast(action === 'reject' ? '已移到回收站'
            : action === 'update' ? '已保存并确认'
              : `已确认 ${list.length} 条`, 'success');
          await loadAll();
        } catch (error) {
          showToast(`审核操作失败：${error.message}`, 'error');
        }
      }, [loadAll, showToast]);

      const mergeMemories = React.useCallback(async (keepId, dropIds) => {
        try {
          const result = await api('/merge', {
            method: 'POST',
            body: JSON.stringify({ keepId, dropIds }),
          });
          if (!result.ok && result.errors?.length) throw new Error(result.errors.join('；'));
          showToast(`已合并 ${result.merged ?? 0} 条重复记忆`, 'success');
          await loadAll();
        } catch (error) {
          showToast(`合并失败：${error.message}`, 'error');
        }
      }, [loadAll, showToast]);

      const exportChat = React.useCallback(async (id = chatSessionId) => {
        if (!id) { showToast('没有可导出的会话。', 'error'); return; }
        setExporting(true);
        try {
          const data = await api(`/export-session?id=${encodeURIComponent(id)}`);
          if (!data.ok) throw new Error(data.error || '导出失败');
          downloadText(data.filename, data.markdown, 'text/markdown;charset=utf-8');
          showToast(`已导出 ${data.filename}`, 'success');
        } catch (error) {
          showToast(`导出失败：${error.message}`, 'error');
        } finally { setExporting(false); }
      }, [chatSessionId, showToast]);

      const requestExit = () => setExitConfirm(true);
      const doExit = () => { setExitConfirm(false); ui.setOpen(false); };

      const switchModel = React.useCallback(async (selection) => {
        if (!modelDirectory) { showToast('模型目录不可用', 'error'); return; }
        try {
          const result = await modelDirectory.select(selection);
          if (result && result.ok === false) throw new Error(result.error?.message || '切换失败');
          showToast('模型已切换', 'success');
          await loadModelCatalog();
          readSignals();
        } catch (error) {
          showToast(`模型切换失败：${error.message}`, 'error');
        }
      }, [modelDirectory, loadModelCatalog, readSignals, showToast]);

      const switchPermission = React.useCallback(async (preset) => {
        if (!clientSession || !preset || preset === sessionSignals.permission) return;
        if (preset === 'danger-full-access' || preset === 'auto') {
          const confirmed = window.confirm(preset === 'auto'
            ? '自动审查是实验功能，可能仍会执行写操作。确定切换？'
            : '完全权限会跳过大部分确认，确定切换？');
          if (!confirmed) { readSignals(); return; }
        }
        try {
          const result = await clientSession.command(`/permission ${preset}`);
          if (!result?.ok) throw new Error(result?.error?.message || '切换失败');
          if (!result.value?.matched) throw new Error('宿主没有 /permission 命令');
          showToast('权限已切换', 'success');
          readSignals();
        } catch (error) {
          showToast(`权限切换失败：${error.message}`, 'error');
        }
      }, [clientSession, sessionSignals.permission, readSignals, showToast]);

      const switchWorkspace = React.useCallback(async (workspaceId) => {
        const ui = typeof getWorkspaceServices === 'function' ? getWorkspaceServices().uiWorkspace : null;
        if (!ui?.startSession) {
          showToast('工作区服务不可用', 'error');
          return;
        }
        setWorkspaceBusy(true);
        try {
          await ui.startSession(workspaceId);
          setWorkspaceOpen(false);
          showToast('已切换工作区，正在新建会话', 'success');
          readWorkspaces();
        } catch (error) {
          showToast(`切换工作区失败：${error.message}`, 'error');
        } finally {
          setWorkspaceBusy(false);
        }
      }, [getWorkspaceServices, readWorkspaces, showToast]);

      const addWorkspace = React.useCallback(async () => {
        const services = typeof getWorkspaceServices === 'function' ? getWorkspaceServices() : {};
        const ui = services.uiWorkspace;
        const workspaces = services.workspaces;
        if (!ui?.pickDirectory || !workspaces?.create) {
          showToast('目录选择器不可用', 'error');
          return;
        }
        setWorkspaceBusy(true);
        try {
          const path = await ui.pickDirectory();
          const workspace = await workspaces.create({ path });
          await ui.startSession(workspace.workspaceId);
          setWorkspaceOpen(false);
          showToast('已添加并切换工作区', 'success');
          readWorkspaces();
        } catch (error) {
          const message = String(error?.message || error);
          if (!/cancel|abort|取消/i.test(message)) showToast(`添加工作区失败：${message}`, 'error');
        } finally {
          setWorkspaceBusy(false);
        }
      }, [getWorkspaceServices, readWorkspaces, showToast]);

      React.useEffect(() => {
        if (!open) return undefined;
        loadAll();
        const onKey = (event) => {
          if (event.key === 'Escape') {
            if (detail) { setDetail(null); setSelected(null); }
            else if (showNew) setShowNew(false);
            // 工作台默认铺满整个窗口，Esc 不再退出；用左侧栏「退出工作台」。
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [open, loadAll, detail, showNew]);

      // 当前会话变化时同步右侧 LIVE SIGNAL（新建会话、切回主对话都会触发）。
      React.useEffect(() => {
        if (!open || !sessionId) return undefined;
        let alive = true;
        api(`/session?id=${encodeURIComponent(sessionId)}`)
          .then((data) => { if (alive) setSession(data); })
          .catch(() => {});
        return () => { alive = false; };
      }, [open, sessionId]);

      // 助手页实时刷新会话状态（todos / recentTools / turn），让代码视图跟着后台执行变化。
      React.useEffect(() => {
        if (!open || !sessionId || (tab !== 'agent' && tab !== 'monitor')) return undefined;
        let alive = true;
        const refresh = () => {
          if (document.hidden) return;
          api(`/session?id=${encodeURIComponent(sessionId)}`)
            .then((data) => { if (alive) setSession(data); })
            .catch(() => {});
        };
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => { alive = false; clearInterval(timer); };
      }, [open, sessionId, tab]);

      // 每次打开工作台先跟随当前会话；用户手动点项目带后才固定选择。
      React.useEffect(() => {
        if (open) chatPinned.current = false;
      }, [open]);
      React.useEffect(() => {
        if (!open || chatPinned.current) return;
        const next = sessionId || sessions[0]?.id || null;
        if (next && next !== chatSessionId) setChatSessionId(next);
      }, [open, sessionId, sessions, chatSessionId]);

      const loadChat = React.useCallback(async (id) => {
        if (!id) return;
        try {
          const data = await api(`/chat/messages?id=${encodeURIComponent(id)}&limit=120`);
          setChat(data);
        } catch (error) {
          setChat({ live: false, messages: [], note: `读取对话失败：${error.message}` });
        }
      }, []);

      // B2：实时会话直接订阅 clientSession.eventSource（历史尾部 + 实时事件），
      // HTTP /chat/messages 只用于历史会话兜底。
      const liveSourceAvailable = Boolean(clientSession?.eventSource && typeof clientSession.eventSource.getSnapshot === 'function');
      React.useEffect(() => {
        const source = clientSession?.eventSource;
        if (!open || !source || typeof source.getSnapshot !== 'function' || !sessionId) {
          setLiveEntries({ sessionId: null, entries: [] });
          return undefined;
        }
        let alive = true;
        const read = () => {
          if (!alive) return;
          try {
            const snap = source.getSnapshot();
            setLiveEntries((prev) => (
              prev.sessionId === sessionId && prev.entries === snap?.entries
                ? prev
                : { sessionId, entries: snap?.entries ?? [] }
            ));
          } catch {
            // 快照暂不可读时保持上一帧。
          }
        };
        read();
        const stop = typeof source.subscribe === 'function' ? source.subscribe(read) : undefined;
        return () => {
          alive = false;
          if (typeof stop === 'function') stop();
        };
      }, [open, clientSession, sessionId]);

      // 事件落库后清掉本地回显，避免和真正的 user/message 重复。
      React.useEffect(() => {
        if (!pendingEcho && pendingEchoAttachments.length === 0) return;
        const entries = liveEntries.sessionId === sessionId ? liveEntries.entries : [];
        const messages = messagesFromLiveEvents(entries, 50);
        const lastUser = [...messages].reverse().find((message) => message.role === 'user');
        if (!lastUser) return;
        const textMatches = pendingEcho ? lastUser.text.trim() === pendingEcho.trim() : true;
        const attachmentsMatch = pendingEchoAttachments.length === 0
          || (lastUser.attachments?.length ?? 0) >= pendingEchoAttachments.length;
        if (textMatches && attachmentsMatch) {
          setPendingEcho('');
          setPendingEchoAttachments([]);
        }
      }, [liveEntries, pendingEcho, pendingEchoAttachments, sessionId]);

      // AGENT 页：历史会话才轮询 HTTP；实时会话由事件订阅驱动。
      React.useEffect(() => {
        if (!open || tab !== 'agent' || !chatSessionId) return undefined;
        if (chatSessionId === sessionId && liveSourceAvailable) return undefined;
        loadChat(chatSessionId);
        const timer = setInterval(() => {
          if (!document.hidden) loadChat(chatSessionId);
        }, 1600);
        return () => clearInterval(timer);
      }, [open, tab, chatSessionId, sessionId, liveSourceAvailable, loadChat]);

      // 换会话后重新判定写句柄占用状态，并丢掉上一会话的本地回显。
      React.useEffect(() => { setWriterHeld(false); setPendingEcho(''); }, [chatSessionId]);

      // 选中历史会话时，单独读取它的详情，让右侧栏/代码视图跟着选中的会话走。
      React.useEffect(() => {
        if (!open || !chatSessionId || chatSessionId === sessionId) {
          setHistorySession(null);
          return undefined;
        }
        let alive = true;
        api(`/session?id=${encodeURIComponent(chatSessionId)}`)
          .then((data) => { if (alive) setHistorySession(data); })
          .catch(() => { if (alive) setHistorySession(null); });
        return () => { alive = false; };
      }, [open, chatSessionId, sessionId]);

      // 工作过程统一轮询：AGENT（代码视图展开）与运行状态共用，避免两处各拉一份。
      const processTarget = tab === 'agent' ? (chatSessionId || sessionId) : (tab === 'monitor' ? sessionId : null);
      const processActive = tab === 'monitor' || (tab === 'agent' && codeOpen);
      // 实时会话的工作过程也由 eventSource 驱动；历史会话才走 HTTP。
      const useLiveProcess = Boolean(clientSession?.eventSource) && processTarget === sessionId && processActive;
      React.useEffect(() => {
        if (!open || !processTarget || !processActive) return undefined;
        if (useLiveProcess) return undefined;
        let alive = true;
        setProcessState({ items: [], error: '', sessionId: processTarget });
        const load = () => {
          if (document.hidden) return;
          api(`/process?id=${encodeURIComponent(processTarget)}&limit=160`)
            .then((data) => {
              if (!alive) return;
              setProcessState({
                items: Array.isArray(data.items) ? data.items : [],
                error: '',
                sessionId: processTarget,
              });
            })
            .catch((error) => {
              if (!alive) return;
              setProcessState((prev) => ({ ...prev, error: error.message, sessionId: processTarget }));
            });
        };
        load();
        const timer = setInterval(load, 1200);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [open, processTarget, processActive, useLiveProcess]);

      const loadMedia = React.useCallback(async () => {
        setMediaLoading(true);
        try { setMedia(await api('/media/list')); }
        catch (error) { showToast(`素材读取失败：${error.message}`, 'error'); }
        finally { setMediaLoading(false); }
      }, [showToast]);

      const sendChatMessage = async (text, attachments = []) => {
        const value = String(text ?? '').trim();
        if (!chatSessionId) { showToast('没有可发送的会话。', 'error'); return false; }
        const isLive = chatSessionId === sessionId && Boolean(clientSession?.eventSource);
        if (attachments.length > 0 && !isLive) { showToast('历史会话不能添加附件。', 'error'); return false; }
        setSendingChat(true);
        if (isLive) {
          setPendingEcho(value);
          setPendingEchoAttachments(attachments.map((attachment) => ({
            kind: attachment.kind,
            name: attachment.name,
            url: attachment.previewUrl || '',
          })));
        } else {
          setChat((prev) => ({
            ...(prev || { live: false }),
            messages: [...(prev?.messages || []), {
              role: 'user',
              id: `local-${Date.now()}`,
              text: value,
              ...(attachments.length ? { attachments: attachments.map((a) => ({ kind: a.kind, name: a.name, url: a.previewUrl || '' })) } : {}),
            }],
          }));
        }
        try {
          // 斜杠指令走 Host 的 commands.execute，而不是普通 prompt。
          if (isLive && value.startsWith('/')) {
            const remote = typeof getRemote === 'function' ? getRemote() : null;
            if (!remote?.commands?.execute) throw new Error('指令服务不可用');
            const result = await remote.commands.execute(sessionId, value, []);
            if (!result?.ok) throw new Error(result?.error?.message || '指令执行失败');
            if (result.value?.result?.kind === 'error') {
              showToast(result.value.result.text || '指令执行失败', 'error');
              setPendingEcho('');
              setPendingEchoAttachments([]);
              return false;
            }
            setWriterHeld(false);
            showToast('指令已执行', 'success');
            setPendingEcho('');
            setPendingEchoAttachments([]);
            return true;
          }
          if (isLive && clientSession && typeof clientSession.prompt === 'function') {
            const content = [];
            for (const attachment of attachments) {
              const file = attachment.file;
              if (!file) continue;
              if (attachment.kind === 'image') {
                const data = await fileToBase64(file);
                content.push({
                  type: 'image',
                  mediaType: file.type || 'image/png',
                  data,
                  ...(attachment.name ? { name: attachment.name } : {}),
                });
              } else {
                const upload = typeof getFileUpload === 'function' ? getFileUpload() : null;
                if (!upload?.upload) throw new Error('附件上传服务不可用');
                const uploaded = await upload.upload(sessionId, file, attachment.name);
                // fileUpload.upload 返回 RemoteResult：{ok, value:{receiptId, file}}。
                const receiptId = uploaded?.ok === false
                  ? ''
                  : (uploaded?.value?.receiptId ?? uploaded?.receiptId ?? '');
                if (!receiptId) throw new Error(uploaded?.error?.message || '附件上传失败');
                content.push({ type: 'file', receiptId });
              }
            }
            if (value) content.push({ type: 'text', text: value });
            if (content.length === 0) throw new Error('消息为空');
            // 走原生 Client Session 的 prompt 通道：它拥有写句柄，能正确激活会话；
            // 直接调 Host 的 agent.resume 会撞 "already owned by an active write handle"。
            const result = await clientSession.prompt(content, 'queue');
            if (!result?.ok) {
              const failure = new Error(result?.error?.message || '发送失败');
              failure.code = result?.error?.code;
              throw failure;
            }
          } else {
            const result = await api('/chat/send', { method: 'POST', body: JSON.stringify({ sessionId: chatSessionId, text: value }) });
            if (!result.ok) {
              const failure = new Error(result.error || '发送失败');
              failure.code = result.code;
              throw failure;
            }
          }
          setWriterHeld(false);
          if (isLive) {
            // 消息会通过 eventSource 订阅回来；这里只刷新会话列表。
            setTimeout(async () => {
              const list = await api('/sessions').catch(() => null);
              if (list?.sessions) setSessions(list.sessions);
            }, 600);
          } else {
            setTimeout(async () => {
              loadChat(chatSessionId);
              const list = await api('/sessions').catch(() => null);
              if (list?.sessions) setSessions(list.sessions);
            }, 900);
          }
          return true;
        } catch (error) {
          console.warn('[dsh-memory-kb] send failed', error?.message ?? error);
          if (isLive) {
            setPendingEcho('');
            setPendingEchoAttachments([]);
          }
          const message = String(error?.message ?? error);
          if (isWriterHeldError(message)) {
            setWriterHeld(true);
            showToast('该会话被原生写句柄占用；点上方「新建会话继续」。', 'error');
          } else {
            showToast(`发送失败：${message}`, 'error');
          }
          return false;
        } finally {
          setSendingChat(false);
        }
      };

      const activateChat = async (id = chatSessionId) => {
        if (!id) return false;
        setSendingChat(true);
        try {
          const result = await api('/chat/activate', { method: 'POST', body: JSON.stringify({ sessionId: id }) });
          if (!result.ok) {
            const failure = new Error(result.error || '激活失败');
            failure.code = result.code;
            throw failure;
          }
          setWriterHeld(false);
          await loadChat(id);
          showToast('会话已激活，可以继续发送', 'success');
          return true;
        } catch (error) {
          if (isWriterHeldError(error)) {
            setWriterHeld(true);
            showToast('该会话被原生写句柄占用；点上方「新建会话继续」。', 'error');
          } else {
            showToast(`激活失败：${error.message}`, 'error');
          }
          return false;
        } finally {
          setSendingChat(false);
        }
      };

      const invokeText = async (text, label) => {
        if (!sessionId) {
          navigator.clipboard?.writeText(text);
          showToast('未识别当前会话，指令已复制，粘贴到对话即可。', 'error');
          return;
        }
        try {
          if (clientSession && typeof clientSession.prompt === 'function') {
            const result = await clientSession.prompt([{ type: 'text', text }], 'queue');
            if (!result?.ok) {
              const failure = new Error(result?.error?.message || '发送失败');
              failure.code = result?.error?.code;
              throw failure;
            }
          } else {
            const result = await api('/chat/send', { method: 'POST', body: JSON.stringify({ sessionId, text }) });
            if (!result.ok) throw new Error(result.error || '发送失败');
          }
          setChatSessionId(sessionId);
          setTab('agent');
          showToast(`已发送到对话：${label}`, 'success');
          setTimeout(() => loadChat(sessionId), 800);
        } catch (error) {
          navigator.clipboard?.writeText(text);
          showToast(`发送失败，已复制指令：${error.message}`, 'error');
        }
      };

      const newSession = async () => {
        // 优先走 uiWorkspace.startSession：与原生「新建会话」按钮同一条路径，
        // 不依赖 DOM 文本（语言切换或界面改版会让扫描失效）。
        try {
          const services = typeof getWorkspaceServices === 'function' ? getWorkspaceServices() : {};
          const workspaceId = workspaceState.current?.workspaceId;
          if (services.uiWorkspace?.startSession) {
            await services.uiWorkspace.startSession(workspaceId);
            chatPinned.current = false;
            setWriterHeld(false);
            showToast('已新建会话', 'success');
            setTimeout(() => loadAll(), 700);
            return;
          }
        } catch (error) {
          console.warn('[dsh-memory-kb] uiWorkspace.startSession failed', error);
        }
        // 兜底：工作台铺满整个窗口时，原生「新建会话」按钮仍在 DOM 里。
        try {
          const target = [...document.querySelectorAll('button')].find((button) => {
            if (button.closest('.wb-shell')) return false;
            const label = `${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('title') ?? ''} ${button.textContent ?? ''}`;
            return label.includes('新建会话');
          });
          if (target) {
            target.click();
            chatPinned.current = false;
            setWriterHeld(false);
            showToast('已新建会话', 'success');
            setTimeout(() => loadAll(), 700);
            return;
          }
        } catch {}
        ui.setOpen(false);
        showToast('请在 DSH 主界面点击「新建会话」。', 'info');
      };

      const openEntry = async (item) => {
        if (item?.kind === 'tag') return;
        const id = item.id;
        setSelected(item);
        setDetail(null);
        try {
          const data = await api(`/entry?id=${encodeURIComponent(id)}`);
          setDetail(data.item);
        } catch (error) {
          showToast(`读取详情失败：${error.message}`, 'error');
        }
      };

      const distill = async (targetId = sessionId) => {
        const id = targetId || sessionId;
        if (!id) { showToast('没有识别到当前会话，请先打开一个对话。', 'error'); return; }
        setBusy('distill');
        try {
          const result = await api('/distill', { method: 'POST', body: JSON.stringify({ sessionId: id }) });
          showToast(`沉淀完成：${result.memories?.length ?? 0} 条记忆${result.skill ? `，技能 ${result.skill.name}` : ''}`, 'success');
          await loadAll();
          if (id !== sessionId) {
            const ses = await api(`/session?id=${encodeURIComponent(id)}`).catch(() => null);
            if (ses) setHistorySession(ses);
          }
        } catch (error) {
          showToast(`沉淀失败：${error.message}`, 'error');
        } finally { setBusy(''); }
      };

      const fetchNewsNow = async () => {
        setBusy('news');
        try {
          const result = await api('/news/fetch', { method: 'POST', body: '{}' });
          showToast(result.skipped ? `未抓取：${result.skipped}` : `抓取 ${result.fetched ?? 0} 条新闻`, 'success');
          await loadAll();
        } catch (error) {
          showToast(`抓取失败：${error.message}`, 'error');
        } finally { setBusy(''); }
      };

      const saveGoal = async (goal, targetId = sessionId) => {
        const id = targetId || sessionId;
        if (!id) { showToast('没有识别到当前会话。', 'error'); return; }
        try {
          await api('/goal', { method: 'POST', body: JSON.stringify({ sessionId: id, goal }) });
          showToast('目标已保存', 'success');
          const ses = await api(`/session?id=${encodeURIComponent(id)}`).catch(() => null);
          if (ses) {
            if (id === sessionId) setSession(ses);
            else setHistorySession(ses);
          }
        } catch (error) {
          showToast(`保存目标失败：${error.message}`, 'error');
        }
      };

      const saveNew = async (form) => {
        setSavingNew(true);
        try {
          await api('/save-memory', {
            method: 'POST',
            body: JSON.stringify({
              type: form.type,
              title: form.title,
              summary: form.summary,
              content: form.content,
              tags: form.tags.split(/[,，、\s]+/),
            }),
          });
          showToast('卡片已保存', 'success');
          setShowNew(false);
          await loadAll();
        } catch (error) {
          showToast(`保存失败：${error.message}`, 'error');
        } finally { setSavingNew(false); }
      };

      const deleteEntry = async () => {
        if (!detail) return;
        if (!window.confirm(`把《${detail.title}》移到回收站？`)) return;
        try {
          await api('/delete', { method: 'POST', body: JSON.stringify({ id: detail.id }) });
          showToast('已移到回收站', 'success');
          setDetail(null);
          setSelected(null);
          await loadAll();
        } catch (error) {
          showToast(`删除失败：${error.message}`, 'error');
        }
      };

      const copySkill = (item) => {
        const text = `请使用技能「${item.title}」：${item.summary || ''}`;
        navigator.clipboard?.writeText(text);
        showToast('调用指令已复制，粘贴到对话即可', 'success');
      };

      const copyStyle = (text, label) => {
        navigator.clipboard?.writeText(text);
        showToast(`${label} 风格指令已复制`, 'success');
      };

      const loadGraph = async () => {
        setGraphLoading(true);
        try { setGraph(await api('/graph?limit=180')); }
        catch (error) { showToast(`图谱读取失败：${error.message}`, 'error'); }
        finally { setGraphLoading(false); }
      };

      React.useEffect(() => {
        if (open && tab === 'graph' && !graph) loadGraph();
      }, [open, tab, graph]);

      // 工作台铺满窗口时，桌面壳右上角原生按钮仍是系统浅色皮肤，很突兀；
      // 打开时同步成工作台深色，退出/卸载时恢复。
      React.useEffect(() => {
        syncDesktopCaption(open);
        return () => syncDesktopCaption(false);
      }, [open]);

      if (!open) return null;
      const nav = navOf(tab);
      const showRight = tab === 'overview' || tab === 'agent';
      const digest = entries.find((item) => item.kind === 'news') || overview?.recent?.find((item) => item.kind === 'news') || null;
      const modelSelection = modelCatalog.current
        || sessionSignals.modelSelection?.next
        || sessionSignals.modelSelection?.lastUsed
        || null;
      const modelGroups = modelCatalog.groups || [];
      const currentGroup = modelGroups.find((group) => group.id === modelSelection?.provider);
      const currentModel = currentGroup?.models?.find((model) => model.id === modelSelection?.model);
      const currentModelLabel = currentModel?.name
        || (modelSelection ? `${modelSelection.provider}/${modelSelection.model}` : '')
        || (session?.cursor?.route?.provider ? `${session.cursor.route.provider}/${session.cursor.route.model}` : '');
      const currentEfforts = currentModel?.reasoning?.efforts || [];
      const currentEffort = modelSelection?.reasoningEffort || currentModel?.reasoning?.defaultEffort || '';
      const permissionValue = sessionSignals.permission || '';
      const workspaceTitle = workspaceState.current?.title
        || (workspaceState.cwd ? workspaceState.cwd.split(/[\\/]/).filter(Boolean).pop() : '')
        || '选择工作区';
      const workspacePath = workspaceState.current?.path || workspaceState.cwd || '';
      // AGENT 页选中历史会话时，右侧栏/代码视图的工作过程都跟随它；
      // 其它页面仍以当前实时会话为准。
      const followsHistory = tab === 'agent' && Boolean(chatSessionId) && chatSessionId !== sessionId;
      const viewingSessionId = followsHistory ? chatSessionId : sessionId;
      const displaySession = followsHistory ? historySession : session;
      const displaySessionLabel = (sessions.find((item) => item.id === viewingSessionId) || {}).title || '';
      // B2：实时会话的聊天/工作过程来自 eventSource；历史会话仍用 HTTP 结果。
      const liveFeedEntries = liveEntries.sessionId === sessionId ? liveEntries.entries : [];
      const liveMessages = liveSourceAvailable && chatSessionId === sessionId
        ? messagesFromLiveEvents(liveFeedEntries, 120)
        : null;
      const liveProcessItems = useLiveProcess ? processFromLiveEvents(liveFeedEntries, 160) : null;
      const pendingMessages = pendingEcho
        ? [{
            role: 'user',
            id: 'local-echo',
            text: pendingEcho,
            ...(pendingEchoAttachments.length ? { attachments: pendingEchoAttachments } : {}),
          }]
        : [];
      // 实时流式文本：eventSource 的 transient assistant/live-chunk。
      const streamingText = liveMessages ? streamingTextOfEntries(liveFeedEntries) : '';
      const streamingMessages = streamingText
        ? [{ role: 'assistant', id: 'live-stream', text: streamingText, streaming: true }]
        : [];
      const shownChat = liveMessages
        ? { live: true, messages: [...liveMessages, ...pendingMessages, ...streamingMessages] }
        : chat;
      const shownProcess = liveProcessItems
        ?? (processState.sessionId === processTarget ? processState.items : []);
      const shownProcessError = liveProcessItems !== null
        ? ''
        : (processState.sessionId === processTarget ? processState.error : '');

      let content = null;
      if (tab === 'agent') {
        content = h(Agent, {
          sessions,
          currentSessionId: sessionId,
          chatSessionId,
          onSelect: (id) => { chatPinned.current = true; setChatSessionId(id); },
          chat: shownChat,
          sending: sendingChat,
          onSend: sendChatMessage,
          sessionId,
          cwd: workspaceState.cwd,
          getRemote,
          getWorkspaceFiles,
          processItems: shownProcess,
          onToast: showToast,
          onNew: newSession,
          onExport: () => exportChat(chatSessionId),
          exporting,
          onActivate: () => activateChat(chatSessionId),
          canSend: chatSessionId === sessionId ? Boolean(clientSession) : Boolean(chat?.live),
          writerHeld,
          onNewSession: newSession,
          modelLabel: currentModelLabel,
          workspaceTitle,
          workspacePath,
          onOpenWorkspace: () => setWorkspaceOpen(true),
          codeOpen,
          onToggleCode: () => setCodeOpen((value) => !value),
          codeView: codeOpen ? h(CodeView, {
            sessionId,
            cwd: workspaceState.cwd,
            getWorkspaceFiles,
            session: displaySession,
            chat: shownChat,
            sending: sendingChat,
            running: sessionSignals.running,
            processItems: shownProcess,
            processError: shownProcessError,
            onClose: () => setCodeOpen(false),
            onToast: showToast,
          }) : null,
        });
      } else if (tab === 'overview') {
        content = h(Overview, { overview, entries, query, setQuery, filter, setFilter, onOpen: openEntry, onTab: setTab, onDistill: distill, onNews: fetchNewsNow, busy, sessionId });
      } else if (tab === 'knowledge') {
        content = h(Knowledge, {
          entries, query, setQuery, filter, setFilter, onOpen: openEntry, onNew: () => setShowNew(true),
          media, mediaLoading, onMediaOpen: setLightbox, onMediaRefresh: loadMedia,
          review, reviewLoading, busy, sessionId,
          onReview: reviewAction,
          onMerge: mergeMemories,
          onRefreshReview: loadReview,
          onToast: showToast,
        });
      } else if (tab === 'projects') {
        content = h(Projects, { entries, onOpen: openEntry });
      } else if (tab === 'experts') {
        content = h(Experts, { entries, onCopy: copySkill, onInvoke: (item) => invokeText(`请使用技能「${item.title}」：${item.summary || ''}`, item.title) });
      } else if (tab === 'styles') {
        content = h(Styles, { onCopy: copyStyle, onInvoke: invokeText });
      } else if (tab === 'monitor') {
        content = h(Monitor, {
          overview,
          entries,
          session,
          sessionId,
          sessions,
          running: sessionSignals.running,
          usage: sessionSignals.usage,
          permissionValue,
          modelLabel: currentModelLabel,
          account,
          accountLoading,
          onAccountRefresh: loadAccount,
          settings: overview?.settings,
          workspaceTitle,
          workspacePath,
          workspaceCount: workspaceState.items.length,
          health,
          onRefresh: loadAll,
          onOpenCodeView: () => { setTab('agent'); setCodeOpen(true); },
          processItems: shownProcess,
          processError: shownProcessError,
        });
      } else if (tab === 'news') {
        content = h(News, { news, digest, onRefresh: fetchNewsNow, busy: busy === 'news' });
      } else if (tab === 'graph') {
        content = h(GraphTab, { graph, loading: graphLoading, onRefresh: loadGraph, onOpen: openEntry });
      } else if (tab === 'settings') {
        content = h(Settings, { onToast: showToast, onSaved: loadAll });
      }

      return h('div', { className: 'wb-overlay', onMouseDown: () => { if (!detail && !showNew && !exitConfirm) requestExit(); } },
        h('div', { className: 'wb-shell', onMouseDown: (event) => event.stopPropagation() },
          h('aside', { className: 'wb-nav' },
            h('div', { className: 'wb-logo' },
              h('span', { className: 'wb-logo-mark' }, 'W'),
              h('span', { className: 'wb-logo-text' }, 'Workbench'),
            ),
            h('div', { className: 'wb-nav-list' }, NAV.map((item) => h('button', {
              key: item.key,
              type: 'button',
              className: `wb-nav-item${tab === item.key ? ' is-active' : ''}`,
              onClick: () => { setTab(item.key); setDetail(null); setSelected(null); },
            },
            h('span', { className: 'wb-nav-ico' }, h(Icon, { name: item.icon, size: 16 })),
            h('span', { className: 'wb-nav-title' }, item.title),
            h('span', { className: 'wb-nav-sub' }, item.sub),
            ))),
            h('div', { className: 'wb-nav-foot' },
              h('button', { type: 'button', className: 'wb-exit', onClick: requestExit }, '退出 Workbench ', h(Icon, { name: 'arrow', size: 12 })),
              h('div', { className: 'wb-nav-note' }, '记忆模式 · Workbench'),
            ),
          ),
          h('section', { className: 'wb-main' },
            h('header', { className: `wb-topbar${showRight ? '' : ' wb-topbar-native-gap'}` },
              showRight ? null : h('div', { className: 'wb-topbar-cutout', 'aria-hidden': 'true' }),
              h('div', { className: 'wb-crumb' }, h('span', { className: 'wb-crumb-local' }, '本地'), ' / ', nav.title, ' ', h('span', { className: 'wb-crumb-sub' }, nav.sub)),
              h('div', { className: 'wb-top-actions' },
                h('span', {
                  className: `wb-live wb-live-top${health === null ? ' is-muted' : health ? '' : ' is-error'}`,
                  title: 'Workbench 插件本地服务（/dsh-memory-kb/api/health）',
                }, h('i'), health === null ? '检测中…' : health ? '插件服务正常' : '插件服务未连接'),
                h('button', { type: 'button', className: 'wb-icon-btn', onClick: loadAll, title: '刷新' }, h(Icon, { name: 'refresh', size: 14 })),
                h('button', { type: 'button', className: 'wb-close', onClick: requestExit, title: '退出 Workbench', 'aria-label': '退出 Workbench' }, '×'),
              ),
            ),
            h('div', { className: 'wb-scroll' },
              loading && !overview ? h(Empty, null, h(Spinner), ' 正在读取 Workbench…') : content,
              detail ? h(EntryDetail, {
                entry: detail,
                onClose: () => { setDetail(null); setSelected(null); },
                onDelete: deleteEntry,
                onCopyPath: () => showToast('路径已复制', 'success'),
                showToast,
              }) : null,
              showNew ? h(NewCardModal, { onClose: () => setShowNew(false), onSave: saveNew, saving: savingNew }) : null,
            ),
            toast ? h('div', { className: `wb-toast is-${toast.type}` }, toast.message) : null,
          ),
          showRight ? h(MemoryCenter, {
            session: displaySession,
            sessionLabel: displaySessionLabel,
            overview,
            busy,
            onDistill: () => distill(viewingSessionId),
            onNews: fetchNewsNow,
            onRefresh: loadAll,
            onGoal: (goal) => saveGoal(goal, viewingSessionId),
            sessionId: viewingSessionId,
            account,
            accountLoading,
            onAccountRefresh: loadAccount,
            modelGroups,
            modelSelection,
            currentModel,
            currentEffort,
            currentEfforts,
            permissionValue,
            usage: followsHistory ? null : sessionSignals.usage,
            onSwitchModel: switchModel,
            onSwitchPermission: switchPermission,
            modelStatus: modelCatalog.status,
            modelError: modelCatalog.error,
            settings: overview?.settings,
            onExport: () => exportChat(viewingSessionId),
            exporting,
          }) : null,
          lightbox ? h(MediaLightbox, { item: lightbox, onClose: () => setLightbox(null) }) : null,
          h(PendingInteractionHost, { uiSession, sessionId, onExit: requestExit }),
          h('style', null, STYLE),
        ),
        workspaceOpen ? h('div', {
          className: 'wb-modal wb-workspace-modal',
          onMouseDown: (event) => event.stopPropagation(),
          onClick: () => setWorkspaceOpen(false),
        },
          h('div', {
            className: 'wb-modal-panel wb-workspace-panel',
            onMouseDown: (event) => event.stopPropagation(),
            onClick: (event) => event.stopPropagation(),
          },
            h('div', { className: 'wb-modal-head' },
              h('h2', null, '切换工作区'),
              h('button', { type: 'button', className: 'wb-close', onClick: () => setWorkspaceOpen(false) }, '×'),
            ),
            h('div', { className: 'wb-workspace-list' },
              workspaceState.items.length === 0
                ? h('div', { className: 'wb-right-empty' }, '暂无已注册工作区')
                : workspaceState.items.map((item) => h('button', {
                    key: item.workspaceId,
                    type: 'button',
                    className: `wb-workspace-item${item.workspaceId === workspaceState.current?.workspaceId ? ' is-current' : ''}`,
                    disabled: workspaceBusy,
                    onClick: () => switchWorkspace(item.workspaceId),
                  },
                    h('strong', null, item.title || '未命名工作区'),
                    h('small', null, item.path || ''),
                    h('em', null, `${(item.sessionIds || []).length} 个会话`),
                  )),
            ),
            h('div', { className: 'wb-workspace-add' },
              h('button', { type: 'button', className: 'wb-btn wb-btn-primary', onClick: addWorkspace, disabled: workspaceBusy },
                workspaceBusy ? '处理中…' : '选择目录…'),
              h('span', { className: 'wb-muted' }, '选择后会注册工作区并新建会话'),
            ),
          ),
        ) : null,
        exitConfirm ? h(ConfirmModal, {
          title: '退出 Workbench？',
          message: '退出后回到 DSH 原生界面。记忆沉淀、新闻抓取和后台会话仍在插件服务里运行；左侧栏「记忆库」可随时重新打开。',
          confirmLabel: '退出 Workbench',
          cancelLabel: '继续使用',
          onCancel: () => setExitConfirm(false),
          onConfirm: doExit,
        }) : null,
      );
    }

    function LaunchButton() {
      const open = useOpen();
      return h(React.Fragment, null,
        h('style', null, STYLE),
        h('button', {
          type: 'button',
          className: `wb-launch${open ? ' is-open' : ''}`,
          title: '打开 Workbench',
          onClick: () => ui.setOpen(!ui.open),
        },
        h('span', { className: 'wb-launch-mark' }, h(Icon, { name: 'brain', size: 13 })),
        h('span', { className: 'wb-launch-text' }, 'Workbench'),
        h('span', { className: 'wb-launch-dot' }),
        ),
      );
    }

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

    // ── 插件入口 ────────────────────────────────────────────────────────────
    function apply(ctx) {
      let workspaceFilesApi = null;
      const wire = (ready) => {
        const getModelDirectories = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('modelDirectories') : undefined; }
          catch { return undefined; }
        };
        const getWorkspaceServices = () => {
          try {
            return {
              uiWorkspace: typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined,
              workspaces: typeof ctx.get === 'function' ? ctx.get('workspaces') : undefined,
              sessions: typeof ctx.get === 'function' ? ctx.get('sessions') : undefined,
            };
          } catch {
            return {};
          }
        };
        const getWorkspaceFiles = () => workspaceFilesApi;
        const getRemote = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('remote') : undefined; }
          catch { return undefined; }
        };
        const getFileUpload = () => {
          try { return typeof ctx.get === 'function' ? ctx.get('fileUpload') : undefined; }
          catch { return undefined; }
        };
        const register = () => {
          ready.slots.inject('sidebar.footer.action', () => ready.slots.register({
            name: 'sidebar.footer.action',
            id: 'dsh-memory-kb-open',
            order: 60,
            label: () => '记忆库',
          }, () => h(LaunchButton, null)));
          ready.slots.inject('shell.overlay', () => ready.slots.register({
            name: 'shell.overlay',
            id: 'dsh-memory-kb-panel',
            order: 820,
          }, () => h(React.Fragment, null,
            h(WindowControls, null),
            h(Workbench, {
              uiSession: ready.uiSession,
              getModelDirectories,
              getWorkspaceServices,
              getWorkspaceFiles,
              getRemote,
              getFileUpload,
            }))));
        };
        if (typeof ready.effect === 'function') ready.effect(register, 'dsh-memory-kb: mounts');
        else register();
      };
      if (typeof ctx.inject === 'function') {
        try {
          ctx.inject(['remote', 'remote.workspaceFiles'], (injected) => {
            try {
              workspaceFilesApi = injected.remote?.workspaceFiles
                ?? injected.get?.('remote')?.workspaceFiles
                ?? null;
            } catch {}
          });
        } catch {}
        ctx.inject(['slots', 'uiSession'], wire);
        return;
      }
      if (ctx.slots !== undefined) wire(ctx);
    }

    return { inject: ['slots', 'uiSession', 'remote', 'remote.fileReferences', 'remote.commands'], apply };
  },
});
