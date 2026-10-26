"use client";

import type { LeaderboardEntry } from "@/types/dashboard";
import { toMeters } from "@/types/item";
import RankedBarList from "@/components/ui/app/RankedBarList";

interface CustomerBarChartProps {
  customers: LeaderboardEntry[];
}

export default function CustomerBarChart({ customers }: CustomerBarChartProps) {
  const totalMetres = customers.reduce(
    (sum, customer) => sum + toMeters(customer.metres),
    0,
  );
  const topThreeMetres = customers
    .slice(0, 3)
    .reduce((sum, customer) => sum + toMeters(customer.metres), 0);
  const topThreePct =
    totalMetres > 0 ? Math.round((topThreeMetres / totalMetres) * 100) : null;

  return (
    <RankedBarList
      title="Top customers"
      items={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        metres: customer.metres,
      }))}
      note={
        topThreePct === null
          ? undefined
          : `Top 3 customers account for ${topThreePct}% of all metres`
      }
    />
  );
}
