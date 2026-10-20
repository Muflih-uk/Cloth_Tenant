import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditVariantRow from "@/app/(admin)/admin/items/edit/[id]/editVariantRow";
import type { EditableVariant } from "@/types/item";

vi.mock("@/components/pages/ImagePreview", () => ({
  ImagePreview: () => <span data-testid="image-preview" />,
}));

const existing = (over: Partial<EditableVariant> = {}): EditableVariant => ({
  backendId: 7,
  localId: "a",
  baseOpening: "100.000",
  initialBaseOpening: "100.000",
  stockMeters: "100.000",
  displayOrder: "Natural",
  imageUrl: null,
  newImage: null,
  imagePreview: null,
  isRollTracked: true,
  rollCount: 1,
  ...over,
});

/** No callbacks do anything here: this is about what the row displays. */
const noop = () => {};

function renderRow(
  variant: EditableVariant,
  isNew = false,
  children?: React.ReactNode,
) {
  return render(
    <EditVariantRow
      variant={variant}
      index={0}
      isOnly
      isNew={isNew}
      onChange={noop}
      onDelete={noop}
      onPickImage={noop}
    >
      {children}
    </EditVariantRow>,
  );
}

describe("EditVariantRow stock figures", () => {
  it("edits the opening base and displays order and on-roll balances separately", () => {
    renderRow(
      existing({
        baseOpening: "200.000",
        initialBaseOpening: "100.000",
        availableMeters: "40.000",
        stockMeters: "100.000",
        isRollTracked: true,
        rollCount: 1,
      }),
    );

    expect(screen.getByDisplayValue("200.000")).toHaveProperty("readOnly", false);
    expect(document.body.textContent).toContain("Opening stock (order-stock base)");
    expect(document.body.textContent).toContain("Available to order: 140 m");
    expect(document.body.textContent).toContain("On rolls: 100 m");
  });

  it("shows roll-less physical stock alongside available-to-order stock", () => {
    renderRow(
      existing({
        baseOpening: "1000",
        initialBaseOpening: "1000",
        availableMeters: "1000",
        stockMeters: "800",
        isRollTracked: false,
      }),
    );

    expect(document.body.textContent).toContain("Available to order: 1,000 m");
    expect(document.body.textContent).toContain("Physical stock: 800 m");
  });

  it("shows preserved loose stock separately when rolls are added", () => {
    renderRow(
      existing({
        untrackedStockMeters: "1000.000",
        isRollTracked: true,
      }),
    );

    expect(document.body.textContent).toContain(
      "Untracked physical (not packable): 1,000 m",
    );
  });

  it("keeps the physical roll panel inside the variant card", () => {
    renderRow(
      existing(),
      false,
      <div data-testid="physical-roll-panel">Physical Rolls</div>,
    );

    const panel = screen.getByTestId("physical-roll-panel");
    expect(panel.closest(".rounded-xl.border")).not.toBeNull();
  });
});