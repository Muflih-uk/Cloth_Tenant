/**
 * Next auto-incrementing colour number for a fabric.
 *
 * Colour numbers live in `displayOrder`, so legacy fabrics may still hold names.
 * Numeric labels drive the sequence; when none exist yet the row count is used.
 */
export function nextColorNumber(
  variants: { displayOrder?: string | null }[],
): string {
  const numbers = variants
    .map((variant) => Number.parseInt(variant.displayOrder ?? "", 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  const highest = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(Math.max(highest + 1, variants.length + 1));
}

/** Human label for a colour row. Numeric labels read as "Colour #1". */
export function colorLabel(displayOrder: string | null | undefined, index: number) {
  const value = (displayOrder ?? "").trim();
  if (!value) return `Colour #${index + 1}`;
  return /^\d+$/.test(value) ? `Colour #${value}` : value;
}
