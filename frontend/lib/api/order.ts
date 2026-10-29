import type {
  AddOrderItemRequest,
  BundleDispatchResponse,
  BundleMutationResponse,
  CreatePackingBundleResponse,
  MergeOrderItemsRequest,
  OrderAllResponse,
  OrderRegisterRequest,
  OrderRegisterResponse,
  OrderResponse,
  OrderTotals,
  PackingBundleListResponse,
  PackingPlan,
  PackingQueue,
  PackingRoundSummary,
  PlaceOrderResponse,
  PlanOverrideEntry,
  ResolveRollScanResponse,
  ScanIntoBundleResponse,
  UpdateOrderItemRequest,
  UpdateOrderRequest,
} from "@/types/order";
import { api } from "./axios";
import type { PaginatedResponse } from "@/types/global";

export interface OrderLog {
  id: number;
  order_ref: number;
  action: string;
  details: Record<string, unknown>;
  performed_by: string | null;
  created_at: string;
}

export interface InvoiceResponse {
  id: number;
  customer: { id: number; name: string; contact: string; address: string };
  agent: { id: number; username: string; contact: string } | null;
  brand?: {
    id: number;
    name: string;
    phone: string;
    email: string;
    address_line1: string;
    address_line2: string | null;
    logo_url: string | null;
    gst: string | null;
  } | null;
  created_at: string;
  status: string;
  items: OrderResponse["items"];
  totals: OrderTotals;
  gst_rate: number;
  notes?: string;
}

export interface PriceOverrideResponse {
  message: string;
  computed_total: string;
  final_total: string | null;
  effective_total: string;
  is_price_overridden: boolean;
  price_override_reason: string;
}

export interface AllocationRecord {
  id: number;
  metres: string;
  sequence: number;
  is_priority_award: boolean;
  created_at: string;
  customer: string;
  fabric: string;
}

export interface ConfirmRoundResponse {
  message: string;
  id: number;
  status: string;
  allocations: AllocationRecord[];
}

export interface OrderFilters {
  from?: string;
  to?: string;
  agent?: string;
  page?: number;
  page_size?: number;
  search?: string;
  customer?: string;
  status?: string[];
}

