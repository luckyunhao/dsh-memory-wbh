import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { apply } from '../index.js';

const root = mkdtempSync(join(tmpdir(), 'mkb-api-'));
// 隔离插件状态：Store 默认读 ~/.dsh/memory-kb/settings.json，
// 测试里的 POST /settings 不能改到真实配置。
process.env.DSH_HOME = join(root, 'dsh-home');
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
const mediaDir = join(root, 'media');
mkdirSync(join(memoryDir, 'entries'), { recursive: true });
mkdirSync(skillsDir, { recursive: true });
mkdirSync(pluginDir, { recursive: true });
mkdirSync(mediaDir, { recursive: true });
writeFileSync(join(mediaDir, 'pic.png'), Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
writeFileSync(join(mediaDir, 'note.txt'), 'unsupported');

const liveMessages = [
  { role: 'user', id: 'u1', source: { kind: 'user' }, content: [{ type: 'text', text: 'live question' }] },
  { role: 'assistant', id: 'a1', content: [{ type: 'text', text: 'live answer' }, { type: 'tool-call', name: 'read' }] },
];
const liveSession = {
  id: 'live-1',
  seq: 20,
  header: { delegationDepth: 0, cwd: root },
  deriveMessages: () => liveMessages,
  snapshotEvents: () => [],
};
const historyEvents = [
  { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'hist question' }] } },
  { type: 'user/message', seq: 2, data: { source: { kind: 'dsh-memory-kb' }, content: [{ type: 'text', text: '[记忆召回] should be hidden' }] } },
  { type: 'assistant/message', seq: 3, data: { message: { id: 'a2', content: [{ type: 'text', text: 'hist answer' }] } } },
  { type: 'tool/call', seq: 4, data: { name: 'pwsh', arguments: '{"cmd":"dir"}' } },
  { type: 'tool/result', seq: 5, data: { name: 'pwsh', result: 'ok' } },
];

let readSessionCalls = 0;
const query = {
  async listSessions() {
    return [
      { header: { id: 's1', createdAt: 1 }, live: false, persisted: true },
      { header: { id: 's2', createdAt: 2 }, live: false, persisted: true },
    ];
  },
  async readTitleSnapshots(ids) {
    // 故意逆序且含 rejected，验证 A19 不能按下标对齐。
    return [
      { status: 'fulfilled', value: { session: { id: 's2' }, title: { title: 'Title S2' } } },
      { status: 'rejected', reason: new Error('no title') },
    ];
  },
  async readSession(id) {
    readSessionCalls += 1;
    return { events: String(id).startsWith('hist') ? historyEvents : [] };
  },
};

