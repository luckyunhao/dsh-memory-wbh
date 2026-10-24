import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import {
  ensureDir,
  isKebabCase,
  nowIso,
  readJson,
  readText,
  redactSecrets,
  scoreTokens,
  shortHash,
  slugify,
  stripTags,
  today,
  tokenize,
  truncate,
  writeAtomic,
  writeJson,
} from './util.js';

export const DEFAULT_NEWS_SOURCES = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
  { name: '36氪', url: 'https://www.36kr.com/feed', category: 'tech' },
  { name: '少数派', url: 'https://sspai.com/feed', category: 'tech' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', category: 'tech' },
  { name: 'GitHub Trending', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml', category: 'dev' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'ai' },
];

export const DEFAULT_SETTINGS = {
  autoDistill: true,
  autoRecall: true,
  recallLimit: 3,
  maxMemoriesPerTurn: 3,
  newsEnabled: true,
  newsIntervalHours: 6,
  newsMaxItemsPerSource: 15,
  newsSources: DEFAULT_NEWS_SOURCES,
  provider: '',
  model: '',
  memoryDir: '',
  skillsDir: '',
  pluginDir: '',
  mediaDir: '',
  // 成本估算：单价单位是「元 / 百万 token」；日预算为 0 表示不提醒。
  dailyBudget: 0,
  priceCacheRead: 0.2,
  priceInput: 2,
  priceOutput: 3,
};

const VALID_TYPES = new Set(['fact', 'preference', 'decision', 'project', 'reference', 'knowledge']);

function defaultDshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

function hasMemoryShape(dir) {
  return existsSync(join(dir, 'INDEX.md')) || existsSync(join(dir, 'entries'));
}

/** 选择记忆根：显式配置 → 环境 → 桌面安装目录 → DSH_HOME。 */
export function resolveMemoryDir(config = {}, dshHome = defaultDshHome()) {
  if (config.memoryDir) return config.memoryDir;
  if (process.env.DSH_MEMORY_DIR) return process.env.DSH_MEMORY_DIR;
  const candidates = [
    join(process.cwd(), 'memory'),
    'D:/DeepSeekHarness/memory',
    join(dshHome, 'memory'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && hasMemoryShape(candidate)) return candidate;
  }
  return join(dshHome, 'memory');
}

export class Store {
  constructor(config = {}, logger = console) {
    this.logger = logger;
    this.dshHome = defaultDshHome();
    this.settingsFile = join(this.dshHome, 'memory-kb', 'settings.json');
    this.savedSettings = readJson(this.settingsFile, {});
    this.settings = { ...DEFAULT_SETTINGS, ...sanitizeSettings(config), ...sanitizeSettings(this.savedSettings) };
    // 保存的设置优先：用户在面板里改过目录后，配置文件里的默认探测不应把它盖掉。
    this.memoryDir = this.settings.memoryDir || resolveMemoryDir(config, this.dshHome);
    this.skillsDir = this.settings.skillsDir || join(this.dshHome, 'skills');
    this.pluginDir = this.settings.pluginDir || join(this.dshHome, 'memory-kb');
    this.mediaDir = this.settings.mediaDir || join(this.pluginDir, 'media');
    this.stateFile = join(this.pluginDir, 'state.json');
    this.state = readJson(this.stateFile, {});
    if (!this.state.sessions || typeof this.state.sessions !== 'object') this.state.sessions = {};
    if (!this.state.goals || typeof this.state.goals !== 'object') this.state.goals = {};
    /** setSessionCursor 等高频写入的防抖句柄。 */
    this.saveTimer = null;
    this.items = [];
    this.byId = new Map();
    this.lastRefresh = 0;
    this.refresh();
  }

  // ── 设置与状态 ──────────────────────────────────────────────────────────────

  getSettings() {
    return {
      ...this.settings,
      memoryDir: this.memoryDir,
      skillsDir: this.skillsDir,
      pluginDir: this.pluginDir,
      mediaDir: this.mediaDir,
      resolvedNewsSources: this.settings.newsSources,
    };
  }

  updateSettings(patch = {}) {
    const next = sanitizeSettings(patch);
    this.settings = { ...this.settings, ...next };
    if (next.memoryDir) this.memoryDir = next.memoryDir;
    if (next.skillsDir) this.skillsDir = next.skillsDir;
    if (next.pluginDir) {
      this.pluginDir = next.pluginDir;
      this.stateFile = join(this.pluginDir, 'state.json');
      this.state = readJson(this.stateFile, this.state ?? {});
      if (!this.state.sessions || typeof this.state.sessions !== 'object') this.state.sessions = {};
    }
    if (next.mediaDir) this.mediaDir = next.mediaDir;
    else if (next.pluginDir && !this.settings.mediaDir) this.mediaDir = join(this.pluginDir, 'media');
    // 设置文件固定在 DSH_HOME/memory-kb，随 pluginDir 变化没有意义。
    writeJson(this.settingsFile, this.settings);
    this.refresh();
    return this.getSettings();
  }

  getState() {
    return this.state;
  }

  saveState() {
    writeJson(this.stateFile, this.state);
  }

  /** 高频状态（会话游标等）延迟批量落盘；卸载时用 flushState 收尾。 */
  scheduleSave(delayMs = 3000) {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveState();
    }, Math.max(500, Number(delayMs) || 3000));
    this.saveTimer.unref?.();
  }

  flushState() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveState();
  }

  getSessionCursor(sessionId) {
    return this.state.sessions[sessionId] ?? null;
  }

  setSessionCursor(sessionId, cursor) {
    this.state.sessions[sessionId] = { ...cursor, updatedAt: nowIso() };
    // 只保留最近 500 个会话游标，避免无限增长。
    const entries = Object.entries(this.state.sessions);
    if (entries.length > 500) {
      entries.sort((a, b) => Date.parse(b[1].updatedAt ?? 0) - Date.parse(a[1].updatedAt ?? 0));
      this.state.sessions = Object.fromEntries(entries.slice(0, 500));
    }
    this.scheduleSave();
  }

  // ── 扫描与解析 ──────────────────────────────────────────────────────────────

  refresh() {
    const items = [];
    const seen = new Set();
    const add = (item) => {
      if (!item || seen.has(item.id)) return;
      seen.add(item.id);
      items.push(item);
    };

    for (const dir of [join(this.memoryDir, 'entries'), join(this.memoryDir, 'knowledge')]) {
      for (const file of listMarkdown(dir)) {
        const item = parseMemoryFile(file, this.memoryDir, dir === join(this.memoryDir, 'knowledge') ? 'knowledge' : 'memory');
        if (item) add(item);
      }
    }
    for (const file of listMarkdown(join(this.memoryDir, 'news'))) {
      const item = parseNewsFile(file, this.memoryDir);
      if (item) add(item);
    }
    for (const file of listMarkdown(join(this.memoryDir, 'profile'))) {
      const item = parseMemoryFile(file, this.memoryDir, 'profile');
      if (item) add(item);
    }
    for (const dir of [this.skillsDir]) {
      for (const file of listSkillFiles(dir)) {
        const item = parseSkillFile(file);
        if (item) add(item);
      }
    }

    items.sort((a, b) => Date.parse(b.createdAt ?? 0) - Date.parse(a.createdAt ?? 0));
    this.items = items;
    this.byId = new Map(items.map((item) => [item.id, item]));
    this.lastRefresh = Date.now();
    return items;
  }

  maybeRefresh(maxAgeMs = 15000) {
    if (Date.now() - this.lastRefresh > maxAgeMs) this.refresh();
  }

  search(query, { kind = '', limit = 50 } = {}) {
    this.maybeRefresh();
    const phrase = String(query ?? '').trim().toLowerCase();
    const tokens = tokenize(phrase);
    let list = this.items;
    if (kind) list = list.filter((item) => item.kind === kind || item.type === kind);
    if (!phrase) return list.slice(0, limit);
    const scored = [];
    for (const item of list) {
      const score = scoreTokens(item, tokens, phrase);
      if (score > 0) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score || Date.parse(b.item.createdAt ?? 0) - Date.parse(a.item.createdAt ?? 0));
    return scored.slice(0, limit).map(({ item }) => item);
  }

  /** 自动召回：只返回分数过线的记忆/知识/偏好，技能和新闻不参与。 */
  recall(query, limit = 3) {
    this.maybeRefresh();
    const phrase = String(query ?? '').trim().toLowerCase();
    const tokens = tokenize(phrase);
    if (tokens.length === 0) return [];
    const scored = [];
    for (const item of this.items) {
      if (!['memory', 'knowledge', 'profile'].includes(item.kind)) continue;
      const score = scoreTokens(item, tokens, phrase);
      if (score >= 8) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(10, limit)));
  }

  get(id) {
    this.maybeRefresh();
    return this.byId.get(id) ?? null;
  }

  // ── 记忆审核 ────────────────────────────────────────────────────────────────

  /** 待人工复核的记忆/知识/偏好条目。 */
  reviewQueue(limit = 100) {
    this.maybeRefresh();
    return this.items
      .filter((item) => isMemoryLike(item) && isPendingReview(item))
      .slice(0, Math.max(1, Math.min(300, Number(limit) || 100)));
  }

  /** 只改状态行：确认一条记忆时不动正文。 */
  setReviewStatus(id, status) {
    this.maybeRefresh();
    const item = this.byId.get(id);
    if (!isMemoryLike(item) || !item.path || !existsSync(item.path)) throw new Error('memory item not found on disk');
    const lines = readText(item.path, '').split(/\r?\n/);
    const line = `- 状态：${status}`;
    const index = lines.findIndex((value) => /^-\s*状态\s*[：:]/.test(value.trim()));
    if (index !== -1) {
      lines[index] = line;
    } else {
      const anchor = lines.findIndex((value) => /^-\s*来源\s*[：:]/.test(value.trim()));
      lines.splice(anchor === -1 ? Math.min(2, lines.length) : anchor + 1, 0, line);
    }
    writeAtomic(item.path, lines.join('\n'));
    this.refresh();
    return { item: this.byId.get(id) ?? item, file: item.path };
  }

  /**
   * 编辑标题/结论/标签。正文其它小节原样保留，避免把「## 依据」重复写两遍。
   * status 省略时保持原状态。
   */
  updateMemory({ id, title, summary, tags, status } = {}) {
    this.maybeRefresh();
    const item = this.byId.get(id);
    if (!isMemoryLike(item) || !item.path || !existsSync(item.path)) throw new Error('memory item not found on disk');
    const lines = readText(item.path, '').split(/\r?\n/);
    const nextTitle = title === undefined
      ? item.title
      : truncate(redactSecrets(String(title)).replace(/\s+/g, ' ').trim(), 120);
    if (!nextTitle) throw new Error('memory title is empty');

    const headingIndex = lines.findIndex((line) => /^#\s+/.test(line.trim()));
    if (headingIndex === -1) lines.unshift(`# ${nextTitle}`, '');
    else lines[headingIndex] = `# ${nextTitle}`;

    const metaIndex = (label) => lines.findIndex((line) => new RegExp(`^-\\s*${label}\\s*[：:]`).test(line.trim()));
    const insertMeta = (line, anchorLabels = ['状态', '来源', '类型', '日期']) => {
      let anchor = -1;
      for (const label of anchorLabels) {
        const index = metaIndex(label);
        if (index !== -1) { anchor = index; break; }
      }
      lines.splice(anchor === -1 ? Math.min(2, lines.length) : anchor + 1, 0, line);
    };

    if (status !== undefined) {
      const line = `- 状态：${status}`;
      const index = metaIndex('状态');
      if (index === -1) insertMeta(line);
      else lines[index] = line;
    }
    if (tags !== undefined) {
      const nextTags = normalizeTags(tags);
      const index = metaIndex('标签');
      if (nextTags.length === 0) {
        if (index !== -1) lines.splice(index, 1);
      } else if (index === -1) {
        insertMeta(`- 标签：${nextTags.join('、')}`, ['状态', '来源', '类型', '日期']);
      } else {
        lines[index] = `- 标签：${nextTags.join('、')}`;
      }
    }
    if (summary !== undefined) {
      const safeSummary = truncate(redactSecrets(String(summary)).trim(), 1200);
      const start = lines.findIndex((line) => /^##\s*结论\s*$/.test(line.trim()));
      if (start !== -1) {
        let end = start + 1;
        while (end < lines.length && !/^#{1,6}\s+/.test(lines[end].trim())) end += 1;
        lines.splice(start + 1, Math.max(0, end - start - 1), '', safeSummary || '（空）', '');
      } else {
        const anchor = Math.max(metaIndex('日期'), metaIndex('类型'), metaIndex('来源'), metaIndex('状态'), metaIndex('标签'));
        lines.splice(anchor === -1 ? 0 : anchor + 1, 0, '', '## 结论', '', safeSummary || '（空）', '');
      }
    }

    writeAtomic(item.path, lines.join('\n'));
    const rel = toPosix(relative(this.memoryDir, item.path));
    this.updateIndexLine(rel, nextTitle, summary === undefined ? item.summary : String(summary));
    this.refresh();
    return { item: this.byId.get(item.id) ?? item, file: item.path };
  }

  /** 更新 INDEX.md 中某条目的标题/结论，找不到就插到最上面。 */
  updateIndexLine(relPath, title, summary) {
    const file = join(this.memoryDir, 'INDEX.md');
    let text = readText(file, '');
    if (!text) return;
    const lines = text.split(/\r?\n/);
    const line = `- [${today()} ${title}](${relPath}) — ${truncate(String(summary ?? '').replace(/\s+/g, ' '), 160)}`;
    const index = lines.findIndex((value) => value.includes(`](${relPath})`));
    if (index !== -1) {
      lines[index] = line;
    } else {
      const at = lines.findIndex((value) => /^-\s+\[/.test(value.trim()));
      lines.splice(at === -1 ? lines.length : at, 0, line);
    }
    writeAtomic(file, lines.join('\n'));
  }

  /** 从 INDEX.md 删除一条链接（删除/合并后调用）。 */
  removeIndexLine(relPath) {
    const file = join(this.memoryDir, 'INDEX.md');
    const text = readText(file, '');
    if (!text) return;
    const lines = text.split(/\r?\n/);
    const next = lines.filter((line) => !line.includes(`](${relPath})`));
    if (next.length !== lines.length) writeAtomic(file, next.join('\n'));
  }

  /** 近似重复：标题+结论的 token Jaccard ≥ 阈值，或规范化标题相同。 */
  duplicateGroups(threshold = 0.55, limit = 20) {
    this.maybeRefresh();
    const items = this.items.filter(isMemoryLike).slice(0, 600);
    const tokens = items.map((item) => new Set(tokenize(`${item.title} ${item.summary}`).slice(0, 80)));
    const parent = items.map((_, index) => index);
    const find = (value) => {
      let current = value;
      while (parent[current] !== current) {
        parent[current] = parent[parent[current]];
        current = parent[current];
      }
      return current;
    };
    const union = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };
    const scores = new Map();
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (normalizeTitle(items[i].title) && normalizeTitle(items[i].title) === normalizeTitle(items[j].title)) {
          union(i, j);
          scores.set(`${i}:${j}`, 1);
          continue;
        }
        const a = tokens[i];
        const b = tokens[j];
        if (a.size === 0 || b.size === 0) continue;
        const [small, large] = a.size <= b.size ? [a, b] : [b, a];
        let intersection = 0;
        for (const token of small) if (large.has(token)) intersection += 1;
        const similarity = intersection / (a.size + b.size - intersection);
        if (similarity >= threshold) {
          union(i, j);
          scores.set(`${i}:${j}`, similarity);
        }
      }
    }
    const groups = new Map();
    for (let i = 0; i < items.length; i += 1) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    const out = [];
    for (const indices of groups.values()) {
      if (indices.length < 2) continue;
      let score = 0;
      for (let x = 0; x < indices.length; x += 1) {
        for (let y = x + 1; y < indices.length; y += 1) {
          score = Math.max(score, scores.get(`${indices[x]}:${indices[y]}`) ?? 0);
        }
      }
      out.push({ score, items: indices.map((index) => items[index]) });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, Math.max(1, Math.min(50, Number(limit) || 20)));
  }

  /** 合并重复条目：保留 keep，其余移入回收站，并在保留条目里追加合并记录。 */
  mergeMemories({ keepId, dropIds = [] } = {}) {
    this.maybeRefresh();
    const keep = this.byId.get(keepId);
    if (!isMemoryLike(keep) || !keep.path || !existsSync(keep.path)) throw new Error('keep item not found');
    const unique = [...new Set(Array.isArray(dropIds) ? dropIds.map(String) : [])];
    const drops = unique
      .map((id) => this.byId.get(id))
      .filter((item) => isMemoryLike(item) && item.id !== keep.id);
    if (drops.length === 0) return { item: keep, merged: 0, errors: [] };
    const section = [
      '## 合并记录',
      '',
      ...drops.map((item) => `- 《${item.title}》：${truncate(item.summary || item.content, 300)}（原文件 ${item.path}）`),
      '',
    ].join('\n');
    writeAtomic(keep.path, `${readText(keep.path, '').trimEnd()}\n\n${section}\n`);
    const errors = [];
    for (const drop of drops) {
      try {
        this.trashItem(drop);
        this.removeIndexLine(toPosix(relative(this.memoryDir, drop.path)));
      } catch (error) {
        errors.push(`${drop.title}: ${error.message}`);
      }
    }
    this.setReviewStatus(keep.id, `已人工确认（${today()}）`);
    return { item: this.byId.get(keep.id) ?? keep, merged: drops.length - errors.length, errors };
  }

  stats() {
    this.maybeRefresh();
    const counts = {};
    const tags = new Map();
    for (const item of this.items) {
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
      for (const tag of item.tags ?? []) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    const lastDistill = this.state.lastDistill ?? null;
    const lastNews = this.state.lastNews ?? null;
    return {
      counts,
      total: this.items.length,
      tags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([name, count]) => ({ name, count })),
      lastDistill,
      lastNews,
      memoryDir: this.memoryDir,
      skillsDir: this.skillsDir,
      pluginDir: this.pluginDir,
      newsSources: this.settings.newsSources.length,
      autoDistill: this.settings.autoDistill,
      autoRecall: this.settings.autoRecall,
      pendingReview: this.items.filter((item) => isMemoryLike(item) && isPendingReview(item)).length,
    };
  }

  // ── 写入 ────────────────────────────────────────────────────────────────────

  saveMemory({ type = 'fact', title, summary = '', content = '', tags = [], source = {} } = {}) {
    const safeType = VALID_TYPES.has(type) ? type : 'fact';
    const safeTitle = truncate(redactSecrets(title || summary || '未命名记忆').replace(/\s+/g, ' ').trim(), 120);
    const safeSummary = truncate(redactSecrets(summary), 1200);
    const safeContent = truncate(redactSecrets(content), 20000);
    const safeTags = normalizeTags(tags);
    if (!safeTitle) throw new Error('memory title is empty');

    const existing = this.items.find((item) => item.kind !== 'skill' && item.kind !== 'news'
      && normalizeTitle(item.title) === normalizeTitle(safeTitle));
    if (existing) {
      return { item: existing, duplicate: true };
    }

    const date = today();
    const dir = join(this.memoryDir, 'entries');
    const slug = slugify(safeTitle);
    let file = join(dir, `${date}-${slug}.md`);
    if (existsSync(file)) file = join(dir, `${date}-${slug}-${shortHash(safeTitle, 6)}.md`);

    const lines = [
      `# ${safeTitle}`,
      '',
      `- 日期：${date}`,
      `- 类型：${safeType}`,
      `- 来源：${redactSecrets(sourceLabel(source))}`,
      `- 状态：自动沉淀（待人工复核）`,
    ];
    if (safeTags.length > 0) lines.push(`- 标签：${safeTags.join('、')}`);
    lines.push('', '## 结论', '', safeSummary || safeContent.slice(0, 500), '');
    if (safeContent && safeContent !== safeSummary) {
      // 项目卡等结构化记忆自带二级标题（项目目标/关键决策/下一步行动…），原样保留。
      if (/^##\s+/m.test(safeContent)) lines.push('', safeContent, '');
      else lines.push('## 依据', '', safeContent, '');
    }
    lines.push('## 备注', '', '本条目由 dsh-memory-kb 自动生成；请在使用前核对事实与口径。', '');
    writeAtomic(file, lines.join('\n'));
    this.prependIndex(safeTitle, relative(this.memoryDir, file).replace(/\\/g, '/'), safeSummary || safeContent);

    this.refresh();
    return { item: this.byId.get(`mem:${relative(this.memoryDir, file).replace(/\\/g, '/')}`) ?? null, duplicate: false, file };
  }

  prependIndex(title, relPath, conclusion) {
    const file = join(this.memoryDir, 'INDEX.md');
    let text = readText(file, '# 记忆索引\n\n> 新条目加到本列表最上面。\n\n');
    if (text.includes(`](${relPath})`)) return;
    const line = `- [${today()} ${title}](${relPath}) — ${truncate(String(conclusion ?? '').replace(/\s+/g, ' '), 160)}`;
    const lines = text.split(/\r?\n/);
    let at = lines.findIndex((item) => /^-\s+\[/.test(item.trim()));
    if (at === -1) {
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push('', line, '');
      at = lines.length - 2;
    } else {
      lines.splice(at, 0, line);
    }
    writeAtomic(file, lines.join('\n'));
  }

  saveSkill({ name, description, whenToUse = '', body = '', source = {} } = {}) {
    const safeName = String(name ?? '').trim().toLowerCase();
    if (!isKebabCase(safeName)) throw new Error(`invalid skill name: ${name}`);
    const safeDescription = truncate(redactSecrets(description).replace(/\s+/g, ' ').trim(), 300);
    if (!safeDescription) throw new Error('skill description is empty');
    const safeBody = truncate(redactSecrets(body), 30000);
    const safeWhen = truncate(redactSecrets(whenToUse).replace(/\s+/g, ' ').trim(), 300);

    const dir = join(this.skillsDir, safeName);
    const file = join(dir, 'SKILL.md');
    const exists = existsSync(file);
    const front = [
      '---',
      `name: ${safeName}`,
      `description: ${yamlString(safeDescription)}`,
      ...(safeWhen ? [`whenToUse: ${yamlString(safeWhen)}`] : []),
      '---',
      '',
      `# ${safeName}`,
      '',
      safeBody || safeDescription,
      '',
      '## 来源',
      '',
      `- 生成方式：${redactSecrets(sourceLabel(source))}`,
      `- 生成日期：${today()}`,
      '- 由 dsh-memory-kb 从对话中沉淀；使用前请核对步骤与命令。',
      '',
    ].join('\n');
    ensureDir(dir);
    writeAtomic(file, front);
    this.refresh();
    return { file, created: !exists, item: this.byId.get(`skill:${safeName}`) ?? null };
  }

  saveNewsItems(items = [], meta = {}) {
    writeJson(join(this.pluginDir, 'news-items.json'), {
      at: nowIso(),
      count: items.length,
      items: items.slice(0, 60),
      ...meta,
    });
  }

  readNewsItems() {
    return readJson(join(this.pluginDir, 'news-items.json'), { at: null, count: 0, items: [] });
  }

  saveNewsDigest({ title, body, items = [], sourceName = 'dsh-memory-kb' } = {}) {
    const safeTitle = truncate(redactSecrets(title || `新闻简报 ${today()}`), 160);
    const dir = join(this.memoryDir, 'news');
    const file = join(dir, `${today()}-${shortHash(safeTitle + items.length, 6)}.md`);
    const lines = [
      `# ${safeTitle}`,
      '',
      `- 日期：${today()}`,
      `- 来源：${sourceName}`,
      `- 条目数：${items.length}`,
      '',
      redactSecrets(body || ''),
      '',
    ];
    if (items.length > 0) {
      lines.push('## 原始条目', '');
      for (const item of items) {
        lines.push(`- [${item.title}](${item.link || '#'}) — ${item.source || ''} ${item.publishedAt ? item.publishedAt.slice(0, 10) : ''}`.trim());
      }
      lines.push('');
    }
    writeAtomic(file, lines.join('\n'));
    this.refresh();
    this.state.lastNews = { at: nowIso(), file, count: items.length };
    this.saveState();
    return { file, item: this.byId.get(`news:${relative(this.memoryDir, file).replace(/\\/g, '/')}`) ?? null };
  }

  /** 复制到 .trash 后删除原文件；调用方负责 refresh。 */
  trashItem(item) {
    const trash = join(this.pluginDir, '.trash');
    ensureDir(trash);
    const target = join(trash, `${Date.now()}-${basename(item.path)}`);
    // 先复制到回收站（跨盘 rename 会失败），再删除原文件；
    // 原文件删除失败时条目会再次出现，必须让调用方知道，不能静默吞掉。
    writeAtomic(target, readText(item.path));
    try {
      unlinkSync(item.path);
    } catch (error) {
      throw new Error(`已复制到回收站 ${target}，但删除原文件失败：${error.message}`);
    }
    return target;
  }

  deleteItem(id) {
    this.maybeRefresh();
    const item = this.byId.get(id);
    if (!item?.path || !existsSync(item.path)) throw new Error('item not found on disk');
    let trashedTo;
    try {
      trashedTo = this.trashItem(item);
    } catch (error) {
      this.refresh();
      throw error;
    }
    // 记忆条目同时从 INDEX.md 移除，否则列表里会留下死链接。
    if (isMemoryLike(item)) this.removeIndexLine(toPosix(relative(this.memoryDir, item.path)));
    this.refresh();
    return { trashedTo };
  }

  graph(limit = 160) {
    this.maybeRefresh();
    const items = this.items.slice(0, limit);
    const tagCounts = new Map();
    for (const item of items) for (const tag of item.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name]) => name);
    const nodes = [];
    const links = [];
    const push = (id, label, kind, extra = {}) => nodes.push({ id, label, kind, ...extra });
    for (const item of items) {
      push(item.id, item.title, item.kind, { type: item.type, createdAt: item.createdAt, path: item.path });
    }
    for (const tag of topTags) push(`tag:${tag}`, `#${tag}`, 'tag');
    for (const item of items) {
      for (const tag of item.tags ?? []) {
        if (topTags.includes(tag)) links.push({ source: item.id, target: `tag:${tag}` });
      }
      if (item.kind === 'skill') {
        const memory = items.find((other) => other.kind === 'memory' && sharesTag(other, item));
        if (memory) links.push({ source: memory.id, target: item.id, kind: 'derived' });
      }
    }
    return { nodes, links, total: this.items.length, truncated: this.items.length > items.length };
  }
}