export const orderApi = {
  getAll(
    filters?: OrderFilters,
  ): Promise<PaginatedResponse<OrderAllResponse[number]>> {
    const params = new URLSearchParams();
    if (filters?.from) params.append("from_date", filters.from);
    if (filters?.to) params.append("to_date", filters.to);
    if (filters?.agent) params.append("agent", filters.agent);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.page_size) params.append("page_size", filters.page_size.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.customer) params.append("customer", filters.customer);
    filters?.status?.forEach((s) => params.append("status", s));
    const query = params.toString();
    return api
      .get<PaginatedResponse<OrderAllResponse[number]>>(
        `/api/orders/${query ? `?${query}` : ""}`,
      )
      .then((r) => r.data);
  },

  getAllIds(): Promise<{ id: number; status: string }[]> {
    return api
      .get<{ id: number; status: string }[]>("/api/orders/order-ids/")
      .then((r) => r.data);
  },

  getByCustomer(
    customerId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<PaginatedResponse<OrderAllResponse[number]>> {
    const query = new URLSearchParams();
    query.append("customer", customerId.toString());
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());
    return api
      .get<PaginatedResponse<OrderAllResponse[number]>>(`/api/orders/?${query.toString()}`)
      .then((r) => r.data);
  },

  getOne(id: number): Promise<OrderResponse> {
    return api.get<OrderResponse>(`/api/orders/${id}/`).then((r) => r.data);
  },

  create(data: OrderRegisterRequest): Promise<OrderRegisterResponse> {
    return api.post<OrderRegisterResponse>("/api/orders/", data).then((r) => r.data);
  },

  /** Add a fabric line by scanning its QR and asking for a number of metres. */
  addItem(orderId: number, itemData: AddOrderItemRequest): Promise<void> {
    return api.post(`/api/orders/${orderId}/add-item/`, itemData).then((r) => r.data);
  },

  update(id: number, data: UpdateOrderRequest): Promise<OrderResponse> {
    return api.patch<OrderResponse>(`/api/orders/${id}/`, data).then((r) => r.data);
  },

  updateItem(itemId: number, data: UpdateOrderItemRequest) {
    return api.patch(`/api/orders/order-items/${itemId}/`, data).then((r) => r.data);
  },

  delete(id: number, pin: string): Promise<void> {
    return api.delete(`/api/orders/${id}/`, { data: { pin } }).then((r) => r.data);
  },

  agentDelete(id: number): Promise<void> {
    return api.delete(`/api/orders/${id}/`).then((r) => r.data);
  },

  deleteItem(orderId: number, itemId: number): Promise<void> {
    return api.delete(`/api/orders/${orderId}/delete-item/${itemId}/`).then((r) => r.data);
  },

  /**
   * Fold duplicate lines into one. Done server-side in a single transaction so
   * the metres are summed as decimals and a failure cannot leave the order
   * holding the group's metres twice.
   */
  mergeItems(orderId: number, data: MergeOrderItemsRequest): Promise<void> {
    return api
      .post(`/api/orders/${orderId}/merge-items/`, data)
      .then((r) => r.data);
  },

  invoiceOrder(id: number): Promise<InvoiceResponse> {
    return api.get<InvoiceResponse>(`/api/orders/${id}/invoice/`).then((r) => r.data);
  },

  /**
   * Turn a DRAFT into real demand. The response lists any `shortfall_lines`:
   * variants where every open order together wants more than the mill holds.
   * That is allowed on purpose -- packing arbitrates the oversubscription.
   */
  placeOrder(
    id: number,
    data?: {
      expected_delivery_date?: string | null;
      preferred_transport?: number | null;
      notes?: string | null;
    },
  ): Promise<PlaceOrderResponse> {
    return api
      .post<PlaceOrderResponse>(`/api/orders/${id}/place-order/`, data)
      .then((r) => r.data);
  },

  /**
   * Set or clear the billed total of a draft order. Posting the computed total
   * clears an existing adjustment. `reason` is optional but always audited.
   * The server caps an agent at the line arithmetic; only an admin may raise it.
   */
  setPrice(
    id: number,
    data: { final_total: string; reason?: string },
  ): Promise<PriceOverrideResponse> {
    return api.post<PriceOverrideResponse>(`/api/orders/${id}/set-price/`, data).then((r) => r.data);
  },

  getOrderLogs(orderId: number): Promise<OrderLog[]> {
    return api.get<OrderLog[]>(`/api/orders/${orderId}/logs/`).then((r) => r.data);
  },

  startEdit(id: number): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/api/orders/${id}/start-edit/`).then((r) => r.data);
  },

  saveEdit(
    id: number,
    data?: {
      expected_delivery_date?: string | null;
      preferred_transport?: number | null;
      notes?: string | null;
    },
  ): Promise<{ message: string; order_id: number }> {
    return api
      .post<{ message: string; order_id: number }>(`/api/orders/${id}/save-edit/`, data)
      .then((r) => r.data);
  },

  cancelEdit(id: number): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/api/orders/${id}/cancel-edit/`).then((r) => r.data);
  },

  getViewedIds(): Promise<number[]> {
    return api.get<number[]>("/api/orders/my-viewed-ids/").then((r) => r.data);
  },

  markAsViewed(orderId: number): Promise<void> {
    return api.post(`/api/orders/${orderId}/mark-viewed/`).then((r) => r.data);
  },

  getArchived(
    filters?: OrderFilters,
  ): Promise<PaginatedResponse<OrderAllResponse[number]>> {
    const params = new URLSearchParams();
    if (filters?.from) params.append("from_date", filters.from);
    if (filters?.to) params.append("to_date", filters.to);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.page_size) params.append("page_size", filters.page_size.toString());
    const query = params.toString();
    return api
      .get<PaginatedResponse<OrderAllResponse[number]>>(
        `/api/orders/archived/${query ? `?${query}` : ""}`,
      )
      .then((r) => r.data);
  },
};

/**
 * The packing board. One fabric variant at a time: see who is waiting for it,
 * dry-run the equal-fill + priority split, freeze the plan, then confirm it to
 * move cloth (or cancel it to put the metres back).
 */
