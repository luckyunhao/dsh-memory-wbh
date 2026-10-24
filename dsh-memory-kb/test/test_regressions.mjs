import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFeed } from '../lib/util.js';
import { Store, sanitizeSettings } from '../lib/store.js';
import { buildTranscript } from '../lib/distill.js';
import { streamText } from '../lib/llm.js';
import { getText } from '../lib/http.js';
import { fetchNews } from '../lib/news.js';

const quiet = { info() {}, warn() {}, debug() {} };

// A4：RSS 坏日期不能抛 RangeError，整源不能失败
const feed = parseFeed('<rss><channel><item><title>A</title><pubDate>not-a-date</pubDate><description>x</description></item><item><title>B</title><pubDate>Wed, 22 Oct 2025 10:00:00 GMT</pubDate></item></channel></rss>', 't');
assert.equal(feed.length, 2);
assert.equal(feed[0].publishedAt, '');
assert.match(feed[1].publishedAt, /^2025-10-22T10:00:00\.000Z$/);

// A5：平铺 skills/foo.md 解析为 foo（嵌套 foo/SKILL.md 仍是 foo）
const root = mkdtempSync(join(tmpdir(), 'mkb-reg-'));
// 隔离插件状态，避免读到真实的 ~/.dsh/memory-kb/settings.json。
process.env.DSH_HOME = join(root, 'dsh-home');
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
for (const dir of [join(memoryDir, 'entries'), join(skillsDir, 'nested'), pluginDir]) mkdirSync(dir, { recursive: true });
writeFileSync(join(skillsDir, 'flat.md'), '# flat\n\n平铺技能\n');
writeFileSync(join(skillsDir, 'nested', 'SKILL.md'), '# nested\n\n嵌套技能\n');
const store = new Store({ memoryDir, skillsDir, pluginDir }, quiet);
assert.ok(store.items.some((item) => item.id === 'skill:flat'));
assert.ok(store.items.some((item) => item.id === 'skill:nested'));

// A6：[记忆召回] 不进转写
const transcript = buildTranscript([
  { type: 'user/message', data: { source: { kind: 'dsh-memory-kb' }, content: [{ type: 'text', text: '[记忆召回] hidden' }] } },
  { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'real question' }] } },
]);
assert.equal(transcript, '[用户] real question');

// A7：max-tokens 返回 truncated，真实错误仍然抛
const truncated = await streamText({
  llm: { stream: async function* () { yield { type: 'text-delta', text: 'partial' }; yield { type: 'finish', reason: { kind: 'max-tokens' } }; } },
}, { provider: 'p', model: 'm', prompt: 'x' });
assert.equal(truncated.truncated, true);
assert.equal(truncated.text, 'partial');
await assert.rejects(
  () => streamText({
    llm: { stream: async function* () { yield { type: 'finish', reason: { kind: 'error', failure: { message: 'boom' } } }; } },
  }, { provider: 'p', model: 'm', prompt: 'x' }),
  /boom/,
);

// A9：provider/model 可以显式清空
const cleared = sanitizeSettings({ provider: '', model: '' });
assert.equal(cleared.provider, '');
assert.equal(cleared.model, '');

// A12：游标高频繁写盘改为防抖，flush 后落盘
store.setSessionCursor('s1', { lastSeq: 7 });
const beforeFlush = existsSync(store.stateFile) ? JSON.parse(readFileSync(store.stateFile, 'utf8')) : {};
assert.equal(beforeFlush.sessions?.s1, undefined);
store.flushState();
const afterFlush = JSON.parse(readFileSync(store.stateFile, 'utf8'));
assert.equal(afterFlush.sessions.s1.lastSeq, 7);

// A8：全部新闻源失败时只记 lastAttempt，不更新 lastNews.at
store.settings.newsSources = [{ name: 'dead', url: 'http://127.0.0.1:1/feed', category: 'tech' }];
store.state.lastNews = { at: '2026-01-01T00:00:00.000Z', count: 3 };
await fetchNews({ llm: { stream: async function* () {} } }, store, { force: true });
assert.equal(store.state.lastNews.at, '2026-01-01T00:00:00.000Z');
assert.ok(store.state.lastNews.lastAttempt);
assert.equal(store.state.lastNews.error, 'no items');

// A21：超过 maxBytes 必须 reject，且不会挂起
const server = http.createServer((req, res) => { res.writeHead(200); res.end('x'.repeat(5000)); });
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
await assert.rejects(() => getText(`http://127.0.0.1:${port}/`, { maxBytes: 1024 }), /exceeds 1024 bytes/);
server.close();

console.log('ALL REGRESSION TESTS PASSED', root);

