"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type { AnalyticsResponse } from "@/types/dashboard";
import RangePresets from "@/components/pages/admin/analytics/RangePresets";
import TrendSparkline from "@/components/pages/admin/analytics/TrendSparkline";
import TimeMetricsRow from "@/components/pages/admin/analytics/TimeMetricsRow";
import StatusDonutChart from "@/components/pages/admin/analytics/StatusDonutChart";
import ValueCards from "@/components/pages/admin/analytics/ValueCards";
import AgentHorizontalBarChart from "@/components/pages/admin/analytics/AgentHorizontalBarChart";
import ItemBarChart from "@/components/pages/admin/analytics/ItemBarChart";
import CustomerBarChart from "@/components/pages/admin/analytics/CustomerBarChart";
import PageHeader from "@/components/ui/app/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/spinner";

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value: string): string {
  const date = parseDate(value);
  if (!date) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRangeLabel(from: string, to: string): string {
  const start = parseDate(from);
  const end = parseDate(to);

  if (!start || !end) return "Selected range";
  if (from === to) return "Today";

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (days === 7) return "Last 7 days";
  if (days === 30) return "Last 30 days";

  return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

function AnalyticsSkeleton() {
  return (
    <div
      className="min-h-screen w-full bg-app-bg pb-12"
      aria-busy="true"
      aria-live="polite"
    >
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:max-w-7xl">
        <div className="pb-4 pt-2">
          <div className="app-skeleton h-8 w-36" />
          <div className="app-skeleton mt-2 h-3 w-24" />
        </div>
        <div className="app-skeleton h-[52px] rounded-full" />
        <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          <div className="app-skeleton h-[212px] rounded-card" />
          <div className="grid grid-cols-2 gap-3">
            <div className="app-skeleton h-[126px] rounded-card" />
            <div className="app-skeleton h-[126px] rounded-card" />
          </div>
          <div className="app-skeleton h-[212px] rounded-card" />
          <div className="app-skeleton h-[158px] rounded-card" />
          <div className="app-skeleton h-[200px] rounded-card" />
        </div>
      </div>
      <span className="sr-only">Loading analytics</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);

  const fetchData = async (fromDate: string, toDate: string) => {
    setFrom(fromDate);
    setTo(toDate);
    setRefetching(true);
    try {
      const result = await dashboardApi.getAnalytics(fromDate, toDate);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialRange = async () => {
      const now = new Date();
      const toDate = now.toISOString().split("T")[0];
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const fromDate = start.toISOString().split("T")[0];

      try {
        const result = await dashboardApi.getAnalytics(fromDate, toDate);
        if (cancelled) return;
        setFrom(fromDate);
        setTo(toDate);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialRange();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="min-h-screen w-full bg-app-bg pb-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:max-w-7xl">
        <PageHeader
          title="Analytics"
          className="pb-4 pt-2"
          subtitle={
            <span className="flex items-center gap-1.5">
              <span className="truncate">{getRangeLabel(from, to)}</span>
              {refetching && (
                <Spinner
                  className="size-3 text-app-muted"
                  aria-label="Updating analytics"
                />
              )}
            </span>
          }
        />

        <RangePresets onRangeChange={fetchData} />

        <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          {data ? (
            <>
              <StatusDonutChart kpis={data.kpis} />
              <ValueCards kpis={data.kpis} />
              <TrendSparkline data={data.trend} from={from} to={to} />
              <TimeMetricsRow metrics={data.time_metrics} />
              <CustomerBarChart customers={data.top_customers} />
              <AgentHorizontalBarChart agents={data.top_agents} />
              <ItemBarChart items={data.top_fabrics} />
            </>
          ) : (
            <EmptyState
              title="No data yet"
              description="Choose another date range."
            />
          )}
        </div>
      </div>
    </div>
  );
}
