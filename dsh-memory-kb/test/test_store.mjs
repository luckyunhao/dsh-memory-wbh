import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../lib/store.js';

const root = mkdtempSync(join(tmpdir(), 'mkb-store-'));
const memoryDir = join(root, 'memory');
const skillsDir = join(root, 'skills');
const pluginDir = join(root, 'plugin');
mkdirSync(join(memoryDir, 'entries'), { recursive: true });
mkdirSync(join(memoryDir, 'profile'), { recursive: true });
mkdirSync(join(memoryDir, 'news'), { recursive: true });
mkdirSync(join(skillsDir, 'demo-skill'), { recursive: true });
writeFileSync(join(memoryDir, 'INDEX.md'), '# 记忆索引\n\n> 说明\n\n', 'utf8');
writeFileSync(join(memoryDir, 'entries', '2026-10-22-test-entry.md'), `# 测试条目\n\n- 日期：2026-10-22\n- 类型：decision\n- 涉及：D:\\demo\n- 状态：完成\n\n## 结论\n\n这是结论正文，包含关键词 alpha。\n\n## 依据\n\n更多细节 beta。\n`, 'utf8');
writeFileSync(join(skillsDir, 'demo-skill', 'SKILL.md'), `---\nname: demo-skill\ndescription: "演示技能"\nwhenToUse: "演示时"\n---\n\n# demo-skill\n\n步骤一。\n`, { encoding: 'utf8', flag: 'w' });

const store = new Store({
  memoryDir,
  skillsDir,
  pluginDir,
  autoDistill: true,
  autoRecall: true,
}, console);

console.log('items', store.items.map((i) => ({ id: i.id, kind: i.kind, title: i.title, tags: i.tags })));
assert.equal(store.items.length, 2);
const entry = store.items.find((i) => i.kind === 'memory');
assert.equal(entry.title, '测试条目');
assert.match(entry.summary, /alpha/);
assert.ok(entry.tags.includes('decision'));

const search = store.search('alpha');
assert.equal(search.length, 1);
console.log('search alpha ->', search[0].title);

const saved = store.saveMemory({ title: '新记忆标题', summary: '新记忆的结论 gamma', content: '细节', tags: ['demo', 'test'], type: 'fact', source: { kind: 'session', sessionId: 's1', turn: 1 } });
assert.ok(saved.file && existsSync(saved.file), 'memory file exists');
console.log('saved', saved.file);
assert.match(readFileSync(join(memoryDir, 'INDEX.md'), 'utf8'), /新记忆标题/);
assert.equal(store.search('gamma').length, 1);

const dup = store.saveMemory({ title: '新记忆标题', summary: '重复', type: 'fact' });
assert.equal(dup.duplicate, true);

const skill = store.saveSkill({ name: 'new-skill', description: '新技能', whenToUse: '需要时', body: '步骤 A\n步骤 B' });
assert.ok(existsSync(skill.file));
assert.match(readFileSync(skill.file, 'utf8'), /name: new-skill/);

const recalled = store.recall('alpha 结论 关键词', 3);
assert.ok(recalled.length >= 1);
console.log('recall ->', recalled.map((r) => r.item.title));

const graph = store.graph();
assert.ok(graph.nodes.length >= 3);
assert.ok(graph.links.length >= 1);

const stats = store.stats();
console.log('stats', stats.counts, stats.total);
assert.ok(stats.total >= 4);

const deleted = store.deleteItem(saved.item.id);
assert.ok(existsSync(deleted.trashedTo));
assert.equal(existsSync(saved.file), false);

console.log('ALL STORE TESTS PASSED', root);

