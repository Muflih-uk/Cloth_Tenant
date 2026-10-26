import { describe, expect, it } from "vitest";

import { backParentOf } from "@/util/backParent";

describe("backParentOf", () => {
  it("sends a fabric's edit page back to the item list", () => {
    expect(backParentOf("/admin/items/edit/12")).toBe("/admin/items");
    expect(backParentOf("/admin/items/new")).toBe("/admin/items");
    expect(backParentOf("/admin/items/ordered/7")).toBe("/admin/items");
    expect(backParentOf("/admin/packing/3")).toBe("/admin/items");
  });

  it("leaves the tab roots alone, so back there can leave the app", () => {
    for (const root of [
      "/admin",
      "/admin/users",
      "/admin/items",
      "/admin/analytics",
    ]) {
      expect(backParentOf(root)).toBeNull();
    }
  });

  it("walks the profile settings tree one level at a time", () => {
    expect(backParentOf("/admin/profile")).toBe("/admin");
    expect(backParentOf("/admin/profile/settings")).toBe("/admin/profile");
    expect(backParentOf("/admin/profile/settings/pin")).toBe(
      "/admin/profile/settings",
    );
    expect(backParentOf("/admin/profile/settings/transports")).toBe(
      "/admin/profile/settings",
    );
    expect(backParentOf("/admin/profile/settings/transports/new")).toBe(
      "/admin/profile/settings/transports",
    );
    expect(backParentOf("/admin/profile/settings/transports/4/edit")).toBe(
      "/admin/profile/settings/transports",
    );
  });

  it("sends the people pages back to the users tab", () => {
    expect(backParentOf("/admin/users/admins/3")).toBe("/admin/users");
    expect(backParentOf("/admin/users/agents/new")).toBe("/admin/users");
    expect(backParentOf("/admin/users/customers/9")).toBe("/admin/users");
  });

  it("sends bulk import back to the settings that launched it", () => {
    expect(backParentOf("/admin/bulk-import")).toBe("/admin/profile/settings");
    expect(backParentOf("/admin/summary")).toBe("/admin");
  });

  it("ignores a trailing slash and a query", () => {
    expect(backParentOf("/admin/items/edit/3/")).toBe("/admin/items");
    expect(backParentOf("/admin/items/ordered/7?tab=all")).toBe("/admin/items");
    expect(backParentOf("/admin/profile/")).toBe("/admin");
  });

  it("does not invent a parent for unknown pages", () => {
    expect(backParentOf("/admin")).toBeNull();
    expect(backParentOf("/agent")).toBeNull();
  });
});
