# Laravel examples: Vue, React, Svelte, and SSR

A local Laravel 12/13 host using the root Composer package and `tests/Fixtures/AcmeBilling` as **symlinked Composer path repositories**. PHP 8.3+, Composer 2, and Node 22.12+ are required. No database or remote credentials are needed. All packages remain unpublished.

From the repository root:

```sh
npm ci
composer install --working-dir=examples/laravel
npm run build
cp examples/laravel/.env.example examples/laravel/.env
cd examples/laravel
php artisan key:generate
php artisan satchel:manifest
php artisan serve
```

In another terminal, from the repository root, run `npm run dev:example`. For production assets use `npm run build:example` with Vite stopped and `examples/laravel/public/hot` absent.

Vue is the default. To run React or Svelte, set **the same `SATCHEL_FRAMEWORK` value in PHP, manifest generation, and Vite**. For example, stop the previous servers, then:

```sh
cd examples/laravel
export SATCHEL_FRAMEWORK=react # or svelte; Vue uses vue
php artisan satchel:manifest
php artisan serve
```

In the second terminal, from the repository root:

```sh
SATCHEL_FRAMEWORK=react npm run dev:example
# Or: SATCHEL_FRAMEWORK=react npm run build:example
```

Switching frameworks regenerates the shared manifest and production assets. Run one example at a time. `config:cache` must be cleared before changing the selection. The fixture's `acme-billing.pages_path` setting exists only to select among its three demo implementations; Satchel's registration API stays `Satchel::pages(namespace, path)`.

| Framework | App directory | Package directory | Extension |
| --- | --- | --- | --- |
| Vue | `resources/js` | `resources/js` | `vue` |
| React | `resources/react` | `resources/react` | `tsx` |
| Svelte | `resources/svelte` | `resources/svelte` | `svelte` |

All use the namespace `acme-billing`, with app overrides in their respective `Pages/vendor/acme-billing` directories. The fixture's original `resources/js/Pages/Dashboard.tsx` is retained for PHP tests and excluded from the Vue manifest.

The home route demonstrates the original app resolver and PHP props. `/billing/invoices/42` loads a vendor page with its own persistent layout. `/billing/invoices` loads the app's invoice-list override. The package layout counter persists during Inertia navigation to the next invoice. Tailwind v4 explicitly scans the Composer symlink with `@source` lines.

Vue/React pages carry a `layout` property on their default component. Svelte exports `layout` from its module script and uses `resolveSatchelModules()`. Svelte's current Vite plugin fully reloads pages with named layout exports when edited; default-only pages hot update. Vue and React page edits preserve the document and layout state.

All three frameworks support production SSR and an opt-in development SSR bridge. Use the [SSR instructions](../../docs/ssr.md) for the framework server entries and corresponding PHP/Vite commands. The normal dev example uses client rendering. `SATCHEL_DEV_SSR=true` adds the example-only Vite HTTP bridge; enable `INERTIA_SSR_ENABLED=true` in PHP to use it. Production SSR uses the same manifest and the public adapter server entry, with `@dgtlss/satchel` included in `ssr.noExternal`. The Svelte example also compiles `@inertiajs/svelte`.

Automated checks from the repository root:

```sh
npm run typecheck
npx playwright install chromium
npm run test:e2e # All nine client, SSR and dev SSR targets, sequentially
npm run test:e2e -- vue-ssr # one target
npm run test:e2e -- react-ssr-dev
npm run test:packed # isolated npm tarball installation; no Laravel required
```

The browser runner creates local `.env`/app key and storage directories if absent, regenerates the manifest, and boots Laravel with built assets or the live Vite server. SSR targets verify HTML without JavaScript, hydration of the original DOM, titles, props, persistent layouts, and concurrent request context. Dev SSR additionally checks edited files, overrides, and an atomic registration replacement outside the workspace. Tests restore temporary edits in `finally`. Run one worker and avoid editing those files during the tests. Failures retain browser traces, Vite messages, and JSON results under `test-results/playwright/<target>`.

`PHP_BINARY` selects a PHP executable or wrapper; it must forward environment variables such as `SATCHEL_FRAMEWORK` and `INERTIA_SSR_ENABLED`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed Chromium. The SSR renderer listens on the same machine's loopback address, so a containerized PHP wrapper must share that network or provide an equivalent `INERTIA_SSR_URL`.
