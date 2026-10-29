"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import Button from "@/components/ui/app/Button";
import ListRow from "@/components/ui/app/ListRow";
import SearchInput from "@/components/ui/app/SearchInput";
import { SkeletonRow } from "@/components/ui/app/Skeleton";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import EmptyState from "@/components/ui/EmptyState";
import { subAdminApi } from "@/lib/api/admin";
import { formatDisplayName } from "@/lib/displayName";
import { formatApiError } from "@/lib/toast";
import type { SubAdminAllResponse } from "@/types/admin";

export default function SubAdminsList() {
  const router = useRouter();
  const [data, setData] = useState<SubAdminAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    subAdminApi
      .getAll()
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
          setError("");
        }
      })
      .catch((fetchError) => {
        if (!cancelled) setError(formatApiError(fetchError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const addButton = (
    <Button
      onClick={() => router.push("/admin/users/subadmins/new")}
      className="shrink-0"
    >
      <Plus className="size-4" aria-hidden="true" />
      Add sub admin
    </Button>
  );

  if (error) {
    return (
      <EmptyState
        title="Could not load sub admins"
        description={error}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setError("");
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No sub admins yet"
        description="Add a sub admin and choose exactly what they can access."
        action={addButton}
      />
    );
  }

  const filtered = data.filter((row) => {
    const name = row.display_name || row.username;
    return `${name} ${row.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="app-section-title">Sub admins</h2>
          <p className="app-secondary mt-1">
            {data.length} {data.length === 1 ? "account" : "accounts"}
          </p>
        </div>
        {addButton}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search sub admins..."
        ariaLabel="Search sub admins"
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching sub admins"
          description="Try a different name or email."
        />
      ) : (
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
          {filtered.map((row) => (
            <ListRow
              key={row.id}
              href={`/admin/users/subadmins/${row.id}/`}
              leading={<StockflowAvatar user={row} tone="navy" />}
              title={formatDisplayName(row.display_name || row.username)}
              subtitle={row.is_active ? row.email : `${row.email} · Inactive`}
            />
          ))}
        </div>
      )}
    </>
  );
}