const registered = { routes: [], listeners: {} };
const promptCalls = [];
const sessionController = {
  async prompt(payload) {
    promptCalls.push(payload);
    if (payload.sessionId === 'held') {
      const error = new Error('Session is already owned by an active write handle');
      error.code = 'session/writer-held';
      throw error;
    }
    return { accepted: true };
  },
  async resolveAgent(id) {
    if (id === 'held') return { error: { code: 'session/writer-held', message: 'held by writer' } };
    return { agent: { id } };
  },
};
const ctx = {
  logger: { info() {}, warn() {}, debug() {} },
  effect(callback, label) { const disposer = callback(); return () => { if (typeof disposer === 'function') disposer(); }; },
  on(name, listener) { registered.listeners[name] = listener; return () => { delete registered.listeners[name]; }; },
  sessions: { list: () => [liveSession], get: (id) => (id === liveSession.id ? liveSession : null) },
  webServer: { register(route) { registered.routes.push(route); return () => {}; } },
  tools: { register() { return () => {}; } },
  commands: { register() { return () => {}; } },
  systemPrompt: { section() { return () => {}; } },
  llm: {
    stream() {
      return (async function* () {
        yield { type: 'text-delta', text: 'MOCK ANSWER [1]' };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  },
  get(name) {
    if (name === 'sessionQuery') return query;
    if (name === 'sessionController') return sessionController;
    if (name === 'agents') return { get: (id) => (id === 'live-1' ? { id } : null) };
    return undefined;
  },
};

apply(ctx, { memoryDir, skillsDir, pluginDir, mediaDir, newsEnabled: false, autoDistill: false, autoRecall: false, provider: 'p', model: 'm' });
const route = registered.routes[0];
assert.ok(route, 'API route registered');

function makeRes() {
  const chunks = [];
  const res = new Writable({ write(chunk, enc, cb) { chunks.push(Buffer.from(chunk)); cb(); } });
  res.status = 0;
  res.headers = {};
  res.headersSent = false;
  res.writeHead = (code, headers = {}) => { res.status = code; res.headers = headers; res.headersSent = true; };
  res.body = () => Buffer.concat(chunks);
  return res;
}

async function call(url, { method = 'GET', body, headers = {} } = {}) {
  const res = makeRes();
  const reqHeaders = { ...headers };
  if (body !== undefined && !reqHeaders['content-type']) reqHeaders['content-type'] = 'application/json';
  const req = {
    method,
    url,
    headers: reqHeaders,
    async *[Symbol.asyncIterator]() { if (body !== undefined) yield Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)); },
  };
  await route.handler(req, res);
  if (!res.writableEnded) await new Promise((resolve) => res.once('finish', resolve));
  const raw = res.body().toString('utf8');
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, headers: res.headers, raw, data, bytes: res.body() };
}

// A14 CSRF 闸
assert.equal((await call('/dsh-memory-kb/api/health')).status, 200, 'no origin allowed');
assert.equal((await call('/dsh-memory-kb/api/health', { headers: { origin: 'http://evil.example' } })).status, 403, 'cross origin blocked');
assert.equal((await call('/dsh-memory-kb/api/health', { headers: { origin: 'http://127.0.0.1:3098', host: '127.0.0.1:3098' } })).status, 200, 'same origin allowed');
assert.equal((await call('/dsh-memory-kb/api/health', { headers: { origin: 'dsh-app://app' } })).status, 200, 'desktop origin allowed');
const plainPost = await call('/dsh-memory-kb/api/goal', {
  method: 'POST',
  body: '{"sessionId":"x","goal":"y"}',
  headers: { origin: 'http://127.0.0.1:3098', host: '127.0.0.1:3098', 'content-type': 'text/plain' },
});
assert.equal(plainPost.status, 403, 'browser text/plain POST blocked');

// A19 标题快照按 id 对齐
const sessions = await call('/dsh-memory-kb/api/sessions');
assert.equal(sessions.status, 200);
const s2 = sessions.data.sessions.find((item) => item.id === 's2');
assert.equal(s2.title, 'Title S2', 'title mapped by result session id');
const s1 = sessions.data.sessions.find((item) => item.id === 's1');
assert.equal(s1.title, '', 'missing title falls back without shifting');

// /chat/messages：实时会话
const liveChat = await call('/dsh-memory-kb/api/chat/messages?id=live-1');
assert.equal(liveChat.status, 200);
assert.equal(liveChat.data.live, true);
assert.deepEqual(liveChat.data.messages.map((m) => m.text), ['live question', 'live answer']);
assert.deepEqual(liveChat.data.messages[1].tools, ['read']);

// /chat/messages：历史会话 + A2 冷读缓存
readSessionCalls = 0;
const histChat1 = await call('/dsh-memory-kb/api/chat/messages?id=hist-1');
const histChat2 = await call('/dsh-memory-kb/api/chat/messages?id=hist-1');
assert.equal(histChat1.data.live, false);
assert.deepEqual(histChat1.data.messages.map((m) => m.text), ['hist question', 'hist answer']);
assert.equal(readSessionCalls, 1, 'cold read cached between polls');

