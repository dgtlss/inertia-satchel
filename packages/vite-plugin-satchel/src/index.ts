import { existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { normalizePath, searchForWorkspaceRoot } from 'vite';
import type { Plugin, ViteDevServer } from 'vite';
import { generateModule, snapshot, writeDeclarations } from './codegen';
import type { Snapshot } from './codegen';
import { readManifest } from './manifest';

export interface SatchelOptions {
  /** Absolute or relative to Vite's root. Default: bootstrap/cache/satchel.json. */
  manifest?: string;
  /** Eager imports, e.g. for a small app or an SSR bundle. Default: false. */
  eager?: boolean;
  /** Output relative to Vite's root, or false. Default: resources/js/satchel-pages.d.ts. */
  dts?: string | false;
}

export const virtualModuleId = 'virtual:satchel/pages';

/** All integration uses Vite's public hooks and Inertia's public resolve option. */
export default function satchel(options: SatchelOptions = {}): Plugin {
  let root: string;
  let manifestPath: string;
  let resolvedId: string;
  let typesPath: string | false;
  let data: Snapshot | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dispose = () => {};

  const read = () => {
    data = undefined;
    data = snapshot(readManifest(manifestPath));
    if (typesPath) writeDeclarations(typesPath, data.pageNames);
    return data;
  };
  const roots = () => data ? [data.manifest.override_path, ...data.manifest.namespaces.map((entry) => entry.path)] : [];
  const allow = (server: ViteDevServer) => {
    for (const path of [root, ...roots()]) {
      const normalized = normalizePath(path);
      if (!server.config.server.fs.allow.includes(normalized)) server.config.server.fs.allow.push(normalized);
    }
  };
  const watch = (server: ViteDevServer) => {
    const directories = roots().map((path) => {
      // Watch the nearest existing ancestor when an app has no overrides yet.
      while (!existsSync(path) && dirname(path) !== path) path = dirname(path);
      return path;
    });
    server.watcher.add([manifestPath, ...directories]);
  };
  const invalidate = (server: ViteDevServer) => {
    const module = server.moduleGraph.getModuleById(resolvedId);
    if (module) server.moduleGraph.invalidateModule(module);
  };
  const reload = (server: ViteDevServer) => {
    clearTimeout(timer);
    // PHP atomically replaces the manifest; let unlink/add settle before reading.
    timer = setTimeout(() => {
      try {
        read();
        allow(server);
        watch(server);
        invalidate(server);
        server.ws.send({ type: 'full-reload', path: '*' });
      } catch (cause) {
        invalidate(server);
        const error = cause instanceof Error ? cause : new Error(String(cause));
        server.config.logger.error(error.message);
        server.ws.send({ type: 'error', err: { name: error.name, message: error.message, stack: error.stack ?? '' } });
      }
    }, 75);
  };
  const relevant = (file: string) => file === manifestPath || roots().some((path) => {
    const fromRoot = relative(path, file);
    return fromRoot === '' || (fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot));
  });

  return {
    name: 'vite-plugin-satchel',
    enforce: 'pre',
    config(config) {
      root = resolve(config.root ?? process.cwd());
      manifestPath = resolve(root, options.manifest ?? 'bootstrap/cache/satchel.json');
      // A synthetic absolute ID gives import.meta.glob a real importer directory.
      // It is provided by load(), never written to disk, and needs no Vite internals.
      resolvedId = normalizePath(resolve(root, '.satchel-virtual-pages.js'));
      typesPath = options.dts === false ? false : resolve(root, options.dts ?? 'resources/js/satchel-pages.d.ts');
      read();
      return { server: { fs: { allow: [...new Set([
        ...(config.server?.fs?.allow ?? [searchForWorkspaceRoot(root)]), root, ...roots(),
      ].map((path) => normalizePath(resolve(root, path))))] } } };
    },
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId;
    },
    buildStart() {
      read();
      this.addWatchFile(manifestPath);
      for (const path of roots()) this.addWatchFile(path);
    },
    load(id) {
      if (id === resolvedId) return generateModule(data ?? read(), dirname(resolvedId), options.eager ?? false);
    },
    configureServer(server) {
      watch(server);
      const onStructure = (file: string) => { if (relevant(resolve(file))) reload(server); };
      for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) server.watcher.on(event, onStructure);
      dispose = () => {
        clearTimeout(timer);
        for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) server.watcher.off(event, onStructure);
      };
      server.httpServer?.once('close', dispose);
    },
    handleHotUpdate(context) {
      if (resolve(context.file) === manifestPath) {
        reload(context.server);
        return [];
      }
      // Existing page edits are handled by the framework plugin's normal HMR.
    },
    closeBundle() { dispose(); },
  };
}
