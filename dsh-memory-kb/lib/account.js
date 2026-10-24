import { closeSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { getText } from './http.js';
import { writeAtomic } from './util.js';

const BALANCE_URL = 'https://api.deepseek.com/user/balance';
const CACHE_MS = 30000;

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

function ledgerFile() {
  return join(dshHome(), 'memory-kb', 'usage-ledger.json');
}

function beijingDay() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function readLedger() {
  try {
    const data = JSON.parse(readFileSync(ledgerFile(), 'utf8'));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function writeLedger(ledger) {
  try {
    writeAtomic(ledgerFile(), JSON.stringify(ledger, null, 2) + '\n');
  } catch {
    // 账本写入失败不影响余额展示
  }
}

function sleepSync(ms) {
  // Node 主线程可用的同步等待；账本观测每 60 秒一次，阻塞窗口很小。
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 多开 DSH 时串行化账本读改写，避免互相覆盖丢消费记录。 */
function withLedgerLock(task, { retries = 40, waitMs = 25 } = {}) {
  const lock = `${ledgerFile()}.lock`;
  mkdirSync(dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < retries; attempt += 1) {
    let fd;
    try {
      fd = openSync(lock, 'wx');
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 10000) {
          unlinkSync(lock);
          continue;
        }
      } catch {
        // 锁刚被释放，直接重试。
      }
      sleepSync(waitMs);
      continue;
    }
    try {
      writeFileSync(fd, String(process.pid));
      return task();
    } finally {
      try { closeSync(fd); } catch {}
      try { unlinkSync(lock); } catch {}
    }
  }
  throw new Error('usage-ledger lock timeout');
}

/**
 * 用余额变化独立记账：余额下降累计为当日消费，充值/赠金单独记录，不会冲掉已有消费。
 * 第一次观测会把当前余额作为当日起点；更早的消费不在本账本区间内。
 */
function observeBalance(balance) {
  const build = () => {
    const today = beijingDay();
    const now = new Date().toISOString();
    const previous = readLedger();
    let ledger;
    if (!previous || previous.day !== today || !Number.isFinite(Number(previous.lastBalance))) {
      ledger = {
        day: today,
        startedAt: now,
        openingBalance: balance,
        lastBalance: balance,
        spent: 0,
        credited: 0,
        observations: 0,
        updatedAt: now,
      };
    } else {
      const last = Number(previous.lastBalance);
      const spent = Number(previous.spent) || 0;
      const credited = Number(previous.credited) || 0;
      ledger = {
        ...previous,
        day: today,
        startedAt: previous.startedAt || now,
        lastBalance: balance,
        spent: spent + (balance < last ? last - balance : 0),
        credited: credited + (balance > last ? balance - last : 0),
        observations: (Number(previous.observations) || 0) + 1,
        updatedAt: now,
      };
    }
    writeLedger(ledger);
    return ledger;
  };
  try {
    return withLedgerLock(build);
  } catch {
    // 锁超时不应让余额面板整体失败：退回上一次账本（不丢已有消费）。
    const previous = readLedger();
    if (previous && Number.isFinite(Number(previous.lastBalance))) return previous;
    return {
      day: beijingDay(),
      startedAt: new Date().toISOString(),
      openingBalance: balance,
      lastBalance: balance,
      spent: 0,
      credited: 0,
      observations: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

function walletTotal(list) {
  return (Array.isArray(list) ? list : [])
    .filter((wallet) => wallet && Number.isFinite(Number(wallet.balance)))
    .reduce((sum, wallet) => sum + Number(wallet.balance), 0);
}

function pickCurrency(wallets) {
  const list = Array.isArray(wallets) ? wallets.filter((w) => w && Number.isFinite(Number(w.balance))) : [];
  return (list.find((w) => String(w.currency || '').toUpperCase() === 'CNY')
    || list.find((w) => Number(w.balance) > 0)
    || list[0] || {}).currency || 'CNY';
}

async function fetchByApiKey(ctx) {
  let credential;
  try {
    credential = await ctx.credentials?.resolve('DEEPSEEK_API_KEY');
  } catch {
    return null;
  }
  const key = credential?.value;
  if (!key) return null;
  try {
    // 用 node:https 而不是全局 fetch：Electron/undici 在部分运行时会
    // 在 TLS 结束时触发 assert(!this.paused)，新闻抓取已因此改用 getText。
    const text = await getText(BALANCE_URL, {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      timeoutMs: 8000,
      maxBytes: 1024 * 1024,
    });
    const data = JSON.parse(text);
    const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
    const info = infos.find((item) => String(item?.currency || '').toUpperCase() === 'CNY') || infos[0];
    if (!info || !Number.isFinite(Number(info.total_balance))) return null;
    return {
      totalBalance: Number(info.total_balance),
      rechargeBalance: Number.isFinite(Number(info.topped_up_balance)) ? Number(info.topped_up_balance) : null,
      bonusBalance: Number.isFinite(Number(info.granted_balance)) ? Number(info.granted_balance) : null,
      currency: String(info.currency || 'CNY').toUpperCase(),
      balanceSource: 'apikey',
    };
  } catch {
    return null;
  }
}

async function fetchByAccount(ctx) {
  let account;
  try {
    account = typeof ctx.get === 'function' ? ctx.get('deepseekAccount') : null;
  } catch {
    account = null;
  }
  if (!account || typeof account.getBalance !== 'function') return null;
  try {
    const result = await account.getBalance({
      version: String(process.env.DSH_CLIENT_VERSION || process.env.DSH_VERSION || '') || 'unknown',
      locale: 'zh_CN',
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    });
    if (!result || result.status !== 'ready') return null;
    const normal = Array.isArray(result.value) ? result.value : [];
    const bonus = Array.isArray(result.bonusWallets) ? result.bonusWallets : [];
    const all = normal.concat(bonus).filter((wallet) => wallet && Number.isFinite(Number(wallet.balance)));
    if (all.length === 0) return null;
    const currency = String(pickCurrency(all)).toUpperCase();
    const pick = (list) => walletTotal(list.filter((wallet) => String(wallet.currency || 'CNY').toUpperCase() === currency));
    const rechargeBalance = pick(normal);
    const bonusBalance = pick(bonus);
    return {
      totalBalance: Number((rechargeBalance + bonusBalance).toFixed(6)),
      rechargeBalance: Number(rechargeBalance.toFixed(6)),
      bonusBalance: Number(bonusBalance.toFixed(6)),
      currency,
      balanceSource: 'account',
    };
  } catch {
    return null;
  }
}

function ledgerView(ledger) {
  return {
    day: ledger?.day ?? beijingDay(),
    startedAt: ledger?.startedAt ?? null,
    openingBalance: ledger?.openingBalance ?? null,
    observations: ledger?.observations ?? 0,
    lastObservedAt: ledger?.updatedAt ?? null,
  };
}

async function compute(ctx) {
  const fresh = (await fetchByApiKey(ctx)) || (await fetchByAccount(ctx));
  if (fresh) {
    const ledger = observeBalance(fresh.totalBalance);
    return {
      ok: true,
      ...fresh,
      todayUsage: Number(ledger.spent) || 0,
      creditedToday: Number(ledger.credited) || 0,
      ...ledgerView(ledger),
      note: '今日已用由 Workbench 独立观测余额变化记账（从首次观测开始，充值不会冲掉已记消费）',
      updatedAt: new Date().toISOString(),
    };
  }
  const ledger = readLedger();
  if (ledger && Number.isFinite(Number(ledger.lastBalance))) {
    return {
      ok: true,
      totalBalance: Number(ledger.lastBalance),
      rechargeBalance: null,
      bonusBalance: null,
      currency: 'CNY',
      balanceSource: 'ledger',
      todayUsage: Number(ledger.spent) || 0,
      creditedToday: Number(ledger.credited) || 0,
      ...ledgerView(ledger),
      note: '余额暂时取不到实时接口，显示 Workbench 最近一次观测值；今日已用为独立记账',
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    ok: false,
    error: '读取不到 DeepSeek 余额：请配置 DEEPSEEK_API_KEY，或在 DSH 中登录 DeepSeek 账号。',
    todayUsage: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** 返回一个带 30 秒缓存的账户/余额查询函数（余额观测会写入独立账本）。 */
export function createAccountInfo(ctx) {
  let cached = null;
  let cachedAt = 0;
  let inflight = null;
  return async function accountInfo() {
    if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
    if (inflight) return inflight;
    inflight = compute(ctx)
      .then((result) => {
        // 只缓存成功结果；冷启动时账号/凭据服务可能还没就绪，
        // 不能让一次失败把界面锁在错误状态 30 秒。
        if (result.ok) {
          cached = result;
          cachedAt = Date.now();
        }
        return result;
      })
      .finally(() => { inflight = null; });
    return inflight;
  };
}
