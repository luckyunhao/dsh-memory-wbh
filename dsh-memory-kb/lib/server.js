import { createReadStream, readdirSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { truncate } from './util.js';

const BASE = '/dsh-memory-kb/api';

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function queryOf(req) {
  const raw = typeof req.url === 'string' ? req.url : '';
  const at = raw.indexOf('?');
  return new URLSearchParams(at === -1 ? '' : raw.slice(at + 1));
}

function isDesktopOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'dsh-app:' || parsed.protocol === 'app:';
  } catch {
    return false;
  }
}

function isSameHostOrigin(origin, host) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return Boolean(host) && parsed.host === host;
  } catch {
    return false;
  }
}

/**
 * 本机 API 的 CSRF 闸。端口只监听 loopback，主要风险是本机网页/脚本：
 * - 桌面壳 dsh-app:// 与 Electron 的 file:///null 来源放行；
 * - 浏览器页面必须与 Host 同源（dev 的 127.0.0.1:3098）；
 * - 带 Origin 的写操作强制 application/json：跨站简单请求（form/text-plain）被拒，
 *   跨站 JSON 请求会触发预检，而本服务不返回 CORS 头，浏览器会拦下；
 * - 无 Origin 的本机客户端/测试/curl 保持可用。
 * 注意：这里不依赖 Sec-Fetch-Site，因为桌面壳访问 127.0.0.1 本身就是 cross-site。
 */
