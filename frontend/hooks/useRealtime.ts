import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { realtimeClient } from "@/lib/realtime/client";
import type { RealtimeEvent } from "@/types/realtime";

export function useRealtimeEvent(
  eventType: string,
  handler: (event: RealtimeEvent) => void,
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((event) => {
      if (event.type === eventType) handlerRef.current(event);
    });
    return () => {
      unsubscribe();
    };
  }, [eventType]);
}

export function useRealtimeStatus() {
  return useSyncExternalStore(
    realtimeClient.subscribeStatus,
    realtimeClient.getStatus,
    () => "disabled" as const,
  );
}

export function useRealtimeRefresh(
  onRefresh?: () => void | Promise<void>,
  delay = 300,
  eventTypes = ["order.created", "order.updated", "order.deleted"],
) {
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRefreshKey((value) => value + 1);
      Promise.resolve(onRefreshRef.current?.()).catch(console.error);
    }, delay);
  }, [delay]);

  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((event) => {
      if (eventTypes.includes(event.type)) scheduleRefresh();
    });
    return () => {
      unsubscribe();
    };
  }, [eventTypes, scheduleRefresh]);

  const handleConnected = useCallback(
    (event: RealtimeEvent) => {
      if (event.reconnected) scheduleRefresh();
    },
    [scheduleRefresh],
  );
  useRealtimeEvent("realtime.connected", handleConnected);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return refreshKey;
}
