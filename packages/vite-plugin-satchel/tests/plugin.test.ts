import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, resolveConfig } from 'vite';
import satchel from '../src/index';
import { readManifest, manifestHint } from '../src/manifest';
import { generateDeclarations, generateModule, snapshot } from '../src/codegen';

let directory: string;
let root: string;
let vendor: string;
let overrides: string;
let manifestFile: string;
const resolverSource = fileURLToPath(new URL('../../satchel/src/manual.ts', import.meta.url));

function file(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function manifest(extra: Record<string, unknown> = {}) {
  const data = {
    version: 1, override_path: overrides,
    namespaces: [{ namespace: 'acme-billing', path: vendor, extensions: ['ts', 'vue'] }],
    ...extra,
  };
  file(manifestFile, JSON.stringify(data));
  return data;
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'satchel-vite-'));
  root = join(directory, 'app');
  vendor = join(directory, 'linked-package', 'Pages');
  overrides = join(root, 'resources/js/Pages/vendor');
  manifestFile = join(root, 'bootstrap/cache/satchel.json');
  mkdirSync(vendor, { recursive: true });
  file(join(vendor, 'Invoices/Show.ts'), 'export default { name: "vendor" };');
  manifest();
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('manifest and declarations', () => {
  it('gives the Artisan hint for a missing manifest', () => {
    rmSync(manifestFile);
    expect(() => readManifest(manifestFile)).toThrow('Manifest not found');
    expect(() => readManifest(manifestFile)).toThrow(manifestHint);
  });

  it.each([0, 2, '1', null])('rejects unsupported version %s with the Artisan hint', (version) => {
    manifest({ version });
    expect(() => readManifest(manifestFile)).toThrow('Unsupported manifest version');
    expect(() => readManifest(manifestFile)).toThrow(manifestHint);
  });

  it('rejects malformed JSON', () => {
    file(manifestFile, '{invalid');
    expect(() => readManifest(manifestFile)).toThrow('Cannot read JSON manifest');
  });

  it.each(['override path', 'namespaces array', 'namespace slug', 'package path', 'extension suffix'])('validates the manifest schema (%s)', (kind) => {
    const changes: Record<string, Record<string, unknown>> = {
      'override path': { override_path: 'relative' },
      'namespaces array': { namespaces: 'not an array' },
      'namespace slug': { namespaces: [{ namespace: '../bad', path: vendor, extensions: ['ts'] }] },
      'package path': { namespaces: [{ namespace: 'acme', path: 'relative', extensions: ['ts'] }] },
      'extension suffix': { namespaces: [{ namespace: 'acme', path: vendor, extensions: ['.ts'] }] },
    };
    manifest(changes[kind]);
    expect(() => readManifest(manifestFile)).toThrow('[Satchel]');
  });

  it('rejects duplicate registrations', () => {
    const entry = { namespace: 'acme', path: vendor, extensions: ['ts'] };
    manifest({ namespaces: [entry, entry] });
    expect(() => readManifest(manifestFile)).toThrow('Duplicate namespace');
  });

  it('generates sorted unique page names including app-only pages', () => {
    file(join(overrides, 'acme-billing/Invoices/Show.vue'), '<template>override</template>');
    file(join(overrides, 'acme-billing/Reports/Custom.vue'), '<template>custom</template>');
    file(join(vendor, 'README.md'), 'ignored');
    file(join(vendor, 'Invalid.Name.ts'), 'ignored');
    const data = snapshot(readManifest(manifestFile));
    expect(data.pageNames).toEqual(['acme-billing::Invoices/Show', 'acme-billing::Reports/Custom']);
    expect(generateDeclarations(data.pageNames)).toContain('| "acme-billing::Invoices/Show"');
    expect(generateDeclarations([])).toContain('SatchelPage = never;');
  });

  it('uses each namespaces extensions when generating app-only types', () => {
    manifest({ namespaces: [
      { namespace: 'first', path: vendor, extensions: ['vue'] },
      { namespace: 'second', path: vendor, extensions: ['ts'] },
    ] });
    file(join(overrides, 'first/NotSupported.ts'), 'export default {};');
    expect(snapshot(readManifest(manifestFile)).pageNames).not.toContain('first::NotSupported');
  });

  it('skips directory symlinks and rejects escaping file symlinks', () => {
    file(join(directory, 'outside/Hidden.ts'), 'export default {};');
    symlinkSync(join(directory, 'outside'), join(vendor, 'linked'), 'dir');
    const data = snapshot(readManifest(manifestFile));
    expect(data.pageNames).not.toContain('acme-billing::linked/Hidden');
    expect(generateModule(data, root, false)).toContain('!../linked-package/Pages/linked/**');
    symlinkSync(join(directory, 'outside/Hidden.ts'), join(vendor, 'Escaped.ts'));
    expect(() => snapshot(readManifest(manifestFile))).toThrow('escapes its registered page directory');
  });

  it('canonicalizes a symlinked Composer path repository and extends fs.allow', async () => {
    const link = join(root, 'vendor/acme/billing');
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(dirname(vendor), link, 'dir');
    manifest({ namespaces: [{ namespace: 'acme-billing', path: join(link, 'Pages'), extensions: ['ts'] }] });
    const config = await resolveConfig({ configFile: false, root, plugins: [satchel()], server: { fs: { allow: [root] } } }, 'serve');
    expect(config.server.fs.allow).toContain(vendor);
    expect(config.server.fs.allow).toContain(root);
    expect(readFileSync(join(root, 'resources/js/satchel-pages.d.ts'), 'utf8')).toContain('acme-billing::Invoices/Show');
  });

  it('accepts a configurable manifest location and disables declaration output', async () => {
    const custom = join(root, 'custom/pages.json');
    file(custom, readFileSync(manifestFile, 'utf8'));
    rmSync(manifestFile);
    await resolveConfig({ configFile: false, root, plugins: [satchel({ manifest: 'custom/pages.json', dts: false })] }, 'build');
    expect(existsSync(join(root, 'resources/js/satchel-pages.d.ts'))).toBe(false);
  });
});

