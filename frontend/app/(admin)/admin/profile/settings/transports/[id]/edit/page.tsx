"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PageLoading } from "@/components/ui/Loading";
import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import TransportForm from "@/components/pages/profile/settings/TransportForm";
import { transportApi } from "@/lib/api/transport";
import type { Transport } from "@/types/transport";

export default function EditTransportPage() {
  const params = useParams();
  const id = Number(params.id);

  const [transport, setTransport] = useState<Transport>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    transportApi
      .getAll()
      .then((rows) => {
        if (live) setTransport(rows.find((row) => row.id === id));
      })
      .catch(() => {
        // Falls through to the "not found" card below.
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id]);

  if (loading) return <PageLoading />;

  return (
    <SettingsShell
      title="Edit Transport"
      subtitle="Transports"
      backHref="/admin/profile/settings/transports"
    >
      {transport ? (
        <TransportForm transport={transport} />
      ) : (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-gray-400">
            That transport could not be found. It may have been removed — go back
            to the list and pick another.
          </p>
        </section>
      )}
    </SettingsShell>
  );
}
