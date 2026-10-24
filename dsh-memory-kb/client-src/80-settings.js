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