describe('literal glob code generation', () => {
  it.each([false, true])('builds and resolves real globs outside the app root (eager=%s)', async (eager) => {
    file(join(vendor, 'Invoices/Index.ts'), 'export default { name: "vendor-index" };');
    file(join(overrides, 'acme-billing/Invoices/Index.ts'), 'export default { name: "override" };');
    // These would fail the real build if glob exclusions stopped matching PHP.
    file(join(vendor, 'Invalid.Name.ts'), 'invalid syntax that must never compile');
    file(join(directory, 'outside/Broken.ts'), 'invalid syntax that must never compile');
    symlinkSync(join(directory, 'outside'), join(vendor, 'linked'), 'dir');
    file(join(overrides, 'unregistered/Broken.ts'), 'invalid syntax that must never compile');
    const other = join(directory, 'other');
    mkdirSync(other);
    manifest({ namespaces: [
      { namespace: 'acme-billing', path: vendor, extensions: ['ts', 'vue'] },
      { namespace: 'other', path: other, extensions: ['jsx'] },
    ] });
    file(join(overrides, 'acme-billing/Unsupported.jsx'), 'invalid syntax that must never compile');
    const generated = generateModule(snapshot(readManifest(manifestFile)), root, eager);
    expect(generated).toContain('import.meta.glob(["./resources/js/Pages/vendor/acme-billing/**/*.ts"');
    expect(generated).toContain('"../linked-package/Pages/**/*.ts"');
    expect(generated).toContain(`eager: ${eager}`);
    file(join(root, 'entry.ts'), `import pages from 'virtual:satchel/pages';
import { resolveSatchel } from ${JSON.stringify(resolverSource)};
export const resolve = resolveSatchel((name) => ({ name }), pages);`);
    await build({
      configFile: false, root, logLevel: 'silent', plugins: [satchel({ eager })],
      build: { minify: false, lib: { entry: join(root, 'entry.ts'), formats: ['es'], fileName: () => 'entry.mjs' } },
    });
    const result = await import(pathToFileURL(join(root, 'dist/entry.mjs')).href);
    expect(await result.resolve('acme-billing::Invoices/Show')).toEqual({ name: 'vendor' });
    expect(await result.resolve('acme-billing::Invoices/Index')).toEqual({ name: 'override' });
    expect(await result.resolve('Home')).toEqual({ name: 'Home' });
    expect(readFileSync(join(root, 'dist/entry.mjs'), 'utf8')).not.toContain('import.meta.glob');
  });

  it('builds manual mode without installing the Satchel Vite plugin', async () => {
    file(join(root, 'entry.ts'), `import { resolveSatchel } from ${JSON.stringify(resolverSource)};
export const resolve = resolveSatchel((name) => ({ name }), {
  overridePath: './overrides', overrides: {},
  namespaces: [{ namespace: 'manual', path: '../linked-package/Pages', extensions: ['ts'],
    pages: import.meta.glob('../linked-package/Pages/**/*.ts') }]
});`);
    await build({
      configFile: false, root, logLevel: 'silent',
      build: { lib: { entry: join(root, 'entry.ts'), formats: ['es'], fileName: () => 'entry.mjs' } },
    });
    const result = await import(pathToFileURL(join(root, 'dist/entry.mjs')).href);
    expect(await result.resolve('manual::Invoices/Show')).toEqual({ name: 'vendor' });
  });
});
