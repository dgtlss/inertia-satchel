# Laravel + Vue example

A local Laravel 12/13 app using the root Composer package and `tests/Fixtures/AcmeBilling` as **symlinked Composer path repositories**. JavaScript dependencies come from npm workspaces. PHP 8.3+, Composer 2, and Node 22.12+ are required. No database or remote credentials are needed.

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

The home route demonstrates the original app resolver and PHP props. `/billing/invoices/42` loads a vendor Vue page with its own persistent default layout. `/billing/invoices` loads the app override of the package's invoice list. The vendor layout counter persists during Inertia navigation to the next invoice. Tailwind v4 explicitly scans the Composer symlink using `@source`.

The existing `Dashboard.tsx` is retained as a PHP test fixture; it is not a React integration example. This app's `config/satchel.php` registers only the `vue` extension, matching its compiler and browser routes.

For the full automated production/dev test, from the repository root:

```sh
npx playwright install chromium
npm run test:e2e
```

The test runner generates a local `.env`/app key if absent, regenerates the manifest, builds production assets, and boots Laravel. It then starts Vite for HMR checks, temporarily edits the fixture/override files, and restores them in `finally`. Run one worker and avoid editing those same files during the test. A custom PHP wrapper can be selected with `PHP_BINARY`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed Chromium instead of Playwright's bundled browser.
