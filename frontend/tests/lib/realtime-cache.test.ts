import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cachedRequest,
  clearRealtimeCache,
  invalidateForRealtimeEvent,
} from "@/lib/realtime/cache";

describe("realtime cache", () => {
  beforeEach(() => {
    clearRealtimeCache();
  });

  it("deduplicates requests and reuses the result", async () => {
    const request = vi.fn().mockResolvedValue({ id: 1 });

    const first = cachedRequest("customers:1", request);
    const second = cachedRequest("customers:1", request);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: 1 },
      { id: 1 },
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("invalidates only the changed entity and affected collection", async () => {
    const changed = vi.fn().mockResolvedValue("changed");
    const unchanged = vi.fn().mockResolvedValue("unchanged");

    await cachedRequest("customers:1", changed);
    await cachedRequest("customers:2", unchanged);
    invalidateForRealtimeEvent({ type: "customer.updated", entity_id: 1 });

    await cachedRequest("customers:1", changed);
    await cachedRequest("customers:2", unchanged);

    expect(changed).toHaveBeenCalledTimes(2);
    expect(unchanged).toHaveBeenCalledTimes(1);
  });
});
