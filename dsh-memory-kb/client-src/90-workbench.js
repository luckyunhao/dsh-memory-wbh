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
