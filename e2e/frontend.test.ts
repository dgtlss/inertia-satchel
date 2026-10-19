import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

declare global { interface Window { satchelHmrMarker?: string } }

const root = fileURLToPath(new URL('..', import.meta.url));
const framework = process.env.SATCHEL_FRAMEWORK ?? 'vue';
const directory = framework === 'vue' ? 'js' : framework;
const extension = framework === 'react' ? 'tsx' : framework;
const vendor = fileURLToPath(new URL(`../tests/Fixtures/AcmeBilling/resources/${directory}/Pages/Invoices/Show.${extension}`, import.meta.url));
const override = fileURLToPath(new URL(`../examples/laravel/resources/${directory}/Pages/vendor/acme-billing/Invoices/Index.${extension}`, import.meta.url));
const manifest = fileURLToPath(new URL('../examples/laravel/bootstrap/cache/satchel.json', import.meta.url));
const vendorIndex = fileURLToPath(new URL(`../tests/Fixtures/AcmeBilling/resources/${directory}/Pages/Invoices/Index.${extension}`, import.meta.url));

async function devServer(): Promise<{ child: ChildProcess; output: () => string }> {
  const child = spawn('npm', ['run', 'dev:example'], {
    cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    // This child intentionally tests HMR in CI; Laravel otherwise forbids serve.
    env: { ...process.env, LARAVEL_BYPASS_ENV_CHECK: '1' },
  });
  let output = '';
  child.stdout?.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-8000); });
  child.stderr?.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-8000); });
  try {
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(`Vite exited: ${output}`);
      try { return (await fetch('http://127.0.0.1:5173/@vite/client')).ok; } catch { return false; }
    }, { timeout: 30_000 }).toBe(true);
  } catch (error) {
    stop(child);
    throw new Error(`Vite did not start: ${output}`, { cause: error });
  }
  return { child, output: () => output };
}

function stop(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

test(`${framework}: vendor pages, overrides, props, layouts, Tailwind, and live development`, async ({ page }) => {
  const errors: string[] = [];
  const updates: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('websocket', (socket) => socket.on('framereceived', ({ payload }) => updates.push(String(payload))));
  const vendorSource = await readFile(vendor, 'utf8');
  const indexSource = await readFile(vendorIndex, 'utf8');
  const overrideSource = await readFile(override, 'utf8');
  const manifestSource = await readFile(manifest, 'utf8');
  let vite: Awaited<ReturnType<typeof devServer>> | undefined;
  try {
    // All adapters run the same behavior checks with their real Vite compiler.
    await page.goto('/billing/invoices/42');
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('invoice-prop')).toHaveText('INV-0042');
    await expect(page.getByTestId('vendor-layout')).toBeVisible();
    await expect(page.getByTestId('vendor-card')).toHaveCSS('padding-top', '28px');
    await expect(page.getByTestId('vendor-card')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.getByTestId('layout-counter').click();
    await page.getByRole('link', { name: 'Next invoice' }).click();
    await expect(page.getByTestId('invoice-prop')).toHaveText('INV-0043');
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');
    await page.getByRole('link', { name: 'Invoices', exact: true }).click();
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    await expect(page.getByTestId('app-layout')).toBeVisible();
    await expect(page.getByRole('link', { name: 'INV-0042' })).toBeVisible();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-prop')).toHaveText('Props from Laravel');

    vite = await devServer();
    await page.goto('/billing/invoices/42');
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('layout-counter').click();
    await page.evaluate(() => { window.satchelHmrMarker = 'same document'; });
    await writeFile(vendor, vendorSource.replace('>Package invoice<', '>Package invoice HMR<'));
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice HMR');
    if (framework === 'svelte') {
      // vite-plugin-svelte accepts only default; named layout exports bubble a reload.
      expect(updates.some((message) => {
        const event = JSON.parse(message);
        return event.type === 'full-reload' && String(event.triggeredBy).endsWith('Show.svelte');
      })).toBe(true);
      expect(await page.evaluate(() => window.satchelHmrMarker)).toBeUndefined();
      await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 0');
      await page.getByTestId('layout-counter').click();
    } else {
      expect(await page.evaluate(() => window.satchelHmrMarker)).toBe('same document');
      await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');
    }
    await page.evaluate(() => { window.satchelHmrMarker = 'before manifest'; });

    // Match PHP's atomic manifest write; this must reload, not retain stale maps.
    await writeFile(`${manifest}.tmp`, `${manifestSource}\n`);
    await rename(`${manifest}.tmp`, manifest);
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 0');
    expect(await page.evaluate(() => window.satchelHmrMarker)).toBeUndefined();

    const removed = page.waitForEvent('load');
    await rm(override);
    await removed;
    await page.goto('/billing/invoices');
    await expect(page.getByRole('heading', { name: 'Package invoices', exact: true })).toBeVisible();
    if (framework === 'svelte') {
      // Default-only Svelte pages still hot update without replacing the document.
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => { window.satchelHmrMarker = 'default-only page'; });
      await writeFile(vendorIndex, indexSource.replace('>Package invoices<', '>Package invoices HMR<'));
      await expect(page.getByRole('heading', { name: 'Package invoices HMR', exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.satchelHmrMarker)).toBe('default-only page');
    }
    await writeFile(override, overrideSource);
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    expect(errors).toEqual([]);
  } finally {
    await writeFile(vendor, vendorSource);
    await writeFile(vendorIndex, indexSource);
    await writeFile(override, overrideSource);
    await writeFile(manifest, manifestSource);
    await rm(`${manifest}.tmp`, { force: true });
    await test.info().attach('vite-updates.json', { body: JSON.stringify(updates, null, 2), contentType: 'application/json' });
    if (vite) await test.info().attach('vite-dev.log', { body: vite.output(), contentType: 'text/plain' });
    if (vite?.child.pid && vite.child.exitCode === null) {
      const exited = new Promise<void>((resolve) => vite!.child.once('exit', () => resolve()));
      stop(vite.child);
      await exited;
    }
    await rm(fileURLToPath(new URL('../examples/laravel/public/hot', import.meta.url)), { force: true });
  }
});
