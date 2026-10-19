/// <reference path="../client.d.ts" />
import pages from 'virtual:satchel/pages';
import { resolveSatchel as manualResolver } from './manual';
import type { AppResolver, SatchelPages } from './types';

export type { AppResolver, PageGlob, PageModule, PageNamespace, SatchelPages } from './types';

/** Wrap createInertiaApp's public resolve option; no Inertia internals are imported. */
export function resolveSatchel<T, Args extends unknown[] = []>(
  appResolver: AppResolver<T, Args>,
  maps: SatchelPages<T> = pages as SatchelPages<T>,
): (name: string, ...args: Args) => Promise<T> {
  return manualResolver(appResolver, maps);
}
