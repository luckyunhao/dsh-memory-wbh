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
