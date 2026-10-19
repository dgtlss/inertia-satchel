import { expect, test } from '@playwright/test';

declare global { interface Window { satchelSsrNode?: Element | null } }

test('Vue SSR sends real HTML for vendor, override and app pages without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:8000/billing/invoices/42');
    await expect(page.getByTestId('vendor-page')).toHaveText('Package invoice');
    await expect(page.getByTestId('invoice-prop')).toHaveText('INV-0042');
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

test('Vue hydrates the server DOM, navigates with layouts, and isolates request state', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text())) errors.push(message.text());
  });
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/build/assets/*.js', async (route) => { await scripts; await route.continue(); });
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
    await expect(page.getByTestId('layout-counter')).toHaveText('Layout count: 1');

    // A fresh request through the same long-lived renderer starts a fresh layout.
    const fresh = await request.get('/billing/invoices/42');
    expect(fresh.ok()).toBe(true);
    expect(await fresh.text()).toMatch(/data-testid="layout-counter"[^>]*>Layout count: 0</);
    await page.getByRole('link', { name: 'Invoices', exact: true }).click();
    await expect(page.getByTestId('override-page')).toHaveText('App invoice list override');
    await expect(page.getByTestId('app-layout')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
