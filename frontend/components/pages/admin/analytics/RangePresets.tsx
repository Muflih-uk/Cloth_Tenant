"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/date-picker";
import Button from "@/components/ui/app/Button";
import SegmentedControl from "@/components/ui/app/SegmentedControl";

interface RangePresetsProps {
  onRangeChange: (from: string, to: string) => void;
}

type Preset = "today" | "7d" | "30d" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "custom", label: "Custom" },
];

export default function RangePresets({ onRangeChange }: RangePresetsProps) {
  const [activePreset, setActivePreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset);
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from = to;

    if (preset === "today") {
      from = to;
    } else if (preset === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
    } else if (preset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      from = d.toISOString().split("T")[0];
    } else {
      return;
    }

    onRangeChange(from, to);
  };

  const handleClear = () => {
    setCustomFrom("");
    setCustomTo("");
  };

  const handleCustomApply = () => {
    if (!customFrom && !customTo) return;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    const finalFrom = customFrom || threeMonthsAgoStr;
    const finalTo = customTo || todayStr;

    onRangeChange(finalFrom, finalTo);
  };

  const hasCustomDates = Boolean(customFrom || customTo);

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-app-bg/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <SegmentedControl
        options={PRESETS}
        value={activePreset}
        onChange={(preset) => {
          if (preset === "custom") {
            setActivePreset(preset);
          } else {
            applyPreset(preset);
          }
        }}
        ariaLabel="Analytics date range"
      />

      {activePreset === "custom" && (
        <div className="mt-2 rounded-card border border-app-line bg-app-card p-3 shadow-card">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 [&_button]:h-11 [&_button]:rounded-control [&_button]:text-xs">
              <DatePicker
                value={customFrom}
                onChange={setCustomFrom}
                placeholder="From"
              />
            </div>
            <span className="shrink-0 text-[11px] font-medium text-app-muted">
              to
            </span>
            <div className="min-w-0 flex-1 [&_button]:h-11 [&_button]:rounded-control [&_button]:text-xs">
              <DatePicker
                value={customTo}
                onChange={setCustomTo}
                placeholder="To"
              />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              onClick={handleCustomApply}
              disabled={!hasCustomDates}
              className="h-11 flex-1 text-xs"
            >
              Apply range
            </Button>
            <Button
              variant="secondary"
              onClick={handleClear}
              disabled={!hasCustomDates}
              className="h-11 flex-1 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
