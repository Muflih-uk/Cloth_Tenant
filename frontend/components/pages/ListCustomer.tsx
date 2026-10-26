"use client";

import { customerApi } from "@/lib/api/customer";
import { CustomerAllResponse } from "@/types/customer";
import { ArrowRight, MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createDraftOrder } from "@/lib/draftOrder";
import { extractErrorMessage } from "@/lib/orderFlow";
import { toastError } from "@/lib/toast";
import Pagination from "../ui/Pagination";
import { PaginatedResponse } from "@/types/global";
import StockflowAvatar from "../ui/custom/stockflowAvatar";
import SearchInput from "../ui/app/SearchInput";
import EmptyState from "../ui/EmptyState";
import { SkeletonCard } from "../ui/app/Skeleton";

const CACHE_KEY = "customers_cache";
const CACHE_META_KEY = "customers_cache_meta";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheMeta {
  lastSync: number; // timestamp
  totalCount: number;
}

function readCache(): CustomerAllResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const meta: CacheMeta | null = JSON.parse(
      localStorage.getItem(CACHE_META_KEY) || "null",
    );
    if (!raw || !meta) return null;
    if (Date.now() - meta.lastSync > CACHE_TTL_MS) return null; // expired
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(data: CustomerAllResponse, totalCount: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({ lastSync: Date.now(), totalCount } satisfies CacheMeta),
    );
  } catch {
    // localStorage full — silently skip caching
  }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_META_KEY);
}

const ListCustomer: React.FC = () => {
  const [data, setData] = useState<CustomerAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const router = useRouter();
  const hasMounted = useRef(false);
  // Stops a double tap on a customer from creating two drafts.
  const creatingRef = useRef(false);

  const fetchCustomers = async (opts: {
    page: number;
    search: string;
    background?: boolean;
  }) => {
    if (!opts.background) setLoading(true);

    try {
      const response: PaginatedResponse<CustomerAllResponse[number]> =
        await customerApi.getAll({
          page: opts.page,
          page_size: pageSize,
          search: opts.search,
        });

      setData(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / pageSize));
      setLastSync(new Date());

      // Only cache page 1 with no search — that's the "default" view
      if (opts.page === 1 && !opts.search) {
        writeCache(response.results, response.count);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!opts.background) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    fetchCustomers({ page: currentPage, search: debouncedSearch });
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(cached);
      const meta: CacheMeta | null = JSON.parse(
        localStorage.getItem(CACHE_META_KEY) || "null",
      );
      if (meta) {
        setTotalCount(meta.totalCount);
        setTotalPages(Math.ceil(meta.totalCount / pageSize));
        setLastSync(new Date(meta.lastSync));
      }
      setLoading(false);
      fetchCustomers({ page: 1, search: "", background: true });
    } else {
      fetchCustomers({ page: 1, search: "" });
    }
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSubmit = async (id: number) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      setLoading(true);
      // Create first, navigate second. The wizard reads the active order id from
      // storage the moment it mounts, so pushing the route before the order
      // existed made it load whatever order the last session had left behind --
      // which is how an agent ended up editing and emptying a placed order.
      await createDraftOrder(id);
      clearCache(); // order created — customer data may change, bust cache
      router.push(`/agent/order/new/${id}`);
    } catch (e) {
      toastError(extractErrorMessage(
        (e as { response?: { data?: unknown } })?.response?.data,
        "Error creating order. Please try again.",
      ));
      setLoading(false);
    } finally {
      creatingRef.current = false;
    }
  };

  return (
    <div className="px-4 py-4 sm:py-6">
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer..."
          ariaLabel="Search customers"
        />
      </div>

      {lastSync && (
        <p className="mb-3 px-1 text-[10px] font-medium text-app-muted">
          Last synced {lastSync.toLocaleTimeString()}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading customers">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<User className="size-5" aria-hidden="true" />}
          title="No customers found"
          description="Try a different search to find the customer you need."
        />
      ) : (
        <div className="space-y-3">
          {data.map((customer) => (
            <button
              type="button"
              onClick={() => handleSubmit(customer.id)}
              key={customer.id}
              className="app-focus app-card group flex w-full items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-navy/20 active:translate-y-0"
            >
              <StockflowAvatar user={customer} />

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-app-ink">
                  {customer.name}
                </h2>
                {customer.address && (
                  <div className="mt-1 flex items-center gap-1">
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default ListCustomer;
