"use client";

import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomerAllResponse } from "@/types/customer";
import { customerApi } from "@/lib/api/customer";
import { PaginatedResponse } from "@/types/global";
import Button from "@/components/ui/app/Button";
import ListRow from "@/components/ui/app/ListRow";
import SearchInput from "@/components/ui/app/SearchInput";
import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { SkeletonRow } from "@/components/ui/app/Skeleton";
import { formatDisplayName } from "@/lib/displayName";
import { formatApiError } from "@/lib/toast";

const CustomerList: React.FC = () => {
  const { isAuthenticated, business, role } = useAuth();
  const canWriteCustomers = role === "ADMIN";

  const [data, setData] = useState<CustomerAllResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const router = useRouter();

  useEffect(() => {
    if (search === debouncedSearch) return;

    const timer = setTimeout(() => {
      setLoading(true);
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedSearch, search]);

  useEffect(() => {
    let cancelled = false;

    customerApi
      .getAll({
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearch,
      })
      .then((response: PaginatedResponse<CustomerAllResponse[number]>) => {
        if (cancelled) return;
        setData(response.results);
        setTotalCount(response.count);
        setTotalPages(Math.ceil(response.count / pageSize));
        setError("");
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error(fetchError);
        setError(formatApiError(fetchError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentPage, pageSize, debouncedSearch, reloadKey]);

  const handlePageChange = (page: number) => {
    setLoading(true);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setLoading(true);
    setPageSize(size);
    setCurrentPage(1);
  };

  const businessCustomers = business
    ? data.filter((customer) => customer.has_business_orders === true)
    : data;
  const otherCustomers = business
    ? data.filter((customer) => customer.has_business_orders !== true)
    : [];

  const renderSection = (
    customers: typeof data,
    header: string,
    count: number,
  ) => {
    if (customers.length === 0) return null;

    return (
      <section className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xs font-semibold text-app-muted">{header}</h2>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-brand-navy/15 bg-brand-navy/5 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
            {count}
          </span>
        </div>

        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
          {customers.map((customer) => (
            <ListRow
              key={customer.id}
              href={`/admin/users/customers/${customer.id}/`}
              leading={<StockflowAvatar user={customer} />}
              title={formatDisplayName(customer.name)}
              subtitle={customer.address || "No address provided"}
              meta={
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-app-muted">
                  <span className="rounded-full bg-app-soft px-2 py-0.5">
                    {customer.agent_name || "Admin"}
                  </span>
                  <span>Agent</span>
                </span>
              }
            />
          ))}
        </div>
      </section>
    );
  };

  const searchBar = (
    <SearchInput
      value={search}
      onChange={setSearch}
      isLoading={loading}
      placeholder="Search customers..."
      ariaLabel="Search customers"
      className="mb-4"
    />
  );

  const addCustomerButton = canWriteCustomers ? (
    <Button
      onClick={() => router.push("/admin/users/customers/new")}
      className="shrink-0"
    >
      <Plus className="size-4" aria-hidden="true" />
      Add customer
    </Button>
  ) : null;

  if (error) {
    return (
      <EmptyState
        title="Could not load customers"
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

  if (!business) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="app-section-title">Customers</h2>
            <p className="app-secondary mt-1">
              {totalCount} {totalCount === 1 ? "customer" : "customers"}
            </p>
          </div>
          {addCustomerButton}
        </div>

        {searchBar}

        {loading ? (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0" aria-busy="true" aria-live="polite">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </div>
        ) : totalCount === 0 && !debouncedSearch ? (
          <EmptyState
            title="No customers yet"
            description={
              canWriteCustomers
                ? "Add your first customer to start taking orders."
                : "No customers have been added yet."
            }
            action={
              canWriteCustomers ? (
                <Button
                  onClick={() => router.push("/admin/users/customers/new")}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add customer
                </Button>
              ) : undefined
            }
          />
        ) : data.length === 0 ? (
          <EmptyState
            title="No matching customers"
            description="Try a different name, phone number, or address."
          />
        ) : (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
            {data.map((item) => (
              <ListRow
                key={item.id}
                href={`/admin/users/customers/${item.id}/`}
                leading={<StockflowAvatar user={item} />}
                title={formatDisplayName(item.name)}
                subtitle={item.address || "No address provided"}
                meta={
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-app-muted">
                    <span className="rounded-full bg-app-soft px-2 py-0.5">
                      {item.agent_name || "Admin"}
                    </span>
                    <span>Agent</span>
                  </span>
                }
              />
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="app-section-title">Customers</h2>
          <p className="app-secondary mt-1">
            {totalCount} {totalCount === 1 ? "customer" : "customers"}
          </p>
        </div>
        {addCustomerButton}
      </div>

      {searchBar}

      {loading ? (
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      ) : (
        <>
          {renderSection(
            businessCustomers,
            "Our customers",
            businessCustomers.length,
          )}
          {renderSection(otherCustomers, "Other customers", otherCustomers.length)}
          {businessCustomers.length === 0 && otherCustomers.length === 0 && (
            <EmptyState
              title="No matching customers"
              description={
                canWriteCustomers
                  ? "Try a different search or add a new customer."
                  : "Try a different search."
              }
            />
          )}
        </>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </>
  );
};

export default CustomerList;
