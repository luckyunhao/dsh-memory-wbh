import { truncate } from './util.js';

const DEFAULT_PROVIDER = 'deepseek-account';
const DEFAULT_MODEL = 'deepseek-flash';

/**
 * 解析本次调用要用的模型路由。
 * 优先级：插件配置 → 该会话最近一次 request/context → 全局最近路由 → 默认值。
 */
export function resolveRoute(store, config = {}, sessionId = '') {
  if (config.provider && config.model) return { provider: config.provider, model: config.model };
  const session = sessionId ? store.getSessionCursor(sessionId) : null;
  if (session?.route?.provider && session?.route?.model) return session.route;
  if (store.state.lastRoute?.provider && store.state.lastRoute?.model) return store.state.lastRoute;
  return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL };
}

export function rememberRoute(store, sessionId, route) {
  if (!route?.provider || !route?.model) return;
  const cursor = store.getSessionCursor(sessionId) ?? {};
  store.state.lastRoute = route;
  store.setSessionCursor(sessionId, { ...cursor, route });
}

/**
 * 调一次模型并把文本增量拼起来。
 * 只消费 text-delta；reasoning 不进入结果。终止分片为 error/aborted 时抛错。
 */
export async function streamText(ctx, { provider, model, system = '', prompt, maxTokens = 2400, timeoutMs = 90000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`memory-kb llm timeout after ${timeoutMs}ms`)), timeoutMs);
  const signals = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  let text = '';
  let finish = null;
  try {
    const stream = ctx.llm.stream({
      provider,
      model,
      system,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: String(prompt ?? '') }],
      }],
      maxTokens,
      signal: signals,
    });
    for await (const chunk of stream) {
      if (!chunk || typeof chunk !== 'object') continue;
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
        text += chunk.text;
        // 防御性上限：即使模型失控也不把内存撑爆。
        if (text.length > 200000) throw new Error('memory-kb llm output exceeded 200k characters');
      } else if (chunk.type === 'finish') {
        finish = chunk.reason ?? chunk.finish ?? null;
      }
    }
  } finally {
    clearTimeout(timer);
  }
  if (finish && finish.kind && finish.kind !== 'stop') {
    // 达到输出上限时部分文本仍然可用：交给调用方决定是否采用，避免整轮作废重试。
    if (finish.kind === 'max-tokens') {
      return { text: text.trim(), finish, truncated: true };
    }
    const failure = finish.failure ?? {};
    const error = new Error(`memory-kb llm finish ${finish.kind}${failure.message ? `: ${failure.message}` : ''}`);
    error.code = failure.code ?? finish.kind;
    throw error;
  }
  return { text: text.trim(), finish, truncated: false };
}

export function isRouteUsable(route) {
  return Boolean(route?.provider && route?.model);
}

export function routeLabel(route) {
  return route?.provider ? `${route.provider}/${route.model}` : 'unknown';
}

export function clipPrompt(text, max = 24000) {
  return truncate(text, max);
}
