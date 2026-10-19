import type { AppModuleResolver, AppResolver, PageGlob, PageModule, SatchelPages } from './types';

export type { AppModuleResolver, AppResolver, PageGlob, PageModule, PageNamespace, SatchelPages } from './types';

const normalize = (path: string): string => path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');

function index<T>(glob: PageGlob<T>) {
  return new Map(Object.entries(glob).map(([key, page]) => [normalize(key), page]));
}

function component<T>(module: T | PageModule<T>): T {
  // Preserve the original component object, including Vue's persistent layout.
  return module !== null && typeof module === 'object' && 'default' in module
    ? (module as PageModule<T>).default
    : (module as T);
}

/** Plugin-free entry point. Maps can be lazy or eager, just like Vite's globs. */
export function resolveSatchel<T, Args extends unknown[] = []>(
  appResolver: AppResolver<T, Args>,
  pages: SatchelPages<T>,
): (name: string, ...args: Args) => Promise<T> {
  const resolve = namespacedResolver(pages);
  return async (name, ...args) => !name.includes('::')
    ? component(await appResolver(name, ...args))
    : (await resolve(name)).default;
}

/** Preserve module-level exports, including Svelte's named layout export. */
export function resolveSatchelModules<T, Args extends unknown[] = []>(
  appResolver: AppModuleResolver<T, Args>,
  pages: SatchelPages<T>,
): (name: string, ...args: Args) => Promise<PageModule<T>> {
  const resolve = namespacedResolver(pages);
  return async (name, ...args) => !name.includes('::')
    ? appResolver(name, ...args)
    : resolve(name);
}

function namespacedResolver<T>(pages: SatchelPages<T>): (name: string) => Promise<PageModule<T>> {
  const overrides = index(pages.overrides);
  const namespaces = new Map(pages.namespaces.map((entry) => [entry.namespace, {
    ...entry,
    files: index(entry.pages),
  }]));

  return async (name) => {
    const parts = name.split('::');
    const namespace = parts[0] ?? '';
    const page = parts[1] ?? '';
    if (parts.length !== 2 || !/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(namespace)
      || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(page)) {
      throw new Error(`[Satchel] Invalid component [${name}]. Use namespace::Folder/Page without an extension.`);
    }

    const registration = namespaces.get(namespace);
    if (!registration) {
      throw new Error(`[Satchel] Unknown namespace [${namespace}] for [${name}]. Registered: ${[...namespaces.keys()].join(', ') || '(none)'}. Tried paths: none (namespace is unregistered).`);
    }

    const tried: string[] = [];
    for (const [root, files, relative] of [
      [pages.overridePath, overrides, `${namespace}/${page}`],
      [registration.path, registration.files, page],
    ] as const) {
      for (const extension of registration.extensions) {
        const path = normalize(`${root}/${relative}.${extension}`);
        tried.push(path);
        const entry = files.get(path);
        if (entry) {
          const module = typeof entry === 'function' ? await entry() : entry;
          if (!module || !('default' in module) || module.default == null) {
            throw new Error(`[Satchel] Page [${name}] at [${path}] has no default component export.`);
          }
          return module;
        }
      }
    }

    throw new Error(`[Satchel] Page [${name}] was not found. Tried paths:\n${tried.map((path) => `  - ${path}`).join('\n')}`);
  };
}
