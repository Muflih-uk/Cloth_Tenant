import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import BackToParent from "@/components/ui/app/BackToParent";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  pathname: { current: "/admin/items/edit/5" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));

/** A page opened as the very first entry (shortcut, notification, refresh). */
function firstEntryOnly() {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    value: 1,
  });
}

/** A page reached by navigating inside the app. */
function hasHistoryBehind(value = 3) {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    value,
  });
}

const pressBack = () =>
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

describe("BackToParent", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.push.mockReset();
    mocks.pathname.current = "/admin/items/edit/5";
  });

  it("takes a deep-linked page to its parent on the first back press", () => {
    firstEntryOnly();
    const pushState = vi.spyOn(window.history, "pushState");

    render(<BackToParent />);
    expect(pushState).toHaveBeenCalledTimes(1);

    pressBack();
    expect(mocks.replace).toHaveBeenCalledWith("/admin/items");

    pushState.mockRestore();
  });

  it("leaves a page reached from another page to the browser's own history", () => {
    hasHistoryBehind();
    const pushState = vi.spyOn(window.history, "pushState");

    render(<BackToParent />);
    expect(pushState).not.toHaveBeenCalled();

    pressBack();
    expect(mocks.replace).not.toHaveBeenCalled();

    pushState.mockRestore();
  });

  it("installs nothing on a tab root, so back can leave the app", () => {
    mocks.pathname.current = "/admin/items";
    firstEntryOnly();
    const pushState = vi.spyOn(window.history, "pushState");

    render(<BackToParent />);
    expect(pushState).not.toHaveBeenCalled();

    pressBack();
    expect(mocks.replace).not.toHaveBeenCalled();

    pushState.mockRestore();
  });

  it("stops listening once the page is gone", () => {
    firstEntryOnly();
    const pushState = vi.spyOn(window.history, "pushState");

    const { unmount } = render(<BackToParent />);
    unmount();
    pressBack();
    expect(mocks.replace).not.toHaveBeenCalled();

    pushState.mockRestore();
  });
});
