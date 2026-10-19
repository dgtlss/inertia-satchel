import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

export interface NamespaceRegistration {
  namespace: string;
  path: string;
  extensions: string[];
}

export interface Manifest {
  version: 1;
  override_path: string;
  namespaces: NamespaceRegistration[];
}

export const manifestHint = 'Run php artisan satchel:manifest in the Laravel app, then restart Vite.';
function invalid(message: string): never { throw new Error(`[Satchel] ${message} ${manifestHint}`); }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Resolve a configured root itself, including Composer path-repository symlinks. */
export function canonicalDirectory(path: string): string {
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  return parent === path ? path : join(canonicalDirectory(parent), basename(path));
}

export function readManifest(path: string): Manifest {
  if (!existsSync(path)) invalid(`Manifest not found at [${path}].`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    invalid(`Cannot read JSON manifest [${path}]: ${error instanceof Error ? error.message : String(error)}.`);
  }
  if (!object(data)) invalid(`Manifest [${path}] must contain an object.`);
  if (data.version !== 1) invalid(`Unsupported manifest version [${String(data.version)}] in [${path}]; expected version 1.`);
  if (typeof data.override_path !== 'string' || !isAbsolute(data.override_path)) invalid('Manifest override_path must be absolute.');
  if (!Array.isArray(data.namespaces)) invalid('Manifest namespaces must be an array.');
  const namespaces: NamespaceRegistration[] = [];
  const seen = new Set<string>();
  for (const entry of data.namespaces) {
    if (!object(entry) || typeof entry.namespace !== 'string' || !/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(entry.namespace)) {
      invalid('Manifest contains an invalid namespace.');
    }
    if (seen.has(entry.namespace)) invalid(`Duplicate namespace [${entry.namespace}].`);
    seen.add(entry.namespace);
    if (typeof entry.path !== 'string' || !isAbsolute(entry.path) || !existsSync(entry.path) || !statSync(entry.path).isDirectory()) {
      invalid(`Page directory for [${entry.namespace}] must be an existing absolute directory.`);
    }
    if (!Array.isArray(entry.extensions) || !entry.extensions.length
      || !entry.extensions.every((extension): extension is string => typeof extension === 'string' && /^[a-z][a-z0-9]*$/.test(extension))) {
      invalid(`Extensions for [${entry.namespace}] must be a non-empty list of lowercase suffixes without dots.`);
    }
    namespaces.push({ namespace: entry.namespace, path: realpathSync(entry.path), extensions: [...new Set(entry.extensions)] });
  }
  namespaces.sort((a, b) => a.namespace.localeCompare(b.namespace, 'en'));
  return { version: 1, override_path: canonicalDirectory(resolve(data.override_path)), namespaces };
}