// /process：实时事件
const sessionEvent = registered.listeners['session/event'];
assert.equal(typeof sessionEvent, 'function');
sessionEvent(liveSession, { type: 'tool/call', seq: 1, time: 1000, data: { name: 'pwsh', arguments: '{"cmd":"dir"}' } });
sessionEvent(liveSession, { type: 'assistant/message', seq: 2, time: 1001, data: { message: { content: [{ type: 'text', text: 'done' }] } } });
const liveProcess = await call('/dsh-memory-kb/api/process?id=live-1&limit=50');
assert.equal(liveProcess.status, 200);
assert.ok(liveProcess.data.items.some((item) => item.toolName === 'pwsh'));

// /process：历史会话冷读
readSessionCalls = 0;
const histProcess1 = await call('/dsh-memory-kb/api/process?id=hist-2');
const histProcess2 = await call('/dsh-memory-kb/api/process?id=hist-2');
assert.ok(histProcess1.data.items.some((item) => item.toolName === 'pwsh'));
assert.equal(readSessionCalls, 1, 'process cold read cached');

// /chat/send
const sent = await call('/dsh-memory-kb/api/chat/send', { method: 'POST', body: { sessionId: 'live-1', text: 'hello' } });
assert.equal(sent.status, 200);
assert.equal(sent.data.ok, true);
assert.equal(promptCalls[0].content[0].text, 'hello');
const heldSend = await call('/dsh-memory-kb/api/chat/send', { method: 'POST', body: { sessionId: 'held', text: 'hello' } });
assert.equal(heldSend.status, 409);
assert.equal(heldSend.data.code, 'session/writer-held');

// /chat/activate
const activated = await call('/dsh-memory-kb/api/chat/activate', { method: 'POST', body: { sessionId: 'any' } });
assert.equal(activated.status, 200);
assert.equal(activated.data.ok, true);
const heldActivate = await call('/dsh-memory-kb/api/chat/activate', { method: 'POST', body: { sessionId: 'held' } });
assert.equal(heldActivate.status, 409);
assert.equal(heldActivate.data.code, 'session/writer-held');

// /settings：A9 显式清空 provider/model
const cleared = await call('/dsh-memory-kb/api/settings', { method: 'POST', body: { provider: '', model: '' } });
assert.equal(cleared.status, 200);
assert.equal(cleared.data.settings.provider, '');
assert.equal(cleared.data.settings.model, '');

// /media/file：Range 206 / 路径穿越 403 / 扩展名 415
const ranged = await call('/dsh-memory-kb/api/media/file?path=pic.png', { headers: { range: 'bytes=0-3' } });
assert.equal(ranged.status, 206);
assert.equal(ranged.headers['content-range'], 'bytes 0-3/8');
assert.equal(ranged.bytes.length, 4);
const traversal = await call('/dsh-memory-kb/api/media/file?path=../secret.txt');
assert.equal(traversal.status, 403);
const unsupported = await call('/dsh-memory-kb/api/media/file?path=note.txt');
assert.equal(unsupported.status, 415);

// 新增：成本设置（每天预算 + 单价）
const costSettings = await call('/dsh-memory-kb/api/settings', {
  method: 'POST',
  body: { dailyBudget: 5, priceCacheRead: 0.3, priceInput: 2.5, priceOutput: 4 },
});
assert.equal(costSettings.status, 200);
assert.equal(costSettings.data.settings.dailyBudget, 5);
assert.equal(costSettings.data.settings.priceInput, 2.5);

// 新增：记忆审核 / 近重复合并
const savedA = await call('/dsh-memory-kb/api/save-memory', {
  method: 'POST',
  body: { type: 'fact', title: 'Alpha report entry', summary: 'netpulse report config details shared by both entries', tags: ['netpulse'] },
});
const savedB = await call('/dsh-memory-kb/api/save-memory', {
  method: 'POST',
  body: { type: 'fact', title: 'Beta report entry', summary: 'netpulse report config details shared by both entries', tags: ['netpulse'] },
});
assert.equal(savedA.status, 200);
assert.equal(savedB.status, 200);
const reviewList = await call('/dsh-memory-kb/api/review');
assert.equal(reviewList.status, 200);
assert.ok(reviewList.data.items.some((item) => item.id === savedA.data.item.id), 'pending queue includes saved memory');
const dupGroup = (reviewList.data.duplicates || []).find((group) =>
  group.items.some((item) => item.id === savedA.data.item.id) && group.items.some((item) => item.id === savedB.data.item.id));
