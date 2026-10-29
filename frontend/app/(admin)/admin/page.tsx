"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import Button from "@/components/ui/app/Button";
import PageHeader from "@/components/ui/app/PageHeader";
import SegmentedControl from "@/components/ui/app/SegmentedControl";
import FilterBar from "@/components/ui/FilterBar";
import FilterToggle from "@/components/ui/FilterToggle";
import SearchBar from "@/components/ui/SearchBar";
import { SkeletonCard } from "@/components/ui/app/Skeleton";
import { OrderFilters } from "@/components/pages/admin/order_components/types";
import {
  fetchViewedOrderIds,
  getViewedOrdersCount,
} from "@/lib/viewedOrders";
import useSessionStorage from "@/hooks/useSessionStorage";
import { useRealtimeRefresh } from "@/hooks/useRealtime";
import OrderList from "@/components/pages/admin/order_components/OrderList";
import { agentApi } from "@/lib/api/agents";
import { orderApi } from "@/lib/api/order";

type Tab = "All" | "Packed" | "Pending" | "Dispatched";

interface SimpleAgent {
  id: number;
  username: string;
}

function AdminHomePageContent() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      return (
        (sessionStorage.getItem("adminOrdersActiveTab") as Tab) || "Pending"
      );
    }
    return "Pending";
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("adminOrdersActiveTab", tab);
    setTabPages((prev) => ({ ...prev, [tab]: 1 }));
    setCurrentPage(tabPages[tab] || 1);
    sessionStorage.removeItem(`admin_${tab}_scrollY`);
  };

  const [filters, setFilters] = useSessionStorage<OrderFilters>(
    "admin_filters",
    {},
  );
  const [agents, setAgents] = useState<SimpleAgent[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useSessionStorage("admin_search", "");
  const [showUnreadOnly, setShowUnreadOnly] = useSessionStorage(
    "admin_showUnreadOnly",
    false,
  );
  const [allOrderIds, setAllOrderIds] = useState<number[]>([]);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);
  const [packedOrderIds, setPackedOrderIds] = useState<number[]>([]);
  const [activeTabTotalCount, setActiveTabTotalCount] = useState(0);
  const [viewedOrderIds, setViewedOrderIds] = useState<Set<number>>(
    new Set(),
  );

  const refreshOrderIds = useCallback(async () => {
    const orderIds = await orderApi.getAllIds();
    const nonDispatched = orderIds.filter(
      (order) => order.status !== "DISPATCHED",
    );
    setAllOrderIds(nonDispatched.map((order) => order.id));
    setPendingOrderIds(
      orderIds
        .filter((order) => order.status === "PENDING")
        .map((order) => order.id),
    );
    setPackedOrderIds(
      orderIds
        .filter((order) => order.status === "PACKED")
        .map((order) => order.id),
    );
  }, []);

  const refreshKey = useRealtimeRefresh(refreshOrderIds);

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    agentApi
      .getAll()
      .then((agents) => {
        setAgents(
          agents.map((agent) => ({
            id: agent.id,
            username: agent.user.username,
          })),
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshOrderIds().catch(console.error);
  }, [refreshOrderIds]);

  const orderCounts: Record<string, number> = {
    all: getViewedOrdersCount(allOrderIds, viewedOrderIds),
    pending: getViewedOrdersCount(pendingOrderIds, viewedOrderIds),
    packed: getViewedOrdersCount(packedOrderIds, viewedOrderIds),
    dispatched: 0,
  };

  useEffect(() => {
    fetchViewedOrderIds().then(setViewedOrderIds).catch(console.error);
  }, []);

  useEffect(() => {
    const customerId = searchParams.get("customer");
    const agentId = searchParams.get("agent");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const newFilters: OrderFilters = {};
    if (customerId) newFilters.customer = customerId;
    if (agentId) newFilters.agent = agentId;
    if (from) newFilters.from = from;
    if (to) newFilters.to = to;

    if (Object.keys(newFilters).length > 0) {
      setFilters(newFilters);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFilters(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleFromDateChange = (date: string) => {
    setFilters((prev) => ({ ...prev, from: date || undefined }));
  };

  const handleToDateChange = (date: string) => {
    setFilters((prev) => ({ ...prev, to: date || undefined }));
  };

  const handleAgentChange = (agentId: string) => {
    setFilters((prev) => ({
      ...prev,
      agent: agentId === "all" ? undefined : agentId,
    }));
  };

  const handleCustomerChange = (customerId: string) => {
    setFilters((prev) => ({
      ...prev,
      customer: customerId === "all" ? undefined : customerId,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch("");
    setShowFilters(false);
  };

  const handleToggleFilters = () => {
    if (showFilters) {
      handleClearFilters();
    } else {
      setShowFilters(true);
    }
  };

  const [tabPages, setTabPages] = useState<Record<string, number>>({});

  const handleTabPageChange = (tab: string, page: number) => {
    setTabPages((prev) => ({ ...prev, [tab]: page }));
    setCurrentPage(page || 1);
  };

  const renderContent = (): React.ReactNode => {
    const commonProps = {
      filters,
      search: debouncedSearch,
      showUnreadOnly,
      refreshKey,
      onTotalCountChange: setActiveTabTotalCount,
      onPageChange: (page: number) => handleTabPageChange(activeTab, page),
    };

    const statusMap: Record<
      Tab,
      "ALL" | "PENDING" | "PACKED" | "DISPATCHED"
    > = {
      All: "ALL",
      Pending: "PENDING",
      Packed: "PACKED",
      Dispatched: "DISPATCHED",
    };

    return <OrderList status={statusMap[activeTab]} {...commonProps} />;
  };

  const orderTabs: Tab[] = ["All", "Pending", "Packed", "Dispatched"];

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-2 lg:max-w-7xl lg:px-6">
      <PageHeader
        title="Orders"
        subtitle="Track packing and dispatch across every order."
        className="mb-4"
      />

      <SegmentedControl
        options={orderTabs.map((tab) => {
          const count = orderCounts[tab.toLowerCase()] ?? 0;
          return {
            value: tab,
            label: tab,
            count: count > 0 ? count : undefined,
          };
        })}
        value={activeTab}
        onChange={handleTabChange}
        ariaLabel="Order status"
        className="mb-4"
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="app-section-title">
            {activeTab}
            {showUnreadOnly ? " unread" : ""} orders
          </h2>
          <p className="app-secondary mt-1">
            {activeTabTotalCount}{" "}
            {activeTabTotalCount === 1 ? "order" : "orders"}
          </p>
        </div>

        <Button
          variant={showUnreadOnly ? "primary" : "secondary"}
          onClick={() => setShowUnreadOnly((value) => !value)}
          aria-pressed={showUnreadOnly}
          className="shrink-0"
        >
          Unread only
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchBar
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder="Search by customer, agent, or order ID..."
          />
        </div>
        <FilterToggle isOpen={showFilters} onToggle={handleToggleFilters} />
      </div>

      <div className="mb-4">
        <FilterBar
          fromDate={filters.from || ""}
          toDate={filters.to || ""}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          agents={agents}
          selectedAgent={filters.agent || "all"}
          onAgentChange={handleAgentChange}
          selectedCustomer={filters.customer || "all"}
          onCustomerChange={handleCustomerChange}
          isOpen={showFilters}
          onClear={handleClearFilters}
        />

        {currentPage > 1 && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="app-secondary">Viewing page {currentPage}</p>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setCurrentPage(1);
                setTabPages({});
                orderTabs.forEach((tab) =>
                  sessionStorage.removeItem(`admin_${tab}_scrollY`),
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Reset to page 1
            </Button>
          </div>
        )}
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen w-full max-w-2xl space-y-3 px-2 pb-32 pt-4 lg:max-w-7xl lg:px-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      }
    >
      <AdminHomePageContent />
    </Suspense>
  );
}
