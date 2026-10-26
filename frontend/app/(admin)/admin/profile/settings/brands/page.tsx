"use client";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import BrandsList from "@/components/pages/admin/settings/BrandsList";

export default function BrandsSettingsPage() {
  return (
    <SettingsShell
      title="Brands"
      subtitle="Profile settings"
      backHref="/admin/profile/settings"
    >
      <BrandsList />
    </SettingsShell>
  );
}
