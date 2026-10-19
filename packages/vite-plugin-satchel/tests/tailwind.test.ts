import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

let directory: string | undefined;
afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

it('Tailwind v4 @source includes a symlinked vendor page that automatic scanning excludes', async () => {
  directory = mkdtempSync(join(tmpdir(), 'satchel-tailwind-'));
  const root = join(directory, 'app');
  const vendor = join(directory, 'package');
  mkdirSync(join(root, 'vendor/acme'), { recursive: true });
  mkdirSync(vendor);
  symlinkSync(vendor, join(root, 'vendor/acme/billing'), 'dir');
  writeFileSync(join(vendor, 'Show.vue'), '<template><div class="bg-fuchsia-700 p-7">Vendor</div></template>');
  const css = join(root, 'resources/css/app.css');
  mkdirSync(dirname(css), { recursive: true });
  const source = '@import "tailwindcss" source(none);\n@source "../../vendor/acme/billing";\n';
  const buildCss = async (input: string) => {
    writeFileSync(css, input);
    await build({
      configFile: false, root, logLevel: 'silent', plugins: [tailwindcss()],
      resolve: { alias: { tailwindcss: createRequire(import.meta.url).resolve('tailwindcss/index.css') } },
      build: { minify: false, cssMinify: false, rollupOptions: { input: css } },
    });
    const assets = join(root, 'dist/assets');
    const output = readdirSync(assets).find((name) => name.endsWith('.css'))!;
    return readFileSync(join(assets, output), 'utf8');
  };
  expect(await buildCss(source)).toContain('.bg-fuchsia-700');
  expect(await buildCss(source.replace('@source "../../vendor/acme/billing";', ''))).not.toContain('.bg-fuchsia-700');
});
