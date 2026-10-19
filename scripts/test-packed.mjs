import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, lstatSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Install actual npm tarballs outside the workspaces: no source aliases or links.
const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'satchel-installed-'));
const app = join(temporary, 'app');
const vendor = join(temporary, 'package/Pages');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const pinned = (name) => lock.packages[`node_modules/${name}`].version;
const file = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};
function run(command, args, cwd = app, capture = false) {
  const result = spawnSync(command, args, {
    cwd, env: process.env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}).`);
  return result.stdout;
}

try {
  mkdirSync(app);
  const tarballs = {};
  for (const directory of ['satchel', 'vite-plugin-satchel']) {
    const [packed] = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], join(root, 'packages', directory), true));
    for (const expected of ['LICENSE', 'README.md', 'dist/index.js', 'dist/index.d.ts']) {
      assert(packed.files.some((entry) => entry.path === expected), `${packed.name} is missing ${expected}`);
    }
    tarballs[packed.name] = `file:${join(temporary, packed.filename)}`;
  }
  file(join(app, 'package.json'), JSON.stringify({
    name: 'satchel-installed-check', private: true, type: 'module',
    dependencies: tarballs,
    devDependencies: { vite: pinned('vite'), typescript: pinned('typescript'), '@types/node': pinned('@types/node') },
  }, null, 2));
  run('npm', ['install', '--no-audit', '--no-fund']);
  for (const name of Object.keys(tarballs)) {
    assert(!lstatSync(join(app, 'node_modules', name)).isSymbolicLink(), `${name} must be extracted from its tarball`);
  }
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { resolveSatchel, resolveSatchelModules } from '@dgtlss/satchel/manual';
    const module = { default: { name: 'manual' }, layout: { name: 'layout' } };
    const maps = { overridePath: '/overrides', overrides: {}, namespaces: [
      { namespace: 'manual', path: '/pages', extensions: ['ts'], pages: { '/pages/Index.ts': module } }
    ] };
    assert.equal(await resolveSatchel(() => module.default, maps)('manual::Index'), module.default);
    assert.equal(await resolveSatchelModules(() => module, maps)('manual::Index'), module);
  `]);

  file(join(vendor, 'Invoices/Show.ts'), 'export const layout = { name: "package-layout" }; export default { name: "vendor" };');
  file(join(vendor, 'Invoices/Index.ts'), 'export default { name: "package-index" };');
  const link = join(app, 'vendor/acme/billing');
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(dirname(vendor), link, 'dir');
  const overrides = join(app, 'resources/js/Pages/vendor');
  file(join(overrides, 'acme-billing/Invoices/Index.ts'), 'export default { name: "override" };');
  file(join(app, 'bootstrap/cache/satchel.json'), JSON.stringify({
    version: 1, override_path: overrides,
    namespaces: [{ namespace: 'acme-billing', path: join(link, 'Pages'), extensions: ['ts'] }],
  }));
  file(join(app, 'vite.config.ts'), `import { defineConfig } from 'vite';
import satchel from 'vite-plugin-satchel';
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [satchel({ eager: isSsrBuild })],
  ssr: { noExternal: ['@dgtlss/satchel'] },
  build: { target: 'es2022', outDir: isSsrBuild ? 'server' : 'client',
    ...(isSsrBuild ? {} : { lib: { entry: 'entry.ts', formats: ['es'], fileName: () => 'entry.js' } }) }
}));`);
  file(join(app, 'entry.ts'), `import { resolveSatchel, resolveSatchelModules } from '@dgtlss/satchel';
import { resolveSatchel as manual } from '@dgtlss/satchel/manual';
import type { SatchelPage } from './resources/js/satchel-pages';
type Component = { name: string };
export const resolve = resolveSatchel<Component>((name) => ({ name }));
export const modules = resolveSatchelModules<Component>((name) => ({ default: { name } }));
export const manualResolve = manual<Component>((name) => ({ name }), {
  overridePath: './overrides', overrides: {}, namespaces: []
});
export const registered: SatchelPage = 'acme-billing::Invoices/Show';
// @ts-expect-error Generated names must reject unregistered pages.
const missing: SatchelPage = 'acme-billing::Missing';
void missing;
`);
  file(join(app, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, skipLibCheck: true,
      types: ['vite/client', '@dgtlss/satchel/client', 'node'], noEmit: true,
    },
    include: ['entry.ts', 'vite.config.ts', 'resources/**/*.d.ts'],
  }));
  const vite = join(app, 'node_modules/vite/bin/vite.js');
  run(process.execPath, [vite, 'build']);
  run(process.execPath, [vite, 'build', '--ssr', 'entry.ts']);
  run(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '--noEmit']);
  // Fresh Node processes ensure neither build can fall back to workspace modules.
  for (const output of ['client', 'server']) {
    run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      const entry = await import('./${output}/entry.js');
      assert.deepEqual(await entry.resolve('acme-billing::Invoices/Show'), { name: 'vendor' });
      assert.deepEqual(await entry.resolve('acme-billing::Invoices/Index'), { name: 'override' });
      assert.deepEqual(await entry.resolve('Home'), { name: 'Home' });
      assert.deepEqual((await entry.modules('acme-billing::Invoices/Show')).layout, { name: 'package-layout' });
      assert.deepEqual(await entry.manualResolve('Home'), { name: 'Home' });
      await assert.rejects(entry.resolve('acme-billing::Missing'), /Tried paths:/);
    `]);
  }
  console.log('Packed installation passed: extracted packages, client/SSR builds, modules/layouts, overrides, manual entry, and generated types.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
