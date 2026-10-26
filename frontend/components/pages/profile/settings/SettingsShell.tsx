"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface SettingsShellProps {
  title: string;
  subtitle?: string;
  /** Where the back arrow goes -- always the page that led here. */
  backHref: string;
  /** Anything that belongs on the header line, such as an Add button. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * The frame every Profile › Settings page shares: one back arrow to the page
 * above it, a title, and the same narrow column the profile itself uses.
 */
export default function SettingsShell({
  title,
  subtitle = "Profile settings",
  backHref,
  action,
  children,
}: SettingsShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100 px-0 pt-2 pb-3 sm:px-4 sm:pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex w-full items-center gap-3 min-w-0 py-4">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              aria-label="Back"
              className="p-2 -ml-2 rounded-full hover:bg-gray-50 shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-gray-900 truncate">
                {title}
              </h1>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                {subtitle}
              </p>
            </div>
            {action}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-0 py-3 space-y-3 sm:px-4 sm:py-4">
        {children}
      </div>
    </div>
  );
}
