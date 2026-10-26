import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ItemList from "@/components/items/ItemList";
import type { UIItem } from "@/types/item";

vi.mock("@/components/items/QRScanModal", () => ({
  default: () => null,
}));

vi.mock("@/components/pages/ImagePreview", () => ({
  ImagePreview: () => <span data-testid="item-image" />,
}));

function item(overrides: Partial<UIItem> = {}): UIItem {
  return {
    id: 1,
    name: "Cotton Checks",
    design_number: "RJ-1042",
    category: "Cotton",
    price_per_meter: "125.00",
    variants: [
      {
        id: 11,
        image: null,
        qr_code: "QR-11",
        display_order: "Red",
        stock_meters: "40.000",
      },
    ],
    ...overrides,
  };
}

const ITEMS = [
  item(),
  item({
    id: 2,
    name: "Summer Weave",
    design_number: "RJ-2099",
    category: "Rayon",
    variants: [
      {
        id: 21,
        image: null,
        qr_code: "QR-21",
        display_order: "Sand",
        stock_meters: "18.000",
      },
    ],
  }),
];

describe("ItemList mobile inventory", () => {
  it("shows the inventory heading, item count and add action", () => {
    const onAddItem = vi.fn();
    render(
      <ItemList
        items={ITEMS}
        loading={false}
        context="admin"
        onAddItem={onAddItem}
      />,
    );

    expect(screen.getByRole("heading", { name: "Inventory" })).toBeTruthy();
    expect(screen.getByText("2 items")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it("filters by item name, item code and fabric type", () => {
    render(<ItemList items={ITEMS} loading={false} context="admin" />);

    const search = screen.getByPlaceholderText("Search name, code or fabric");

    fireEvent.change(search, { target: { value: "summer" } });
    expect(screen.getByText("Summer Weave")).toBeTruthy();
    expect(screen.queryByText("Cotton Checks")).toBeNull();

    fireEvent.change(search, { target: { value: "rj-1042" } });
    expect(screen.getByText("Cotton Checks")).toBeTruthy();
    expect(screen.queryByText("Summer Weave")).toBeNull();

    fireEvent.change(search, { target: { value: "rayon" } });
    expect(screen.getByText("Summer Weave")).toBeTruthy();
    expect(screen.queryByText("Cotton Checks")).toBeNull();
  });

  it("keeps the existing stock filters and their active state", () => {
    render(<ItemList items={ITEMS} loading={false} context="admin" />);

    const inStock = screen.getByRole("button", { name: "In Stock (2)" });
    const out = screen.getByRole("button", { name: "Out (0)" });

    expect(inStock.getAttribute("aria-pressed")).toBe("true");
    expect(out.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(out);

    expect(inStock.getAttribute("aria-pressed")).toBe("false");
    expect(out.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("No items found")).toBeTruthy();
  });
});
