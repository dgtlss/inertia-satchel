# @dgtlss/satchel

Unreleased ESM runtime for Satchel's Inertia v3 page names. Vue, React, and Svelte client rendering and SSR are verified end to end. MIT licensed. Nothing is published to npm.

With `vite-plugin-satchel` enabled:

```ts
import { resolveSatchel } from '@dgtlss/satchel';

createInertiaApp({
  resolve: resolveSatchel(existingAppResolver),
  // Keep the application's existing setup callback.
});
```

The wrapper resolves `namespace::Folder/Page`, checking every app override extension before trying package extensions. It unwraps a module's default export without copying the component, preserving Vue and React `layout` properties. Regular names are delegated with their original arguments. Missing namespaced pages throw an error listing every attempted glob key. Lazy import errors retain their original error and stack.

For Svelte, use the module-preserving resolver:

```ts
import { resolveSatchelModules } from '@dgtlss/satchel';

createInertiaApp({ resolve: resolveSatchelModules(existingAppResolver) });
```

`resolveSatchelModules<T>(appResolver, maps?)` returns the original `{ default: T, ...namedExports }` module. The app resolver must also return a module. Inertia's Svelte adapter reads the module's named `layout` export; unwrapping `default` would lose it. The plugin and manual entries export both resolver functions, plus `AppResolver`, `AppModuleResolver`, `PageModule`, `PageGlob`, `PageNamespace`, and `SatchelPages` types.

The package imports no Inertia internals and has no Vue or Inertia runtime dependency. It uses only the public `createInertiaApp({ resolve })` contract.

## Manual mode

Import the **`/manual` entry** when the Vite plugin is absent. The default entry imports `virtual:satchel/pages`; the manual entry has no virtual-module dependency.

```ts
import { resolveSatchel } from '@dgtlss/satchel/manual';
import type { DefineComponent } from 'vue';
import type { PageModule } from '@dgtlss/satchel/manual';

const resolve = resolveSatchel<DefineComponent>(existingAppResolver, {
  overridePath: './Pages/vendor',
  overrides: import.meta.glob<PageModule<DefineComponent>>('./Pages/vendor/**/*.vue'),
  namespaces: [{
    namespace: 'acme-billing',
    path: '../../vendor/acme/billing/resources/js/Pages',
    extensions: ['vue'],
    pages: import.meta.glob<PageModule<DefineComponent>>('../../vendor/acme/billing/resources/js/Pages/**/*.vue'),
  }],
});
```

Each `path` must match the key prefix produced by its glob **in that importer**. Use the PHP manifest's extension order. Eager maps (`{ eager: true }`) work too; retain the `{ default: Component }` module wrapper rather than using `import: 'default'`. This distinguishes eager function components from lazy import functions. Plain hand-written maps/loaders can be used with other bundlers.

`resolveSatchelModules(appResolver, maps)` uses this same map format in manual mode. It preserves module identity and named exports for both eager and lazy maps.

For SSR, include the runtime in Vite's `ssr.noExternal` so its virtual import is transformed. See the [JavaScript guide](../../docs/javascript.md), [SSR guide](../../docs/ssr.md), and [Laravel example](../../examples/laravel/README.md).