function isMemoryLike(item) {
  return Boolean(item && ['memory', 'knowledge', 'profile'].includes(item.kind));
}

function isPendingReview(item) {
  const status = String(item?.meta?.['状态'] ?? '');
  if (!status) return true;
  return /待人工复核|待复核|pending/i.test(status);
}

function sharesTag(a, b) {
  const set = new Set(a.tags ?? []);
  return (b.tags ?? []).some((tag) => set.has(tag));
}

function sanitizeSettings(input = {}) {
  const out = {};
  const pickBool = (key) => { if (typeof input[key] === 'boolean') out[key] = input[key]; };
  const pickNum = (key, min, max) => {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) out[key] = Math.min(max, Math.max(min, input[key]));
  };
  pickBool('autoDistill');
  pickBool('autoRecall');
  pickBool('newsEnabled');
  pickNum('recallLimit', 0, 10);
  pickNum('maxMemoriesPerTurn', 0, 8);
  pickNum('newsIntervalHours', 1, 168);
  pickNum('newsMaxItemsPerSource', 1, 60);
  pickNum('dailyBudget', 0, 100000);
  pickNum('priceCacheRead', 0, 1000);
  pickNum('priceInput', 0, 1000);
  pickNum('priceOutput', 0, 1000);
  for (const key of ['provider', 'model']) {
    // 空字符串表示「跟随当前会话」：必须允许显式清空，
    // 否则 UI 删空后旧值仍会生效，永远回不到自动路由。
    if (typeof input[key] === 'string') out[key] = input[key].trim();
  }
  for (const key of ['memoryDir', 'skillsDir', 'pluginDir', 'mediaDir']) {
    if (typeof input[key] === 'string' && input[key].trim()) out[key] = input[key].trim();
  }
  if (Array.isArray(input.newsSources)) {
    out.newsSources = input.newsSources
      .filter((source) => source && typeof source.url === 'string' && /^https?:\/\//.test(source.url))
      .slice(0, 20)
      .map((source) => ({
        name: truncate(String(source.name || hostOf(source.url)), 60),
        url: source.url.trim(),
        category: truncate(String(source.category || 'tech'), 24),
      }));
    if (out.newsSources.length === 0) out.newsSources = DEFAULT_NEWS_SOURCES;
  }
  return out;
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return 'feed'; }
}

