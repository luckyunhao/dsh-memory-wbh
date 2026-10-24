import { isKebabCase, extractJson, redactSecrets, today, truncate } from './util.js';
import { resolveRoute, streamText, routeLabel } from './llm.js';

const MAX_TRANSCRIPT = 30000;

const SYSTEM_PROMPT = `你是 DeepSeek Harness 的长期记忆整理器。你的工作是从一段真实的开发/运维对话里，抽取下一次会话仍然有用、可复用的信息，并判断是否值得沉淀成技能。

只输出一个 JSON 对象，不要 Markdown 代码围栏，不要解释。结构：
{
  "memories": [
    {
      "type": "fact | preference | decision | project | reference",
      "title": "一句话标题（中文，<= 60 字）",
      "summary": "结论（2-4 句，写清结果、数字、路径、口径）",
      "content": "依据/细节（可选，Markdown，<= 2000 字）",
      "tags": ["短标签", "最多 6 个"]
    }
  ],
  "skill": null
}

规则：
1. memories 最多 3 条；没有值得长期保存的内容就返回空数组。
2. 只保存稳定、可复用的事实：环境/路径/版本/账号口径、用户偏好、已做出的技术决策、项目进展、可复用的排查结论。
3. 不保存寒暄、临时进度、一次性的中间输出、推测或未验证的结论。
4. 禁止保存任何密码、token、API key、身份证号等凭据；遇到也必须省略。
5. 不要重复 existingTitles 里已有的主题。
6. skill 只在这段对话形成了「可重复执行的流程」时才生成：有明确步骤、命令或判断标准，下一次遇到同类任务能直接照做。否则必须为 null。
7. 生成 skill 时结构为：
   {
     "name": "kebab-case-英文名",
     "description": "一句话说明这个技能做什么（中文，<= 80 字）",
     "whenToUse": "什么情况下使用（中文）",
     "body": "Markdown 正文：适用场景、前置检查、步骤、命令、验证方法、坑与回退"
   }
8. 用对话本身的语言写；技术名词、命令、路径保持原样。
9. 如果 type=project，content 必须使用且只用这些二级标题（没有信息的写“待确认”）：
   ## 项目目标
   ## 关键决策
   ## 当前状态
   ## 下一步行动
   ## 参考链接
   下一步行动用「- [ ] 具体动作」的形式，方便知识库勾选。`;

const SKILL_SCHEMA = `如果生成 skill，name 必须是小写 kebab-case（a-z0-9 和连字符），body 必须包含可执行的步骤，不要写空话。`;

/**
 * 把一批 session 事件整理成给模型看的转写文本。
 * 只保留人类可读内容；tool 结果截断，避免把整个文件塞进 prompt。
 */
export function buildTranscript(events) {
  const lines = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const data = event.data ?? {};
    switch (event.type) {
      case 'user/message': {
        // 只沉淀真人输入：插件注入的 [记忆召回] 等背景块 source 不是 user，
        // 否则会把召回内容当成用户发言再次沉淀，形成自我循环。
        if (data.source?.kind !== 'user') break;
        const text = textOfContent(data.content);
        if (text) lines.push(`[用户] ${redactSecrets(text)}`);
        break;
      }
      case 'assistant/message': {
        const text = textOfContent(data.message?.content);
        if (text) lines.push(`[助手] ${redactSecrets(text)}`);
        break;
      }
      case 'tool/call': {
        const name = data.name ?? 'tool';
        const args = truncate(String(data.arguments ?? '').replace(/\s+/g, ' '), 240);
        lines.push(`[工具调用] ${name} ${args}`);
        break;
      }
      case 'tool/result': {
        const text = truncate(textOfContent(data.message?.content).replace(/\s+/g, ' '), 600);
        if (text) lines.push(`[工具结果] ${data.error ? `(失败 ${data.error.code ?? ''}) ` : ''}${redactSecrets(text)}`);
        break;
      }
      default:
        break;
    }
  }
  return truncate(lines.join('\n'), MAX_TRANSCRIPT);
}

function textOfContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function existingTitles(store, limit = 100) {
  return store.items
    .filter((item) => item.kind === 'memory' || item.kind === 'knowledge')
    .slice(0, limit)
    .map((item) => item.title);
}

function validateMemory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = truncate(String(raw.title ?? '').replace(/\s+/g, ' ').trim(), 120);
  if (!title) return null;
  const type = ['fact', 'preference', 'decision', 'project', 'reference', 'knowledge'].includes(raw.type)
    ? raw.type
    : 'fact';
  const summary = truncate(String(raw.summary ?? '').trim(), 1600);
  const content = truncate(String(raw.content ?? '').trim(), 20000);
  const tags = Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag).slice(0, 32)).slice(0, 8) : [];
  return { type, title, summary, content, tags };
}

