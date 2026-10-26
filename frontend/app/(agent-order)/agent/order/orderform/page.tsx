"use client";

import { orderApi, InvoiceResponse } from "@/lib/api/order";
import { toastError } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pages/InvoicePdf";
import { useBackButton } from "@/util/useBackButton";

import OrderForm from "@/components/pages/order-form/OrderFormView";
import { AlertTriangle, Download, Printer, Share2 } from "lucide-react";
import { PageLoading } from "@/components/ui/Loading";
import Button from "@/components/ui/app/Button";

const urlToDataUrl = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) return null;
        const blob = await res.blob();

        // Convert to PNG via canvas (handles webp, avif, anything the browser supports)
        return await new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(blob);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d")!;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(objectUrl);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(null);
            };
            img.src = objectUrl;
        });
    } catch {
        return null;
    }
};

// ── Page Component ─────────────────────────────────────────────────────────────
export default function InvoicePage() {
    const router = useRouter();
    const invoiceRef = useRef<HTMLDivElement>(null);

    const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
    const [printing, setPrinting] = useState<boolean>(false);
    const [sharing, setSharing] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [, setFetchError] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState(true);
    const [pdfError, setPdfError] = useState<string | null>(null);

    useBackButton({
        onBack: () => {
            router.push("/agent");
        },
    });

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    }, []);

    // ── Fetch invoice on mount ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const key = localStorage.getItem("orderKey");
                if (key) {
                    const res = await orderApi.invoiceOrder(Number(key));
                    setInvoice(res);
                } else {
                    setFetchError(true);
                }
            } catch (e) {
                console.error("Error fetching order details:", e);
                toastError("Failed to load order form", e);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ── Generate PDF blob for preview ──
    useEffect(() => {
        if (!invoice) return;

        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPdfGenerating(true);

        const generatePdf = async () => {
            try {
                const logoDataUrl = invoice.brand?.logo_url
                    ? await urlToDataUrl(invoice.brand.logo_url)
                    : null;

                const invoiceForPdf = {
                    ...invoice,
                    brand: invoice.brand
                        ? { ...invoice.brand, logo_url: logoDataUrl }
                        : invoice.brand,
                };

                const blob = await pdf(
                    <InvoicePDF invoice={invoiceForPdf} />,
                ).toBlob();
                if (cancelled) return;

                setPdfBlob(blob);
                setPdfBlobUrl(URL.createObjectURL(blob));
                setPdfError(null);
                setPdfGenerating(false);
            } catch (e) {
                console.error("Failed to generate PDF preview:", e);
                if (!cancelled) {
                    // Surface this. Previously the failure was swallowed, so the
                    // preview stayed a blank iframe and Print/Download silently
                    // stayed disabled with nothing to tell the agent why.
                    setPdfError(
                        e instanceof Error
                            ? e.message
                            : "The order form preview could not be generated",
                    );
                    setPdfGenerating(false);
                }
            }
        };

        generatePdf();

        return () => {
            cancelled = true;
        };
    }, [invoice]);

    // ── Cleanup blob URL on unmount ──
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    const handlePrint = async () => {
        if (!pdfBlob) return;
        setPrinting(true);
        try {
            const url = URL.createObjectURL(pdfBlob);

            if (isMobile) {
                // Mobile — open in new tab, user prints from browser menu
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } else {
                // Desktop — silent print via hidden iframe
                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                iframe.src = url;
                document.body.appendChild(iframe);
                iframe.onload = () => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);
                    }, 3000);
                };
            }
        } finally {
            setPrinting(false);
        }
    };

    const handleShare = async () => {
        if (!pdfBlob) {
            toastError("PDF not ready yet, please wait");
            return;
        }

        setSharing(true);
        try {
            const file = new File([pdfBlob], `order-form.pdf`, {
                type: "application/pdf",
            });

            // Check Web Share API exists at all
            if (!navigator.share) {
                toastError(
                    "Web Share API not supported, falling back to download",
                );
                handleDownload();
                return;
            }

            // Try file share first, fallback to URL-only share, then download
            try {
                if (
                    navigator.canShare &&
                    navigator.canShare({ files: [file] })
                ) {
                    await navigator.share({
                        title: "Order Form",
                        text: "Order Form",
                        files: [file],
                    });
                } else {
                    // Fallback: share blob URL instead of file
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    try {
                        await navigator.share({
                            title: "Order Form",
                            text: "Please find the order form attached.",
                            url: blobUrl, // share the URL instead
                        });
                    } finally {
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                    }
                }
            } catch (shareError) {
                const err = shareError as Error;
                if (err.name === "AbortError") return; // silent cancel
                toastError(shareError); // only real errors
                handleDownload();
            }
        } catch (e) {
            console.error("handleShare outer error:", e);
            handleDownload();
        } finally {
            setSharing(false);
        }
    };

    const handleDownload = () => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orderform.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // ── Loading state ──
    if (loading) {
        return <PageLoading text="Loading Order Form..." />;
    }

    // ── Error / not found state ──
    if (!invoice) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-app-bg px-4">
                <div className="text-center">
                    <p className="mb-4 text-sm font-medium text-app-muted">
                        Failed to load invoice.
                    </p>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            localStorage.removeItem("orderKey");
                            router.push("/agent");
                        }}
                    >
                        ← Go home
                    </Button>
                </div>
            </main>
        );
    }

    // ── Main render ──
    return (
        <main className="flex min-h-screen flex-col items-center bg-app-bg px-4 py-6 font-sans">
            <header className="mb-6 flex w-full max-w-5xl items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/agent")}
                    className="-ml-2"
                >
                    <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    Back
                </Button>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-app-muted">
                    Order Management
                </span>
            </header>

            <div className="flex w-full max-w-5xl flex-1 overflow-y-auto">
                {isMobile ? (
                    <div className="flex w-full flex-col gap-4">
                        <OrderForm
                            id={invoice.id}
                            customer={invoice.customer}
                            agent={invoice.agent}
                            brand={invoice.brand}
                            created_at={invoice.created_at}
                            items={invoice.items}
                            totals={invoice.totals}
                            invoiceRef={invoiceRef}
                        />
                    </div>
                ) : pdfGenerating ? (
                    <div className="flex h-96 flex-col items-center justify-center gap-3">
                        <div className="size-10 animate-spin rounded-full border-4 border-brand-navy/20 border-t-brand-navy" />
                        <p className="text-sm font-medium text-app-muted">
                            Generating preview…
                        </p>
                    </div>
                ) : pdfError ? (
                    <div className="flex h-96 flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="flex size-10 items-center justify-center rounded-full bg-brand-red/10">
                            <AlertTriangle
                                size={20}
                                className="text-brand-red"
                                aria-hidden="true"
                            />
                        </div>
                        <p className="text-sm font-bold text-app-ink">
                            The order form preview could not be generated
                        </p>
                        <p className="max-w-xs text-xs font-medium text-app-muted">
                            {pdfError}
                        </p>
                        <Button
                            variant="ghost"
                            onClick={() => window.location.reload()}
                            className="mt-1 text-brand-navy"
                        >
                            Try again
                        </Button>
                    </div>
                ) : (
                    <iframe
                        src={pdfBlobUrl ?? undefined}
                        className="h-[650px] w-full border-0"
                        title="Order Form Preview"
                    />
                )}
            </div>

            <div className="sticky bottom-0 w-full border-t border-app-line/70 bg-app-card/95 p-4 backdrop-blur-md">
                <div className="mx-auto flex max-w-md gap-3">
                    <Button
                        variant="secondary"
                        onClick={handlePrint}
                        disabled={printing || !pdfBlob}
                        loading={printing}
                        fullWidth
                    >
                        <Printer size={18} aria-hidden="true" />
                        {printing ? "Opening..." : "Print"}
                    </Button>

                    {isMobile && (
                        <Button
                            variant="secondary"
                            onClick={handleShare}
                            disabled={sharing || !pdfBlob}
                            loading={sharing}
                            fullWidth
                        >
                            <Share2 size={18} aria-hidden="true" />
                            {sharing ? "Sharing..." : "Share"}
                        </Button>
                    )}

                    <Button
                        onClick={handleDownload}
                        disabled={!pdfBlob}
                        fullWidth
                    >
                        <Download size={18} aria-hidden="true" />
                        Download
                    </Button>
                </div>
            </div>
        </main>
    );
}
