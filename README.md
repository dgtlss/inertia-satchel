# Satchel

Blade-style vendor pages for **Inertia v3**, **Laravel 12/13**, and **PHP 8.3+**. MIT licensed; Composer package name: `dgtlss/satchel`.

**Unreleased: Vue, React, Svelte, and SSR.** Registration, resolution, manifests, Artisan commands, the TypeScript resolvers, and the Vite plugin are implemented. All three adapters have client rendering, production SSR, and development SSR checks, including hydration and request isolation. Nothing has been published to Composer or npm.

## Register package pages

Satchel's provider is auto-discovered. A package registers its pages in its service provider's `boot()` method:

```php
use Dgtlss\Satchel\Facades\Satchel;

public function boot(): void
{
    Satchel::pages('acme-billing', __DIR__.'/../resources/js/Pages');
}
```

Namespaces are unique lowercase slugs (letters, digits, single `-` or `_` separators, starting with a letter). Paths must be existing readable directories and are canonicalized to absolute paths. Invalid configuration throws `InvalidArgumentException`; duplicate registration throws `LogicException`.

Render through the normal Inertia API:

```php
use Inertia\Inertia;

return Inertia::render('acme-billing::Invoices/Index', ['invoices' => $invoices]);
```

Satchel checks **every app override extension first**, then the package's extensions, in this default order: `vue`, `tsx`, `jsx`, `svelte`, `ts`, `js`.

1. `resources/js/Pages/vendor/acme-billing/Invoices/Index.*`
2. The registered package directory's `Invoices/Index.*`

An app `.tsx` override beats a package `.vue` page. Nested, extensionless page names support letters, digits, `_`, `-`, and `/`. Traversal, extensions in component names, and symlinks escaping a declared page root are rejected. Directory symlinks are not followed during inventory scans. App-only pages in a registered namespace are supported; they have no package source to publish or compare for drift.

The response's `component` remains **`acme-billing::Invoices/Index`** for either source. No absolute filesystem path is sent in the Inertia response. The JavaScript resolver uses the same manifest and precedence rules. Regular app component names, props, partial reloads, enums, and Inertia's optional strict page checks continue to work.

## Commands and configuration

```sh
php artisan satchel:manifest
php artisan satchel:list
php artisan satchel:publish 'acme-billing::Invoices/Index'
php artisan satchel:publish --all
php artisan satchel:publish 'acme-billing::Invoices/Index' --force
```

`satchel:list` shows the component, package source, resolved source, override status, and drift. Drift means the override's **SHA-256 hash differs from the current package page**; an intentional customization also counts as drift. It does not claim to distinguish app edits from upstream changes. Identical copied pages are overridden without drift; app-only pages show `n/a` for drift.

`satchel:publish` copies pages into the override directory and preserves existing overrides by default, including overrides using another extension. `--force` replaces the page and removes alternate extension overrides for that page so the published source actually takes effect. `--all` publishes shipped pages across all registered namespaces. Dependencies, layouts, and other assets are not copied.

Publishing refuses symlinks beneath the override root, including links to another file inside that root, to avoid modifying a shared target. Remove such an override link before publishing over it.

The configuration is publishable using the standard Laravel config mechanism:

```sh
php artisan vendor:publish --tag=satchel-config
```

```php
// config/satchel.php
return [
    'extensions' => ['vue', 'tsx', 'jsx', 'svelte', 'ts', 'js'],
    'override_path' => resource_path('js/Pages/vendor'),
    'manifest_path' => app()->bootstrapPath('cache/satchel.json'),
];
```

Configure extensions before registering pages; each registration retains its extension order. Override and manifest locations must be absolute paths. Satchel resolves from the live filesystem rather than a cached manifest, so new overrides take effect immediately on the PHP side.

## Manifest

`satchel:manifest` writes deterministic JSON with atomic replacement. Successful `package:discover` also regenerates it, including providers discovered for the first time during that command. No manifest is written on ordinary HTTP requests.

```json
{
    "version": 1,
    "override_path": "/app/resources/js/Pages/vendor",
    "namespaces": [
        {
            "namespace": "acme-billing",
            "path": "/app/vendor/acme/billing/resources/js/Pages",
            "extensions": ["vue", "tsx", "jsx", "svelte", "ts", "js"]
        }
    ]
}
```

Namespace entries are sorted. Paths use forward slashes; extensions have no leading dot and retain their precedence. Empty registrations produce `"namespaces": []`. The manifest is local build input, contains machine-specific paths, and should not be committed or served publicly. Regenerate it on the build machine after dependencies are installed and whenever providers or configuration change. Configure the Vite plugin's `manifest` option when the location differs from the default.

## JavaScript setup

The npm workspaces are `packages/satchel` (`@dgtlss/satchel`) and `packages/vite-plugin-satchel` (`vite-plugin-satchel`). With Vue's Vite plugin, enable `satchel()` and wrap the app's existing resolver:

```ts
import { resolveSatchel } from '@dgtlss/satchel';

createInertiaApp({
  resolve: resolveSatchel(existingAppResolver),
  // Keep the application's setup callback.
});
```

The plugin reads the PHP manifest, provides `virtual:satchel/pages`, generates the `SatchelPage` type union, and handles watches/filesystem access for package pages. Use `@dgtlss/satchel/manual` for explicit glob maps without the plugin. Vue and React page layout properties are preserved. Svelte uses `resolveSatchelModules(existingAppResolver)` to retain the full module, including its named `layout` export. Tailwind v4 needs an explicit vendor `@source` line.

See the [JavaScript guide](docs/javascript.md) for plugin configuration and generated code, and the [SSR guide](docs/ssr.md) for all three server entries, hydration, development SSR, and deployment boundaries. The [week 3 guide](docs/week-3.md) covers adapter APIs and compatibility. The [Laravel example](examples/laravel/README.md) hosts all three frontends. The [week 2 contract](docs/week-2.md) records the PHP and Inertia integration boundaries. All packages remain unpublished.

## Develop

With PHP 8.3+ and Composer 2:

```sh
composer install
composer test
composer analyse
composer format:check
# or: composer check
```

The [Acme Billing fixture](tests/Fixtures/AcmeBilling) ships separate Vue, React, and Svelte pages/layouts for the browser example. Its original `resources/js/Pages/Dashboard.tsx` remains a PHP fixture. Pest uses isolated temporary app directories, so running the tests does not publish pages into a real application. PHPStan runs at level 8; Pint uses the Laravel preset.

JavaScript uses Node 22.12+ and npm workspaces, with a committed npm lockfile:

```sh
npm ci
npm run build
npm test
npm run test:packed
# The adapter type check loads the example's Vite config and manifest:
composer install --working-dir=examples/laravel
npm run typecheck
npx playwright install chromium
npm run test:e2e
# Or select one: npm run test:e2e -- vue-ssr
```

CI tests PHP 8.3, 8.4, and 8.5 against Laravel 12/Testbench 10 and Laravel 13/Testbench 11. A separate job checks Inertia 3.0.0. The library intentionally does not commit `composer.lock`, allowing each compatibility job to resolve its own framework/toolchain combination.
