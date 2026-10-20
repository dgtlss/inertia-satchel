import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const targets = process.argv.slice(2);
const supported = ['vue', 'vue-ssr', 'vue-ssr-dev', 'react', 'react-ssr', 'react-ssr-dev', 'svelte', 'svelte-ssr', 'svelte-ssr-dev'];
if (!targets.length) targets.push(...supported);
for (const target of targets) {
  if (!supported.includes(target)) throw new Error(`Unknown example: ${target}`);
  const result = spawnSync(process.execPath, [cli, 'test'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      SATCHEL_FRAMEWORK: target.split('-')[0],
      SATCHEL_SSR: String(target.includes('-ssr')),
      SATCHEL_DEV_SSR: String(target.endsWith('-ssr-dev')),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
