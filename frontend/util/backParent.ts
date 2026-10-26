/**
 * Where a phone's back button should land when a page has a natural parent.
 *
 * Only pages that sit *inside* something get an entry. The tab roots -- /admin,
 * /admin/users, /admin/items, /admin/analytics -- deliberately have none: back
 * there means "leave the app", which is what a native app does too.
 *
 * The order matters: the first matching rule wins, so the deeper paths are
 * listed before the shallower ones they start with.
 */
const RULES: Array<{ match: RegExp; parent: string }> = [
  // Stock: one fabric, its demand list, and the packing board all belong to the
  // item list they were opened from.
  { match: /^\/admin\/items\/edit\/[^/]+$/, parent: "/admin/items" },
  { match: /^\/admin\/items\/new$/, parent: "/admin/items" },
  { match: /^\/admin\/items\/ordered\/[^/]+$/, parent: "/admin/items" },
  { match: /^\/admin\/packing(\/.*)?$/, parent: "/admin/items" },

  // Users: the three sub-lists and every person inside them.
  {
    match: /^\/admin\/users\/(admins|agents|customers)(\/.*)?$/,
    parent: "/admin/users",
  },

  // Orders: status, edit and the order wizard.
  { match: /^\/admin\/order(\/.*)?$/, parent: "/admin" },

  // Profile › Settings, deepest first.
  {
    match: /^\/admin\/profile\/settings\/transports\/[^/]+\/edit$/,
    parent: "/admin/profile/settings/transports",
  },
  {
    match: /^\/admin\/profile\/settings\/transports\/new$/,
    parent: "/admin/profile/settings/transports",
  },
  {
    match: /^\/admin\/profile\/settings\/transports$/,
    parent: "/admin/profile/settings",
  },
  {
    match: /^\/admin\/profile\/settings\/brands\/(new|[^/]+)$/,
    parent: "/admin/profile/settings/brands",
  },
  {
    match: /^\/admin\/profile\/settings\/brands$/,
    parent: "/admin/profile/settings",
  },
  {
    match: /^\/admin\/profile\/settings\/(admins|subadmins)$/,
    parent: "/admin/profile/settings",
  },
  {
    match: /^\/admin\/profile\/settings\/pin$/,
    parent: "/admin/profile/settings",
  },
  { match: /^\/admin\/profile\/settings$/, parent: "/admin/profile" },
  { match: /^\/admin\/profile$/, parent: "/admin" },

  // Admin settings and their forms, reached through Profile › Settings.
  { match: /^\/admin\/settings\/(brands|transports)(\/.*)?$/, parent: "/admin/settings" },
  { match: /^\/admin\/settings$/, parent: "/admin/profile/settings" },

  // Tools that open on their own: summary sits under the order list, bulk
  // import is launched from Settings now.
  { match: /^\/admin\/summary$/, parent: "/admin" },
  { match: /^\/admin\/bulk-import$/, parent: "/admin/profile/settings" },
];

/** The parent page for `pathname`, or null when the page is a tab root. */
export function backParentOf(pathname: string): string | null {
  // Ignore a trailing slash and any query the caller may have left on.
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  for (const { match, parent } of RULES) {
    if (match.test(clean)) return parent;
  }
  return null;
}
