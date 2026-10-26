"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { backParentOf } from "@/util/backParent";

/**
 * The phone's back button, behaving like a native app's.
 *
 * Two cases, and they are not symmetrical:
 *
 * - The page was reached from another page in the app. The browser already has
 *   that page in its history, so back is already correct; touching it here
 *   would only make the press happen twice.
 *
 * - The page is the *first* entry -- opened from a home-screen shortcut, a
 *   notification, or a hard refresh. Left alone, back would close the app from
 *   halfway inside it. Instead one press goes to the page this one belongs to
 *   (the item list for a fabric's edit page, the settings menu for the PIN
 *   page), and the press after that closes the app, which is what the person
 *   expects.
 *
 * Tabs and the app home have no parent, so nothing is installed for them: back
 * there means leave the app, exactly as it should.
 */
export default function BackToParent() {
  const pathname = usePathname();
  const router = useRouter();
  const parent = backParentOf(pathname);

  useEffect(() => {
    if (!parent) return;
    if (window.history.length > 1) return;

    // Hold the first press inside the app so it can be answered, then let the
    // browser replace this entry with the parent page.
    window.history.pushState({ appBack: true }, "");
    const handlePop = () => router.replace(parent);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [parent, pathname, router]);

  return null;
}
