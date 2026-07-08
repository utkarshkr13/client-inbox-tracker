import { cn } from "@/lib/cn";

interface SparklineProps {
  data: { label: string; value: number; sub?: number }[];
  height?: number;
  className?: string;
}

/** Compact 3-7 day activity bars. `sub` renders as a stacked overlay (e.g. pending share). */
export function Sparkline({ data, height = 56, className }: SparklineProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => {
          const h = Math.max((d.value / max) * height, d.value > 0 ? 4 : 2);
          const subH = d.sub && d.value > 0 ? (d.sub / d.value) * 100 : 0;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height }}>
                <div
                  className="w-full rounded-md bg-primary/15 relative overflow-hidden transition-all"
                  style={{ height: `${h}px` }}
                  title={`${d.label}: ${d.value}${d.sub != null ? ` (${d.sub} pending)` : ""}`}
                >
                  {subH > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-warning/70"
                      style={{ height: `${subH}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-1.5 mt-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center">
            <p className="text-[10px] text-fg-subtle">{d.label}</p>
            <p className="text-xs font-semibold text-fg tabular-nums">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
