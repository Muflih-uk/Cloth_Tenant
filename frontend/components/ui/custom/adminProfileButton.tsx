"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import StockflowAvatar from "./stockflowAvatar";
import { useSyncExternalStore } from "react";

const AdminProfileButton: React.FC = () => {
  const router = useRouter();
  const { business, role, user } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="flex w-full justify-between px-4 py-3 lg:mx-auto lg:max-w-7xl lg:px-6">
        <div className="h-5 w-24 animate-pulse rounded-full bg-app-soft" />
        <div className="size-11 animate-pulse rounded-full bg-app-soft" />
      </div>
    );
  }

  const businessLabel = business
    ? business.charAt(0).toUpperCase() + business.slice(1)
    : "";

  return (
    <div className="relative flex w-full items-center justify-between px-4 py-3 lg:mx-auto lg:max-w-7xl lg:px-6">
      <div className="truncate text-sm font-bold tracking-wide text-brand-navy">
        {businessLabel ||
          (role === "SUBADMIN" ? "Sub admin" : role === "ADMIN" ? "Admin" : "")}
      </div>
      <button
        type="button"
        onClick={() => router.push("/admin/profile")}
        aria-label="Open profile"
        className="app-focus -m-1 flex size-12 items-center justify-center rounded-full p-1 transition-colors hover:bg-app-soft"
      >
        <StockflowAvatar user={user} />
      </button>
    </div>
  );
};

export default AdminProfileButton;
