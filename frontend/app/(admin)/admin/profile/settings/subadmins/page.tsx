"use client";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import SubAdminsList from "@/components/pages/admin/settings/SubAdminsList";

export default function SubAdminsSettingsPage() {
  return (
    <SettingsShell
      title="Sub Admins"
      subtitle="Profile settings"
      backHref="/admin/profile/settings"
    >
      <SubAdminsList />
    </SettingsShell>
  );
}
