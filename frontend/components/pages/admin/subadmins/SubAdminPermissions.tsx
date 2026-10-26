"use client";

import type { PermissionFlags } from "@/types/auth";

type PermissionKey = keyof PermissionFlags;

const GROUPS: {
  title: string;
  description: string;
  permissions: { key: PermissionKey; label: string; hint: string }[];
}[] = [
  {
    title: "Orders",
    description: "Order lists, packing, bundles, and dispatch.",
    permissions: [
      { key: "orders_view", label: "View", hint: "See and open orders." },
      { key: "orders_edit", label: "Edit", hint: "Edit orders and pack." },
      {
        key: "orders_delete",
        label: "Delete",
        hint: "Delete orders with a PIN.",
      },
    ],
  },
  {
    title: "Stock",
    description: "Fabrics, colours, rolls, and stock figures.",
    permissions: [
      { key: "items_view", label: "View", hint: "See and open stock." },
      { key: "items_edit", label: "Edit", hint: "Edit stock and rolls." },
      {
        key: "items_delete",
        label: "Delete",
        hint: "Delete stock with a PIN.",
      },
    ],
  },
  {
    title: "Agents",
    description: "Agent and customer details are read-only.",
    permissions: [
      {
        key: "agents_view",
        label: "View agents",
        hint: "See agents and their customers.",
      },
    ],
  },
];

const EMPTY_FLAGS: PermissionFlags = {
  orders_view: false,
  orders_edit: false,
  orders_delete: false,
  items_view: false,
  items_edit: false,
  items_delete: false,
  agents_view: false,
};

export default function SubAdminPermissions({
  value,
  onChange,
  disabled = false,
}: {
  value: PermissionFlags;
  onChange: (value: PermissionFlags) => void;
  disabled?: boolean;
}) {
  const toggle = (key: PermissionKey, checked: boolean) => {
    const next = { ...value, [key]: checked };

    if (key === "orders_view" && !checked) {
      next.orders_edit = false;
      next.orders_delete = false;
    }
    if (key === "orders_edit" || key === "orders_delete") {
      if (checked) next.orders_view = true;
    }
    if (key === "items_view" && !checked) {
      next.items_edit = false;
      next.items_delete = false;
    }
    if (key === "items_edit" || key === "items_delete") {
      if (checked) next.items_view = true;
    }

    onChange(next);
  };

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => (
        <section
          key={group.title}
          className="rounded-card border border-app-line bg-app-card p-4"
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-app-ink">{group.title}</h3>
            <p className="app-secondary mt-0.5">{group.description}</p>
          </div>
          <div className="space-y-2">
            {group.permissions.map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-control px-1 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={value[key]}
                  disabled={disabled}
                  onChange={(event) => toggle(key, event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-brand-navy"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-app-ink">
                    {label}
                  </span>
                  <span className="app-secondary block">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export { EMPTY_FLAGS };
