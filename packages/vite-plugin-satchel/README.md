# vite-plugin-satchel

Unreleased ESM Vite 7 plugin for Satchel's PHP manifest. Node 22.12+; MIT licensed. Nothing is published to npm.

```ts
import satchel from 'vite-plugin-satchel';

export default defineConfig({
  plugins: [vue(), satchel({
    manifest: 'bootstrap/cache/satchel.json',
    eager: false,
    dts: 'resources/js/satchel-pages.d.ts',
  })],
});
```

All options are optional. Relative paths resolve from Vite's `root`. `dts: false` disables declaration output. The manifest is required in both dev and build; missing/unsupported manifests explain how to run `php artisan satchel:manifest`.

`virtual:satchel/pages` exports glob maps and namespace metadata for `@dgtlss/satchel`. Globs are literal, constrained to registered namespace/extension combinations, and eager or lazy as configured. Registered paths are canonicalized so Composer path-repository symlinks can point outside the Laravel app. Their real paths are added to `server.fs.allow`, preserving existing allowed paths and Vite's workspace access.

The plugin does not follow directory symlinks beneath page roots; escaping file symlinks fail. It excludes filenames PHP does not treat as page names. Vue transforms belong to `@vitejs/plugin-vue`.

In dev, page content edits use normal Vue HMR. Page additions/removals update the generated type union and reload the client. Manifest edits, including atomic replacement by PHP, rebuild the maps, add any new watch/allow roots, regenerate types, and perform a full reload. Production bundles require rebuilding after files or registration change.

See [the full configuration, generated code, and week 3 notes](../../docs/javascript.md).
