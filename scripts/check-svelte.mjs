import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('svelte-check/bin/svelte-check');
const result = spawnSync(process.execPath, [cli, '--workspace', '.', '--tsconfig', './examples/laravel/tsconfig.svelte.json'], {
  stdio: 'inherit', env: { ...process.env, SATCHEL_FRAMEWORK: 'svelte' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
