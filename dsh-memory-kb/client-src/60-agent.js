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