function guardRequest(req) {
  const headers = req.headers ?? {};
  const method = (req.method ?? 'GET').toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const origin = headers.origin;
  if (!origin) return '';
  const trusted = isDesktopOrigin(origin) || isSameHostOrigin(origin, headers.host) || origin === 'null';
  if (!trusted) return 'origin not allowed';
  if (unsafe && !String(headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
    return 'content-type must be application/json';
  }
  return '';
}

/**
 * 注册记忆库 API。返回 disposer。
 * @param {object} deps
 * @param {object} deps.ctx
 * @param {import('./store.js').Store} deps.store
 * @param {(opts:object)=>Promise<object>} deps.distill - 由 index.js 提供的沉淀入口
 * @param {(opts:object)=>Promise<object>} deps.fetchNews
 * @param {(sessionId:string)=>Array} deps.eventsOf
 * @param {(sessionId:string)=>object|null} deps.sessionOf
 * @param {(sessionId:string)=>object} deps.metaOf
 */
export function registerApi({
  ctx, store, distill, fetchNews, eventsOf, sessionOf, metaOf,
  listSessions, chatMessages, processEvents, sendChat, activateChat, accountInfo,
  askMemory, exportSession, diffFile, revealPath, logger = console,
}) {
  let newsRunning = null;
  const handler = async (req, res) => {
    try {
      const denied = guardRequest(req);
      if (denied) {
        send(res, 403, { error: denied });
        return;
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const path = url.pathname;
      if (!path.startsWith(BASE)) {
        send(res, 404, { error: 'not found' });
        return;
      }
      const route = path.slice(BASE.length) || '/';
      const query = queryOf(req);
      const method = (req.method ?? 'GET').toUpperCase();

      if (method === 'GET' && route === '/overview') {
        const stats = store.stats();
        send(res, 200, {
          stats,
          recent: store.items.slice(0, 8).map(brief),
          settings: store.getSettings(),
          state: {
            lastNews: store.state.lastNews ?? null,
            lastDistill: store.state.lastDistill ?? null,
            lastRoute: store.state.lastRoute ?? null,
          },
        });
        return;
      }

      if (method === 'GET' && route === '/entries') {
        const q = query.get('q') ?? '';
        const kind = query.get('kind') ?? '';
        const limit = Math.max(1, Math.min(300, Number(query.get('limit')) || 80));
        const items = store.search(q, { kind, limit });
        send(res, 200, { items: items.map(brief), total: store.items.length, query: q, kind });
        return;
      }

      if (method === 'GET' && route === '/entry') {
        const id = query.get('id') ?? '';
        const item = store.get(id);
        if (!item) {
          send(res, 404, { error: 'entry not found' });
          return;
        }
        send(res, 200, { item: full(item) });
        return;
      }

      if (method === 'GET' && route === '/graph') {
        send(res, 200, store.graph(Math.max(20, Math.min(300, Number(query.get('limit')) || 160))));
        return;
      }

      if (method === 'GET' && route === '/sessions') {
        send(res, 200, await (listSessions?.() ?? { sessions: [] }));
        return;
      }

      if (method === 'GET' && route === '/chat/messages') {
        const id = String(query.get('id') ?? '').trim();
        if (!id) {
          send(res, 400, { error: 'id is required' });
          return;
        }
        send(res, 200, await (chatMessages?.(id, Number(query.get('limit')) || 100) ?? { live: false, messages: [] }));
        return;
      }

      if (method === 'GET' && route === '/process') {
        const id = String(query.get('id') ?? '').trim();
        if (!id) {
          send(res, 400, { error: 'id is required' });
          return;
        }
        send(res, 200, { items: await (processEvents?.(id, Number(query.get('limit')) || 120) ?? []) });
        return;
      }

      if (method === 'POST' && route === '/chat/activate') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        if (!sessionId) {
          send(res, 400, { error: 'sessionId is required' });
          return;
        }
        const result = await (activateChat?.(sessionId) ?? { ok: false, error: 'activate unavailable' });
        send(res, result.ok ? 200 : 409, result);
        return;
      }

      if (method === 'POST' && route === '/chat/send') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        const text = String(body.text ?? '').trim();
        if (!sessionId || !text) {
          send(res, 400, { error: 'sessionId and text are required' });
          return;
        }
        const result = await (sendChat?.(sessionId, text) ?? { ok: false, error: 'chat unavailable' });
        send(res, result.ok ? 200 : 409, result);
        return;
      }

      if (method === 'GET' && route === '/media/list') {
        send(res, 200, listMedia(store.mediaDir));
        return;
      }

      if (method === 'GET' && route === '/media/file') {
        serveMedia(req, res, store.mediaDir, query);
        return;
      }

      if (method === 'GET' && route === '/session') {
        const id = String(query.get('id') ?? '').trim();
        if (!id) {
          send(res, 400, { error: 'id is required' });
          return;
        }
        const meta = metaOf?.(id) ?? {};
        const session = sessionOf(id);
        const cursor = store.getSessionCursor(id);
        const lastDistill = store.state.lastDistill?.sessionId === id ? store.state.lastDistill : null;
        send(res, 200, {
          id,
          exists: Boolean(session),
          title: meta.title ?? '',
          turn: meta.lastTurn ?? 0,
          bufferCount: (eventsOf(id) ?? []).length,
          lastEventAt: meta.lastEventAt ?? 0,
          todos: meta.todos ?? [],
          recentTools: meta.recentTools ?? [],
          subagents: meta.subagents ?? [],
          goal: store.state.goals?.[id] ?? '',
          cursor,
          lastDistill,
        });
        return;
      }

      if (method === 'POST' && route === '/goal') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        if (!sessionId) {
          send(res, 400, { error: 'sessionId is required' });
          return;
        }
        store.state.goals = store.state.goals ?? {};
        store.state.goals[sessionId] = truncate(String(body.goal ?? '').trim(), 1200);
        store.saveState();
        send(res, 200, { ok: true, sessionId, goal: store.state.goals[sessionId] });
        return;
      }

      if (method === 'GET' && route === '/news/items') {
        send(res, 200, store.readNewsItems());
        return;
      }

      if (method === 'GET' && route === '/settings') {
        send(res, 200, { settings: store.getSettings() });
        return;
      }

      if (method === 'POST' && route === '/settings') {
        const body = await readBody(req);
        send(res, 200, { settings: store.updateSettings(body) });
        return;
      }

      if (method === 'POST' && route === '/save-memory') {
        const body = await readBody(req);
        const result = store.saveMemory({
          type: body.type,
          title: body.title,
          summary: body.summary,
          content: body.content,
          tags: body.tags,
          source: { kind: 'manual' },
        });
        send(res, 200, { ok: true, item: result.item ? full(result.item) : null, duplicate: result.duplicate });
        return;
      }

      if (method === 'POST' && route === '/delete') {
        const body = await readBody(req);
        const result = store.deleteItem(String(body.id ?? ''));
        send(res, 200, { ok: true, ...result });
        return;
      }

      if (method === 'POST' && route === '/distill') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        if (!sessionId) {
          send(res, 400, { error: 'sessionId is required' });
          return;
        }
        const session = sessionOf(sessionId);
        const events = eventsOf(sessionId) ?? [];
        try {
          const result = await distill({
            sessionId,
            session,
            events,
            force: true,
            turn: latestTurn(events),
          });
          send(res, 200, { ok: true, ...result });
        } catch (error) {
          const message = String(error?.message ?? error);
          if (message.includes('session not found')) {
            send(res, 404, { error: 'session not found', sessionId });
            return;
          }
          if (message.includes('no buffered events')) {
            send(res, 409, { error: 'no buffered events for this session yet', sessionId });
            return;
          }
          throw error;
        }
        return;
      }

      if (method === 'GET' && route === '/review') {
        const limit = Math.max(1, Math.min(300, Number(query.get('limit')) || 100));
        const threshold = Math.max(0.2, Math.min(1, Number(query.get('threshold')) || 0.55));
        const items = store.reviewQueue(limit);
        const groups = store.duplicateGroups(threshold);
        send(res, 200, {
          items: items.map(brief),
          pending: store.items.filter((item) => ['memory', 'knowledge', 'profile'].includes(item.kind)
            && reviewPending(item)).length,
          duplicates: groups.map((group) => ({
            score: Number(group.score.toFixed(3)),
            items: group.items.map(brief),
          })),
        });
        return;
      }

      if (method === 'POST' && route === '/review') {
        const body = await readBody(req);
        const action = String(body.action ?? 'confirm');
        const ids = (Array.isArray(body.ids) ? body.ids : [body.id])
          .map((value) => String(value ?? '').trim())
          .filter(Boolean);
        if (ids.length === 0) {
          send(res, 400, { error: 'id or ids is required' });
          return;
        }
        const status = `已人工确认（${new Date().toISOString().slice(0, 10)}）`;
        const results = [];
        for (const id of ids) {
          try {
            if (action === 'confirm') {
              store.setReviewStatus(id, status);
              results.push({ id, ok: true });
            } else if (action === 'update') {
              const result = store.updateMemory({
                id,
                title: body.title,
                summary: body.summary,
                tags: body.tags,
                status: body.status || status,
              });
              results.push({ id, ok: true, item: result.item ? brief(result.item) : null });
            } else if (action === 'reject') {
              store.deleteItem(id);
              results.push({ id, ok: true });
            } else {
              results.push({ id, ok: false, error: `unknown action: ${action}` });
            }
          } catch (error) {
            results.push({ id, ok: false, error: String(error?.message ?? error) });
          }
        }
        send(res, 200, { ok: results.every((item) => item.ok), results });
        return;
      }

      if (method === 'POST' && route === '/merge') {
        const body = await readBody(req);
        const keepId = String(body.keepId ?? '').trim();
        const dropIds = Array.isArray(body.dropIds) ? body.dropIds : [];
        if (!keepId || dropIds.length === 0) {
          send(res, 400, { error: 'keepId and dropIds are required' });
          return;
        }
        const result = store.mergeMemories({ keepId, dropIds });
        store.refresh();
        send(res, 200, {
          ok: result.errors?.length === 0,
          merged: result.merged,
          errors: result.errors ?? [],
          item: result.item ? brief(result.item) : null,
        });
        return;
      }

      if (method === 'POST' && route === '/ask-memory') {
        const body = await readBody(req);
        const question = String(body.question ?? '').trim();
        if (!question) {
          send(res, 400, { error: 'question is required' });
          return;
        }
        if (typeof askMemory !== 'function') {
          send(res, 503, { ok: false, error: 'ask unavailable' });
          return;
        }
        const result = await askMemory({
          question,
          sessionId: String(body.sessionId ?? '').trim(),
          limit: Number(body.limit) || 6,
        });
        send(res, result.ok === false ? 502 : 200, result);
        return;
      }

      if (method === 'GET' && route === '/export-session') {
        const id = String(query.get('id') ?? '').trim();
        if (!id) {
          send(res, 400, { error: 'id is required' });
          return;
        }
        if (typeof exportSession !== 'function') {
          send(res, 503, { error: 'export unavailable' });
          return;
        }
        try {
          const result = await exportSession(id);
          send(res, 200, { ok: true, ...result });
        } catch (error) {
          send(res, 404, { ok: false, error: String(error?.message ?? error) });
        }
        return;
      }

      if (method === 'POST' && route === '/workspace/diff') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        const path = String(body.path ?? '').trim();
        if (!sessionId || !path) {
          send(res, 400, { error: 'sessionId and path are required' });
          return;
        }
        if (typeof diffFile !== 'function') {
          send(res, 503, { ok: false, error: 'diff unavailable' });
          return;
        }
        try {
          send(res, 200, await diffFile({ sessionId, path }));
        } catch (error) {
          send(res, Number(error?.status) || 500, { ok: false, error: String(error?.message ?? error) });
        }
        return;
      }

      if (method === 'POST' && route === '/workspace/reveal') {
        const body = await readBody(req);
        const sessionId = String(body.sessionId ?? '').trim();
        const path = String(body.path ?? '').trim();
        if (!sessionId || !path) {
          send(res, 400, { error: 'sessionId and path are required' });
          return;
        }
        if (typeof revealPath !== 'function') {
          send(res, 503, { ok: false, error: 'reveal unavailable' });
          return;
        }
        try {
          send(res, 200, await revealPath({ sessionId, path }));
        } catch (error) {
          send(res, Number(error?.status) || 500, { ok: false, error: String(error?.message ?? error) });
        }
        return;
      }

      if (method === 'POST' && route === '/news/fetch') {
        if (newsRunning) {
          send(res, 409, { error: 'news fetch already running' });
          return;
        }
        newsRunning = fetchNews({ force: true }).finally(() => { newsRunning = null; });
        const result = await newsRunning;
        send(res, 200, { ok: true, ...summarizeNews(result) });
        return;
      }

      if (method === 'GET' && route === '/news/status') {
        send(res, 200, {
          lastNews: store.state.lastNews ?? null,
          settings: {
            newsEnabled: store.settings.newsEnabled,
            newsIntervalHours: store.settings.newsIntervalHours,
            sources: store.settings.newsSources,
          },
        });
        return;
      }

      if (method === 'GET' && route === '/export') {
        send(res, 200, { exportedAt: new Date().toISOString(), items: store.items.map(full) });
        return;
      }

      if (method === 'GET' && route === '/health') {
        send(res, 200, { ok: true, version: 1, memoryDir: store.memoryDir, items: store.items.length });
        return;
      }

      if (method === 'GET' && route === '/account') {
        let data = null;
        try {
          data = await accountInfo?.();
        } catch (error) {
          data = { ok: false, error: String(error?.message ?? error) };
        }
        send(res, 200, data ?? { ok: false, error: 'account info unavailable' });
        return;
      }

      send(res, 404, { error: `unknown route: ${method} ${route}` });
    } catch (error) {
      logger.warn?.(`[dsh-memory-kb] api error: ${error?.stack ?? error}`);
      if (!res.headersSent) send(res, 500, { error: truncate(error?.message ?? String(error), 500) });
      else res.end();
    }
  };
  return ctx.webServer.register({ kind: 'prefix', path: BASE, handler });
}

