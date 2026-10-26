"use client";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import TransportForm from "@/components/pages/profile/settings/TransportForm";
import { useAuth } from "@/context/AuthContext";

export default function NewTransportPage() {
  const { isSuperuser } = useAuth();

  return (
    <SettingsShell
      title="Add Transport"
      subtitle="Transports"
      backHref="/admin/profile/settings/transports"
    >
      <TransportForm isSuperuser={isSuperuser} />
    </SettingsShell>
  );
}
