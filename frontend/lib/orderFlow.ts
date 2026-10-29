import type { OrderRegisterRequest } from "@/types/order";

export type OrderFlowMode = "agent" | "admin";

export const AGENT_ORDER_BASE_PATH = "/agent/order/new";
export const ADMIN_ORDER_BASE_PATH = "/admin/order/new";

export function getOrderBasePath(mode: OrderFlowMode): string {
  return mode === "admin" ? ADMIN_ORDER_BASE_PATH : AGENT_ORDER_BASE_PATH;
}

export function getOrderAfterPlacePath(
  mode: OrderFlowMode,
  orderId: number,
): string {
  return mode === "admin"
    ? `/admin/order/status/${orderId}`
    : "/agent/order/orderform";
}

/**
 * Admins may create an order for an assigned or unassigned customer. When an
 * agent is known, it is sent through; otherwise the server keeps the order
 * directly under the admin.
 */
export function buildOrderCreatePayload(
  customerId: number,
  agentId?: number,
): OrderRegisterRequest {
  return {
    customer: customerId,
    status: "DRAFT",
    ...(agentId === undefined ? {} : { agent: agentId }),
  };
}

/**
 * An agent must not send `agent`: the server attaches the signed-in agent's own
 * record, so a value from the client could only ever be wrong.
 */
export function buildAgentOrderCreatePayload(
  customerId: number,
): OrderRegisterRequest {
  return { customer: customerId, status: "DRAFT" };
}

/**
 * Pulls the first human-readable message out of a DRF error body, which may be
 * `{ error }`, `{ detail }`, or field errors like `{ agent: ["..."] }`.
 */
export function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (!data || typeof data !== "object") return fallback;

  const record = data as Record<string, unknown>;

  for (const key of ["error", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0];
    }
  }

  return fallback;
}
