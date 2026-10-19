# Week 2: JavaScript resolver and Vite plugin contract

## Input and component identity

The version 1 manifest schema is illustrated in the [README](../README.md#manifest). It contains `version`, the absolute `override_path`, and a sorted `namespaces` array of `{namespace, path, extensions}`. Both source locations and extension order are authoritative; the plugin must not assume `.vue`, reconstruct vendor package locations, or depend on Composer's directory layout. No JavaScript framework choice is imposed by the PHP package.

For a component `acme-billing::Invoices/Index`:

1. Parse exactly one `::`. The page is an extensionless, case-sensitive slash path. Apply the same page-name grammar as `PageResolver::isValidPage()`.
2. Look up the namespace in the manifest; reject missing namespaces and unknown manifest versions with a useful build error.
3. Check `<override_path>/acme-billing/Invoices/Index.<ext>` for **all** configured extensions, in order.
4. If none exists, check `<namespace.path>/Invoices/Index.<ext>` in the same extension order.
5. Generate an import-map entry keyed by **the original canonical `namespace::Page` string** for the winning file. Namespace prefixes prevent cross-package filename collisions. Include app-only pages under registered namespaces. Reject symlinks escaping the declared source root; do not follow directory symlinks when enumerating pages, matching PHP inventory behavior.
6. Delegate component names without `::` to the application's normal resolver.

PHP always sends that canonical identity, regardless of the winning file or extension. It does not encode an absolute filename, selected source, or extension into the wire protocol, add shared props, or require a new client header. PHP's `PageResolver::resolve()` returns the actual selected path, package path, and override path for diagnostics and commands. `ResolvedPage` exposes `component()`, `isOverridden()`, and `isDrifted()`.

## Inertia v3 boundaries

The intended client integration uses the **public** `createInertiaApp({ resolve })` option. Inertia supplies the component string; the resolver can return the framework component synchronously or via a dynamic import. Account for adapter-specific module/default export handling. The same mapping must work during initial HTML hydration, subsequent `X-Inertia` navigation, and SSR.

Source evidence inspected during week 1:

- [Laravel adapter `ResponseFactory::render()` at v3.0.0](https://github.com/inertiajs/inertia-laravel/blob/v3.0.0/src/ResponseFactory.php) accepts enums/strings and produces an `Inertia\Response`. Satchel binds a subclass that validates namespaced pages and then delegates to the parent; props, versioning, root views, history, and partial reload behavior remain Inertia's responsibility.
- [`inertia.view-finder` in the Laravel adapter](https://github.com/inertiajs/inertia-laravel/blob/v3.0.0/src/ServiceProvider.php) is used for optional strict existence checks and Inertia's test assertions. Satchel decorates this binding, resolves namespaced pages itself, and delegates regular app pages. This container key is an adapter integration detail, covered by PHP integration tests.
- Newer v3 adapters have `transformComponentUsing()`, but v3.0.0 does **not**. Satchel does not require or take ownership of that callback. Applications replacing the `ResponseFactory` binding must retain Satchel's namespaced validation, and applications transforming component names must preserve the namespace contract.
- The [Vue adapter's `createInertiaApp`](https://github.com/inertiajs/inertia/blob/3.x/packages/vue3/src/createInertiaApp.ts) passes `page.component` to the supplied resolver and unwraps `module.default || module`. The [core page implementation](https://github.com/inertiajs/inertia/blob/3.x/packages/core/src/page.ts) resolves that same string during navigation and compares component identity for same-page handling. These moving branch links explain the inspected behavior; the plugin should integrate through the public resolver option and test against its pinned npm versions, rather than importing either internal module.

The Vite plugin needs **no private Inertia JS imports**. Stable component identity matters for partial reloads, state preservation, and SSR. PHP tests cover initial HTML, JSON navigation, shared props, partial reloads, enum names, and strict existence checks. Week 2 verifies Vue browser rendering, real Vite bundles, props/layouts/overrides, and HMR. [Week 3](week-3.md) adds Vue SSR and React/Svelte adapter coverage, including Svelte's module-level layout exports.

## Vite behavior to implement

Generate literal import specifiers (or compile-time globs) from the manifest. Vite cannot discover arbitrary runtime filesystem paths in a browser resolver. Namespaced package pages may be outside the app's normal `resources` glob, so the dev server's allowed filesystem roots, dependency handling, transforms, and production module graph must include the registered directories. Vue/React/Svelte compilation still belongs to the app's corresponding framework plugins.

Use the same generated map for client and SSR builds. Watch package page directories, app overrides, and the manifest; rebuild the map when pages are added/deleted, overrides appear/disappear, or registration changes. Atomic manifest replacement is deliberate, so watch replacement as well as in-place changes. Preserve the app's existing resolver for normal pages.

The manifest contains absolute local paths and is **build input**, not a browser asset or a portable deployment artifact. Run `php artisan satchel:manifest` before Vite if Composer package discovery was skipped. Build and deployment must use matching registrations, extension configuration, and files: PHP can immediately notice a new override, while an already-built client bundle requires rebuilding and updating the app's asset version.

Week 2 tests cover extension precedence across sources, duplicate filenames in different namespaces, app-only pages, nested pages, missing components, configured paths, symlink containment, eager/lazy builds, Vue transforms/HMR, and normal-page fallback. Week 3's adapter and SSR tests retain this same canonical key and manifest schema.
