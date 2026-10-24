#!/usr/bin/env node
/**
 * 把 client-src/*.js 拼回 client.js。
 *
 * DSH 的 client 入口是一个 __ModuleLoader__ 单模块，不能直接 import 相对文件；
 * 所以源码按功能拆成多个片段，共享同一个 factory 作用域，由本脚本按文件名顺序拼接。
 *
 *   node scripts/build-client.mjs          # 构建
 *   node scripts/build-client.mjs --check  # 只检查 client.js 是否与源码一致
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, 'client-src');
const target = join(root, 'client.js');

const header = readFileSync(join(sourceDir, '_header.txt'), 'utf8').replace(/\s+$/, '');
const footer = readFileSync(join(sourceDir, '_footer.txt'), 'utf8').replace(/\s+$/, '');
const parts = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.js'))
  .sort()
  .map((name) => ({ name, text: readFileSync(join(sourceDir, name), 'utf8').replace(/\s+$/, '') }));

const output = `${header}\n\n${parts.map((part) => part.text).join('\n\n')}\n${footer}\n`;
const check = process.argv.includes('--check');

if (check) {
  if (!existsSync(target)) {
    console.error('client.js missing');
    process.exit(1);
  }
  const current = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  if (current !== output) {
    console.error('client.js is stale; run: node scripts/build-client.mjs');
    process.exit(1);
  }
  console.log(`client.js is up to date (${parts.length} parts, ${output.split('\n').length} lines)`);
  process.exit(0);
}

writeFileSync(target, output, 'utf8');
console.log(`built client.js from ${parts.length} parts (${output.split('\n').length} lines)`);
for (const part of parts) console.log(`  ${part.name.padEnd(20)} ${part.text.split('\n').length} lines`);
