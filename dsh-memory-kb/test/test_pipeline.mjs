import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../lib/store.js';
import { distillSession, buildTranscript } from '../lib/distill.js';
import { parseFeed, extractJson, redactSecrets, tokenize, today } from '../lib/util.js';

// ── util ──
const rss = `<?xml version="1.0"?><rss><channel><title>T</title>
<item><title>Hello &amp; World</title><link>https://example.com/a</link><description><![CDATA[<p>Summary <b>here</b></p>]]></description><pubDate>Thu, 22 Oct 2026 06:00:00 GMT</pubDate></item>
<item><title>第二篇</title><link>https://example.com/b</link><description>中文摘要</description></item>
</channel></rss>`;
const feed = parseFeed(rss, 'Demo');
assert.equal(feed.length, 2);
assert.equal(feed[0].title, 'Hello & World');
assert.equal(feed[0].summary, 'Summary here');
assert.equal(feed[1].title, '第二篇');
console.log('feed ok', feed.map((i) => i.title));

const atom = `<feed><entry><title>Atom Entry</title><link href="https://example.com/atom"/><summary>Atom summary</summary><updated>2026-10-22T06:00:00Z</updated></entry></feed>`;
assert.equal(parseFeed(atom)[0].link, 'https://example.com/atom');

const json = extractJson('```json\n{"a":1,"b":{"c":"}"},"d":[1,2]}\n```');
assert.deepEqual(json, { a: 1, b: { c: '}' }, d: [1, 2] });
assert.match(redactSecrets('key sk-abcdefghijklmnopqrstuvwx password=secret123'), /已脱敏/);
assert.ok(tokenize('NetPulse 报表 推送').length >= 3);

// ── distill ──
const root = mkdtempSync(join(tmpdir(), 'mkb-distill-'));
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
mkdirSync(join(memoryDir, 'entries'), { recursive: true });
mkdirSync(skillsDir, { recursive: true });
writeFileSync(join(memoryDir, 'INDEX.md'), '# 记忆索引\n\n', 'utf8');

const store = new Store({ memoryDir, skillsDir, pluginDir }, console);
const modelOutput = JSON.stringify({
  memories: [
    { type: 'decision', title: 'NetPulse 报表改用新的推送口径', summary: '报表从 15 分钟改为 5 分钟，推送走企业微信。', content: '细节', tags: ['NetPulse', '报表'] },
    { type: 'preference', title: '用户喜欢先看版式再看数字', summary: '交付表格前先渲染成图目检。', content: '', tags: ['交付'] },
  ],
  skill: {
    name: 'refresh-netpulse-report',
    description: '刷新 NetPulse 报表并推送企业微信',
    whenToUse: '需要更新报表时',
    body: '## 步骤\n1. 打开平台\n2. 点击刷新\n\n## 验证\n看日志。',
  },
});
const ctx = {
  llm: {
    stream(options) {
      assert.equal(options.provider, 'deepseek-account');
      assert.equal(options.model, 'deepseek-flash');
      assert.ok(options.messages[0].content[0].text.includes('对话转写'));
      return (async function* () {
        yield { type: 'text-delta', text: modelOutput.slice(0, 30) };
        yield { type: 'text-delta', text: modelOutput.slice(30) };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  },
};
store.setSessionCursor('sess-1', { route: { provider: 'deepseek-account', model: 'deepseek-flash' } });
const events = [
  { type: 'turn/start', seq: 1, data: { turn: 1 } },
  { type: 'user/message', seq: 2, data: { role: 'user', content: [{ type: 'text', text: '把 NetPulse 报表改一下，推送企业微信，先给我看版式再看数字。' }], source: { kind: 'user' } }, surfaceOp: 'append' },
  { type: 'assistant/message', seq: 3, data: { message: { role: 'assistant', content: [{ type: 'text', text: '已改好：间隔 5 分钟，推送走企业微信。' }] } }, surfaceOp: 'append' },
  { type: 'turn/end', seq: 4, data: { turn: 1, reason: { kind: 'completed' } } },
];
const transcript = buildTranscript(events);
assert.match(transcript, /用户/);
assert.match(transcript, /助手/);

const result = await distillSession(ctx, store, { id: 'sess-1' }, events, { turn: 1, force: true });
console.log('distill result', result);
assert.equal(result.memories.length, 2);
assert.equal(result.skill.name, 'refresh-netpulse-report');
assert.ok(existsSync(join(skillsDir, 'refresh-netpulse-report', 'SKILL.md')));
const index = readFileSync(join(memoryDir, 'INDEX.md'), 'utf8');
assert.match(index, /NetPulse 报表改用新的推送口径/);
assert.match(index, /用户喜欢先看版式再看数字/);
const skillFile = readFileSync(join(skillsDir, 'refresh-netpulse-report', 'SKILL.md'), 'utf8');
assert.match(skillFile, /name: refresh-netpulse-report/);
assert.match(skillFile, /## 步骤/);

// 第二次同样的对话不应重复写记忆（LLM 仍返回同样标题，store 去重）
store.setSessionCursor('sess-1', { lastSeq: 0, route: { provider: 'deepseek-account', model: 'deepseek-flash' } });
const again = await distillSession(ctx, store, { id: 'sess-1' }, events, { turn: 1, force: true });
console.log('second distill', again.memories.map((m) => m.duplicate));
assert.ok(again.memories.every((m) => m.duplicate));
assert.equal(again.skill.created, false);

const search = store.search('NetPulse 推送');
assert.ok(search.length >= 1);
console.log('search ->', search.map((i) => i.title));
console.log('ALL PIPELINE TESTS PASSED', root, today());

