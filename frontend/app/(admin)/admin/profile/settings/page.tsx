"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  KeyRound,
  Store,
  Truck,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import SettingsShell from "@/components/pages/profile/settings/SettingsShell";
import { useAuth } from "@/context/AuthContext";

type SettingsRow = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

/**
 * Profile › Settings.
 *
 * Each admin area has its own page now: Brands, Transports, Admins and Sub
 * Admins, followed by the signed-in admin's PIN and the customer import.
 */
const ROWS: SettingsRow[] = [
  {
    label: "Brands",
    description: "The company name, contact details and logo used on invoices.",
    href: "/admin/profile/settings/brands",
    icon: Store,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    label: "Transports",
    description: "The lorry companies an order can be dispatched with.",
    href: "/admin/profile/settings/transports",
    icon: Truck,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Admins",
    description: "Manage admin accounts and their PINs.",
    href: "/admin/profile/settings/admins",
    icon: Users,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    label: "Sub Admins",
    description: "Create sub-admin accounts and choose what they can do.",
    href: "/admin/profile/settings/subadmins",
    icon: UserCog,
    tone: "bg-rose-50 text-rose-600",
  },
  {
    label: "PIN",
    description: "Create your PIN, or change it with a code emailed to you.",
    href: "/admin/profile/settings/pin",
    icon: KeyRound,
    tone: "bg-emerald-50 text-emerald-600",
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
  const { role } = useAuth();

  if (role !== "ADMIN") return null;

  return (
    <SettingsShell
      title="Settings"
      subtitle="Profile"
      backHref="/admin/profile"
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {ROWS.map(({ label, description, href, icon: Icon, tone }) => (
          <button
            key={label}
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
