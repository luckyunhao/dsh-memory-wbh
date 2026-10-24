import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../lib/store.js';
import { fetchNews } from '../lib/news.js';

const root = mkdtempSync(join(tmpdir(), 'mkb-news-'));
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
mkdirSync(join(memoryDir, 'entries'), { recursive: true });
mkdirSync(skillsDir, { recursive: true });
writeFileSync(join(memoryDir, 'INDEX.md'), '# 索引\n', 'utf8');

const store = new Store({
  memoryDir, skillsDir, pluginDir,
  newsEnabled: true,
  newsIntervalHours: 6,
  newsMaxItemsPerSource: 6,
  newsSources: [
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
    { name: '36氪', url: 'https://www.36kr.com/feed', category: 'tech' },
    { name: 'GitHub Trending', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml', category: 'dev' },
  ],
}, console);

const ctx = {
  llm: {
    stream() {
      throw new Error('llm disabled in this test');
    },
  },
};

const result = await fetchNews(ctx, store, { force: true });
console.log('sources', result.sources);
console.log('fetched', result.fetched, 'digest', result.digest?.path);
assert.ok(result.fetched > 0, 'fetched items');
assert.ok(result.digest?.path, 'digest saved');
const digest = readFileSync(result.digest.path, 'utf8');
assert.match(digest, /## 原始条目/);
console.log(digest.slice(0, 600));

const second = await fetchNews(ctx, store, { force: false });
console.log('second (should be not-due)', second.skipped);
assert.equal(second.skipped, 'not-due');

console.log('ALL NEWS TESTS PASSED', root);

