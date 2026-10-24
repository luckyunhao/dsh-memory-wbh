import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

/**
 * 极简 GET 文本客户端：node:http(s) + 重定向 + 压缩 + 超时。
 * 刻意不用全局 fetch：Electron 的 undici 在部分运行时里会在 TLS 连接结束时
 * 抛 `assert(!this.paused)` 并杀掉进程；新闻抓取不值得冒这个风险。
 */
export function getText(url, { headers = {}, timeoutMs = 20000, maxBytes = 8 * 1024 * 1024, redirects = 5, signal } = {}) {
  return new Promise((resolve, reject) => {
    let current = url;
    let hops = 0;
    // 超过大小上限时 request.destroy 不一定触发请求级 error；
    // 用 settled 闸保证 Promise 只会以错误结束一次。
    let settled = false;
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const run = () => {
      let parsed;
      try {
        parsed = new URL(current);
      } catch (error) {
        fail(error);
        return;
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        fail(new Error(`unsupported protocol: ${parsed.protocol}`));
        return;
      }
      const client = parsed.protocol === 'https:' ? https : http;
      const request = client.get(parsed, {
        headers: {
          'user-agent': 'dsh-memory-kb/0.1 (+https://deepseek.com)',
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
          'accept-encoding': 'gzip, deflate, br',
          ...headers,
        },
        timeout: timeoutMs,
      }, (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          hops += 1;
          if (hops > redirects) {
            fail(new Error(`too many redirects for ${url}`));
            return;
          }
          current = new URL(response.headers.location, current).toString();
          run();
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          fail(new Error(`HTTP ${status} for ${current}`));
          return;
        }

        let stream = response;
        const encoding = String(response.headers['content-encoding'] ?? '').toLowerCase();
        if (encoding.includes('gzip')) stream = response.pipe(zlib.createGunzip());
        else if (encoding.includes('deflate')) stream = response.pipe(zlib.createInflate());
        else if (encoding.includes('br')) stream = response.pipe(zlib.createBrotliDecompress());

        const chunks = [];
        let size = 0;
        stream.on('data', (chunk) => {
          if (settled) return;
          size += chunk.length;
          if (size > maxBytes) {
            const error = new Error(`response exceeds ${maxBytes} bytes`);
            // 同时销毁解压流与请求，并主动 reject，避免某些运行时只静默 close。
            stream.destroy(error);
            request.destroy(error);
            fail(error);
            return;
          }
          chunks.push(chunk);
        });
        stream.on('end', () => succeed(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', fail);
      });
      request.on('timeout', () => request.destroy(new Error(`timeout after ${timeoutMs}ms for ${current}`)));
      request.on('error', fail);
      if (signal) {
        if (signal.aborted) {
          request.destroy(new Error('aborted'));
          fail(new Error('aborted'));
          return;
        }
        const onAbort = () => request.destroy(new Error('aborted'));
        signal.addEventListener('abort', onAbort, { once: true });
        request.on('close', () => signal.removeEventListener('abort', onAbort));
      }
    };

    run();
  });
}
