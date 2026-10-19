/** Keep the module wrapper: eager function components must not be called as loaders. */
export interface PageModule<T = unknown> {
  default: T;
}

export type PageGlob<T = unknown> = Record<
  string,
  PageModule<T> | (() => Promise<PageModule<T>>)
>;

export interface PageNamespace<T = unknown> {
  namespace: string;
  /** The glob key prefix, e.g. ../../vendor/acme/billing/resources/js/Pages. */
  path: string;
  extensions: readonly string[];
  pages: PageGlob<T>;
}

export interface SatchelPages<T = unknown> {
  overridePath: string;
  overrides: PageGlob<T>;
  namespaces: readonly PageNamespace<T>[];
}

export type AppResolver<T, Args extends unknown[] = []> = (
  name: string,
  ...args: Args
) => T | PageModule<T> | Promise<T | PageModule<T>>;
