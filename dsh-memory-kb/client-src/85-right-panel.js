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
