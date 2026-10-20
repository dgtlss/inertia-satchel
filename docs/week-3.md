# Adapters, SSR, and installed packages

The PHP registration API, canonical `namespace::Page` component name, version 1 manifest, and Vite plugin options are unchanged. All integration uses public `createInertiaApp({ resolve })` APIs. The only runtime API addition is `resolveSatchelModules()` for adapters that consume a complete module.

## Resolver APIs

| Export | App resolver returns | Satchel returns | Used by |
| --- | --- | --- | --- |
| `resolveSatchel<T, Args>(appResolver, maps?)` | Component or `{ default: T }`, sync/async | `Promise<T>` | Vue, React |
| `resolveSatchelModules<T, Args>(appResolver, maps?)` | `{ default: T, ...namedExports }`, sync/async | `Promise<PageModule<T>>` | Svelte |

Both wrappers delegate ordinary app names with all original arguments. Namespaced pages use identical validation, override precedence, extension order, and missing-page diagnostics. They preserve the winning component/module identity rather than copying or mutating it. `PageModule<T>` describes the required default export; additional named exports pass through unchanged at runtime.

Both functions also exist in `@dgtlss/satchel/manual`, where `maps` is required. That entry has no virtual import and works without the Vite plugin. The runtime has no framework dependencies and imports no Inertia implementation files.

Vue and React pages can attach their persistent layout to the default component. Svelte pages export the layout from their module script:

```svelte
<script module lang="ts">
  export { default as layout } from '../../Layouts/BillingLayout.svelte';
</script>
```

Use `resolveSatchelModules()` with Svelte; unwrapping `default` would discard this named export. The app's ordinary glob resolver must return the module as well. See the [Svelte entry](../examples/laravel/resources/svelte/app.ts) and corresponding Vue/React entries for complete examples.

## Server rendering

Vue, React, and Svelte now have production and development SSR checks. They share the browser resolver and manifest, preserve the initial server DOM during hydration, and retain layout state during Inertia navigation. Tests also verify head output and public `usePage()` values across eight concurrent renderer requests.

Keep `@dgtlss/satchel` in `ssr.noExternal` so Vite transforms its virtual import; the Svelte example also compiles its adapter's component sources. The plugin excludes its runtime and virtual module from dependency prebundling, allowing ordinary dependencies to scan without trying to read the generated module from disk.

See the [SSR guide](ssr.md) for the public server entries, framework-specific hydration, example-only dev HTTP bridge, and complete run instructions. The example enables SSR explicitly and throws on rendering errors, so the tests cannot pass through a silent client-rendering fallback.

## Verified compatibility and dev behavior

The committed npm lockfile pins the versions exercised by the examples:

| Component | Verified version |
| --- | --- |
| Node | 24.19 |
| Vite | 7.3.7 |
| Inertia Vue/React/Svelte adapters | 3.9.1 |
| Vue | 3.5.44 |
| React / React DOM | 19.3.1 |
| Svelte | 5.57.2 |
| Tailwind | 4.3.3 |

The package engines require Node 22.12+, and the plugin peer range is Vite `^7.3.0`. The PHP matrix covers Laravel 12/13 and PHP 8.3/8.4/8.5, with a separate Inertia Laravel 3.0 check. This does not establish that every older JS adapter version or every compiler option has been tested.

All three browser examples use a real Composer path-repository symlink, the same namespace, and the same Laravel routes. Each selects its own page directory, extension, override root, generated declarations, and Vite compiler. Their tests check vendor rendering, overrides, props, persistent layout state during navigation, Tailwind sources, an atomic manifest reload, and override removal/restoration.

Vue and React page edits hot update while preserving the document and layout counter. With `@sveltejs/vite-plugin-svelte` 6, the default HMR configuration accepts only the component's default export. A page with a named `layout` export propagates a full reload and loses local state on edits. The test verifies that the reload was triggered by that page. A default-only Svelte page hot updates without replacing the document. Satchel leaves this behavior to the framework plugin; it does not suppress reloads or patch Svelte internals.

## Installation and release preparation

```sh
npm run test:packed
npm run test:e2e
# Select a browser target:
npm run test:e2e -- react
```

The packed check uses `npm pack`, installs both tarballs into an isolated temporary app outside the workspaces, and verifies extracted package contents, ESM and declaration exports, plugin-free manual mode, generated page-name types, real client/SSR bundles, module layouts, missing-page errors, and overrides through a symlinked vendor path. It pins the consumer's direct tools to versions in the repository lockfile. No package is published.

The JavaScript CI workflow has separate package checks and browser jobs for `vue`, `react`, and `svelte`, plus each `-ssr` and `-ssr-dev` variant. Browser failures retain traces, Vite messages, and a JSON report; CI also emits the assertion as an annotation. The test dev-server children and Svelte checker explicitly set Laravel Vite's documented `LARAVEL_BYPASS_ENV_CHECK=1`: those processes intentionally load serve mode in CI. Normal app startup keeps Laravel's environment check. All npm packages retain the unreleased `0.0.0` workspace version. Composer continues deriving its development version from Git. Choose release versions and tags only as part of a later release task.

Deployment process managers, clustered rendering, rolling asset updates, and framework-specific async/streaming SSR remain outside these example checks. See the [SSR guide](ssr.md) for the tested versions and scope.
