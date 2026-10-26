"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { ArrowLeft, ArrowRight, MapPin, Plus, User } from "lucide-react";

import { customerApi } from "@/lib/api/customer";
import { createDraftOrder } from "@/lib/draftOrder";
import { extractErrorMessage } from "@/lib/orderFlow";
import { toastError } from "@/lib/toast";
import type { CustomerAllResponse } from "@/types/customer";
import Button from "@/components/ui/app/Button";
import SearchInput from "@/components/ui/app/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";

const PAGE_SIZE = 20;

export default function AdminCustomerSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customer");

  const [customers, setCustomers] = useState<CustomerAllResponse>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [presetCustomer, setPresetCustomer] = useState<
    CustomerAllResponse[number] | null
  >(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const append = page > 1;

    const load = async () => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await customerApi.getAll({
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch,
        });
        if (cancelled) return;
        setCustomers((prev) =>
          append ? [...prev, ...res.results] : res.results,
        );
        setTotalCount(res.count);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        toastError("Failed to load customers");
      } finally {
        if (cancelled) return;
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    };

    const timer = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (!presetCustomerId) return;
    customerApi
      .getOne(Number(presetCustomerId))
      .then(setPresetCustomer)
      .catch(console.error);
  }, [presetCustomerId]);

  const handleSelect = async (customerId: number, agentId: number) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      await createDraftOrder(customerId, agentId);
      router.push(`/admin/order/new/${customerId}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      toastError(
        extractErrorMessage(
          axiosError.response?.data,
          "Failed to create order",
        ),
      );
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const hasMore = customers.length < totalCount;

  return (
    <div className="min-h-screen bg-app-bg pb-32">
      <header className="sticky top-0 z-10 border-b border-app-line/70 bg-app-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin")}
            aria-label="Back to orders"
            className="-ml-2 shrink-0"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold leading-tight text-app-ink">
              Create Order
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
              Step 1: Select Customer
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {presetCustomer && (
          <button
            type="button"
            onClick={() =>
              handleSelect(presetCustomer.id, presetCustomer.agent)
            }
            disabled={creating}
            className="app-focus app-card mb-4 flex w-full items-center gap-3 border-brand-navy/15 bg-brand-navy/5 p-4 text-left transition-all hover:border-brand-navy/30 active:scale-[0.99] disabled:opacity-60"
          >
            <StockflowAvatar user={presetCustomer} />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-brand-navy/60">
                Continue with
              </p>
              <h2 className="truncate text-sm font-bold text-app-ink">
                {presetCustomer.name}
              </h2>
              <p className="truncate text-xs font-medium text-app-muted">
                Agent: {presetCustomer.agent_name || "—"}
              </p>
            </div>
            <ArrowRight
              size={20}
              className="shrink-0 text-brand-navy/50"
              aria-hidden="true"
            />
          </button>
        )}

        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customer..."
            ariaLabel="Search customers"
          />
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading customers">
            {[0, 1, 2, 3].map((index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<User className="size-5" aria-hidden="true" />}
            title="No customers found"
            description="Try a different search, or add a customer from the Users screen."
          />
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <button
                type="button"
                onClick={() => handleSelect(customer.id, customer.agent)}
                key={customer.id}
                disabled={creating}
                className="app-focus app-card group flex w-full items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-navy/20 active:translate-y-0 disabled:opacity-60"
              >
                <StockflowAvatar user={customer} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-app-ink">
                    {customer.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-1">
                    <User
                      size={11}
                      className="shrink-0 text-app-subtle"
                      aria-hidden="true"
                    />
                    <p className="truncate text-xs font-medium leading-tight text-app-muted">
                      Agent: {customer.agent_name || "—"}
                    </p>
                  </div>
                  {customer.address && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <MapPin
                        size={11}
                        className="shrink-0 text-app-subtle"
                        aria-hidden="true"
                      />
                      <p className="truncate text-xs font-medium leading-tight text-app-muted">
                        {customer.address}
                      </p>
                    </div>
                  )}
                </div>
                <ArrowRight
                  size={20}
                  className="shrink-0 text-app-subtle transition-colors group-hover:text-brand-navy/50"
                  aria-hidden="true"
                />
              </button>
            ))}

            {hasMore && (
              <Button
                variant="secondary"
                onClick={() => setPage((current) => current + 1)}
                disabled={loadingMore}
                loading={loadingMore}
                fullWidth
              >
                <Plus size={16} aria-hidden="true" />
                Show more
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
