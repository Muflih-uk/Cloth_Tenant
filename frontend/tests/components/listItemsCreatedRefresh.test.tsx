import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ListItems from "@/components/pages/admin/items/ListItems";

const mocks = vi.hoisted(() => ({
  getStockList: vi.fn(),
  getOutstandingDemand: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => mocks.params,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    role: "ADMIN",
    permissions: {
      orders_view: true,
      orders_edit: true,
      orders_delete: true,
      items_view: true,
      items_edit: true,
      items_delete: true,
      agents_view: true,
    },
  }),
}));

vi.mock("@/lib/api/item", () => ({
  fabricApi: {
    getStockList: mocks.getStockList,
    getOutstandingDemand: mocks.getOutstandingDemand,
  },
}));

vi.mock("@/lib/rollsCache", () => ({
  invalidateRolls: vi.fn(),
}));

vi.mock("@/components/items", () => ({
  ItemList: () => <div />,
}));

describe("inventory after item creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = new URLSearchParams();
    mocks.getStockList.mockResolvedValue([]);
    mocks.getOutstandingDemand.mockResolvedValue([]);
  });

  it("refetches stock when the create success token changes", async () => {
    const page = render(<ListItems />);

    await waitFor(() => expect(mocks.getStockList).toHaveBeenCalledTimes(1));
    mocks.params = new URLSearchParams("created=123");
    page.rerender(<ListItems />);

    await waitFor(() => expect(mocks.getStockList).toHaveBeenCalledTimes(2));
  });
});
