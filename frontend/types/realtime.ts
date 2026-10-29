export interface RealtimeEvent {
  type: string;
  order_id?: number;
  entity_id?: number;
  status?: string | null;
  source?: string;
  occurred_at?: string;
  reconnected?: boolean;
}

export type RealtimeStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "disconnected";
