import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminNavBar from "@/components/ui/AdminNavBar";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: { current: "/admin" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isSuperuser: true }),
}));

describe("AdminNavBar", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.pathname.current = "/admin";
  });

  /**
   * The tabs used to remember the path they had asked for, and that memory
   * outlived the navigation. Opening the profile from the avatar (a route the
   * bar never asked for) then left every tab disabled behind a spinner that
   * never resolved.
   */
  it("still navigates after the profile was opened from a tab", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AdminNavBar />);

    await user.click(screen.getByRole("button", { name: /users/i }));
    expect(mocks.push).toHaveBeenCalledWith("/admin/users");

    // The person leaves through the profile avatar instead.
    mocks.pathname.current = "/admin/profile";
    rerender(<AdminNavBar />);

    const stock = screen.getByRole("button", { name: /stock/i }) as HTMLButtonElement;
    expect(stock.disabled).toBe(false);

    await user.click(stock);
    expect(mocks.push).toHaveBeenLastCalledWith("/admin/items");
  });

  it("keeps every tab usable while no navigation is in flight", () => {
    render(<AdminNavBar />);

    for (const label of [/users/i, /orders/i, /stats/i, /stock/i]) {
      const tab = screen.getByRole("button", { name: label }) as HTMLButtonElement;
      expect(tab.disabled).toBe(false);
    }
  });
});
