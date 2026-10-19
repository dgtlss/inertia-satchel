/// <reference path="../client.d.ts" />
import pages from 'virtual:satchel/pages';
import { resolveSatchel as manualResolver, resolveSatchelModules as manualModuleResolver } from './manual';
import type { AppModuleResolver, AppResolver, PageModule, SatchelPages } from './types';

export type { AppModuleResolver, AppResolver, PageGlob, PageModule, PageNamespace, SatchelPages } from './types';

/** Wrap createInertiaApp's public resolve option; no Inertia internals are imported. */
export function resolveSatchel<T, Args extends unknown[] = []>(
  appResolver: AppResolver<T, Args>,
  maps: SatchelPages<T> = pages as SatchelPages<T>,
): (name: string, ...args: Args) => Promise<T> {
  return manualResolver(appResolver, maps);
}

/** Svelte's public resolver consumes a module with its named layout export. */
export function resolveSatchelModules<T, Args extends unknown[] = []>(
  appResolver: AppModuleResolver<T, Args>,
  maps: SatchelPages<T> = pages as SatchelPages<T>,
): (name: string, ...args: Args) => Promise<PageModule<T>> {
  return manualModuleResolver(appResolver, maps);
}
