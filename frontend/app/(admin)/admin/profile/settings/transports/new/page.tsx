"use client";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import TransportForm from "@/components/pages/profile/settings/TransportForm";

export default function NewTransportPage() {
  return (
    <SettingsShell
      title="Add Transport"
      subtitle="Transports"
      backHref="/admin/profile/settings/transports"
    >
      <TransportForm />
    </SettingsShell>
  );
}
