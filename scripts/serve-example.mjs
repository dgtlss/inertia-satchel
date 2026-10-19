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
run('npm', ['run', ssr ? 'build:ssr' : 'build']);
let renderer;
if (ssr) {
  renderer = spawn(process.execPath, ['bootstrap/ssr/ssr.js'], { cwd: app, stdio: 'inherit' });
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch('http://127.0.0.1:13714/health')).ok) break;
    } catch { /* Wait for the public Inertia SSR server's health endpoint. */ }
    if (renderer.exitCode !== null || attempt >= 100) {
      renderer.kill('SIGTERM');
      throw new Error('The example SSR renderer did not become healthy.');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const server = spawn(php, ['artisan', 'serve', '--host=0.0.0.0', '--port=8000', '--no-reload'], {
  cwd: app, stdio: 'inherit', env: { ...process.env, INERTIA_SSR_ENABLED: String(ssr), INERTIA_SSR_THROW_ON_ERROR: 'true' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.kill(signal);
  renderer?.kill(signal);
});
server.on('error', (error) => { throw error; });
server.on('exit', (code) => {
  renderer?.kill('SIGTERM');
  process.exit(code ?? 0);
});
