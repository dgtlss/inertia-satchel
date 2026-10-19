import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

declare global { interface Window { satchelHmrMarker?: string } }

const root = fileURLToPath(new URL('..', import.meta.url));
const vendor = fileURLToPath(new URL('../tests/Fixtures/AcmeBilling/resources/js/Pages/Invoices/Show.vue', import.meta.url));
const override = fileURLToPath(new URL('../examples/laravel/resources/js/Pages/vendor/acme-billing/Invoices/Index.vue', import.meta.url));
const manifest = fileURLToPath(new URL('../examples/laravel/bootstrap/cache/satchel.json', import.meta.url));

async function devServer(): Promise<ChildProcess> {
  const child = spawn('npm', ['run', 'dev:example'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout?.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-8000); });
  child.stderr?.on('data', (data: Buffer) => { output = (output + data.toString()).slice(-8000); });
  try {
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(`Vite exited: ${output}`);
      try { return (await fetch('http://127.0.0.1:5173/@vite/client')).ok; } catch { return false; }
    }, { timeout: 30_000 }).toBe(true);
  } catch (error) {
    if (child.pid) process.kill(-child.pid, 'SIGTERM');
    throw new Error(`Vite did not start: ${output}`, { cause: error });
  }
  return child;
}

test('Vue vendor pages, overrides, props, layouts, Tailwind, and live development', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const vendorSource = await readFile(vendor, 'utf8');
  const overrideSource = await readFile(override, 'utf8');
  const manifestSource = await readFile(manifest, 'utf8');
  let vite: ChildProcess | undefined;
  try {
    // The webServer command built production assets before starting Laravel.
    await page.goto('/billing/invoices/42');
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
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
    await page.getByTestId('layout-counter').click();
    await page.evaluate(() => { window.satchelHmrMarker = 'same document'; });
    await writeFile(vendor, vendorSource.replace('>Package invoice<', '>Package invoice HMR<'));
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice HMR');
    expect(await page.evaluate(() => window.satchelHmrMarker)).toBe('same document');
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');

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
    await writeFile(override, overrideSource);
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    expect(errors).toEqual([]);
  } finally {
    await writeFile(vendor, vendorSource);
    await writeFile(override, overrideSource);
    await writeFile(manifest, manifestSource);
    await rm(`${manifest}.tmp`, { force: true });
    if (vite?.pid && vite.exitCode === null) {
      const exited = new Promise<void>((resolve) => vite!.once('exit', () => resolve()));
      process.kill(-vite.pid, 'SIGTERM');
      await exited;
    }
    await rm(fileURLToPath(new URL('../examples/laravel/public/hot', import.meta.url)), { force: true });
  }
});
