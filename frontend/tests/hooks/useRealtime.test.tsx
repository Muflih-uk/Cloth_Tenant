import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRealtimeRefresh } from "@/hooks/useRealtime";
import type { RealtimeEvent } from "@/types/realtime";

type Listener = (event: RealtimeEvent) => void;

const realtime = vi.hoisted(() => {
  const listeners = new Set<Listener>();
  return {
    listeners,
    subscribe: vi.fn((listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    emit(event: RealtimeEvent) {
      for (const listener of listeners) listener(event);
    },
  };
});

vi.mock("@/lib/realtime/client", () => ({
  realtimeClient: { subscribe: realtime.subscribe },
}));

const orderEvent = {
  type: "order.updated",
  order_id: 1,
  status: "PENDING",
  source: "api",
  occurred_at: "2026-01-01T00:00:00Z",
} satisfies RealtimeEvent;

describe("useRealtimeRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    realtime.listeners.clear();
    realtime.subscribe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches a burst of order events into one refresh", () => {
    const refresh = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRealtimeRefresh(refresh, 200),
    );

    act(() => {
      realtime.emit({ ...orderEvent, type: "order.created" });
      realtime.emit(orderEvent);
      realtime.emit({ ...orderEvent, type: "order.deleted" });
    });
    expect(refresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(1);
    unmount();
  });

  it("only refreshes on reconnect, not on the initial connection", () => {
    const refresh = vi.fn();
    renderHook(() => useRealtimeRefresh(refresh, 100));

    act(() => {
      realtime.emit({ type: "realtime.connected", reconnected: false });
      vi.advanceTimersByTime(100);
    });
    expect(refresh).not.toHaveBeenCalled();

    act(() => {
      realtime.emit({ type: "realtime.connected", reconnected: true });
      vi.advanceTimersByTime(100);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("supports resource event families", () => {
    const refresh = vi.fn();
    renderHook(() =>
      useRealtimeRefresh(refresh, 100, ["inventory.updated"]),
    );

    act(() => {
      realtime.emit({ type: "customer.updated", entity_id: 1 });
      realtime.emit({ type: "inventory.updated", entity_id: 2 });
      vi.advanceTimersByTime(100);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops listening after unmount", () => {
    const refresh = vi.fn();
    const { unmount } = renderHook(() => useRealtimeRefresh(refresh, 100));

    unmount();
    act(() => {
      realtime.emit(orderEvent);
      vi.advanceTimersByTime(100);
    });

    expect(refresh).not.toHaveBeenCalled();
  });
});
