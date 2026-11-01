// Shared by the browser upload (lib/direct-upload.ts) and the server actions
// that accept its keys. No 'use client' / 'use server': both sides import it.

/** Same sanitising the server actions always used, so keys look the same. */
export function safeFilename(name: string | null | undefined, fallback = 'document'): string {
  return (name || fallback).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || fallback;
}

/** `<prefix>/<uuid>-<safe name>` and nothing else: no `..`, no extra slashes. */
const KEY_TAIL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9._-]{1,80}$/;

/** True when `key` is an object this form may point at: one under its own
 *  prefix (a vacancy's slug, an application's document slot), shaped exactly
 *  as lib/direct-upload.ts names it. */
export function isOwnedKey(key: string, prefix: string): boolean {
  if (!key.startsWith(`${prefix}/`)) return false;
  const tail = key.slice(prefix.length + 1);
  return KEY_TAIL.test(tail) && !tail.includes('..');
}
