import { expect, test } from '@playwright/test';
import type { Page as InertiaPage } from '@inertiajs/core';
import { cp, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

declare global { interface Window { satchelSsrNode?: Element | null } }

const framework = process.env.SATCHEL_FRAMEWORK ?? 'vue';
const devSsr = process.env.SATCHEL_DEV_SSR === 'true';
const endpoint = devSsr ? 'http://127.0.0.1:5173/__inertia_ssr' : 'http://127.0.0.1:13714/render';

test(`${framework} SSR sends real HTML for vendor, override and app pages without JavaScript`, async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:8000/billing/invoices/42');
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
    await expect(page.getByTestId('invoice-prop')).toHaveText('INV-0042');
    await expect(page.getByTestId('layout-reference')).toHaveText('INV-0042');
    await expect(page).toHaveTitle('INV-0042');
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 0');
    await page.goto('http://127.0.0.1:8000/billing/invoices');
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    await expect(page.getByTestId('app-layout')).toBeVisible();
    await expect(page.getByRole('link', { name: 'INV-0042' })).toBeVisible();
    await page.goto('http://127.0.0.1:8000/');
    await expect(page.getByTestId('home-prop')).toHaveText('Props from Laravel');
  } finally {
    await context.close();
  }
});

test(`${framework} hydrates the server DOM, navigates with layouts, and isolates request state`, async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text())) errors.push(message.text());
  });
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  await page.route(devSsr ? 'http://127.0.0.1:5173/**' : '**/build/assets/*.js', async (route) => {
    if (route.request().resourceType() === 'script') await scripts;
    await route.continue();
  });
  try {
    await page.goto('/billing/invoices/42', { waitUntil: 'commit' });
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
    await page.evaluate(() => { window.satchelSsrNode = document.querySelector('[data-testid="vendor-page"]'); });
    release();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('layout-counter').click();
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');
    expect(await page.evaluate(() => window.satchelSsrNode === document.querySelector('[data-testid="vendor-page"]'))).toBe(true);
    await page.getByRole('link', { name: 'Next invoice' }).click();
    await expect(page.getByTestId('invoice-prop')).toHaveText('INV-0043');
    await expect(page.getByTestId('layout-reference')).toHaveText('INV-0043');
    await expect(page).toHaveTitle('INV-0043');
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');

    // A fresh request through the same long-lived renderer starts a fresh layout.
    const fresh = await request.get('/billing/invoices/42');
    expect(fresh.ok()).toBe(true);
    const text = await page.evaluate((html) => new DOMParser().parseFromString(html, 'text/html')
      .querySelector('[data-testid="layout-counter"]')?.textContent?.trim(), await fresh.text());
    expect(text).toBe('Layout count: 0');
    await page.getByRole('link', { name: 'Invoices', exact: true }).click();
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    await expect(page.getByTestId('app-layout')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test(`${framework} SSR keeps page props and layout page context isolated across concurrent requests`, async ({ page, request }) => {
  // Exercise the public renderer directly so PHP's single-threaded dev server
  // cannot serialize these requests before they reach the shared Node process.
  const initial: Pick<InertiaPage, 'component' | 'props' | 'url' | 'version'> = {
    component: 'acme-billing::Invoices/Show', props: { errors: {} },
    url: '/billing/invoices/42', version: null,
  };
  const rendered = await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const reference = `REQUEST-${index}`;
    const result = await request.post(endpoint, {
      data: { ...initial, url: `/billing/invoices/${index}`, props: { ...initial.props, invoice: { id: index, reference } } },
    });
    expect(result.ok()).toBe(true);
    return { reference, data: await result.json() };
  }));
  for (const { reference, data } of rendered) {
    const values = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      return ['invoice-prop', 'layout-reference', 'layout-counter'].map((id) =>
        document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim());
    }, data.body);
    expect(values).toEqual([reference, reference, 'Layout count: 0']);
    expect(data.head.join('')).toContain(reference);
  }
});

