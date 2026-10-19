import { existsSync, mkdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const app = fileURLToPath(new URL('../examples/laravel', import.meta.url));
const php = process.env.PHP_BINARY || 'php';
if (!existsSync(`${app}/vendor/autoload.php`)) {
  throw new Error('Install the example first: cd examples/laravel && composer install');
}
for (const directory of ['bootstrap/cache', 'storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs']) {
  mkdirSync(`${app}/${directory}`, { recursive: true });
}
if (!existsSync(`${app}/.env`)) copyFileSync(`${app}/.env.example`, `${app}/.env`);
const run = (command, args, cwd = app) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}).`);
};
if (!/^APP_KEY=.+$/m.test(readFileSync(`${app}/.env`, 'utf8'))) run(php, ['artisan', 'key:generate', '--force']);
run(php, ['artisan', 'satchel:manifest']);
rmSync(`${app}/public/hot`, { force: true });
run('npm', ['run', 'build:example'], root);
const server = spawn(php, ['artisan', 'serve', '--host=0.0.0.0', '--port=8000', '--no-reload'], {
  cwd: app, stdio: 'inherit', env: process.env,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', (error) => { throw error; });
server.on('exit', (code) => process.exit(code ?? 0));
