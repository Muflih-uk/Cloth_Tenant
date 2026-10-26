import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  activeRollCount: 1,
  ...over,
});

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
  it("shows order, physical and active-roll figures on the card", () => {
    renderRow(
      existing({
        baseOpening: "200.000",
        initialBaseOpening: "100.000",
        availableMeters: "40.000",
        stockMeters: "100.000",
        isRollTracked: true,
        rollCount: 1,
        activeRollCount: 1,
      }),
    );

    expect(screen.getByText("Available to order")).toBeTruthy();
    expect(screen.getByText("140 m")).toBeTruthy();
    expect(screen.getByText("Physical stock")).toBeTruthy();
    expect(screen.getAllByText("100 m").length).toBeGreaterThan(0);
    expect(screen.getByText("Active rolls")).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText("Natural")).toBeTruthy();
  });

  it("shows roll-less physical stock alongside available-to-order stock", () => {
    renderRow(
      existing({
        baseOpening: "1000",
        initialBaseOpening: "1000",
        availableMeters: "1000",
        stockMeters: "800",
        isRollTracked: false,
        activeRollCount: 0,
      }),
    );

    expect(screen.getAllByText("1,000 m").length).toBeGreaterThan(0);
    expect(screen.getByText("Physical stock")).toBeTruthy();
    expect(screen.getByText("800 m")).toBeTruthy();
  });

  it("keeps the card to the three stock figures and actions", () => {
    renderRow(existing({ untrackedStockMeters: "1000.000" }));

    expect(screen.queryByText("Stock details")).toBeNull();
    expect(screen.queryByText(/untracked physical/i)).toBeNull();
    expect(screen.getByRole("button", { name: /adjust stock/i })).toBeTruthy();
  });

  it("keeps the physical roll panel inside the variant card", () => {
    renderRow(
      existing(),
      false,
      <div data-testid="physical-roll-panel">Physical Rolls</div>,
    );

    const panel = screen.getByTestId("physical-roll-panel");
    expect(panel.closest(".rounded-2xl.border")).not.toBeNull();
  });

  it("changes the opening base through the stock adjustment dialog", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EditVariantRow
        variant={existing()}
        index={0}
        isOnly
        isNew={false}
        onChange={onChange}
        onDelete={noop}
        onPickImage={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: /adjust stock/i }));

    const input = screen.getByLabelText(
      "Opening order-stock base in metres",
    ) as HTMLInputElement;
    expect(input.value).toBe("100.000");

    await user.clear(input);
    await user.type(input, "125");
    await user.click(screen.getByRole("button", { name: /save adjustment/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ baseOpening: "125" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens Receive Rolls from the card", async () => {
    const user = userEvent.setup();
    const onRequestReceive = vi.fn();
    render(
      <EditVariantRow
        variant={existing()}
        index={0}
        isOnly
        isNew={false}
        onChange={noop}
        onDelete={noop}
        onPickImage={noop}
        onRequestReceive={onRequestReceive}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /receive rolls/i }),
    );

    expect(onRequestReceive).toHaveBeenCalledTimes(1);
  });
});
