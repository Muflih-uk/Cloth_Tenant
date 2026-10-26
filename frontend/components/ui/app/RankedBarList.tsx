import { toMeters } from "@/types/item";
import { formatDisplayName } from "@/lib/displayName";

import Card from "./Card";

export interface RankedBarItem {
  id?: number | string;
  name: string;
  metres: string | number;
}

interface RankedBarListProps {
  title: string;
  items: RankedBarItem[];
  accent?: "blue" | "purple";
  note?: string;
  emptyLabel?: string;
}

function formatMetres(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
}

export default function RankedBarList({
  title,
  items,
  accent = "blue",
  note,
  emptyLabel = "No data yet",
}: RankedBarListProps) {
  const entries = items.map((item, index) => ({
    ...item,
    key: item.id ?? `${item.name}-${index}`,
    metres: toMeters(item.metres),
  }));

  const total = entries.reduce((sum, item) => sum + item.metres, 0);
  const barClass =
    accent === "purple" ? "bg-brand-purple" : "bg-brand-blue";

  return (
    <Card title={title}>
      {entries.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center rounded-control bg-app-soft px-4 text-center">
          <p className="text-xs font-medium text-app-muted">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {entries.map((item) => {
            const share = total > 0 ? (item.metres / total) * 100 : 0;

            return (
              <li key={item.key}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] font-medium text-app-ink">
                    {formatDisplayName(item.name)}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-app-muted">
                    {formatMetres(item.metres)} m
                    <span className="text-app-subtle">
                      {" "}
                      · {Math.round(share)}%
                    </span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-app-soft"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${barClass} transition-[width] duration-500`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {note && (
        <p className="mt-4 border-t border-app-line pt-3 text-[11px] font-normal leading-snug text-app-muted">
          {note}
        </p>
      )}
    </Card>
  );
}
