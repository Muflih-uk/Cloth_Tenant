"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Printer, X } from "lucide-react";
import { formatMeters } from "@/types/item";
import type { FabricRoll } from "@/types/item";
import { toastError } from "@/lib/toast";
import { brandApi } from "@/lib/api/brand";

interface PrintableRollLabel {
  rollNumber: string;
  fabric: string;
  colour: string;
  qr: string;
  metres: string;
  companyLogo: string | null;
}

function useCompanyLogo() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    brandApi
      .getAll()
      .then((brands) => {
        if (!cancelled) setCompanyLogo(brands[0]?.logo_url ?? null);
      })
      .catch((error) => {
        if (!cancelled) toastError("Failed to load company logo", error);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { companyLogo, loaded };
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export function buildRollLabelPrintHtml(labels: PrintableRollLabel[]): string {
  const labelMarkup = labels
    .map(
      (label) => `
        <article class="label">
          ${
            label.companyLogo
              ? `<img class="logo" src="${escapeHtml(label.companyLogo)}" alt="">`
              : ""
          }
          <h1>${escapeHtml(label.fabric)}</h1>
          <p class="colour">${escapeHtml(label.colour)}</p>
          <img class="qr" src="${escapeHtml(label.qr)}" alt="">
          <h2>${escapeHtml(label.rollNumber)}</h2>
          <p class="metres">${escapeHtml(label.metres)} m</p>
          <p class="caption">on the roll</p>
        </article>`,
    )
    .join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Roll QR labels</title>
        <style>
          @page { size: 80mm 100mm; margin: 0; }
          * { box-sizing: border-box; }
          html, body { width: 80mm; margin: 0; padding: 0; }
          body { color: #111; font-family: Arial, sans-serif; }
          .label {
            width: 80mm;
            height: 100mm;
            padding: 3mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            border: .3mm solid #111;
            break-after: page;
            page-break-after: always;
          }
          .label:last-child { break-after: auto; page-break-after: auto; }
          .logo { align-self: flex-start; width: 18mm; height: 13mm; margin-bottom: 1mm; object-fit: contain; object-position: left top; }
          h1 { max-width: 100%; margin: 0; font-size: 12pt; line-height: 1.15; overflow-wrap: anywhere; }
          .colour { margin: 1mm 0 0; font-size: 10pt; }
          .qr { display: block; width: 32mm; height: 32mm; margin: 2mm auto; object-fit: contain; }
          h2 { margin: 0; font-size: 16pt; line-height: 1.1; }
          .metres { margin: 1mm 0 0; font-size: 13pt; font-weight: bold; }
          .caption { margin: 0; color: #666; font-size: 7pt; }
          .caption { text-transform: uppercase; letter-spacing: .1em; }
        </style>
      </head>
      <body>
        ${labelMarkup}
        <script>
          const printWhenReady = () => {
            window.focus();
            window.print();
          };
          window.addEventListener("load", printWhenReady);
          window.addEventListener("afterprint", () => window.close());
        </script>
      </body>
    </html>`;
}

function openRollLabelPrintWindow(labels: PrintableRollLabel[]) {
  const printWindow = window.open("", "_blank", "popup,width=420,height=560");
  if (!printWindow) {
    toastError("The print window was blocked. Allow pop-ups and try again.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildRollLabelPrintHtml(labels));
  printWindow.document.close();
}

function printableLabelFor(
  roll: FabricRoll,
  fabric: string,
  displayOrder: string,
  qr: string,
  companyLogo: string | null,
): PrintableRollLabel {
  return {
    rollNumber: roll.roll_number,
    fabric,
    colour: displayOrder ? `Color #${displayOrder}` : "Colour not named",
    qr,
    metres: formatMeters(roll.original_meters),
    companyLogo,
  };
}

interface Props {
  roll: FabricRoll;
  fabric: string;
  displayOrder: string;
  onClose: () => void;
}

/**
 * The label that goes on one physical roll.
 *
 * A roll is not split at the warehouse, so the label is what tells the packer what
 * they picked up: which colour, how much is on it, and what it is worth. The QR
 * carries the roll's primary key, which is the whole point of it -- scanning this
 * label against an order line fills that line from this exact roll, and the server
 * refuses the scan if the colour or the line does not match.
 *
 * The print action opens a clean, standalone document so application layout and
 * modal styles cannot cause labels to spill across pages.
 */
export default function RollLabelDialog({
  roll,
  fabric,
  displayOrder,
  onClose,
}: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const { companyLogo, loaded: logoLoaded } = useCompanyLogo();
  const printLabel = () => {
    if (!qr || !logoLoaded) return;
    openRollLabelPrintWindow([
      printableLabelFor(roll, fabric, displayOrder, qr, companyLogo),
    ]);
  };

  useEffect(() => {
    let cancelled = false;
    // The label's payload is the roll's primary key, so a scan resolves to exactly
    // one roll rather than to a colour that may have several lengths on the shelf.
    QRCode.toDataURL(String(roll.id), { width: 320, margin: 1 }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [roll.id]);

  return (
    <div
      className="roll-label-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="roll-label-dialog my-auto max-h-[calc(100vh-3rem)] w-full max-w-sm shrink-0 overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 print:hidden">
          <h2 className="text-sm font-black text-gray-900">{roll.roll_number} label</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close roll label"
          >
            <X size={18} />
          </button>
        </div>

        <div className="roll-label-print-root">
          <RollLabel
            roll={roll}
            fabric={fabric}
            displayOrder={displayOrder}
            qr={qr}
          />
        </div>

        <div className="flex gap-2 px-5 pb-5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={printLabel}
            disabled={qr === null || !logoLoaded}
            className="h-11 flex-1 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Printer size={16} />
            Print label
          </button>
        </div>
      </div>
    </div>
  );
}

interface LabelProps {
  roll: FabricRoll;
  fabric: string;
  displayOrder: string;
  /** The roll's QR as a data URL, or null while it is still being encoded. */
  qr: string | null;
}

/**
 * One roll's label, and nothing else: no dialog, no buttons, no print call.
 *
 * Split out of {@link RollLabelDialog} so that printing a whole colour's rolls at
 * once is this component repeated rather than a second label design that drifts
 * from the first. It is markup only -- the caller decides how the codes are made
 * and when the printer is sent.
 */
export function RollLabel({
  roll,
  fabric,
  displayOrder,
  qr,
}: LabelProps) {
  return (
    /*
      The label itself. `print:` utilities strip the app chrome away, and the
      fixed width and generous type are what make it legible from a metre away
      once it is stuck to a roll.
    */
    <div className="roll-label-card mx-5 mb-5 rounded-2xl border-2 border-gray-900 p-5 text-center print:mx-0 print:mb-0 print:rounded-none print:p-0">
      <p className="roll-label-fabric text-xl font-black leading-tight text-gray-900">{fabric}</p>
      <p className="roll-label-color mt-1 text-lg font-bold text-gray-700">
        {displayOrder ? `Color #${displayOrder}` : "Colour not named"}
      </p>

      {qr ? (
        <Image
          src={qr}
          unoptimized
          alt={`QR code for roll ${roll.roll_number}`}
          width={160}
          height={160}
          className="roll-label-qr mx-auto my-4 h-40 w-40 print:my-3 print:h-36 print:w-36"
        />
      ) : (
        <div className="mx-auto my-4 h-40 w-40 animate-pulse bg-gray-100 print:hidden" />
      )}

      <p className="roll-label-number text-2xl font-black tracking-wide text-gray-900">
        {roll.roll_number}
      </p>
      <p className="roll-label-length mt-1.5 text-lg font-bold text-gray-800">
        {formatMeters(roll.original_meters)} m
      </p>
      <p className="roll-label-caption text-[11px] font-medium uppercase tracking-widest text-gray-400">
        on the roll
      </p>
    </div>
  );
}

/**
 * Every roll of one colour's labels in a single print job.
 *
 * The warehouse labels a batch of rolls as it shelves them, so the whole colour is
 * printed in one go from the Inventory page. The labels are the same ones, in the
 * same order, from the same {@link RollLabel}: this only differs in looping.
 *
 * A roll with nothing left on it is left out. A label is scanned to pick that
 * exact roll into a packing round, and a roll that has been cut to zero cannot be
 * picked, so its label would be printed only to be binned.
 */
export function RollLabelsDialog({
  rolls,
  fabric,
  displayOrder,
  onClose,
}: Omit<LabelProps, "qr" | "roll"> & {
  rolls: FabricRoll[];
  onClose: () => void;
}) {
  const [qrs, setQrs] = useState<Record<number, string>>({});
  const { companyLogo, loaded: logoLoaded } = useCompanyLogo();

  useEffect(() => {
    let cancelled = false;
    // One encoding per roll, keyed by primary key so a repeated code cannot be
    // filed under the wrong roll.
    Promise.all(
      rolls.map((roll) =>
        QRCode.toDataURL(String(roll.id), { width: 320, margin: 1 }).then(
          (url) => [roll.id, url] as const,
        ),
      ),
    )
      .then((pairs) => {
        if (!cancelled) setQrs(Object.fromEntries(pairs));
      })
      .catch(() => {
        // Printing early would put a blank square on cloth, so the button stays
        // disabled instead.
        if (!cancelled) setQrs({});
      });
    return () => {
      cancelled = true;
    };
  }, [rolls]);

  // Not until every code is drawn: a half-printed sheet of labels is worse than
  // a moment's wait.
  const ready =
    logoLoaded && rolls.every((roll) => qrs[roll.id] !== undefined);

  return (
    <div
      className="roll-label-overlay fixed inset-0 z-[60] flex flex-col items-center justify-start overflow-y-auto overscroll-contain bg-black/40 backdrop-blur-sm px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="roll-label-dialog mb-auto max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] w-full max-w-sm shrink-0 touch-pan-y overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 print:hidden">
          <h2 className="text-sm font-black text-gray-900">
            {rolls.length} roll label{rolls.length === 1 ? "" : "s"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close roll labels"
          >
            <X size={18} />
          </button>
        </div>

        <div className="roll-label-print-root">
          {rolls.map((roll) => (
            <RollLabel
              key={roll.id}
              roll={roll}
              fabric={fabric}
              displayOrder={displayOrder}
              qr={qrs[roll.id] ?? null}
            />
          ))}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-gray-100 bg-white px-5 py-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() =>
              openRollLabelPrintWindow(
                rolls.map((roll) =>
                  printableLabelFor(
                    roll,
                    fabric,
                    displayOrder,
                    qrs[roll.id] ?? "",
                    companyLogo,
                  ),
                ),
              )
            }
            disabled={!ready}
            className="h-11 flex-1 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Printer size={16} />
            Print {rolls.length} label{rolls.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
