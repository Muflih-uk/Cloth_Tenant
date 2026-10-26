import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ItemCard from "@/components/items/ItemCard";
import type { UIItem } from "@/types/item";

vi.mock("@/components/pages/ImagePreview", () => ({
  ImagePreview: () => <span data-testid="item-image" />,
}));

vi.mock("@/components/items/VariantCard", () => ({
  default: ({ variant }: { variant: { id: number } }) => (
    <div>Variant {variant.id}</div>
  ),
}));

function item(overrides: Partial<UIItem> = {}): UIItem {
  return {
    id: 7,
    name: "Cotton Checks",
    design_number: "RJ-1042",
    category: "Cotton",
    price_per_meter: "125.00",
    variants: [
      {
        id: 11,
        image: "/cotton.jpg",
        qr_code: "QR-11",
        display_order: "Red",
        stock_meters: "40.000",
      },
      {
        id: 12,
        image: null,
        qr_code: "QR-12",
        display_order: "Blue",
        stock_meters: "25.000",
      },
    ],
    ...overrides,
  };
}

function renderCard({
  overrides = {},
  isExpanded = false,
  context = "admin",
}: {
  overrides?: Partial<UIItem>;
  isExpanded?: boolean;
  context?: "admin" | "agent";
} = {}) {
  const onToggle = vi.fn();
  const onEdit = vi.fn();
  const onPrintAll = vi.fn();

  const result = render(
    <ItemCard
      item={item(overrides)}
      context={context}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onEdit={onEdit}
      onPrintAll={onPrintAll}
    />,
  );

  return { ...result, onToggle, onEdit, onPrintAll };
}

describe("ItemCard inventory summary", () => {
  it("shows the code, fabric type, colours and image", () => {
    renderCard();

    expect(screen.getByText("Cotton Checks")).toBeTruthy();
    expect(screen.getByText("RJ-1042")).toBeTruthy();
    expect(screen.getByText("Cotton")).toBeTruthy();
    expect(screen.getByText("2 colours")).toBeTruthy();
    expect(screen.getByTestId("item-image")).toBeTruthy();
  });

  it("falls back to the item id and truncates a long name", () => {
    renderCard({
      overrides: {
        design_number: undefined,
        name: "A very long fabric name that cannot fit on a narrow phone",
      },
    });

    expect(screen.getByText("Item #7")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "A very long fabric name that cannot fit on a narrow phone",
      }).className,
    ).toContain("truncate");
  });

  it("opens details from the card body without triggering the actions", async () => {
    const { onToggle, onEdit, onPrintAll } = renderCard();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Show details for Cotton Checks",
      }),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Edit Cotton Checks" }),
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Print QR codes for Cotton Checks",
      }),
    );

    expect(onEdit).toHaveBeenCalledWith(7);
    expect(onPrintAll).toHaveBeenCalledWith(7);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("marks the body as expanded and renders the colour cards", () => {
    renderCard({ isExpanded: true });

    expect(
      screen.getByRole("button", {
        name: "Hide details for Cotton Checks",
      }).getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("Variant 11")).toBeTruthy();
    expect(screen.getByText("Variant 12")).toBeTruthy();
  });

  it("does not expose admin edit or QR actions to an agent", () => {
    renderCard({ context: "agent" });

    expect(
      screen.queryByRole("button", { name: "Edit Cotton Checks" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Print QR codes for Cotton Checks",
      }),
    ).toBeNull();
    expect(screen.getByText("₹125/m")).toBeTruthy();
  });
});
