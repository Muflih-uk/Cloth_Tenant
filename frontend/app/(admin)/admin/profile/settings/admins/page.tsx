"use client";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import AdminsList from "@/components/pages/admin/users/AdminsList";

export default function AdminsSettingsPage() {
  return (
    <SettingsShell
      title="Admins"
      subtitle="Profile settings"
      backHref="/admin/profile/settings"
    >
      <AdminsList />
    </SettingsShell>
  );
}