assert.ok(dupGroup, 'near duplicate group found');

const confirmed = await call('/dsh-memory-kb/api/review', {
  method: 'POST',
  body: { ids: [savedA.data.item.id], action: 'confirm' },
});
assert.equal(confirmed.status, 200);
assert.equal(confirmed.data.ok, true);
const confirmedEntry = await call(`/dsh-memory-kb/api/entry?id=${encodeURIComponent(savedA.data.item.id)}`);
assert.match(confirmedEntry.data.item.meta['状态'], /已人工确认/);

const merged = await call('/dsh-memory-kb/api/merge', {
  method: 'POST',
  body: { keepId: savedA.data.item.id, dropIds: [savedB.data.item.id] },
});
assert.equal(merged.status, 200);
assert.equal(merged.data.ok, true);
assert.equal(merged.data.merged, 1);
const afterMerge = await call('/dsh-memory-kb/api/entries?limit=300');
assert.ok(!afterMerge.data.items.some((item) => item.id === savedB.data.item.id), 'dropped duplicate removed');
const keptEntry = await call(`/dsh-memory-kb/api/entry?id=${encodeURIComponent(savedA.data.item.id)}`);
assert.match(keptEntry.data.item.content, /合并记录/);

// 新增：问记忆库（RAG）
const asked = await call('/dsh-memory-kb/api/ask-memory', {
  method: 'POST',
  body: { question: 'netpulse report config', sessionId: 'live-1', limit: 5 },
});
assert.equal(asked.status, 200);
assert.equal(asked.data.ok, true);
assert.match(asked.data.answer, /MOCK ANSWER/);
assert.ok(asked.data.citations.length >= 1, 'ask returns citations');
assert.ok(asked.data.citations[0].path, 'citation has path');

// 新增：会话导出
const exported = await call('/dsh-memory-kb/api/export-session?id=live-1');
assert.equal(exported.status, 200);
assert.equal(exported.data.ok, true);
assert.match(exported.data.filename, /\.md$/);
assert.match(exported.data.markdown, /# /);
assert.match(exported.data.markdown, /工具调用 · pwsh/);

// 新增：diff 路径必须留在工作区内
const diffOutside = await call('/dsh-memory-kb/api/workspace/diff', {
  method: 'POST',
  body: { sessionId: 'live-1', path: '../outside.txt' },
});
assert.equal(diffOutside.status, 403);

// 新增：git 工作区的 diff（含未跟踪文件）
const repo = join(root, 'repo');
mkdirSync(repo, { recursive: true });
writeFileSync(join(repo, 'a.txt'), 'one\n');
const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
git('init');
git('config', 'user.email', 'test@example.com');
git('config', 'user.name', 'Test');
git('add', '.');
git('commit', '-m', 'init');
writeFileSync(join(repo, 'a.txt'), 'one\ntwo\n');
liveSession.header.cwd = repo;
const diff = await call('/dsh-memory-kb/api/workspace/diff', {
  method: 'POST',
  body: { sessionId: 'live-1', path: 'a.txt' },
});
assert.equal(diff.status, 200);
assert.equal(diff.data.ok, true);
assert.match(diff.data.diff, /\+two/, 'git diff includes the new line');
writeFileSync(join(repo, 'b.txt'), 'new file\n');
const untrackedDiff = await call('/dsh-memory-kb/api/workspace/diff', {
  method: 'POST',
  body: { sessionId: 'live-1', path: 'b.txt' },
});
assert.equal(untrackedDiff.status, 200);
assert.equal(untrackedDiff.data.untracked, true);
liveSession.header.cwd = root;

console.log('ALL API TESTS PASSED', root);

