import { authFetch } from './auth';

interface PermEntry { resource: string; can_read: number; can_write: number; }

let _cache  = new Map<string, PermEntry>();
let _loaded = false;

export async function loadPermissions(): Promise<void> {
  try {
    const r = await authFetch('/api/permissions/my');
    if (!r.ok) return;
    const data: PermEntry[] = await r.json();
    _cache  = new Map(data.map(p => [p.resource, p]));
    _loaded = true;
  } catch {}
}

export function clearPermissions(): void {
  _cache  = new Map();
  _loaded = false;
}

export function isPermissionsLoaded(): boolean { return _loaded; }

export function canRead(resource: string): boolean {
  return !!_cache.get(resource)?.can_read;
}

export function canWrite(resource: string): boolean {
  return !!_cache.get(resource)?.can_write;
}