function validateSkill(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim().toLowerCase();
  if (!isKebabCase(name)) return null;
  const description = truncate(String(raw.description ?? '').replace(/\s+/g, ' ').trim(), 300);
  if (!description) return null;
  return {
    name,
    description,
    whenToUse: truncate(String(raw.whenToUse ?? '').replace(/\s+/g, ' ').trim(), 300),
    body: truncate(String(raw.body ?? '').trim(), 30000),
  };
}

/**
 * 对一次轮次结束做沉淀。
 * @param {object} ctx - DSH 插件上下文（需要 ctx.llm）。
 * @param {import('./store.js').Store} store
 * @param {object} session - 实时 Session，至少有 id、header。
 * @param {Array} events - 该会话的事件缓冲（按 seq 升序）。
 * @param {{turn?: number, reason?: object, force?: boolean, signal?: AbortSignal}} options
 */
export async function distillSession(ctx, store, session, events, options = {}) {
  const sessionId = session?.id ?? options.sessionId;
  if (!sessionId) throw new Error('distillSession: missing session id');
  const cursor = store.getSessionCursor(sessionId) ?? {};
  const fromSeq = Number.isFinite(cursor.lastSeq) ? cursor.lastSeq + 1 : 0;
  const fresh = events.filter((event) => Number.isFinite(event?.seq) && event.seq >= fromSeq);
  const transcript = buildTranscript(fresh);
  if (!options.force && transcript.length < 160) {
    // 太短的轮次不值得花一次模型调用。
    store.setSessionCursor(sessionId, { ...cursor, lastSeq: maxSeq(fresh, cursor.lastSeq), lastTurn: options.turn ?? cursor.lastTurn ?? 0 });
    return { ok: true, skipped: 'transcript-too-short', memories: [], skill: null };
  }
  if (transcript.length === 0) {
    return { ok: true, skipped: 'empty-transcript', memories: [], skill: null };
  }

  const route = resolveRoute(store, store.settings, sessionId);
  const prompt = [
    `日期：${today()}`,
    `会话：${sessionId}`,
    options.turn ? `轮次：${options.turn}` : '',
    '',
    'existingTitles（不要重复这些主题）：',
    JSON.stringify(existingTitles(store), null, 0),
    '',
    '对话转写：',
    transcript,
    '',
    SKILL_SCHEMA,
  ].filter(Boolean).join('\n');

  const { text } = await streamText(ctx, {
    provider: route.provider,
    model: route.model,
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 2600,
    timeoutMs: options.timeoutMs ?? 90000,
    signal: options.signal,
  });

  let parsed;
  try {
    parsed = extractJson(text);
  } catch (error) {
    const wrapped = new Error(`memory-kb distill: model did not return JSON (${error.message})`);
    wrapped.code = 'BAD_JSON';
    wrapped.raw = truncate(text, 1000);
    throw wrapped;
  }

  const memories = [];
  const maxMemories = Math.max(0, Math.min(8, Number(store.settings.maxMemoriesPerTurn) || 3));
  for (const raw of Array.isArray(parsed.memories) ? parsed.memories.slice(0, maxMemories) : []) {
    const memory = validateMemory(raw);
    if (!memory) continue;
    const result = store.saveMemory({
      ...memory,
      source: { kind: 'session', sessionId, turn: options.turn },
    });
    memories.push({
      title: result.item?.title ?? memory.title,
      duplicate: Boolean(result.duplicate),
      id: result.item?.id ?? null,
    });
  }

  let skill = null;
  const candidate = validateSkill(parsed.skill);
  if (candidate) {
    const existing = store.get(`skill:${candidate.name}`);
    if (existing) {
      skill = { name: candidate.name, created: false, skipped: 'already-exists' };
    } else {
      const result = store.saveSkill({
        ...candidate,
        source: { kind: 'session', sessionId, turn: options.turn },
      });
      skill = { name: candidate.name, created: Boolean(result.created), file: result.file };
    }
  }

  const nextCursor = {
    ...cursor,
    lastSeq: maxSeq(fresh, cursor.lastSeq),
    lastTurn: options.turn ?? cursor.lastTurn ?? 0,
    lastDistilledAt: new Date().toISOString(),
    route,
  };
  store.setSessionCursor(sessionId, nextCursor);
  store.state.lastDistill = {
    at: new Date().toISOString(),
    sessionId,
    turn: options.turn ?? null,
    memories: memories.length,
    skill: skill?.name ?? null,
    route: routeLabel(route),
  };
  store.saveState();

  return { ok: true, memories, skill, route, transcriptChars: transcript.length };
}

function maxSeq(events, fallback = -1) {
  let max = Number.isFinite(fallback) ? fallback : -1;
  for (const event of events) if (Number.isFinite(event?.seq) && event.seq > max) max = event.seq;
  return max;
}
