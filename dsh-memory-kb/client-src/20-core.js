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
