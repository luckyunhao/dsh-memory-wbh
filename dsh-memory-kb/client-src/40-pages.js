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