function listMarkdown(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .map((name) => join(dir, name))
      .filter((file) => {
        try { return statSync(file).isFile(); } catch { return false; }
      });
  } catch {
    return [];
  }
}

function listSkillFiles(root) {
  const out = [];
  try {
    for (const name of readdirSync(root)) {
      const full = join(root, name);
      try {
        if (statSync(full).isDirectory()) {
          const file = join(full, 'SKILL.md');
          if (statSync(file).isFile()) out.push(file);
        } else if (name.toLowerCase().endsWith('.md')) {
          // skill-filesystem 也接受平铺 <name>.md。
          out.push(full);
        }
      } catch {
        // 忽略不可读条目。
      }
    }
  } catch {
    // 根不存在。
  }
  return out;
}

function parseMemoryFile(file, root, kind) {
  const raw = readText(file, '');
  if (!raw.trim()) return null;
  const rel = toPosix(relative(root, file));
  const lines = raw.split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line.trim()));
  const title = heading ? heading.replace(/^#\s+/, '').trim() : basename(file, '.md');
  const meta = {};
  for (const line of lines) {
    const match = /^-\s*([^：:]+)[：:]\s*(.*)$/.exec(line.trim());
    if (match) meta[match[1].trim()] = match[2].trim();
  }
  const body = lines
    .filter((line) => !/^#\s+/.test(line.trim()))
    .filter((line) => !/^-\s*(日期|类型|来源|状态|标签)[：:]/.test(line.trim()))
    .join('\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n{3,}/g, '\n\n');
  const summary = sectionText(body, ['结论', '做了什么', '摘要']) || firstParagraph(body);
  const tags = normalizeTags([
    ...(meta['标签'] ? meta['标签'].split(/[、,，\s]+/) : []),
    ...(meta['类型'] ? [meta['类型']] : []),
  ]);
  const created = meta['日期'] ? new Date(meta['日期']) : statDate(file);
  return {
    id: `${kind === 'profile' ? 'profile' : 'mem'}:${rel}`,
    kind,
    type: meta['类型'] || (kind === 'profile' ? 'reference' : 'fact'),
    title,
    summary: truncate(stripTags(summary), 800),
    content: truncate(body, 20000),
    tags,
    createdAt: Number.isFinite(created.getTime()) ? created.toISOString() : nowIso(),
    updatedAt: statDate(file).toISOString(),
    path: file,
    meta,
  };
}

function parseNewsFile(file, root) {
  const raw = readText(file, '');
  if (!raw.trim()) return null;
  const lines = raw.split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line.trim()));
  const title = heading ? heading.replace(/^#\s+/, '').trim() : basename(file, '.md');
  const body = lines.filter((line) => !/^#\s+/.test(line.trim())).join('\n').trim();
  const meta = {};
  for (const line of lines) {
    const match = /^-\s*([^：:]+)[：:]\s*(.*)$/.exec(line.trim());
    if (match) meta[match[1].trim()] = match[2].trim();
  }
  const created = meta['日期'] ? new Date(meta['日期']) : statDate(file);
  return {
    id: `news:${toPosix(relative(root, file))}`,
    kind: 'news',
    type: 'news',
    title,
    summary: truncate(stripTags(sectionText(body, ['要点', '摘要']) || firstParagraph(body)), 800),
    content: truncate(body, 20000),
    tags: normalizeTags([...String(meta['来源'] ?? '').split(/[、,，\s]+/), '新闻']),
    createdAt: Number.isFinite(created.getTime()) ? created.toISOString() : nowIso(),
    updatedAt: statDate(file).toISOString(),
    path: file,
    meta,
  };
}

function parseSkillFile(file) {
  const raw = readText(file, '');
  if (!raw.trim()) return null;
  const base = basename(file);
  // 嵌套技能是 <name>/SKILL.md；平铺技能是 <name>.md。
  // 按目录名判断会把平铺文件解析成目录名（skills/foo.md → "skills"）。
  const name = base.toLowerCase() === 'skill.md' ? basename(dirname(file)) : basename(file, '.md');
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const meta = {};
  if (front) {
    for (const line of front[1].split(/\r?\n/)) {
      const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
      if (match) meta[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
  const description = meta.description || firstParagraph(body) || name;
  return {
    id: `skill:${name}`,
    kind: 'skill',
    type: 'skill',
    title: name,
    summary: truncate(description, 800),
    content: truncate(body, 20000),
    tags: normalizeTags(['skill', ...(meta.whenToUse ? [meta.whenToUse] : [])]),
    createdAt: statDate(file).toISOString(),
    updatedAt: statDate(file).toISOString(),
    path: file,
    meta,
  };
}

function statDate(file) {
  try { return statSync(file).mtime; } catch { return new Date(); }
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

function sectionText(body, names) {
  const lines = String(body ?? '').split(/\r?\n/);
  for (const name of names) {
    const start = lines.findIndex((line) => new RegExp(`^#{2,4}\\s*${name}\\s*$`).test(line.trim()));
    if (start === -1) continue;
    const collected = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      if (/^#{1,6}\s+/.test(lines[index].trim())) break;
      collected.push(lines[index]);
    }
    const text = collected.join('\n').trim();
    if (text) return text;
  }
  return '';
}

function firstParagraph(body) {
  return String(body ?? '')
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#{1,6}\s*/gm, '').trim())
    .find((part) => part.length > 0) ?? '';
}

function normalizeTitle(value) {
  return String(value ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function normalizeTags(tags) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(tags) ? tags : [tags]) {
    for (const tag of String(raw ?? '').split(/[、,，#\s]+/)) {
      const clean = tag.replace(/[^\p{L}\p{N}_-]/gu, '').trim().slice(0, 32);
      if (!clean || seen.has(clean.toLowerCase())) continue;
      seen.add(clean.toLowerCase());
      out.push(clean);
    }
  }
  return out.slice(0, 12);
}

function sourceLabel(source = {}) {
  if (source.kind === 'session' && source.sessionId) {
    return `DSH 会话 ${source.sessionId}${source.turn ? ` 第 ${source.turn} 轮` : ''}`;
  }
  if (source.kind === 'manual') return '手动保存';
  if (source.kind === 'news') return `新闻抓取 ${source.url ?? ''}`.trim();
  return source.kind || 'dsh-memory-kb';
}

function yamlString(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '\\"');
  return `"${text}"`;
}

export { sanitizeSettings, sourceLabel };
