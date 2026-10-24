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
