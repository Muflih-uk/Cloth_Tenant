"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/ui/app/Button";
import ListRow from "@/components/ui/app/ListRow";
import SearchInput from "@/components/ui/app/SearchInput";
import { SkeletonRow } from "@/components/ui/app/Skeleton";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/api/admin";
import { formatDisplayName } from "@/lib/displayName";
import { formatApiError } from "@/lib/toast";
import { AdminAllResponse } from "@/types/admin";

const AdminsList: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<AdminAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await adminApi.getAll();
        if (cancelled) return;
        setData(response);
        setError("");
      } catch (fetchError) {
        if (cancelled) return;
        console.error("Error fetching data:", fetchError);
        setError(formatApiError(fetchError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, reloadKey]);

  const filteredData = data.filter((item) => {
    const name = item.display_name || item.username;
    return `${name} ${item.email}`.toLowerCase().includes(search.toLowerCase());
  });

  const addAdminButton = (
    <Button
      onClick={() => router.push("/admin/users/admins/new")}
      className="shrink-0"
    >
      <Plus className="size-4" aria-hidden="true" />
      Add admin
    </Button>
  );

  if (error) {
    return (
      <EmptyState
        title="Could not load admins"
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
        title="No admins yet"
        description="Add an admin to help manage the warehouse."
        action={addAdminButton}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="app-section-title">Admins</h2>
          <p className="app-secondary mt-1">
            {data.length} {data.length === 1 ? "admin" : "admins"}
          </p>
        </div>
        {addAdminButton}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search admins..."
        ariaLabel="Search admins"
        className="mb-4"
      />

      {filteredData.length === 0 ? (
        <EmptyState
          title="No matching admins"
          description="Try a different name or email."
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((item) => (
            <ListRow
              key={item.id}
              href={`/admin/users/admins/${item.id}/`}
              leading={<StockflowAvatar user={item} tone="navy" />}
              title={formatDisplayName(item.display_name || item.username)}
              subtitle={item.email}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default AdminsList;