export const packingApi = {
  /** Outstanding demand for one variant, ranked by customer priority. */
  queue(variantId: number): Promise<PackingQueue> {
    return api
      .get<PackingQueue>("/api/orders/packing-rounds/queue/", {
        params: { variant: variantId },
      })
      .then((r) => r.data);
  },

  /** Run the allocation engine without writing anything. */
  preview(data: {
    variant: number;
    round_size: string;
    order_ids?: number[];
    available_meters?: string | null;
  }): Promise<PackingPlan> {
    return api.post<PackingPlan>("/api/orders/packing-rounds/preview/", data).then((r) => r.data);
  },

  /**
   * Freeze a plan as a DRAFT round. Omit `allocations` to accept the engine's
   * own split, or send a hand-edited plan to override it.
   */
  createRound(data: {
    variant: number;
    round_size: string;
    note?: string;
    allocations?: PlanOverrideEntry[];
  }): Promise<{ id: number; status: string; plan_override: PlanOverrideEntry[] }> {
    return api.post("/api/orders/packing-rounds/", data).then((r) => r.data);
  },

  listRounds(variantId?: number): Promise<PackingRoundSummary[]> {
    return api
      .get<PackingRoundSummary[]>("/api/orders/packing-rounds/list/", {
        params: variantId ? { variant: variantId } : undefined,
      })
      .then((r) => r.data);
  },

  /** Commit the round: cloth leaves the roll and allocations are recorded. */
  confirm(roundId: number, note?: string): Promise<ConfirmRoundResponse> {
    return api
      .post<ConfirmRoundResponse>(`/api/orders/packing-rounds/${roundId}/confirm/`, {
        note: note ?? "",
      })
      .then((r) => r.data);
  },

  /** Reverse a confirmed round, returning its metres to the roll. */
  cancel(roundId: number): Promise<{ message: string; id: number; status: string }> {
    return api
      .post<{ message: string; id: number; status: string }>(
        `/api/orders/packing-rounds/${roundId}/cancel/`,
        {},
      )
      .then((r) => r.data);
  },

  /**
   * Check a scanned roll label and get the token used to pack it.
   *
   * The raw label is sent, not a hand-built roll id, so our parser and the
   * server's lookup agree on what a label is. Nothing moves yet: a bad label, a
   * spent roll, a colour this order never asked for and a sealed bundle are all
   * refused here, before the roll confirmation appears.
   */
  resolveScan(
    orderId: number,
    bundleId: number,
    roll: string,
  ): Promise<ResolveRollScanResponse> {
    return api
      .post<ResolveRollScanResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/scan/resolve/`,
        { roll },
      )
      .then((r) => r.data);
  },

  /**
   * Every bundle on this order, sealed ones included. Sealed bundles keep their
   * rolls in the response, which is what lets a packing slip be reprinted long
   * after the box has gone.
   */
  listBundles(orderId: number): Promise<PackingBundleListResponse> {
    return api
      .get<PackingBundleListResponse>(`/api/orders/${orderId}/bundles/`)
      .then((r) => r.data);
  },

  /**
   * Open a new empty bundle on this order. Nothing is fixed yet: rolls can be
   * scanned in and taken back out until it is sealed.
   */
  createBundle(orderId: number): Promise<CreatePackingBundleResponse> {
    return api
      .post<CreatePackingBundleResponse>(
        `/api/orders/${orderId}/bundles/create/`,
        {},
      )
      .then((r) => r.data);
  },

  /**
   * Add the server-selected ordered quantity from the roll named by a resolve token.
   *
   * The browser cannot swap the roll between resolving and cutting: the server
   * holds the roll, order, bundle and admin in the token and re-checks the cut
   * under the roll lock. The line is chosen by the roll's colour, so no line id is
   * sent either.
   */
  scanIntoBundle(
    orderId: number,
    bundleId: number,
    token: string,
    metres: string,
  ): Promise<ScanIntoBundleResponse> {
    return api
      .post<ScanIntoBundleResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/scan/`,
        { token, metres },
      )
      .then((r) => r.data);
  },

  /**
   * Take one roll back out of an open bundle.
   *
   * `rollAllocationId` names the RollAllocation row rather than the roll, so the
   * same label appearing twice in one bundle is still removable on its own. The
   * metres go back on the very roll they came off and the line's packed total comes
   * down; the rest of the bundle is untouched.
   */
  removeRollFromBundle(
    orderId: number,
    bundleId: number,
    rollAllocationId: number,
  ): Promise<BundleMutationResponse> {
    return api
      .post<BundleMutationResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/rolls/${rollAllocationId}/remove/`,
        {},
      )
      .then((r) => r.data);
  },

  /**
   * Seal a bundle, freezing its contents. This is the point of no return: the slip
   * printed from a sealed bundle is a promise about what is in the box, so afterwards
   * no roll can be added and none can be taken out.
   */
  sealBundle(
    orderId: number,
    bundleId: number,
  ): Promise<BundleMutationResponse> {
    return api
      .post<BundleMutationResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/seal/`,
        {},
      )
      .then((r) => r.data);
  },

  /**
   * Throw an open bundle away, giving back every roll in it in one go. A bundle that
   * held something is kept as CANCELLED without a number, so the order still shows
   * what was tried while the number can be reused. An empty bundle is deleted.
   */
  cancelBundle(
    orderId: number,
    bundleId: number,
  ): Promise<BundleMutationResponse> {
    return api
      .post<BundleMutationResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/cancel/`,
        {},
      )
      .then((r) => r.data);
  },

  /**
   * Send one sealed bundle out. This is the unit of dispatch: a finished box of cloth
   * is the smallest thing that can honestly be called shipped, and one truck may take
   * the first two boxes and come back for the third.
   *
   * `transport_company` is only needed for the first bundle to leave on an order --
   * the transport is chosen once and reused, so a later bundle carrying a different
   * one is refused rather than quietly rewriting where the earlier boxes went.
   */
  dispatchBundle(
    orderId: number,
    bundleId: number,
    data?: { transport_company?: number | null },
  ): Promise<BundleDispatchResponse> {
    return api
      .post<BundleDispatchResponse>(
        `/api/orders/${orderId}/bundles/${bundleId}/dispatch/`,
        data ?? {},
      )
      .then((r) => r.data);
  },
};
