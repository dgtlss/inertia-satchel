# Week 3: adapters, Vue SSR, and installed packages

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

## Vue production SSR

Use the same Satchel plugin and manifest in both builds. Keep the installed runtime inside Vite's transform pipeline:

```ts
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    laravel({ input: 'resources/js/app.ts', ssr: 'resources/js/ssr.ts' }),
    vue(),
    satchel({ eager: isSsrBuild }),
  ],
  ssr: { noExternal: ['@dgtlss/satchel'] },
}));
```

Without `ssr.noExternal`, an installed npm runtime may remain an external import. Node cannot load its `virtual:satchel/pages` import; Vite must transform it during the server build. Workspace symlinks can hide this problem, which is why the installation check uses extracted tarballs. Eager maps are optional; the example uses them for vendor pages on the server, while the browser uses lazy maps. Ordinary app globs exclude the `Pages/vendor` subtree to avoid a second import path for overrides.

The server entry uses public exports:

```ts
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createInertiaApp } from '@inertiajs/vue3';
import createServer from '@inertiajs/vue3/server';
import { resolve } from './resolve';

createServer((page) => createInertiaApp({
  page,
  resolve,
  render: renderToString,
  setup: ({ App, props, plugin }) =>
    createSSRApp({ render: () => h(App, props) }).use(plugin),
}), { host: '127.0.0.1' });
```

The browser entry hydrates existing server markup with `createSSRApp`, otherwise mounts with `createApp`. Keep layout state inside component setup; shared module objects must not hold request-specific state. The browser test preserves the original server heading node, checks for hydration errors, navigates to another invoice with a persistent counter, and verifies a fresh server request starts at zero. A separate JavaScript-disabled context proves vendor pages, app overrides, layouts, and PHP props were rendered into HTML.

From the repository root, after the [example setup](../examples/laravel/README.md):

```sh
npm run build:ssr --workspace=@satchel/example
npm run ssr --workspace=@satchel/example
# In another terminal:
cd examples/laravel
INERTIA_SSR_ENABLED=true INERTIA_SSR_THROW_ON_ERROR=true php artisan serve
```

Stop Vite and remove its stale `public/hot` file before using production assets. The example disables SSR by default and enables it explicitly for the SSR tests. Its SSR service uses the public Inertia HTTP gateway; no custom PHP response protocol is added.

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

The JavaScript CI workflow has separate package checks and browser jobs for `vue`, `vue-ssr`, `react`, and `svelte`. Browser failures retain traces, Vite messages, and a JSON report; CI also emits the assertion as an annotation. All npm packages retain the unreleased `0.0.0` workspace version. Composer continues deriving its development version from Git. Choose release versions and tags only as part of a later release task.

Remaining integration work: React SSR, Svelte SSR, and live SSR through Vite's dev server are unverified. The example deliberately runs client rendering in dev and tests Vue SSR against production builds. A future deployment test should also exercise the target process manager, framework dependency externalization, and matching PHP/browser/server asset versions.
