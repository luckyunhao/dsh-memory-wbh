    // ── 新闻 ────────────────────────────────────────────────────────────────
    function News({ news, digest, onRefresh, busy }) {
      const items = news?.items || [];
      // 用词边界匹配，避免 training/detail 里的 "ai" 被误判为 AI 新闻。
      const left = items.filter((item) => item.category !== 'dev' && !/\b(AI|GPT|LLM|Agent)\b|模型/i.test(item.title));
      const right = items.filter((item) => item.category === 'dev' || /\b(AI|GPT|LLM|Agent)\b|模型/i.test(item.title));
      const column = (title, list) => h('div', { className: 'wb-news-col' },
        h('div', { className: 'wb-eyebrow' }, title),
        list.length === 0 ? h('div', { className: 'wb-news-empty' }, '暂无条目') : list.slice(0, 14).map((item) => h('a', {
          key: `${item.title}-${item.link}`,
          className: 'wb-news-item',
          href: item.link || '#',
          target: '_blank',
          rel: 'noreferrer noopener',
        },
        item.image ? h('img', { className: 'wb-news-thumb', src: item.image, alt: '', loading: 'lazy' }) : h('span', { className: 'wb-news-thumb wb-news-fallback' }, item.source?.match(/[一-鿿]/)?.[0] || '新闻'),
        h('div', { className: 'wb-news-body' },
          h('div', { className: 'wb-news-title' }, item.title),
          h('div', { className: 'wb-news-meta' }, h('span', null, item.source), h('span', null, fmtDate(item.publishedAt, true))),
        ),
        )),
      );
      return h('div', { className: 'wb-page' },
        h('div', { className: 'wb-news-hero' },
          h('div', null,
            h('span', { className: 'wb-eyebrow' }, '实时新闻'),
            h('h1', { className: 'wb-news-title-main' }, '近三天，', h('span', null, '人工智能世界发生了什么。')),
            h('p', { className: 'wb-muted' }, digest ? `最新简报：${digest.title}` : '还没有新闻简报，点右侧刷新抓取。'),
          ),
          h(Button, { kind: 'primary', onClick: onRefresh, disabled: busy, icon: 'refresh' }, busy ? '抓取中…' : '刷新抓取'),
        ),
        h('div', { className: 'wb-news-grid' },
          column('人工智能行业资讯', left),
          column('工具与模型动向', right),
        ),
      );
    }

    // ── 图谱 ────────────────────────────────────────────────────────────────
    function layoutGraph(data) {
      const nodes = (data.nodes || []).map((node, index) => {
        const angle = (index / Math.max(1, data.nodes.length)) * Math.PI * 2;
        const radius = 220 + (index % 7) * 26;
        return { ...node, x: 500 + Math.cos(angle) * radius, y: 320 + Math.sin(angle) * radius, vx: 0, vy: 0 };
      });
      const byId = new Map(nodes.map((node) => [node.id, node]));
      const links = (data.links || []).filter((link) => byId.has(link.source) && byId.has(link.target));
      for (let step = 0; step < 160; step += 1) {
        const alpha = 1 - step / 160;
        for (let i = 0; i < nodes.length; i += 1) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j += 1) {
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            const distance = Math.max(8, Math.hypot(dx, dy));
            const force = (6200 / (distance * distance)) * alpha;
            dx /= distance; dy /= distance;
            a.vx += dx * force; a.vy += dy * force;
            b.vx -= dx * force; b.vy -= dy * force;
          }
        }
        for (const link of links) {
          const a = byId.get(link.source);
          const b = byId.get(link.target);
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distance = Math.max(8, Math.hypot(dx, dy));
          const force = (distance - 115) * 0.006 * alpha;
          dx /= distance; dy /= distance;
          a.vx += dx * force; a.vy += dy * force;
          b.vx -= dx * force; b.vy -= dy * force;
        }
        for (const node of nodes) {
          node.vx += (500 - node.x) * 0.0015 * alpha;
          node.vy += (320 - node.y) * 0.0015 * alpha;
          node.vx *= 0.82; node.vy *= 0.82;
          node.x = Math.max(24, Math.min(976, node.x + node.vx));
          node.y = Math.max(24, Math.min(616, node.y + node.vy));
        }
      }
      if (nodes.length > 1) {
        const xs = nodes.map((node) => node.x);
        const ys = nodes.map((node) => node.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const scale = Math.min(920 / Math.max(1, maxX - minX), 560 / Math.max(1, maxY - minY), 2.2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        for (const node of nodes) {
          node.x = 500 + (node.x - cx) * scale;
          node.y = 320 + (node.y - cy) * scale;
        }
      }
      return { nodes, links };
    }

    const GRAPH_COLORS = { memory: THEME.accentSoft, knowledge: THEME.violet, skill: THEME.green, news: THEME.orange, profile: THEME.cyan, tag: THEME.dim };

    function GraphTab({ graph, loading, onRefresh, onOpen }) {
      const layout = React.useMemo(() => layoutGraph(graph || { nodes: [], links: [] }), [graph]);
      return h('div', { className: 'wb-page wb-graph-page' },
        h('div', { className: 'wb-page-head' },
          h('div', null, h('span', { className: 'wb-eyebrow' }, '关系网络'), h('h1', { className: 'wb-page-title' }, '关系网络')),
          h(Button, { onClick: onRefresh, disabled: loading, icon: 'refresh' }, loading ? '刷新中…' : '刷新'),
        ),
        h('div', { className: 'wb-graph-stats' },
          h('span', null, `${layout.nodes.length} 个节点`),
          h('span', null, `${layout.links.length} 条边`),
          h('span', { className: 'wb-muted' }, graph?.truncated ? `共 ${graph.total} 条，已截断` : '全部条目已展示'),
        ),
        h('div', { className: 'wb-graph-canvas' },
          h('svg', { viewBox: '0 0 1000 640', className: 'wb-graph-svg', role: 'img', 'aria-label': '知识图谱' },
            layout.links.map((link, index) => {
              const a = layout.nodes.find((node) => node.id === link.source);
              const b = layout.nodes.find((node) => node.id === link.target);
              if (!a || !b) return null;
              return h('line', { key: `l-${index}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, className: 'wb-edge' });
            }),
            layout.nodes.map((node) => h('g', {
              key: node.id,
              className: 'wb-node',
              onClick: () => node.kind !== 'tag' && onOpen(node),
            },
            h('circle', { cx: node.x, cy: node.y, r: node.kind === 'tag' ? 4.5 : 7.5, fill: GRAPH_COLORS[node.kind] || THEME.dim }),
            h('text', { x: node.x + 10, y: node.y + 3, className: 'wb-node-label' }, truncate(node.label, 20)),
            )),
          ),
        ),
        h('div', { className: 'wb-legend' }, Object.entries({ memory: '记忆', knowledge: '知识', skill: '技能', news: '新闻', profile: '偏好', tag: '标签' }).map(([kind, label]) => h('span', { key: kind, className: 'wb-legend-item' },
          h('i', { style: { background: GRAPH_COLORS[kind] } }), label,
        ))),
      );
    }
