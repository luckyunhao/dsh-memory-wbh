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
