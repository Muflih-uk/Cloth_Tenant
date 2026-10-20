import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ItemList from "@/components/items/ItemList";
import type { OutstandingDemandRow } from "@/types/item";

vi.mock("@/components/items/QRScanModal", () => ({
  default: () => null,
}));

function demandRow(
  overrides: Partial<OutstandingDemandRow> = {},
): OutstandingDemandRow {
  return {
    variant: 1,
    fabric: "Cotton",
    fabric_id: 10,
    display_order: "White",
    stock_meters: "100.000",
    outstanding_meters: "25.000",
    is_backordered: false,
    ...overrides,
  };
}

describe("ItemList outstanding tab", () => {
  it("only shows and counts variants with positive outstanding demand", () => {
    render(
      <ItemList
        items={[]}
        loading={false}
        context="admin"
        initialTab="ordered"
        outstandingDemand={[
          demandRow(),
          demandRow({
            variant: 2,
            display_order: "Blue",
            outstanding_meters: "0.000",
          }),
          demandRow({
            variant: 3,
            display_order: "Red",
            outstanding_meters: "-10.000",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Outstanding (1)" })).toBeTruthy();
    expect(screen.getByText("Cotton")).toBeTruthy();
    expect(screen.getByText(/25 m/)).toBeTruthy();
    expect(screen.queryByText(/Blue:/)).toBeNull();
    expect(screen.queryByText(/Red:/)).toBeNull();
  });

  it("shows an empty state when no variant has demand", () => {
    render(
      <ItemList
        items={[]}
        loading={false}
        context="admin"
        initialTab="ordered"
        outstandingDemand={[demandRow({ outstanding_meters: "0.000" })]}
      />,
    );

    expect(screen.getByRole("button", { name: "Outstanding (0)" })).toBeTruthy();
    expect(screen.getByText("No fabric is awaiting packing")).toBeTruthy();
  });

  it("filters the positive outstanding demand by fabric name", () => {
    render(
      <ItemList
        items={[]}
        loading={false}
        context="admin"
        initialTab="ordered"
        outstandingDemand={[
          demandRow(),
          demandRow({
            variant: 2,
            fabric: "Linen",
            fabric_id: 11,
            outstanding_meters: "50.000",
          }),
        ]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search outstanding demand..."), {
      target: { value: "linen" },
    });

    expect(screen.getByRole("button", { name: "Outstanding (1)" })).toBeTruthy();
    expect(screen.getByText("Linen")).toBeTruthy();
    expect(screen.queryByText("Cotton")).toBeNull();
  });
});
