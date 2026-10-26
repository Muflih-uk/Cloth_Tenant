"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Download,
  Lock,
  PackageX,
  Printer,
  QrCode,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import QRScanModal from "@/components/items/QRScanModal";
import { ImagePreview } from "@/components/pages/ImagePreview";
import { BundlePackingSlipPdf } from "@/components/pages/order/BundlePackingSlipPdf";
import { packingApi } from "@/lib/api/order";
import { brandApi } from "@/lib/api/brand";
import { transportApi } from "@/lib/api/transport";
import { orderItemColorSuffix } from "@/lib/colorLabel";
import { toastError, toastErrorFromError, toastSuccess } from "@/lib/toast";
import { bundleSlipFilename, parseRollScan } from "@/lib/utils/bundleSlip";
import {
  bundleCoverageMetres,
  bundleLineShares,
  metresPackedOutsideBundles,
  packedOutsideBundleLines,
} from "@/lib/utils/bundleLines";
import { formatMeters, toMeters } from "@/types/item";
import type {
  OrderItem as OrderItemType,
  OrderStatus,
  PackingBundle,
  ResolveRollScanResponse,
} from "@/types/order";

type Props = {
orderId: number;
  /** False once the order is out of reach, so no bundle can be opened. */
  enabled: boolean;
  /**
   * Every line on the order, settled ones included. A bundle says which line each
   * of its rolls fed and how many metres that was, but not what the line looks
   * like, so the thumbnail beside a packed line is read from here.
   */
  items?: OrderItemType[];
  /**
   * Called after anything that moved cloth, so the page can refresh the lines and
   * the stock figures it shows beside them.
   */
  onChanged: () => void;
  /** Lets the page move its own status badge when a scan fills the order. */
  onOrderStatusChange?: (status: OrderStatus) => void;
  /**
   * Reports how many sealed bundles are still here and how many have gone, so the
   * foot of the page can say what is left to dispatch without fetching the bundles a
   * second time.
   */
  onBundlesChange?: (counts: {
    pending: number;
    dispatched: number;
  }) => void;
  /**
   * The transport already chosen for this order, if any. The transport is one
   * decision for the whole order and every bundle after the first reuses it, so
   * this is only asked for on the first box to leave.
   */
  transportCompanyId?: number | null;
  /** What the customer asked for; offered first when a choice has to be made. */
  preferredTransportId?: number | null;
};

/**
 * The order lines a single bundle packed, once its box is opened.
 *
 * Reads as the line cards do -- thumbnail, name, price -- but scoped to what this
 * one box carried, so a line whose metres were split over two bundles shows only
 * its share under each. The thumbnail comes from the order's own line, because the
 * bundle records the line's id and metres but not what the fabric looks like.
 */
