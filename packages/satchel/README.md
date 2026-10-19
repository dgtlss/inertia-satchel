# @dgtlss/satchel

Unreleased ESM runtime for Satchel's Inertia v3 page names. Vue is verified end to end; React, Svelte, and SSR integration are week 3 work. MIT licensed. Nothing is published to npm.

With `vite-plugin-satchel` enabled:

```ts
import { resolveSatchel } from '@dgtlss/satchel';

createInertiaApp({
  resolve: resolveSatchel(existingAppResolver),
  // Keep the application's existing setup callback.
});
```

The wrapper resolves `namespace::Folder/Page`, checking every app override extension before trying package extensions. It unwraps a module's default export without copying the component, preserving Vue's `layout` property. Regular names are delegated with their original arguments. Missing namespaced pages throw an error listing every attempted glob key. Lazy import errors retain their original error and stack.

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

See the [Vue guide](../../docs/javascript.md) and [Laravel example](../../examples/laravel/README.md).