function latestTurn(events) {
  let turn = 0;
  for (const event of events) {
    const value = event?.data?.turn;
    if (Number.isFinite(value) && value > turn) turn = value;
  }
  return turn || undefined;
}

function summarizeNews(result) {
  if (!result) return {};
  return {
    skipped: result.skipped,
    fetched: result.fetched,
    sources: result.sources,
    digest: result.digest ? brief(result.digest) : null,
    error: result.error,
  };
}

function reviewPending(item) {
  const status = String(item?.meta?.['状态'] ?? '');
  if (!status) return true;
  return /待人工复核|待复核|pending/i.test(status);
}

function brief(item) {
  return {
    id: item.id,
    kind: item.kind,
    type: item.type,
    title: item.title,
    summary: item.summary,
    // 项目卡要在列表里解析「下一步行动」，所以带上截断后的正文。
    content: truncate(item.content ?? '', 2500),
    tags: item.tags,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    path: item.path,
    status: item.meta?.['状态'] ?? '',
    source: item.meta?.['来源'] ?? '',
  };
}

function full(item) {
  return {
    ...brief(item),
    content: item.content,
    meta: item.meta,
    updatedAt: item.updatedAt,
  };
}

const MEDIA_TYPES = {
  '.jpg': ['image/jpeg', 'image'],
  '.jpeg': ['image/jpeg', 'image'],
  '.png': ['image/png', 'image'],
  '.webp': ['image/webp', 'image'],
  '.gif': ['image/gif', 'image'],
  '.svg': ['image/svg+xml', 'image'],
  '.mp4': ['video/mp4', 'video'],
  '.webm': ['video/webm', 'video'],
  '.mov': ['video/quicktime', 'video'],
  '.mp3': ['audio/mpeg', 'audio'],
  '.wav': ['audio/wav', 'audio'],
  '.m4a': ['audio/mp4', 'audio'],
};

