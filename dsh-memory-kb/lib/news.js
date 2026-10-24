import { parseFeed, redactSecrets, today, truncate } from './util.js';
import { resolveRoute, streamText, routeLabel } from './llm.js';
import { getText } from './http.js';

const MAX_ITEMS = 48;
const MAX_PROMPT_ITEMS = 36;

function due(store, force) {
  if (force) return true;
  if (!store.settings.newsEnabled) return false;
  const last = store.state.lastNews?.at;
  if (!last) return true;
  const hours = (Date.now() - Date.parse(last)) / 3600000;
  return !Number.isFinite(hours) || hours >= store.settings.newsIntervalHours;
}

async function fetchFeed(source, max = 30, outerSignal, timeoutMs = 20000) {
  const xml = await getText(source.url, { timeoutMs, signal: outerSignal, maxBytes: 24 * 1024 * 1024 });
  const items = parseFeed(xml, source.name).slice(0, max);
  return items.map((item) => ({ ...item, category: source.category, sourceUrl: source.url }));
}

function normalizeKey(item) {
  return `${item.title}`.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '').slice(0, 120);
}

/**
 * 抓取全部新闻源并生成简报。失败源单独记录，不影响其他源。
 * @returns {{skipped?: string, fetched: number, sources: Array, items: Array, digest?: object}}
 */
export async function fetchNews(ctx, store, { force = false, signal } = {}) {
  if (!due(store, force)) {
    return { skipped: 'not-due', fetched: 0, sources: [], items: [] };
  }
  const sources = store.settings.newsSources ?? [];
  if (sources.length === 0) return { skipped: 'no-sources', fetched: 0, sources: [], items: [] };

  const maxPerSource = Math.max(1, Math.min(60, Number(store.settings.newsMaxItemsPerSource) || 15));
  const results = await Promise.allSettled(sources.map((source) => fetchFeed(source, maxPerSource, signal)));
  const status = [];
  const all = [];
  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled') {
      status.push({ name: source.name, url: source.url, ok: true, count: result.value.length });
      all.push(...result.value);
    } else {
      status.push({ name: source.name, url: source.url, ok: false, error: result.reason?.message ?? String(result.reason) });
    }
  });

  // 去重 + 按时间倒序 + 截断。
  const seen = new Set();
  const unique = [];
  for (const item of all) {
    const key = normalizeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  unique.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
  const items = unique.slice(0, MAX_ITEMS);

  if (items.length === 0) {
    // 全部失败时只记录尝试时间，不更新 lastNews.at：否则 due() 会以为已经抓过，
    // 最长整个抓取间隔内都不会重试。
    store.state.lastNews = {
      ...(store.state.lastNews ?? {}),
      lastAttempt: new Date().toISOString(),
      error: 'no items',
      sources: status,
    };
    store.saveState();
    return { fetched: 0, sources: status, items: [], error: 'all sources returned no items' };
  }

  store.saveNewsItems(items, { sources: status, fetchedAt: new Date().toISOString() });
  const rawBody = buildRawBody(items, status);
  let digestText = rawBody;
  let route = null;
  let summaryNote = '';
  try {
    route = resolveRoute(store, store.settings);
    const promptItems = items.slice(0, MAX_PROMPT_ITEMS);
    const { text, truncated } = await streamText(ctx, {
      provider: route.provider,
      model: route.model,
      system: '你是一名中文科技新闻编辑。只依据给定条目写简报，不编造、不补充原文没有的事实。用 Markdown，不要代码围栏，不要输出思考过程。',
      prompt: [
        `日期：${today()}`,
        '请把下面的抓取条目写成一份中文简报：',
        '1. 开头「## 今日要点」：5-8 条，每条一句话，合并同一主题。',
        '2. 然后「## 值得点开」：8-15 条，格式 `- [标题](链接) — 来源`。',
        '3. 不要逐条翻译；优先技术、AI、开发工具相关内容。',
        '4. 只输出简报正文，不要解释你做了什么。',
        '',
        JSON.stringify(promptItems.map((item) => ({
          title: item.title,
          link: item.link,
          source: item.source,
          time: item.publishedAt,
          summary: truncate(item.summary, 220),
        })), null, 0),
      ].join('\n'),
      maxTokens: 3200,
      timeoutMs: 90000,
      signal,
    });
    if (text.length > 80) {
      digestText = text;
      if (truncated) summaryNote = '模型输出达到 token 上限，简报可能不完整。';
    } else {
      summaryNote = `模型只返回了 ${text.length} 个字符，已回退为原始条目列表。`;
    }
  } catch (error) {
    digestText = `${rawBody}\n\n> 模型摘要失败：${error.message}\n`;
    summaryNote = `模型摘要失败：${error.message}`;
  }

  const digest = store.saveNewsDigest({
    title: `新闻简报 ${today()}`,
    body: digestText,
    items,
    sourceName: sources.map((source) => source.name).join(' / '),
  });
  store.state.lastNews = {
    at: new Date().toISOString(),
    file: digest.file,
    count: items.length,
    sources: status,
    route: route ? routeLabel(route) : null,
    ...(summaryNote ? { summaryNote } : {}),
  };
  store.saveState();
  return { fetched: items.length, sources: status, items, digest: digest.item, route };
}

function buildRawBody(items, status) {
  const lines = ['## 原始条目', ''];
  for (const item of items) {
    lines.push(`- [${item.title}](${item.link || '#'}) — ${item.source}${item.publishedAt ? ` · ${item.publishedAt.slice(0, 16).replace('T', ' ')}` : ''}`);
  }
  const failed = status.filter((source) => !source.ok);
  if (failed.length > 0) {
    lines.push('', '## 抓取失败', '');
    for (const source of failed) lines.push(`- ${source.name}：${redactSecrets(source.error)}`);
  }
  return lines.join('\n');
}
