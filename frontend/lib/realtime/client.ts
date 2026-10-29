import { API_BASE_URL } from "@/lib/api/axios";
import type { RealtimeEvent, RealtimeStatus } from "@/types/realtime";

type EventHandler = (event: RealtimeEvent) => void;
type StatusHandler = (status: RealtimeStatus) => void;
type TicketProvider = () => Promise<string>;

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];
const HEARTBEAT_INTERVAL = 25_000;
const STALE_AFTER = 60_000;
const HIDDEN_DISCONNECT_DELAY = 120_000;

export const REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_REALTIME_ENABLED !== "false";

function websocketUrl(ticket: string) {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  const base =
    configured ||
    `${API_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/orders/`;

  const url = new URL(base);
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private ticketProvider: TicketProvider | null = null;
  private handlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private status: RealtimeStatus = REALTIME_ENABLED ? "disconnected" : "disabled";
  private running = false;
  private paused = false;
  private connecting = false;
  private attempt = 0;
  private hasConnected = false;
  private lastMessageAt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  private listeningToWindow = false;

  start = (getTicket: TicketProvider) => {
    if (!REALTIME_ENABLED || typeof window === "undefined") return;

    this.ticketProvider = getTicket;
    this.running = true;
    this.paused = false;
    this.attachWindowListeners();
    void this.connect();
  };

  stop = () => {
    this.running = false;
    this.paused = false;
    this.connecting = false;
    this.ticketProvider = null;
    this.attempt = 0;
    this.hasConnected = false;
    this.clearTimers();
    this.detachWindowListeners();
    this.socket?.close();
    this.socket = null;
    this.setStatus(REALTIME_ENABLED ? "disconnected" : "disabled");
  };

  subscribe = (handler: EventHandler) => {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  };

  subscribeStatus = (handler: StatusHandler) => {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  };

  getStatus = () => this.status;

  private async connect() {
    if (typeof WebSocket === "undefined") {
      this.setStatus("disabled");
      return;
    }

    if (
      !this.running ||
      this.paused ||
      this.connecting ||
      !this.ticketProvider ||
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.connecting = true;
    this.setStatus("connecting");

    let ticket: string;
    try {
      ticket = await this.ticketProvider();
    } catch (error) {
      this.connecting = false;
      console.error("[Realtime] Could not get a WebSocket ticket", error);
      this.scheduleReconnect();
      return;
    }

    if (!this.running || this.paused) {
      this.connecting = false;
      return;
    }

    try {
      const socket = new WebSocket(websocketUrl(ticket));
      this.connecting = false;
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) {
          socket.close();
          return;
        }
        this.attempt = 0;
        this.lastMessageAt = Date.now();
        this.setStatus("connected");
        this.startHeartbeat();
        const reconnected = this.hasConnected;
        this.hasConnected = true;
        this.emit({ type: "realtime.connected", reconnected });
      };

      socket.onmessage = (message) => {
        if (this.socket !== socket) return;
        this.lastMessageAt = Date.now();
        try {
          const event = JSON.parse(message.data) as RealtimeEvent;
          if (event?.type && event.type !== "pong") this.emit(event);
        } catch (error) {
          console.error("[Realtime] Invalid message", error);
        }
      };

      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.stopHeartbeat();
        this.setStatus("disconnected");
        if (!this.paused) this.scheduleReconnect();
      };

      socket.onerror = () => {
        if (this.socket === socket) socket.close();
      };
    } catch (error) {
      this.connecting = false;
      console.error("[Realtime] Could not open the WebSocket", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.running || this.paused || this.reconnectTimer) return;

    const base = RECONNECT_DELAYS[Math.min(this.attempt, RECONNECT_DELAYS.length - 1)];
    const delay = base + Math.floor(Math.random() * 500);
    this.attempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const socket = this.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      if (Date.now() - this.lastMessageAt > STALE_AFTER) {
        socket.close();
        return;
      }

      socket.send(JSON.stringify({ type: "ping" }));
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = null;
    }
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private emit(event: RealtimeEvent) {
    this.handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("[Realtime] Event handler failed", error);
      }
    });
  }

  private onOnline = () => {
    if (!this.running) return;
    this.attempt = 0;
    void this.connect();
  };

  private onVisibilityChange = () => {
    if (!this.running) return;

    if (document.visibilityState === "hidden") {
      if (this.hiddenTimer) clearTimeout(this.hiddenTimer);
      this.hiddenTimer = setTimeout(() => {
        this.paused = true;
        this.socket?.close();
      }, HIDDEN_DISCONNECT_DELAY);
      return;
    }

    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = null;
    }
    this.paused = false;
    this.attempt = 0;
    void this.connect();
  };

  private attachWindowListeners() {
    if (this.listeningToWindow) return;
    this.listeningToWindow = true;
    window.addEventListener("online", this.onOnline);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private detachWindowListeners() {
    if (!this.listeningToWindow) return;
    this.listeningToWindow = false;
    window.removeEventListener("online", this.onOnline);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }
}

export const realtimeClient = new RealtimeClient();