function listMedia(dir) {
  const items = [];
  try {
    for (const name of readdirSync(dir)) {
      const file = resolve(dir, name);
      let stat;
      try { stat = statSync(file); } catch { continue; }
      if (!stat.isFile()) continue;
      const ext = extname(name).toLowerCase();
      const type = MEDIA_TYPES[ext];
      if (!type) continue;
      items.push({
        name,
        rel: name,
        kind: type[1],
        ext,
        size: stat.size,
        mtime: stat.mtimeMs,
        url: `${BASE}/media/file?path=${encodeURIComponent(name)}`,
      });
    }
  } catch {
    // 目录不存在 = 空素材库
  }
  items.sort((a, b) => b.mtime - a.mtime);
  return { dir, items: items.slice(0, 200), total: items.length };
}

function serveMedia(req, res, rootDir, query) {
  const rel = String(query.get('path') ?? '');
  if (!rel) { res.writeHead(400, { 'content-type': 'text/plain' }); res.end('path required'); return; }
  let file;
  try {
    const root = resolve(rootDir);
    file = resolve(root, rel);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain' }); res.end('forbidden'); return;
    }
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }); res.end('bad path'); return;
  }
  const ext = extname(file).toLowerCase();
  const type = MEDIA_TYPES[ext];
  if (!type) { res.writeHead(415, { 'content-type': 'text/plain' }); res.end('unsupported media'); return; }
  let stat;
  try { stat = statSync(file); } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return;
  }
  if (!stat.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not a file'); return; }

  const total = stat.size;
  let start = 0;
  let end = total - 1;
  let status = 200;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (match) {
      start = match[1] ? Number(match[1]) : 0;
      end = match[2] ? Number(match[2]) : total - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
        res.writeHead(416, { 'content-range': `bytes */${total}` });
        res.end();
        return;
      }
      end = Math.min(end, total - 1);
      status = 206;
    }
  }
  const headers = {
    'content-type': type[0],
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=3600',
    'content-length': end - start + 1,
  };
  if (status === 206) headers['content-range'] = `bytes ${start}-${end}/${total}`;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file, { start, end }).pipe(res);
}

export { BASE as API_BASE };
