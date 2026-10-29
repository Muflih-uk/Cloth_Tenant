"use client";

import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api/auth";
import {
  clearRealtimeCache,
  invalidateForRealtimeEvent,
} from "@/lib/realtime/cache";

import { realtimeClient } from "./client";

export default function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, accessToken } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      realtimeClient.stop();
      clearRealtimeCache();
      return;
    }

    realtimeClient.start(async () => {
      const response = await authApi.getWsTicket();
      return response.ticket;
    });

    const unsubscribe = realtimeClient.subscribe(invalidateForRealtimeEvent);

    return () => {
      unsubscribe();
      realtimeClient.stop();
    };
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
}
