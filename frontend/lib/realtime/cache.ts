import type { RealtimeEvent } from "@/types/realtime";

type CacheEntry<T> = {
  value: T | null;
  expiresAt: number;
  pending: Promise<T> | null;
};

const DEFAULT_TTL_MS = 5 * 60_000;
const entries = new Map<string, CacheEntry<unknown>>();

export function cachedRequest<T>(
  key: string,
  request: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const current = entries.get(key) as CacheEntry<T> | undefined;

  if (current?.value !== null && current && current.expiresAt > now) {
    return Promise.resolve(current.value);
  }
  if (current?.pending) return current.pending;

  const entry: CacheEntry<T> = current ?? {
    value: null,
    expiresAt: 0,
    pending: null,
  };
  const pending = request().then(
    (value) => {
      entry.value = value;
      entry.expiresAt = Date.now() + ttlMs;
      entry.pending = null;
      return value;
    },
    (error) => {
      entry.pending = null;
      throw error;
    },
  );
  entry.pending = pending;
  entries.set(key, entry);
  return pending;
}

export function invalidateCached(prefix: string): void {
  for (const key of entries.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) entries.delete(key);
  }
}

export function clearRealtimeCache(): void {
  entries.clear();
}

export function invalidateForRealtimeEvent(event: RealtimeEvent): void {
  switch (event.type) {
    case "inventory.updated":
      if (event.entity_id !== undefined) {
        invalidateCached(`rolls:${event.entity_id}`);
        invalidateCached(`rolls:list:${event.entity_id}`);
      }
      invalidateCached("items:stock-list");
      invalidateCached("items:demand:all");
      break;
    case "catalog.updated":
      if (event.entity_id !== undefined) invalidateCached(`items:${event.entity_id}`);
      invalidateCached("items:list");
      invalidateCached("items:stock-list");
      break;
    case "customer.updated":
      if (event.entity_id !== undefined) invalidateCached(`customers:${event.entity_id}`);
      invalidateCached("customers:list");
      break;
    case "order.created":
    case "order.updated":
    case "order.deleted":
      invalidateCached("orders:list");
      if (event.order_id !== undefined) invalidateCached(`orders:${event.order_id}`);
      break;
  }
}
