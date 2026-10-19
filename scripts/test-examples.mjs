import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const targets = process.argv.slice(2);
if (!targets.length) targets.push('vue', 'vue-ssr', 'react', 'svelte');
for (const target of targets) {
  if (!['vue', 'vue-ssr', 'react', 'svelte'].includes(target)) throw new Error(`Unknown example: ${target}`);
  const result = spawnSync(process.execPath, [cli, 'test'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      SATCHEL_FRAMEWORK: target === 'vue-ssr' ? 'vue' : target,
      SATCHEL_SSR: String(target === 'vue-ssr'),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
