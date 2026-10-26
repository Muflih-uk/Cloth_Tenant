"use client";

import { usePathname, useRouter } from "next/navigation";
import { Truck, Users, Archive, BarChart3, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useSyncExternalStore } from "react";

import BottomNav, { type BottomNavItem } from "./app/BottomNav";

const AdminNavBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperuser } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // The pending state has to come from the transition, not from remembering the
  // path we asked for: that memory outlives the navigation, so leaving this
  // screen by another route (the profile avatar, say) used to leave every tab
  // disabled behind a spinner that never resolved. `isPending` drops the moment
  // the router commits, which is the only moment we can be sure it is over.
  const [isPending, startTransition] = React.useTransition();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const pendingPath = isPending ? loadingPath : null;

  if (!mounted) return null;

  const items: (BottomNavItem & { requiresSuperuser?: boolean })[] = [
    {
      label: "Users",
      icon: Users,
      path: "/admin/users",
    },
    {
      label: "Orders",
      icon: Truck,
      path: "/admin",
    },
    {
      label: "Settings",
      icon: Store,
      path: "/admin/settings",
      requiresSuperuser: true,
    },
    {
      label: "Stats",
      icon: BarChart3,
      path: "/admin/analytics",
    },
    {
      label: "Stock",
      icon: Archive,
      path: "/admin/items",
    },
  ];

  const navItems = items
    .filter((item) => !item.requiresSuperuser || isSuperuser)
    .map((item) => ({
      ...item,
      active:
        pathname === item.path ||
        (item.path !== "/admin" && pathname.startsWith(item.path)),
    }));

  const handleNavigation = (path: string) => {
    if (pendingPath || pathname === path) return;

    setLoadingPath(path);

    startTransition(() => {
      router.push(path);
    });
  };

  return (
    <BottomNav
      items={navItems}
      ariaLabel="Admin navigation"
      onNavigate={handleNavigation}
      loadingPath={pendingPath}
    />
  );
};

export default AdminNavBar;
