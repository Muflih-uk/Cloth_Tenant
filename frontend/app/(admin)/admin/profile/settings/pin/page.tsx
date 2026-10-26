"use client";

import { useEffect, useState } from "react";

import { PageLoading } from "@/components/ui/Loading";
import PinSettings from "@/components/pages/profile/settings/PinSettings";
import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import { authApi } from "@/lib/api/auth";
import { UserProfile } from "@/types/auth";

/**
 * Profile › Settings › PIN.
 *
 * The account is read here rather than passed through the URL, because whether
 * a PIN exists decides which of the two flows the page shows -- create, or
 * change behind an emailed code.
 */
export default function PinSettingsPage() {
  const [profile, setProfile] = useState<UserProfile>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    authApi
      .getProfile()
      .then((data) => {
        if (live) setProfile(data);
      })
      .catch(() => {
        // Without the profile there is no way to know which flow applies.
      })
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
      title="PIN"
      subtitle="Profile settings"
      backHref="/admin/profile/settings"
    >
      {profile ? (
        <PinSettings
          profile={profile}
          onChanged={(hasPin) =>
            setProfile((prev) => (prev ? { ...prev, has_pin: hasPin } : prev))
          }
        />
      ) : (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <p className="text-xs font-semibold text-gray-400">
            Your account could not be loaded, so the PIN cannot be managed right
            now. Reload the page to try again.
          </p>
        </section>
      )}
    </SettingsShell>
  );
}
