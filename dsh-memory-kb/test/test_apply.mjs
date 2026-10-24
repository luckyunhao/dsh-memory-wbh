import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../index.js';

const root = mkdtempSync(join(tmpdir(), 'mkb-apply-'));
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
mkdirSync(join(memoryDir, 'entries'), { recursive: true });
mkdirSync(skillsDir, { recursive: true });
writeFileSync(join(memoryDir, 'INDEX.md'), '# 记忆索引\n\n', 'utf8');
writeFileSync(join(memoryDir, 'entries', 'seed.md'), '# 已有记忆\n\n- 日期：2026-10-22\n- 类型：fact\n\n## 结论\n\nseeded keyword zeta\n', 'utf8');

const registered = { tools: [], commands: [], sections: [], routes: [], listeners: {}, effects: [] };
const injected = [];
const fakeAgent = { inject(input) { injected.push(input); } };
const fakeSession = {
  id: 'sess-apply',
  seq: 10,
  header: { delegationDepth: 0 },
  snapshotEvents(from, to) { return [{ type: 'user/message', seq: 9, data: { role: 'user', content: [{ type: 'text', text: 'seeded keyword zeta 的问题' }], source: { kind: 'user' } } }]; },
};
const ctx = {
  logger: { info() {}, warn() {}, debug() {} },
  effect(callback, label) { const disposer = callback(); registered.effects.push({ label, disposer }); return () => { if (typeof disposer === 'function') disposer(); }; },
  on(name, listener) { registered.listeners[name] = listener; return () => { delete registered.listeners[name]; }; },
  sessions: { list: () => [fakeSession], get: (id) => (id === fakeSession.id ? fakeSession : null) },
  webServer: { register(route) { registered.routes.push(route); return () => {}; } },
  tools: { register(tool) { registered.tools.push(tool); return () => {}; } },
  skills: { register() { return () => {}; } },
  systemPrompt: { section(section) { registered.sections.push(section); return () => {}; } },
  commands: { register(command) { registered.commands.push(command); return () => {}; } },
  llm: {
    stream(options) {
      return (async function* () {
        yield { type: 'text-delta', text: JSON.stringify({ memories: [{ type: 'fact', title: '应用级测试记忆', summary: 'auto distill 工作正常', tags: ['test'] }], skill: null }) };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  },
  get(name) { if (name === 'agents') return { get: () => fakeAgent }; return undefined; },
};

apply(ctx, { memoryDir, skillsDir, pluginDir, autoDistill: true, autoRecall: true, newsEnabled: false, ...{ provider: 'p', model: 'm' } });

console.log('tools', registered.tools.map((t) => t.name));
console.log('commands', registered.commands.map((c) => c.name));
console.log('routes', registered.routes.map((r) => r.path));
console.log('sections', registered.sections.map((s) => s.name));
assert.deepEqual(registered.tools.map((t) => t.name).sort(), ['memory_save', 'memory_search', 'memory_stats', 'news_fetch', 'skill_create', 'skill_list']);
for (const tool of registered.tools) {
  assert.equal(tool.parameters?.type, 'object', `${tool.name} parameters must be a compiled object schema`);
  assert.ok(tool.parameters.properties && typeof tool.parameters.properties === 'object', `${tool.name} properties`);
}
const saveSchema = registered.tools.find((t) => t.name === 'memory_save').parameters;
console.log('memory_save schema', JSON.stringify(saveSchema));
assert.deepEqual(saveSchema.required, ['title', 'summary']);
assert.equal(saveSchema.properties.type.type, 'string');
assert.deepEqual(registered.commands.map((c) => c.name), ['memory']);
assert.equal(registered.routes[0].path, '/dsh-memory-kb/api');
assert.equal(registered.sections[0].name, 'dsh-memory-kb');

// 工具输出
const searchTool = registered.tools.find((t) => t.name === 'memory_search');
const searchText = await searchTool.execute({ query: 'zeta', limit: 3 }, {});
assert.match(searchText, /已有记忆/);
console.log('search tool ->', searchText.split('\n')[0]);

// 召回注入：agent/pre-step 应把 [记忆召回] 插到当前步骤的消息里
const preStep = registered.listeners['agent/pre-step'];
assert.ok(preStep, 'agent/pre-step listener registered');
const userMessage = {
  role: 'user', id: 'u-1',
  content: [{ type: 'text', text: 'seeded keyword zeta 相关的问题是什么？' }],
  source: { kind: 'user' },
};
const decision = await preStep(
  { agent: { session: fakeSession }, messages: [userMessage], turn: 1, step: 1 },
  async () => ({ kind: 'enter', messages: [userMessage] }),
);
const recallMessages = decision.messages.filter((message) => message.source?.kind === 'dsh-memory-kb');
console.log('recall messages', recallMessages.length, recallMessages[0]?.content?.[0]?.text?.slice(0, 80));
assert.equal(recallMessages.length, 1, 'recall message inserted');
assert.match(recallMessages[0].content[0].text, /记忆召回/);
assert.equal(decision.messages[0], userMessage, 'user message stays first');

// HTTP overview
const route = registered.routes[0];
async function call(url, method = 'GET', body) {
  let status = 0; let payload = '';
  const req = { method, url, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(JSON.stringify(body)); } };
  const res = {
    headersSent: false,
    writeHead(code) { status = code; this.headersSent = true; },
    end(text) { payload = text; },
  };
  await route.handler(req, res);
  return { status, data: JSON.parse(payload) };
}
const overview = await call('/dsh-memory-kb/api/overview');
console.log('overview status', overview.status, 'total', overview.data.stats?.total);
assert.equal(overview.status, 200);
assert.ok(overview.data.stats.total >= 1);

const entries = await call('/dsh-memory-kb/api/entries?q=zeta');
assert.equal(entries.status, 200);
assert.ok(entries.data.items.length >= 1);

const save = await call('/dsh-memory-kb/api/save-memory', 'POST', { title: 'HTTP 保存测试', summary: '通过 API 保存', tags: ['api'] });
assert.equal(save.status, 200);
assert.ok(save.data.item.path && existsSync(save.data.item.path));

const distill = await call('/dsh-memory-kb/api/distill', 'POST', { sessionId: 'sess-apply' });
console.log('distill api', distill.status, distill.data);
assert.equal(distill.status, 200);

const graph = await call('/dsh-memory-kb/api/graph');
assert.equal(graph.status, 200);
assert.ok(graph.data.nodes.length >= 1);

console.log('ALL APPLY TESTS PASSED', root);

