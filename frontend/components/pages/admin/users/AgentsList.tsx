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
import { agentApi } from "@/lib/api/agents";
import { formatDisplayName } from "@/lib/displayName";
import { formatApiError } from "@/lib/toast";
import { AgentAllResponse } from "@/types/agent";

const AgentsList: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<AgentAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await agentApi.getAll();
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

  const filteredData = data.filter((item) =>
    (item.user.display_name || item.user.username)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const addAgentButton = (
    <Button
      onClick={() => router.push("/admin/users/agents/new")}
      className="shrink-0"
    >
      <Plus className="size-4" aria-hidden="true" />
      Add agent
    </Button>
  );

  if (error) {
    return (
      <EmptyState
        title="Could not load agents"
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
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No agents yet"
        description="Add your first sales agent to assign customers and orders."
        action={addAgentButton}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="app-section-title">Agents</h2>
          <p className="app-secondary mt-1">
            {data.length} {data.length === 1 ? "agent" : "agents"}
          </p>
        </div>
        {addAgentButton}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search agents..."
        ariaLabel="Search agents"
        className="mb-4"
      />

      {filteredData.length === 0 ? (
        <EmptyState
          title="No matching agents"
          description="Try a different name, username, or email."
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((item) => {
            const name = item.user.display_name || item.user.username;
            const contact = item.contact?.replace(/\s+/g, "") ?? "";
            const telHref = contact.startsWith("+")
              ? `tel:${contact}`
              : `tel:+91${contact}`;

            return (
              <ListRow
                key={item.id}
                href={`/admin/users/agents/${item.id}/`}
                leading={<StockflowAvatar user={item.user} tone="purple" />}
                title={formatDisplayName(name)}
                subtitle={item.user.email}
                meta={
                  item.contact ? (
                    <a
                      href={telHref}
                      onClick={(event) => event.stopPropagation()}
                      className="pointer-events-auto relative z-10 inline-flex min-h-8 items-center rounded-full bg-app-soft px-2.5 py-0.5 text-[10px] font-semibold text-app-ink hover:bg-app-line/60"
                    >
                      +91 {item.contact}
                    </a>
                  ) : undefined
                }
                trailing={
                  <div className="pr-1 text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                      Clients
                    </div>
                    <div className="mt-0.5 text-base font-bold tabular-nums text-app-ink">
                      {item.total_customers}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default AgentsList;
