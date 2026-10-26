"use client";

import type { TopFabricsEntry } from "@/types/dashboard";
import RankedBarList from "@/components/ui/app/RankedBarList";

interface ItemBarChartProps {
  items: TopFabricsEntry[];
}

export default function ItemBarChart({ items }: ItemBarChartProps) {
  return (
    <RankedBarList
      title="Top fabrics"
      items={items.map((item, index) => ({
        id: `${item.name}-${index}`,
        name: item.name,
        metres: item.metres_ordered,
      }))}
      accent="purple"
    />
  );
}