function BundleLineList({
  bundle,
  lineFor,
}: {
  bundle: PackingBundle;
  lineFor: (itemId: number) => OrderItemType | undefined;
}) {
  const shares = bundleLineShares(bundle);
  if (shares.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1.5 border-t border-status-pending/30 pt-2">
      {shares.map((share) => {
        const line = lineFor(share.itemId);
        return (
          <li
            key={share.itemId}
            className="flex items-center gap-3 rounded-control border border-app-line/60 bg-app-card px-2 py-2 sm:px-3"
          >
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-control border border-app-line/60 bg-app-soft">
              {line?.variant_image ? (
                <ImagePreview src={line.variant_image} alt={share.fabricName} />
              ) : (
                <div className="h-full w-full bg-app-soft" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-app-ink">
                {`${share.fabricName}${orderItemColorSuffix(share.colour)}`}
              </p>
              <p className="mt-1 text-xs font-medium text-app-muted">
                <span className="font-bold text-app-ink">
                  {`${formatMeters(share.metres)} m packed in this bundle`}
                </span>
              </p>
              {/* Only say which rolls when there were rolls to name. Metres typed in
                  by the packer came off no roll, and printing a blank here would look
                  like a slip in the data rather than a fact about the cloth. */}
              <p className="mt-0.5 text-[10px] text-app-subtle">
                {share.rollNumbers.length > 0
                  ? share.rollNumbers.join(", ")
                  : "packed by hand"}
              </p>
            </div>

            {/* What this box's share of the line came to, not the whole line. */}
            <span className="flex-shrink-0 text-base font-extrabold text-app-ink">
              ₹{share.value.toLocaleString("en-IN")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bundles: the boxes of cloth that actually leave the warehouse.
 *
 * Packing starts with the roll: the packer picks it up, scans the label, then says
 * how many metres to cut. There is no typed-metres shortcut that skips the roll.
 * That scan belongs to a *bundle* rather than to a single order line, because a box
 * can carry rolls of several colours against one order, and because a mistake has
 * to be undoable one roll at a time: take back the wrong roll, leave the rest of
 * the box alone.
 *
 * So the scan lives up here at order level rather than on each line. Nothing else
 * about packing changes: the server builds the same one-entry round it always did
 * and confirms it through the same engine, and the colour on the roll picks which
 * line is filled, so the packer never has to choose a line.
 *
 * The bundle stays *open* until it is sealed. Open means undoable -- remove a roll,
 * or throw the whole bundle away and get every roll back. Sealing is the point of no
 * return, because the packing slip is a promise about what is in the box; after that
 * nothing can go in or come out, and the slip can be printed again as often as it is
 * needed.
 *
 * Once sealed, a bundle is what gets dispatched. Each box leaves on its own, so one
 * truck can take the first two and come back for the third, and the order says how
 * far along it is -- partly dispatched while some boxes are still here, fully
 * dispatched once the last one has gone. A dispatched box keeps its seal and its
 * slip, so the paperwork for something already in transit can still be reprinted.
 */
export default function PackingBundlePanel({
  orderId,
  enabled,
  items,
  onChanged,
  onOrderStatusChange,
  onBundlesChange,
  transportCompanyId = null,
  preferredTransportId = null,
}: Props) {
  const [bundles, setBundles] = useState<PackingBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundleLoadError, setBundleLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  // The roll the server has checked, waiting for the packer to confirm the cut.
  // Holding the token here (rather than sending the roll id again) is what makes
  // the cut follow the scanned label even if the roll list changes meanwhile.
  const [pendingScan, setPendingScan] =
    useState<ResolveRollScanResponse | null>(null);
  const [scanMetres, setScanMetres] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slipMessage, setSlipMessage] = useState<string | null>(null);
  // Which boxes the admin has opened, by bundle id. Held per bundle rather than
  // as one flag so opening Bundle 2 leaves Bundle 1 as it was.
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  // The box waiting to go out, and the transport step that comes with it. The
  // picker only appears for the first bundle on an order -- after that the order
  // already knows where the cloth is going.
  const [dispatchingBundle, setDispatchingBundle] = useState<PackingBundle | null>(
    null,
  );
  const [dispatchTransport, setDispatchTransport] = useState("");
  const [transports, setTransports] = useState<
    { value: string; label: string }[]
  >([]);

  const toggleExpanded = (bundleId: number) =>
    setExpanded((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }));

  useEffect(() => {
    let live = true;
    packingApi
      .listBundles(orderId)
      .then((rows) => {
        if (live) {
          setBundles(rows);
          setBundleLoadError(false);
        }
      })
      .catch(() => {
        if (live) setBundleLoadError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [orderId]);

  /** The bundle being worked on, if one is. */
  const openBundle = bundles.find((bundle) => bundle.status === "OPEN") ?? null;
  const sealedBundles = bundles.filter((bundle) => bundle.status === "SEALED");

  // A line that packing has finished is shown against the box that carried it, so
  // the two views have to be worked out from the same figures rather than from two
  // separate ideas of what is packed.
  const coverage = bundleCoverageMetres(bundles);
  const lineFor = (itemId: number) =>
    (items ?? []).find((line) => line.id === itemId);
  // Metres can also be packed by typing a figure, and that path writes no bundle.
  // Those lines are collected here so they are still shown somewhere.
  const packedByHand = packedOutsideBundleLines(items ?? [], coverage);

  const replaceBundle = (next: PackingBundle) =>
    setBundles((prev) =>
      prev.some((bundle) => bundle.id === next.id)
        ? prev.map((bundle) => (bundle.id === next.id ? next : bundle))
        : [...prev, next],
    );

  // Count the boxes whenever the list changes, so the foot of the page can say what
  // is still waiting to go without asking for the bundles all over again.
  useEffect(() => {
    onBundlesChange?.({
      pending: bundles.filter(
        (bundle) => bundle.status === "SEALED" && !bundle.is_dispatched,
      ).length,
      dispatched: bundles.filter((bundle) => bundle.is_dispatched).length,
    });
  }, [bundles, onBundlesChange]);

  /**
   * Render the slip for a bundle and hand the file to the browser.
   *
   * Generated in the browser from data the page already has, so a lost slip is
   * reprinted by pressing the button again rather than by asking the server to
   * remember a file.
   */
  const printSlip = useCallback(
    async (bundle: PackingBundle, download: boolean) => {
      const brands = await brandApi.getAll();
      const brand = brands[0] ?? null;
      // The inner await matters: `pdf()` hands back a promise, and `toBlob` lives
      // on what it resolves to.
      const blob = await (
        await pdf(<BundlePackingSlipPdf bundle={bundle} brand={brand} />)
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = bundleSlipFilename(bundle.code);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      // Print through a hidden frame so the sheet goes straight to the printer
      // without a second tab the packer has to dismiss.
      const frame = document.createElement("iframe");
      frame.style.display = "none";
      frame.src = url;
      document.body.appendChild(frame);
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(frame);
          URL.revokeObjectURL(url);
        }, 3000);
      };
    },
    [],
  );

  const handleCreate = async () => {
    setBusy(true);
    try {
      const result = await packingApi.createBundle(orderId);
      replaceBundle(result.bundle);
      setSlipMessage(null);
      setScanOpen(true);
      toastSuccess(result.message, "Scan rolls in as you build the box.");
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Check the scanned label, then ask how many metres to cut.
   *
   * Resolving moves no cloth. A label from another warehouse, a spent roll, a
   * colour this order never asked for or a sealed bundle all fail here, so the
   * packer sees the reason before typing a figure. On success the camera closes
   * and the cut prompt opens on the shorter of "what is left" and "what the line
   * still needs".
   */
  const handleScan = async (raw: string) => {
    const roll = parseRollScan(raw);
    if (roll === null) {
      toastError(
        "That is not a roll label",
        "Roll labels carry a plain number. Scan the label on the roll itself.",
      );
      return;
    }
    if (!openBundle) {
      setScanOpen(false);
      toastError("No open bundle", "Create a bundle before scanning rolls in.");
      return;
    }

    setBusy(true);
    try {
      const result = await packingApi.resolveScan(
        orderId,
        openBundle.id,
        String(roll),
      );
      setPendingScan(result);
      setScanMetres(result.suggested_meters);
      setScanOpen(false);
    } catch (err) {
      // The scanner stays open on a refusal: the packer most likely just grabbed
      // the wrong roll, and the fix is to scan again rather than reopen anything.
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  /** Cut the confirmed metres from the roll the server resolved. */
  const handleConfirmScan = async () => {
    if (!openBundle || !pendingScan) return;
    const metres = Number(scanMetres);
    if (!Number.isFinite(metres) || metres <= 0) {
      toastError("Enter the cut", "The metres to cut must be greater than zero.");
      return;
    }
    if (metres > Number(pendingScan.remaining_meters)) {
      toastError(
        "Not enough cloth on the roll",
        `${pendingScan.roll_number} has ${formatMeters(
          Number(pendingScan.remaining_meters),
        )} m left.`,
      );
      return;
    }

    setBusy(true);
    try {
      const result = await packingApi.scanIntoBundle(
        orderId,
        openBundle.id,
        pendingScan.token,
        scanMetres,
      );
      replaceBundle(result.bundle);
      onChanged();
      if (result.order_status) onOrderStatusChange?.(result.order_status);
      toastSuccess(
        result.message,
        `${result.fabric_name}${
          result.variant_display_order
            ? ` (${result.variant_display_order})`
            : ""
        } · ${formatMeters(Number(result.remaining_meters))} m left on the roll`,
      );
      setPendingScan(null);
      setScanMetres("");
      // A box is filled by a run of rolls, so go straight back to the camera.
      setScanOpen(true);
    } catch (err) {
      // Keep the prompt open: the packer can lower the figure, and the server is
      // the one that decides whether the roll still has enough.
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPendingScan = () => {
    setPendingScan(null);
    setScanMetres("");
    setScanOpen(true);
  };

  const handleRemove = async (entryId: number) => {
    if (!openBundle) return;
    setBusy(true);
    try {
      const result = await packingApi.removeRollFromBundle(
        orderId,
        openBundle.id,
        entryId,
      );
      replaceBundle(result.bundle);
      onChanged();
      if (result.order_status) onOrderStatusChange?.(result.order_status);
      toastSuccess(result.message);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!openBundle) return;
    setBusy(true);
    try {
      const result = await packingApi.cancelBundle(orderId, openBundle.id);
      replaceBundle(result.bundle);
      setConfirmCancel(false);
      setScanOpen(false);
      setPendingScan(null);
      onChanged();
      if (result.order_status) onOrderStatusChange?.(result.order_status);
      toastSuccess(result.message);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSeal = async () => {
    if (!openBundle) return;
    setBusy(true);
    try {
      const result = await packingApi.sealBundle(orderId, openBundle.id);
      replaceBundle(result.bundle);
      setScanOpen(false);
      setPendingScan(null);
      // Sealing closes the box, so the slip for it is produced straight away
      // rather than left as a job someone has to remember.
      await printSlip(result.bundle, true);
      setSlipMessage(
        `${result.bundle.code} is sealed and its packing slip has been downloaded.`,
      );
      toastSuccess(
        `${result.bundle.code} sealed`,
        "Its contents can no longer be changed.",
      );
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Start sending a box out.
   *
   * Once the order already has a transport this goes straight through, because there
   * is nothing left to decide. The first box on an order is the one that needs a
   * choice, so that is where the picker appears -- and it opens on whatever the
   * customer asked for, which is right far more often than not.
   */
  const handleDispatchClick = async (bundle: PackingBundle) => {
    if (transportCompanyId) {
      await handleDispatch(bundle);
      return;
    }
    setDispatchingBundle(bundle);
    // Offer the customer's preference, if we know what it is.
    setDispatchTransport(preferredTransportId ? String(preferredTransportId) : "");
    if (transports.length === 0) {
      try {
        const rows = await transportApi.getActive();
        setTransports(
          rows.map((row) => ({ value: String(row.id), label: row.name })),
        );
      } catch {
        toastError(
          "Could not load the transport list",
          "Reload the page and try again.",
        );
      }
    }
  };

  const handleDispatch = async (
    bundle: PackingBundle,
    transportCompany?: number,
  ) => {
    setBusy(true);
    try {
      const result = await packingApi.dispatchBundle(orderId, bundle.id, {
        // Omitted once the order has a transport: naming it again would be asking a
        // question the order has already answered.
        ...(transportCompany ? { transport_company: transportCompany } : {}),
      });
      replaceBundle(result.bundle);
      setDispatchingBundle(null);
      setDispatchTransport("");
      toastSuccess(
        result.message,
        result.order_status === "DISPATCHED"
          ? "That was the last box, so the order is fully dispatched."
          : "Other boxes are still here to go out.",
      );
      // The order's own status has moved, and the badge on the page reads it.
      onOrderStatusChange?.(result.order_status);
      onChanged();
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSlipDownload = async (bundle: PackingBundle) => {
    setBusy(true);
    try {
      await printSlip(bundle, true);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSlipPrint = async (bundle: PackingBundle) => {
    setBusy(true);
    try {
      await printSlip(bundle, false);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-card border border-status-pending/30 bg-status-pending/5 px-3 py-4 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-[color:var(--status-pending-text)]">
            <Box size={15} />
            Packing bundles
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-[color:var(--status-pending-text)]">
            {openBundle
              ? `${openBundle.code} is open · ${openBundle.roll_count} roll${
                  openBundle.roll_count === 1 ? "" : "s"
                } · ${formatMeters(openBundle.total_metres)} m`
              : sealedBundles.length > 0
                ? `${sealedBundles.length} sealed bundle${
                    sealedBundles.length === 1 ? "" : "s"
                  } on this order`
                : "Scan fabric rolls to pack this order."}
          </p>
        </div>

        {enabled && !openBundle && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || loading}
            className="app-focus flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-brand-navy px-3 text-[11px] font-bold text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
          >
            <QrCode size={13} />
            Create bundle
          </button>
        )}

        {openBundle && (
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            disabled={busy}
            className="app-focus flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-brand-navy px-3 text-[11px] font-bold text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
          >
            <QrCode size={13} />
            Scan a roll into this bundle
          </button>
        )}
      </div>

      {slipMessage && (
        <p className="mt-2 text-[11px] font-semibold text-[color:var(--status-dispatched-text)]">
          {slipMessage}
        </p>
      )}

      {openBundle && (
        <div className="mt-3">
          {openBundle.rolls.length === 0 ? (
            <p className="text-[11px] font-medium text-[color:var(--status-pending-text)]">
              Nothing in this bundle yet. Scan a roll label to put one in.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {openBundle.rolls.map((roll) => (
                <li
                  key={roll.id}
                  className="flex items-center gap-2 rounded-control border border-status-pending/30 bg-app-card px-2 py-2 sm:px-3"
                >
                  <span className="w-20 shrink-0 font-mono text-[11px] font-bold text-app-ink">
                    {roll.roll_number}
                  </span>
                  <span className="min-w-0 flex-1 text-[11px] font-medium text-app-muted">
                    {roll.fabric_name || roll.fabric}
                    {roll.colour ? ` · ${roll.colour}` : ""} ·{" "}
                    {formatMeters(roll.metres)} m
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(roll.id)}
                    disabled={busy}
                    className="app-focus flex h-11 min-h-11 shrink-0 items-center gap-1 rounded-control border border-app-line px-2 text-[10px] font-bold text-app-muted transition-colors hover:bg-app-soft hover:text-brand-red disabled:opacity-50"
                  >
                    <Trash2 size={11} />
                    Remove from bundle
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* The open box's own view of what it has packed so far, in the same
              line-card shape the sealed boxes use. No slip buttons here: a slip
              is a promise about a box that can no longer change. */}
          {openBundle.rolls.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => toggleExpanded(openBundle.id)}
                aria-expanded={expanded[openBundle.id] === true}
                className="app-focus flex h-11 min-h-11 items-center gap-1 rounded-control border border-status-pending/30 bg-app-card px-2 text-[10px] font-bold text-[color:var(--status-pending-text)] transition-colors hover:bg-status-pending/15"
              >
                {expanded[openBundle.id] ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
                Lines packed
              </button>
              {expanded[openBundle.id] && (
                <BundleLineList bundle={openBundle} lineFor={lineFor} />
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSeal}
              disabled={busy || openBundle.rolls.length === 0}
              title={
                openBundle.rolls.length === 0
                  ? "A bundle has to hold at least one roll before it can be sealed."
                  : undefined
              }
              className="app-focus flex h-11 min-h-11 items-center gap-1.5 rounded-control bg-brand-navy px-3 text-[11px] font-bold text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
            >
              <Lock size={13} />
              Complete bundle &amp; print slip
            </button>

            {confirmCancel ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy}
                  className="app-focus flex h-11 min-h-11 items-center gap-1 rounded-control bg-brand-red px-3 text-[11px] font-bold text-white transition-colors hover:bg-brand-red/90 disabled:opacity-50"
                >
                  <PackageX size={13} />
                  Give every roll back
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="app-focus flex h-11 min-h-11 items-center gap-1 rounded-control border border-app-line px-2.5 text-[11px] font-bold text-app-muted transition-colors hover:bg-app-soft"
                >
                  <X size={13} />
                  Keep bundle
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
                className="app-focus flex h-11 min-h-11 items-center gap-1.5 rounded-control border border-app-line px-2.5 text-[11px] font-bold text-app-muted transition-colors hover:bg-app-soft disabled:opacity-50"
              >
                <PackageX size={13} />
                Cancel bundle
              </button>
            )}
          </div>

          {confirmCancel && (
            <p className="mt-2 text-[11px] font-medium text-brand-red">
              Cancelling puts every roll in this bundle back on the shelf and takes
              the metres off the order. The bundle is kept as a record.
            </p>
          )}
        </div>
      )}

      {sealedBundles.length > 0 && (
        <div className="mt-3 border-t border-status-pending/30 pt-3">
          <p className="text-[11px] font-bold text-[color:var(--status-pending-text)]">
            Sealed bundles
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {sealedBundles.map((bundle) => (
              <li
                key={bundle.id}
                className="rounded-control border border-app-line bg-app-card px-2 py-2 sm:px-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-app-ink">
                    {bundle.code}
                  </span>
                  <span className="text-[11px] font-medium text-app-muted">
                    {/* A box of metres typed in rather than scanned off rolls has no
                        rolls to count, so it says what is actually in it. */}
                    {bundle.is_roll_based
                      ? `${bundle.roll_count} roll${bundle.roll_count === 1 ? "" : "s"} · `
                      : "packed by hand · "}
                    {formatMeters(bundle.total_metres)} m ·{" "}
                    {bundle.sealed_at ? bundle.sealed_at.slice(0, 10) : "sealed"}
                  </span>
                  {/* Once a box has gone, say so, and say when -- the slip it was
                      printed from is now the record of something in transit. */}
                  {bundle.is_dispatched && (
                    <span className="flex items-center gap-1 rounded-full border border-brand-green/25 bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--status-dispatched-text)]">
                      <Truck size={10} />
                      {bundle.dispatched_at
                        ? `Dispatched ${bundle.dispatched_at.slice(0, 10)}`
                        : "Dispatched"}
                    </span>
                  )}
                  <span className="grid w-full grid-cols-2 gap-1.5 sm:ml-auto sm:flex sm:w-auto">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(bundle.id)}
                      aria-expanded={expanded[bundle.id] === true}
                      className="app-focus flex h-11 min-h-11 min-w-0 items-center justify-center gap-1 rounded-control border border-app-line px-2 text-center text-[10px] font-bold text-app-muted transition-colors hover:bg-app-soft"
                    >
                      {expanded[bundle.id] ? (
                        <ChevronDown size={11} />
                      ) : (
                        <ChevronRight size={11} />
                      )}
                      Lines packed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlipPrint(bundle)}
                      disabled={busy}
                      className="app-focus flex h-11 min-h-11 min-w-0 items-center justify-center gap-1 rounded-control border border-app-line px-2 text-center text-[10px] font-bold text-app-muted transition-colors hover:bg-app-soft disabled:opacity-50"
                    >
                      <Printer size={11} />
                      Print slip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlipDownload(bundle)}
                      disabled={busy}
                      className="app-focus flex h-11 min-h-11 min-w-0 items-center justify-center gap-1 rounded-control bg-brand-navy px-2 text-center text-[10px] font-bold text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
                    >
                      <Download size={11} />
                      Download slip
                    </button>
                    {/* A sealed box is the smallest thing that can honestly be called
                        shipped, so this is the button that sends it -- not the order,
                        and not the other boxes on it. A box already gone has nothing
                        left to dispatch. */}
                    {!bundle.is_dispatched && (
                      <button
                        type="button"
                        onClick={() => handleDispatchClick(bundle)}
                        disabled={busy}
                        className="app-focus flex h-11 min-h-11 min-w-0 items-center justify-center gap-1 rounded-control bg-brand-green px-2 text-center text-[10px] font-bold text-white transition-colors hover:bg-brand-green/90 disabled:opacity-50"
                      >
                        <Truck size={11} />
                        Dispatch
                      </button>
                    )}
                  </span>
                </div>

                {expanded[bundle.id] && (
                  <BundleLineList bundle={bundle} lineFor={lineFor} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metres can also be packed by typing a figure rather than scanning a roll,
          and that path records no bundle to hang them on. Shown here rather than
          left out of the page, since the main list below only carries what is
          still owed. */}
      {!loading && bundleLoadError && (
        <p className="mt-3 border-t border-status-pending/30 pt-3 text-[11px] font-medium text-[color:var(--status-pending-text)]">
          Bundle details could not be loaded, so packed items cannot be classified.
          Please reload the order.
        </p>
      )}

      {!loading && !bundleLoadError && packedByHand.length > 0 && (
        <div className="mt-3 border-t border-status-pending/30 pt-3">
          <p className="text-[11px] font-bold text-[color:var(--status-pending-text)]">
            Packed without a bundle
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {packedByHand.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-3 rounded-control border border-app-line bg-app-card px-2 py-2 sm:px-3"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-control border border-app-line/60 bg-app-soft">
                  {line.variant_image ? (
                    <ImagePreview
                      src={line.variant_image}
                      alt={line.fabric_name}
                    />
                  ) : (
                    <div className="h-full w-full bg-app-soft" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-app-ink">
                    {line.fabric_name}
                    {orderItemColorSuffix(line.variant_display_order)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-app-muted">
                    <span className="font-bold text-app-ink">
                      {`${formatMeters(metresPackedOutsideBundles(line, coverage))} m packed by hand`}
                    </span>
                  </p>
                  {/* A line packed past what was ordered leaves the main list, so
                      its surplus is noted here rather than lost with it. */}
                  {toMeters(line.allocated_quantity) >
                    toMeters(line.ordered_quantity) && (
                    <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--status-pending-text)]">
                      +{formatMeters(toMeters(line.allocated_quantity) - toMeters(line.ordered_quantity))}{" "}
                      m over ordered
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-base font-extrabold text-app-ink">
                  ₹
                  {(
                    (metresPackedOutsideBundles(line, coverage) *
                      Number(line.rate_per_meter || 0))
                  ).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingScan && openBundle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/35 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Enter cut for ${pendingScan.roll_number}`}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmScan();
            }}
            className="w-full max-w-sm rounded-card border border-app-line bg-app-card p-6 shadow-float"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-control bg-status-pending/15 p-2 text-[color:var(--status-pending-text)]">
                <QrCode size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-app-ink">
                  Metres to cut
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-app-ink">
                  {pendingScan.roll_number} · {pendingScan.fabric}
                  {pendingScan.colour ? ` · ${pendingScan.colour}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-app-muted">
                  {formatMeters(Number(pendingScan.remaining_meters))} m left on
                  this roll · going into {openBundle.code}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-xs font-bold text-app-ink">
              Metres to cut from this roll
              <input
                autoFocus
                inputMode="decimal"
                type="number"
                min="0.001"
                step="0.001"
                max={pendingScan.remaining_meters}
                value={scanMetres}
                onChange={(event) => setScanMetres(event.target.value)}
                className="app-focus mt-1 h-12 w-full rounded-control border border-app-line bg-app-card px-3 text-base font-bold text-app-ink outline-none transition-colors focus:border-brand-navy"
              />
            </label>
            <p className="mt-1 text-[11px] text-app-muted">
              The figure is checked against the roll again when you confirm.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelPendingScan}
                disabled={busy}
                className="app-focus h-11 min-h-11 rounded-control border border-app-line px-4 text-sm font-bold text-app-muted transition-colors hover:bg-app-soft disabled:opacity-50"
              >
                Scan another roll
              </button>
              <button
                type="submit"
                disabled={busy}
                className="app-focus flex h-11 min-h-11 items-center gap-1.5 rounded-control bg-brand-navy px-4 text-sm font-bold text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
              >
                <Box size={14} />
                {busy ? "Packing..." : "Cut and pack"}
              </button>
            </div>
          </form>
        </div>
      )}

      <QRScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
      />

      {/* The first box to leave an order is the only moment the transport gets
          decided, and it gets decided once: every bundle after this one travels the
          same way. So this is a short confirmation for one box, not a standing
          prompt on the page. */}
      {dispatchingBundle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/35 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Dispatch ${dispatchingBundle.code}`}
        >
          <div className="w-full max-w-sm rounded-card border border-app-line bg-app-card p-6 shadow-float">
            <h3 className="text-lg font-bold text-app-ink">
              Dispatch this bundle
            </h3>
            <p className="mt-2 text-sm text-app-muted">
              {dispatchingBundle.code} holds{" "}
              {formatMeters(dispatchingBundle.total_metres)} m. Recording it here
              means this box has left the warehouse.
            </p>

            <label className="mt-4 block text-xs font-bold text-app-ink">
              Transport
              <select
                value={dispatchTransport}
                onChange={(e) => setDispatchTransport(e.target.value)}
                className="app-focus mt-1 h-12 w-full rounded-control border border-app-line bg-app-card px-3 text-sm font-medium text-app-ink outline-none transition-colors focus:border-brand-green"
              >
                <option value="">Choose a transport</option>
                {transports.map((transport) => (
                  <option
                    key={transport.value}
                    value={transport.value}
                  >
                    {transport.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-[11px] text-app-muted">
              The other bundles on this order are untouched -- dispatch them when
              they go, on the same transport.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDispatchingBundle(null);
                  setDispatchTransport("");
                }}
                disabled={busy}
                className="app-focus h-11 min-h-11 rounded-control border border-app-line px-4 text-sm font-bold text-app-muted transition-colors hover:bg-app-soft disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!dispatchTransport) {
                    toastError(
                      "Choose a transport",
                      "A bundle cannot go out without knowing what carried it.",
                    );
                    return;
                  }
                  void handleDispatch(
                    dispatchingBundle,
                    Number(dispatchTransport),
                  );
                }}
                disabled={busy || !dispatchTransport}
                className="app-focus flex h-11 min-h-11 items-center gap-1.5 rounded-control bg-brand-green px-4 text-sm font-bold text-white transition-colors hover:bg-brand-green/90 disabled:opacity-50"
              >
                <Truck size={14} />
                {busy ? "Dispatching..." : "Dispatch bundle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
