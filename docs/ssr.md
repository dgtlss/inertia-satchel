# Server rendering: Vue, React, and Svelte

Satchel uses the same version 1 PHP manifest, canonical `namespace::Page` name, and override rules for browser and server builds. No SSR-specific response props or private Inertia imports are needed. All three examples verify HTML with JavaScript disabled, hydration of the original DOM, Inertia navigation, persistent layouts, head output, and request isolation.

## Build configuration

Use the framework's Vite plugin and keep the runtime inside Vite's transform pipeline:

```ts
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    laravel({ input: 'resources/js/app.ts', ssr: 'resources/js/ssr.ts' }),
    vue(), // Or the app's React/Svelte plugin and corresponding entry paths.
    satchel({ eager: isSsrBuild }),
  ],
  ssr: { noExternal: ['@dgtlss/satchel'] },
}));
```

An installed runtime that remains external would ask Node to load `virtual:satchel/pages`; Vite must transform that import. The Svelte example additionally includes `@inertiajs/svelte` in `ssr.noExternal` so the adapter's `.svelte` files are compiled. The plugin automatically excludes `@dgtlss/satchel` and `virtual:satchel/pages` from dependency prebundling, preserving existing exclusions. This lets Vite transform the generated module without esbuild trying to read a nonexistent file during its scan. Ordinary dependencies still optimize normally.

Eager server maps are optional. The example uses eager vendor imports in production SSR and lazy imports in the browser and dev server. Keep ordinary app globs separate from `Pages/vendor` to avoid a second import path for overrides. Run `php artisan satchel:manifest` on the build machine after installing Composer dependencies and before Vite.

## Framework entries

Each frontend shares a `resolve.ts` between its browser entry and a pure `render.ts`/`render.tsx` function. Its `ssr.ts` starts the official public Inertia server with that function:

| Framework | Resolver | Server renderer | Browser hydration |
| --- | --- | --- | --- |
| Vue 3 | `resolveSatchel()` | `createInertiaApp({ page, resolve, render: renderToString, setup })`, with `createSSRApp` | `createSSRApp(...).use(plugin).mount(el)` |
| React 19 | `resolveSatchel()` | `createInertiaApp({ page, resolve, render: renderToString, setup })`, with a React element | `hydrateRoot(el, element)` |
| Svelte 5 | `resolveSatchelModules()` | `createInertiaApp({ page, resolve, setup })`, returning `render(App, { props })` from `svelte/server` | The public adapter hydrates `data-server-rendered` roots automatically |

Vue and React preserve a page's default component `layout` property. Svelte preserves the named module `layout` export. The original app resolver continues to handle ordinary component names on both server and browser. Vue/React browser entries mount normally when no SSR markup exists.

Complete sources:

- [Vue renderer](../examples/laravel/resources/js/render.ts) and [server entry](../examples/laravel/resources/js/ssr.ts).
- [React renderer](../examples/laravel/resources/react/render.tsx) and [server entry](../examples/laravel/resources/react/ssr.ts).
- [Svelte renderer](../examples/laravel/resources/svelte/render.ts) and [server entry](../examples/laravel/resources/svelte/ssr.ts).

The entries import `createServer` only from the adapter's public `/server` export. Keep layout state inside component setup and avoid request data in shared module objects. Eight concurrent requests to the same long-lived renderer verify independent invoice props, public `usePage()` layout values, document titles, and zeroed layout counters. This covers the example's current synchronous page components, not every async SSR feature of each framework.

## Run the production example

After the [example dependency setup](../examples/laravel/README.md), select the same framework in every terminal. For example, in `examples/laravel`:

```sh
export SATCHEL_FRAMEWORK=react # vue, react, or svelte
php artisan satchel:manifest
npm run build:ssr
npm run ssr
```

In another terminal, in the same directory:

```sh
export SATCHEL_FRAMEWORK=react
INERTIA_SSR_ENABLED=true INERTIA_SSR_THROW_ON_ERROR=true php artisan serve
```

Stop Vite and remove a stale `public/hot` before using production assets. The example's SSR bundle is `bootstrap/ssr/ssr.js`; its official Inertia HTTP renderer listens on loopback port 13714. SSR is disabled by default and explicitly enabled for these runs. `throw_on_error` prevents SSR failures from silently becoming client-rendered test successes.

## Development SSR

The example has an opt-in Vite middleware bridge. In `examples/laravel`, after selecting a framework:

```sh
export SATCHEL_FRAMEWORK=svelte
php artisan satchel:manifest
SATCHEL_DEV_SSR=true npm run dev
```

In another terminal:

```sh
export SATCHEL_FRAMEWORK=svelte
INERTIA_SSR_ENABLED=true INERTIA_SSR_THROW_ON_ERROR=true php artisan serve
```

Inertia Laravel reads Vite's hot-file URL and sends its public dev SSR request to `/__inertia_ssr`. The [example bridge](../examples/laravel/vite/ssr.ts) loads the pure renderer on every request through Vite's public `ssrLoadModule()` API. It does not start a second production renderer or change the npm plugin's API. Normal `npm run dev` keeps the existing client-only example behavior. The bridge is example application code, not a published production SSR server.

The example allows 30 seconds for an SSR request so a cold dev render can compile. Set `INERTIA_SSR_TIMEOUT` to adjust that application setting; Satchel does not change the host application's Inertia timeout.

After Vite processes a page edit, the next render uses the updated source. Atomic manifest replacement and override additions/removals invalidate the generated map for both browser and SSR. Vitest exercises Vite's real SSR module loader through registration changes, overrides, an invalid manifest, and recovery; browser tests also replace a registration with a package outside the workspace, including relative layout imports, and verify fresh HTML and working browser hydration. The dev SSR test polls for successful HTML with the updated page after the asynchronous file watch, without requiring a connected HMR client. Separate client tests cover automatic reloads and state preservation.

Client HMR remains the framework plugin's responsibility. Vue and React template edits preserve document/layout state. Svelte pages with named layout exports currently reload; default-only Svelte pages hot update. Development SSR does not change that behavior.

## Checks and deployment boundaries

```sh
npm run test:e2e -- react-ssr
npm run test:e2e -- svelte-ssr-dev
npm run test:e2e # All nine client, production SSR, and dev SSR targets.
```

Tests run on the committed Node 24/Vite 7 and Inertia JS 3.9.1 versions listed in [week 3](week-3.md). The example uses Inertia Laravel 3.5.1/Laravel 13.37 locally; the library's separate PHP matrix covers Laravel 12/13 and Inertia Laravel 3.0 compatibility. Inertia Laravel 3.0 already has the hot-file SSR gateway, but the full browser SSR suite is not a matrix of every PHP/JS adapter version.

The manifest contains machine-local paths and remains build input. Deploy matching PHP registrations, page files, browser assets, and server bundles, and update the application's Inertia asset version. Production process-manager behavior, rolling deployments, clustered SSR, and framework-specific async/streaming SSR remain outside these example checks. No packages or releases have been published.
