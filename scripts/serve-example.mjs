import { existsSync, mkdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const app = fileURLToPath(new URL('../examples/laravel', import.meta.url));
const php = process.env.PHP_BINARY || 'php';
if (!existsSync(`${app}/vendor/autoload.php`)) {
  throw new Error('Install the example first: cd examples/laravel && composer install');
}
for (const directory of ['bootstrap/cache', 'storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs']) {
  mkdirSync(`${app}/${directory}`, { recursive: true });
}
if (!existsSync(`${app}/.env`)) copyFileSync(`${app}/.env.example`, `${app}/.env`);
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: app, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}).`);
};
if (!/^APP_KEY=.+$/m.test(readFileSync(`${app}/.env`, 'utf8'))) run(php, ['artisan', 'key:generate', '--force']);
run(php, ['artisan', 'satchel:manifest']);
rmSync(`${app}/public/hot`, { force: true });
const ssr = process.env.SATCHEL_SSR === 'true';
const devSsr = process.env.SATCHEL_DEV_SSR === 'true';
if (!devSsr) run('npm', ['run', ssr ? 'build:ssr' : 'build']);
let renderer;
if (ssr) {
  renderer = devSsr
    ? spawn('npm', ['run', 'dev'], {
      cwd: app, stdio: 'inherit', detached: true,
      env: { ...process.env, LARAVEL_BYPASS_ENV_CHECK: '1' },
    })
    : spawn(process.execPath, ['bootstrap/ssr/ssr.js'], { cwd: app, stdio: 'inherit' });
  renderer.on('error', (error) => { throw error; });
  for (let attempt = 0; ; attempt++) {
    try {
      const url = devSsr ? 'http://127.0.0.1:5173/__inertia_ssr' : 'http://127.0.0.1:13714/health';
      if ((await fetch(url)).ok && (!devSsr || existsSync(`${app}/public/hot`))) break;
    } catch { /* Wait for the public Inertia SSR server's health endpoint. */ }
    if (renderer.exitCode !== null || attempt >= 100) {
      stopRenderer();
      throw new Error('The example SSR renderer did not become healthy.');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const server = spawn(php, ['artisan', 'serve', '--host=0.0.0.0', '--port=8000', '--no-reload'], {
  cwd: app, stdio: 'inherit', env: { ...process.env, INERTIA_SSR_ENABLED: String(ssr), INERTIA_SSR_THROW_ON_ERROR: 'true' },
});
function stopRenderer(signal = 'SIGTERM') {
  if (!renderer || renderer.exitCode !== null) return;
  try {
    if (devSsr && renderer.pid) process.kill(-renderer.pid, signal);
    else renderer.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.kill(signal);
  stopRenderer(signal);
});
server.on('error', (error) => { throw error; });
server.on('exit', (code) => {
  stopRenderer();
  if (devSsr) rmSync(`${app}/public/hot`, { force: true });
  process.exit(code ?? 0);
});
