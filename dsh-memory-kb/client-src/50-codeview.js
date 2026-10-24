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
