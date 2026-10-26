"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, KeyRound, Truck, Upload } from "lucide-react";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";

/**
 * Profile › Settings.
 *
 * A menu rather than a form: each thing an admin keeps here -- their PIN, the
 * transport list, and the spreadsheet import that used to sit on the profile --
 * now has a page of its own behind this one.
 */
const ROWS = [
  {
    label: "PIN",
    description: "Create your PIN, or change it with a code emailed to you.",
    href: "/admin/profile/settings/pin",
    icon: KeyRound,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Transports",
    description: "The lorry companies an order can be dispatched with.",
    href: "/admin/profile/settings/transports",
    icon: Truck,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Bulk Import",
    description: "Import customers from a spreadsheet.",
    href: "/admin/bulk-import",
    icon: Upload,
    tone: "bg-indigo-50 text-indigo-500",
  },
];

export default function ProfileSettingsPage() {
  const router = useRouter();

  return (
    <SettingsShell
      title="Settings"
      subtitle="Profile"
      backHref="/admin/profile"
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {ROWS.map(({ label, description, href, icon: Icon, tone }) => (
          <button
            key={href}
            type="button"
            onClick={() => router.push(href)}
            className="flex items-center gap-3 w-full px-3 py-3 sm:px-4 group hover:bg-gray-50/60 transition-colors text-left"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-700">{label}</p>
              <p className="text-[11px] text-gray-400 leading-snug">
                {description}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-gray-300 group-hover:text-primary transition-colors shrink-0"
            />
          </button>
        ))}
      </div>
    </SettingsShell>
  );
}
