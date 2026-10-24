import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tests = [
  'test_store.mjs',
  'test_pipeline.mjs',
  'test_apply.mjs',
  'test_news.mjs',
  'test_api.mjs',
  'test_regressions.mjs',
];

for (const name of tests) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(process.execPath, [join(here, name)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('\nALL TESTS PASSED');