if (devSsr) {
  test(`${framework} dev SSR refreshes edited pages, overrides and atomic registrations in HTML and the browser`, async ({ browser, page }) => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const directory = framework === 'vue' ? 'js' : framework;
    const extension = framework === 'react' ? 'tsx' : framework;
    const fixture = join(root, `tests/Fixtures/AcmeBilling/resources/${directory}`);
    const vendor = join(fixture, `Pages/Invoices/Show.${extension}`);
    const override = join(root, `examples/laravel/resources/${directory}/Pages/vendor/acme-billing/Invoices/Index.${extension}`);
    const manifest = join(root, 'examples/laravel/bootstrap/cache/satchel.json');
    const [vendorSource, overrideSource, manifestSource] = await Promise.all([
      readFile(vendor, 'utf8'), readFile(override, 'utf8'), readFile(manifest, 'utf8'),
    ]);
    const temporary = await mkdtemp(join(tmpdir(), 'satchel-dev-ssr-'));
    const context = await browser.newContext({ javaScriptEnabled: false });
    const raw = await context.newPage();
    const errors: string[] = [];
    const updates: { type?: string; path?: string; triggeredBy?: string; generation: number }[] = [];
    let connections = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('websocket', (socket) => socket.on('framereceived', ({ payload }) => {
      try {
        const event = JSON.parse(String(payload));
        if (event.type === 'connected') connections++;
        updates.push({ ...event, generation: connections });
      } catch { /* Non-JSON keepalive. */ }
    }));
    const pageEdit = async (source: string) => {
      const before = connections;
      const loaded = framework === 'svelte' ? page.waitForEvent('load') : undefined;
      await writeFile(vendor, source);
      if (loaded) {
        await loaded;
        await expect.poll(() => connections).toBeGreaterThan(before);
      }
      await page.waitForLoadState('networkidle');
    };
    const reloads = () => updates.filter((event) => event.type === 'full-reload'
      && event.path === '*' && event.triggeredBy === undefined);
    const registrationChange = async (change: () => Promise<void>) => {
      await page.waitForLoadState('networkidle');
      const before = reloads().length;
      await change();
      // Match a browser's ordering: render after Satchel has read the new map
      // and invalidated it, rather than inside the file watch debounce window.
      await expect.poll(() => reloads().length).toBeGreaterThan(before);
      const signal = reloads()[before];
      if (!signal) throw new Error('The Satchel reload signal was not received.');
      // A cached networkidle state can still belong to the old document.
      // Wait for the new document's Vite socket before the next mutation.
      await expect.poll(() => connections).toBeGreaterThan(signal.generation);
      await page.waitForLoadState('networkidle');
    };
    const heading = async (url: string) => {
      await raw.goto(`http://127.0.0.1:8000${url}`);
      return raw.locator('h1').textContent();
    };
    try {
      expect(await heading('/billing/invoices/42')).toBe('Package invoice');
      await page.goto('/billing/invoices/42');
      await page.waitForLoadState('networkidle');
      await expect.poll(() => connections).toBeGreaterThan(0);
      await pageEdit(vendorSource.replace('>Package invoice<', '>Package invoice live SSR<'));
      await expect.poll(() => heading('/billing/invoices/42')).toBe('Package invoice live SSR');
      await pageEdit(vendorSource);

      await registrationChange(() => rm(override));
      await expect.poll(() => heading('/billing/invoices')).toBe('Package invoices');
      await registrationChange(() => writeFile(override, overrideSource));
      await expect.poll(() => heading('/billing/invoices')).toBe('App invoice list override');

      // A replacement registration is outside both the app and the workspace.
      // Preserve its relative layout imports and use the same installed peers.
      const alternate = join(temporary, 'billing');
      await cp(fixture, alternate, { recursive: true });
      await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
      await writeFile(join(alternate, `Pages/Invoices/Show.${extension}`),
        vendorSource.replace('>Package invoice<', '>Alternate registration<'));
      const data = JSON.parse(manifestSource);
      const registration = data.namespaces.find((entry: { namespace: string; path: string }) => entry.namespace === 'acme-billing');
      registration.path = join(alternate, 'Pages');
      await registrationChange(async () => {
        await writeFile(`${manifest}.tmp`, JSON.stringify(data));
        await rename(`${manifest}.tmp`, manifest);
      });
      await expect.poll(() => heading('/billing/invoices/42')).toBe('Alternate registration');

      await expect(page.getByTestId('vendor-page')).toHaveText('Alternate registration');
      await expect(page.getByTestId('layout-reference')).toHaveText('INV-0042');
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
      await page.getByTestId('layout-counter').click();
      await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await writeFile(vendor, vendorSource);
      await writeFile(override, overrideSource);
      await writeFile(manifest, manifestSource);
      await rm(`${manifest}.tmp`, { force: true });
      await rm(temporary, { recursive: true, force: true });
    }
  });
}
