import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import OrderItemsSection from "@/components/pages/order/OrderItemsSection";
import type { OrderItem } from "@/types/order";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ role: "ADMIN" }),
}));

vi.mock("@/components/pages/order/PackingBundlePanel", () => ({
  default: () => <div data-testid="bundle-panel" />,
}));

const lineA: OrderItem = {
  id: 7,
  fabric: 1,
  variant: 3,
  variant_display_order: "Natural",
  fabric_name: "Cotton Cambric",
  fabric_name_display: "Cotton Cambric",
  rate_per_meter: "9.00",
  original_rate_per_meter: "9.00",
  is_rate_overridden: false,
  rate_overridden_by: null,
  rate_overridden_at: null,
  variant_image: null,
  ordered_quantity: "600.000",
  allocated_quantity: "0.000",
  outstanding_quantity: "600.000",
  line_total: "5400.00",
  allocation_count: 0,
  is_roll_tracked: true,
};

const lineB: OrderItem = {
  ...lineA,
  id: 8,
  fabric: 2,
  variant: 4,
  variant_display_order: "Charcoal",
  fabric_name: "Linen Blend",
  fabric_name_display: "Linen Blend",
  ordered_quantity: "400.000",
  outstanding_quantity: "400.000",
  line_total: "4800.00",
};

function section(items: OrderItem[] = [lineA, lineB], status = "PENDING") {
  return render(
    <OrderItemsSection
      items={items}
      status={status}
      orderId={5}
      onItemsChange={vi.fn()}
    />,
  );
}

describe("OrderItemsSection packing entry points", () => {
  it("puts packing in the bundle panel rather than on each line", () => {
    section();

    expect(screen.getByTestId("bundle-panel")).toBeTruthy();
    // Manual packing was removed: cloth only moves after a roll label is scanned.
    expect(
      screen.queryByRole("button", { name: /pack this line/i }),
    ).toBeNull();
    expect(
      screen.queryByLabelText(/metres of .* to pack/i),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /update packing/i }),
    ).toBeNull();
  });

  it("shows ordered and packed progress without duplicate warnings", () => {
    section();

    expect(screen.getByText("1000 m ordered · 0 m packed")).toBeTruthy();
    expect(screen.getByText("600 m ordered · 0 m packed")).toBeTruthy();
    expect(screen.queryByText(/still owed/i)).toBeNull();
    expect(screen.queryByText(/awaiting packing/i)).toBeNull();
  });

  it("takes settled lines out of the work list but keeps part-packed ones", () => {
    section([
      { ...lineA, allocated_quantity: "600.000", outstanding_quantity: "0.000" },
      { ...lineB, allocated_quantity: "100.000", outstanding_quantity: "300.000" },
    ]);

    expect(screen.queryByText(/Cotton Cambric/)).toBeNull();
    expect(screen.getByText(/Linen Blend/)).toBeTruthy();
    expect(screen.getByText("1000 m ordered · 700 m packed")).toBeTruthy();
  });

  it("says when every line has gone into a bundle", () => {
    section([
      { ...lineA, allocated_quantity: "600.000", outstanding_quantity: "0.000" },
      { ...lineB, allocated_quantity: "400.000", outstanding_quantity: "0.000" },
    ]);

    expect(screen.getByText(/All items packed/)).toBeTruthy();
    expect(screen.getByTestId("bundle-panel")).toBeTruthy();
  });
});
