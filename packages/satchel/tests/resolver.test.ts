import { describe, expect, it, vi } from 'vitest';
import { resolveSatchel, resolveSatchelModules } from '../src/manual';
import type { PageGlob, PageModule, SatchelPages } from '../src/types';

interface Component { name: string; layout?: object }
const vendor = { name: 'vendor' };
const override = { name: 'override' };

function maps(overrides: PageGlob<Component> = {}, files: PageGlob<Component> = {}): SatchelPages<Component> {
  return {
    overridePath: './Pages/vendor',
    overrides,
    namespaces: [{
      namespace: 'acme-billing', path: '../../vendor/billing/Pages',
      extensions: ['vue', 'tsx'], pages: files,
    }],
  };
}

describe('manual resolver', () => {
  it.each([false, true])('preserves the entire winning module and its named layout (eager=%s)', async (eager) => {
    const layout = {};
    const module: PageModule<Component> = { default: override, layout };
    const vendorModule = { default: vendor, layout: {} };
    const resolve = resolveSatchelModules(() => vendorModule, maps(
      { './Pages/vendor/acme-billing/Index.vue': eager ? module : async () => module },
      { '../../vendor/billing/Pages/Index.vue': vendorModule },
    ));
    expect(await resolve('acme-billing::Index')).toBe(module);
    expect(module.layout).toBe(layout);
  });

  it('delegates app module resolution with arguments and preserves named exports', async () => {
    const module = { default: vendor, layout: {} };
    const app = vi.fn((_name: string, _props: object) => module);
    const resolve = resolveSatchelModules(app, maps());
    const props = {};
    expect(await resolve('Home', props)).toBe(module);
    expect(app).toHaveBeenCalledExactlyOnceWith('Home', props);
  });

  it('applies the same errors to module resolution', async () => {
    const resolve = resolveSatchelModules(() => ({ default: vendor }), maps());
    await expect(resolve('acme-billing::Missing')).rejects.toThrow('Tried paths:');
    await expect(resolve('acme-billing::../Invalid')).rejects.toThrow('Invalid component');
  });

  it('delegates regular names with all original arguments', async () => {
    const app = vi.fn((name: string, page: { url: string }) => ({ name: name + page.url }));
    const resolve = resolveSatchel(app, maps());
    const page = { url: '/home' };
    await expect(resolve('Home', page)).resolves.toEqual({ name: 'Home/home' });
    expect(app).toHaveBeenCalledExactlyOnceWith('Home', page);
  });

  it('loads a lazy vendor module and preserves its component and layout identity', async () => {
    const layout = {};
    const page = { name: 'vendor', layout };
    const load = vi.fn(async () => ({ default: page }));
    const app = vi.fn();
    const resolve = resolveSatchel(app, maps({}, { '../../vendor/billing/Pages/Invoices/Index.vue': load }));
    expect(await resolve('acme-billing::Invoices/Index')).toBe(page);
    expect((await resolve('acme-billing::Invoices/Index')).layout).toBe(layout);
    expect(app).not.toHaveBeenCalled();
  });

  it.each(['vue', 'tsx'])('prefers every app override before vendor extensions (%s)', async (extension) => {
    const resolve = resolveSatchel(() => vendor, maps(
      { [`./Pages/vendor/acme-billing/Invoices/Index.${extension}`]: { default: override } },
      { '../../vendor/billing/Pages/Invoices/Index.vue': { default: vendor } },
    ));
    expect(await resolve('acme-billing::Invoices/Index')).toBe(override);
  });

  it('uses extension order within the winning source', async () => {
    const resolve = resolveSatchel(() => vendor, maps({
      './Pages/vendor/acme-billing/Index.tsx': { default: vendor },
      './Pages/vendor/acme-billing/Index.vue': { default: override },
    }));
    expect(await resolve('acme-billing::Index')).toBe(override);
  });

  it('supports eager module maps and app-only pages', async () => {
    const resolve = resolveSatchel(() => vendor, maps({
      './Pages/vendor/acme-billing/Custom.vue': { default: override },
    }));
    expect(await resolve('acme-billing::Custom')).toBe(override);
  });

  it('does not invoke eager functional components as import functions', async () => {
    const functional = vi.fn();
    const resolve = resolveSatchel(() => functional, {
      overridePath: '/overrides', overrides: {},
      namespaces: [{ namespace: 'fn', path: '/vendor', extensions: ['vue'], pages: { '/vendor/Index.vue': { default: functional } } }],
    });
    expect(await resolve('fn::Index')).toBe(functional);
    expect(functional).not.toHaveBeenCalled();
  });

  it('keeps namespaces with identical page names separate', async () => {
    const data = maps({}, { '../../vendor/billing/Pages/Index.vue': { default: vendor } });
    data.namespaces = [...data.namespaces, {
      namespace: 'other', path: '/other', extensions: ['vue'], pages: { '/other/Index.vue': { default: override } },
    }];
    const resolve = resolveSatchel(() => vendor, data);
    expect(await resolve('acme-billing::Index')).toBe(vendor);
    expect(await resolve('other::Index')).toBe(override);
  });

  it('normalizes Windows glob keys without changing case', async () => {
    const resolve = resolveSatchel(() => vendor, {
      overridePath: 'C:\\app\\Pages\\vendor',
      overrides: { 'C:\\app\\Pages\\vendor\\acme-billing\\Index.vue': { default: override } },
      namespaces: [{ namespace: 'acme-billing', path: 'C:/package', extensions: ['vue'], pages: {} }],
    });
    expect(await resolve('acme-billing::Index')).toBe(override);
    await expect(resolve('acme-billing::index')).rejects.toThrow('was not found');
  });

  it('lists every attempted override and vendor path in precedence order', async () => {
    const resolve = resolveSatchel(() => vendor, maps());
    await expect(resolve('acme-billing::Missing')).rejects.toThrow([
      '[Satchel] Page [acme-billing::Missing] was not found. Tried paths:',
      '  - Pages/vendor/acme-billing/Missing.vue',
      '  - Pages/vendor/acme-billing/Missing.tsx',
      '  - ../../vendor/billing/Pages/Missing.vue',
      '  - ../../vendor/billing/Pages/Missing.tsx',
    ].join('\n'));
  });

  it('reports unknown namespaces without delegating them to the app', async () => {
    const app = vi.fn();
    await expect(resolveSatchel(app, maps())('unknown::Index')).rejects.toThrow('Registered: acme-billing');
    expect(app).not.toHaveBeenCalled();
  });

  it.each(['ns::../Index', 'ns::Index.vue', 'ns::/Index', 'ns::A//Index', 'ns::A\\Index', 'ns::A::B', 'NS::Index', 'ns::'])('rejects invalid component %s', async (name) => {
    await expect(resolveSatchel(() => vendor, maps())(name)).rejects.toThrow('Invalid component');
  });

  it('reports a module without a default export', async () => {
    const resolve = resolveSatchel(() => vendor, maps({}, {
      '../../vendor/billing/Pages/Index.vue': {} as { default: Component },
    }));
    await expect(resolve('acme-billing::Index')).rejects.toThrow('no default component export');
  });

  it('preserves import failures for diagnosis', async () => {
    const error = new Error('failed to fetch page');
    const resolve = resolveSatchel(() => vendor, maps({}, {
      '../../vendor/billing/Pages/Index.vue': async () => { throw error; },
    }));
    await expect(resolve('acme-billing::Index')).rejects.toBe(error);
  });
});
