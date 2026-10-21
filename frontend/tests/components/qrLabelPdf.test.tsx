import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";

import { QRLabelPdf } from "@/components/pages/items/qr/QRLabelPdf";

describe("QRLabelPdf", () => {
  it("keeps every variant label on one page, including long fabric names", async () => {
    const variants = [
      { id: 1, display_order: "Deep Charcoal With Long Finish Description" },
      { id: 2, display_order: "Natural White" },
      { id: 3, display_order: "Ocean Blue" },
    ];
    const qrImages: Record<number, string> = {};
    for (const variant of variants) {
      qrImages[variant.id] = await QRCode.toDataURL(`variant-${variant.id}`);
    }

    const blob = await pdf(
      <QRLabelPdf
        item={{
          name: "Premium Cotton Fabric With A Very Long Product Name",
          price_per_meter: "125.00",
          variants,
        }}
        qrImages={qrImages}
      />,
    ).toBlob();
    const document = await PDFDocument.load(await blob.arrayBuffer());

    expect(document.getPageCount()).toBe(variants.length);
    const { width, height } = document.getPage(0).getSize();
    expect(width).toBeCloseTo((30 * 72) / 25.4, 1);
    expect(height).toBeCloseTo((50 * 72) / 25.4, 1);
  });
});
