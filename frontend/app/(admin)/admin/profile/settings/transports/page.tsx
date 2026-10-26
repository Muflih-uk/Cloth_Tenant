"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Truck } from "lucide-react";

import { PageLoading } from "@/components/ui/Loading";
import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import StockFlowButton from "@/components/ui/custom/stockFlowButton";
import { transportApi } from "@/lib/api/transport";
import { toastErrorFromError } from "@/lib/toast";
import type { Transport } from "@/types/transport";

const BASE = "/admin/profile/settings/transports";

/**
 * Profile › Settings › Transports.
 *
 * The list the dispatch dialog offers. Reading it needs no permission -- an
 * order has to show what it can travel with -- but adding or renaming one is an
 * admin action, which is what the two pages behind this one handle.
 */
export default function TransportsPage() {
  const router = useRouter();
  const [data, setData] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    transportApi
      .getAll()
      .then((rows) => {
        if (live) setData(rows);
      })
      .catch((error) => toastErrorFromError(error))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  if (loading) return <PageLoading />;

  return (
    <SettingsShell
      title="Transports"
      subtitle="Profile settings"
      backHref="/admin/profile/settings"
      action={
        <StockFlowButton
          variant="filled"
          text="Add"
          icon={<Plus className="size-4" />}
          onClick={() => router.push(`${BASE}/new`)}
          className="shrink-0 h-10 rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 ring-1 ring-primary/10"
        />
      }
    >
      {data.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
          <Truck size={40} className="text-gray-200" />
          <p className="text-sm font-bold text-gray-400">No transports yet</p>
          <p className="text-[11px] text-gray-400">
            Add the lorry companies an order can be dispatched with.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {data.map((transport) => (
            <div
              key={transport.id}
              className="flex items-center gap-3 px-3 py-3 sm:px-4"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Truck size={15} className="text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {transport.name}
                </p>
                <span
                  className={`text-[11px] font-bold ${
                    transport.is_active ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {transport.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => router.push(`${BASE}/${transport.id}/edit`)}
                aria-label={`Edit ${transport.name}`}
                className="p-2 rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsShell>
  );
}
