import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// ── 时间与标识 ────────────────────────────────────────────────────────────────

export function today(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function stamp(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${today(date)}-${h}${mi}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function shortHash(text, length = 10) {
  return createHash('sha1').update(String(text)).digest('hex').slice(0, length);
}

/** 中文标题 → 可读英文/拼音无关的稳定 slug；失败时用哈希。 */
export function slugify(text) {
  const ascii = String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return ascii || `entry-${shortHash(text, 8)}`;
}

export function isKebabCase(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64;
}

// ── 文件 ──────────────────────────────────────────────────────────────────────

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function readText(file, fallback = '') {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** 原子写：同目录临时文件 → rename。跨盘/权限失败时抛给调用方。 */
export function writeAtomic(file, content) {
  ensureDir(dirname(file));
  const tmp = join(dirname(file), `.${process.pid}-${shortHash(file + content, 8)}.tmp`);
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, file);
}

export function writeJson(file, value) {
  writeAtomic(file, JSON.stringify(value, null, 2) + '\n');
}

// ── 文本 ──────────────────────────────────────────────────────────────────────

export function truncate(text, max) {
  const value = String(text ?? '');
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** 从模型输出里取 JSON：先去代码围栏，再按字符串感知的括号配对。 */
export function extractJson(text) {
  let value = String(text ?? '').trim();
  value = value.replace(/^```(?:json|JSON)?\s*/m, '').replace(/```\s*$/m, '').trim();
  const start = value.search(/[[{]/);
  if (start === -1) throw new Error('no JSON object in model output');
  const open = value[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < value.length; i += 1) {
    const ch = value[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(value.slice(start, i + 1));
    }
  }
  throw new Error('unterminated JSON object in model output');
}

const SECRET_PATTERNS = [
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\b(?:api[_-]?key|apikey|token|secret|password|passwd|pwd)\s*[:=]\s*["'`]?[^\s"'`]{6,}/gi,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/gi,
];

/** 记忆禁止存凭据：写盘前的最后一道闸。 */
export function redactSecrets(text) {
  let value = String(text ?? '');
  for (const pattern of SECRET_PATTERNS) value = value.replace(pattern, '[已脱敏]');
  return value;
}

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
  : null;

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也',
  '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'are', 'was', 'were', 'be', 'been',
  'for', 'on', 'with', 'as', 'at', 'by', 'it', 'this', 'that', 'from', 'we', 'you', 'i',
]);

/** 中英文混合分词：中文用 Intl.Segmenter，英文用词边界，并补中文 bigram。 */
export function tokenize(text) {
  const value = String(text ?? '').toLowerCase();
  const tokens = new Set();
  if (segmenter) {
    for (const part of segmenter.segment(value)) {
      const word = part.segment.trim();
      if (word.length >= 2 && !STOP_WORDS.has(word) && /[\p{L}\p{N}]/u.test(word)) tokens.add(word);
    }
  }
  for (const word of value.split(/[^\p{L}\p{N}_-]+/u)) {
    if (word.length >= 2 && !STOP_WORDS.has(word)) tokens.add(word);
  }
  const cjk = value.replace(/[^㐀-鿿]/g, '');
  for (let i = 0; i + 1 < cjk.length; i += 1) {
    const bigram = cjk.slice(i, i + 2);
    if (!STOP_WORDS.has(bigram)) tokens.add(bigram);
  }
  return [...tokens].slice(0, 400);
}

/** 相关度：标题 6、标签 4、摘要 2、正文 1，另加精确短语加成。 */
export function scoreTokens(item, tokens, phrase = '') {
  if (tokens.length === 0) return 0;
  const title = String(item.title ?? '').toLowerCase();
  const summary = String(item.summary ?? '').toLowerCase();
  const content = String(item.content ?? '').toLowerCase();
  const tags = (item.tags ?? []).join(' ').toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 6;
    if (tags.includes(token)) score += 4;
    if (summary.includes(token)) score += 2;
    if (content.includes(token)) score += 1;
  }
  if (phrase && phrase.length >= 2) {
    if (title.includes(phrase)) score += 12;
    else if (summary.includes(phrase)) score += 6;
    else if (content.includes(phrase)) score += 3;
  }
  // 没有任何词命中就返回 0；否则纯新条目会因为时间加成挤进所有搜索结果。
  if (score === 0) return 0;
  const ageDays = (Date.now() - Date.parse(item.createdAt ?? 0)) / 86400000;
  if (Number.isFinite(ageDays) && ageDays >= 0) score += Math.max(0, 3 - ageDays / 30);
  return score;
}

// ── RSS / Atom ────────────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeXml(text) {
  return String(text ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (_, name) => ENTITIES[name.toLowerCase()] ?? `&${name};`);
}

export function stripTags(html) {
  return decodeXml(String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function firstTag(block, names) {
  for (const name of names) {
    const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block);
    if (match) return decodeXml(match[1]).trim();
  }
  return '';
}

function attrOf(block, tag, attr) {
  const match = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i').exec(block);
  return match ? decodeXml(match[1]).trim() : '';
}

function httpUrl(value) {
  const text = String(value ?? '').trim();
  return /^https?:\/\//i.test(text) ? text : '';
}

/** 从条目里找一张可展示的图：enclosure / media:thumbnail / media:content / 正文首图。 */
function imageOf(block) {
  for (const candidate of [
    attrOf(block, 'enclosure', 'url'),
    attrOf(block, 'media:thumbnail', 'url'),
    attrOf(block, 'media:content', 'url'),
  ]) {
    if (httpUrl(candidate)) return httpUrl(candidate);
  }
  const img = /<img\b[^>]*\bsrc=["']([^"']+)["']/i.exec(block);
  return img ? httpUrl(decodeXml(img[1])) : '';
}

/** 解析 RSS 2.0 / Atom。返回 { title, link, summary, publishedAt, source }。 */
export function parseFeed(xml, sourceName = '') {
  const text = String(xml ?? '');
  const blocks = [
    ...text.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...text.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ].map((match) => match[0]);
  const items = [];
  for (const block of blocks) {
    const title = stripTags(firstTag(block, ['title']));
    let link = firstTag(block, ['link']);
    if (!link) link = attrOf(block, 'link', 'href');
    if (!link) link = attrOf(block, 'guid', 'isPermaLink') === 'false' ? '' : firstTag(block, ['guid']);
    const summary = stripTags(firstTag(block, ['description', 'summary', 'content']));
    const published = firstTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    // 坏日期（空串、时区乱码、非 RFC 822 格式）不能抛 RangeError，否则整源失败。
    const publishedMs = published ? Date.parse(published) : NaN;
    const iso = Number.isFinite(publishedMs) ? new Date(publishedMs).toISOString() : '';
    if (!title) continue;
    items.push({
      title: truncate(title, 300),
      link: link || '',
      summary: truncate(summary, 800),
      publishedAt: iso,
      source: sourceName,
      image: imageOf(block),
    });
  }
  return items;
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
