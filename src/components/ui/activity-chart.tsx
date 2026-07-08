"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Sparkline } from "./sparkline";
import { CountUp } from "./count-up";

type Bucket = { label: string; value: number; sub: number };
type RangeKey = "7d" | "30d" | "90d";

export function ActivityChart({
  ranges,
  totalPending,
}: {
  ranges: Record<RangeKey, { buckets: Bucket[]; total: number; hasActivity: boolean; emptyLabel: string }>;
  totalPending: number;
}) {
  const [range, setRange] = useState<RangeKey>("7d");
  const active = ranges[range];
  const rangeLabel: Record<RangeKey, string> = { "7d": "7-day", "30d": "30-day", "90d": "90-day" };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-fg-muted">{rangeLabel[range]} activity</p>
          <p className="text-2xl font-bold text-fg tabular-nums"><CountUp value={active.total} /></p>
          <p className="text-[11px] text-fg-subtle">emails received</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-0.5 bg-bg-muted rounded-lg p-0.5">
            {(["7d", "30d", "90d"] as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
                  range === r ? "bg-bg-elev text-fg shadow-sm" : "text-fg-subtle hover:text-fg-muted"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-fg-subtle flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Total</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Pending</span>
          </div>
        </div>
      </div>
      {active.hasActivity ? (
        <div className="flex-1 flex items-end">
          <Sparkline data={active.buckets} height={132} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1 py-6">
          <p className="text-xs text-fg-subtle">{active.emptyLabel}</p>
          {totalPending > 0 && (
            <p className="text-[11px] text-fg-subtle">The {totalPending} pending backlog is older — see it below</p>
          )}
        </div>
      )}
    </div>
  );
}
