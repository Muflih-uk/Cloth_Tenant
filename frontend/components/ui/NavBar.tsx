"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, History, Package, Plus } from "lucide-react";
import React, { useState } from "react";

import BottomNav, { type BottomNavItem } from "./app/BottomNav";

type NavItem = BottomNavItem & {
  match?: (pathname: string) => boolean;
};

const NavBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [isPending, startTransition] = React.useTransition();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const pendingPath = isPending ? loadingPath : null;

  const isHome = pathname === "/agent";

  const handleNavigation = (path: string) => {
    if (pendingPath || pathname === path) return;

    setLoadingPath(path);

    startTransition(() => {
      router.push(path);
    });
  };

  const items: NavItem[] = [
    {
      label: "History",
      path: "/agent/history",
      icon: History,
    },
    isHome
      ? {
          label: "New Order",
          path: "/agent/order/new",
          icon: Plus,
          highlighted: true,
        }
      : {
          label: "Orders",
          path: "/agent",
          icon: Home,
        },
    {
      label: "My Items",
      path: "/agent/items",
      icon: Package,
      match: (currentPath) => currentPath.startsWith("/agent/items"),
    },
  ];

  const navItems = items.map((item) => ({
    ...item,
    active: item.match ? item.match(pathname) : pathname === item.path,
  }));

  return (
    <BottomNav
      items={navItems}
      ariaLabel="Agent navigation"
      onNavigate={handleNavigation}
      loadingPath={pendingPath}
    />
  );
};

export default NavBar;
