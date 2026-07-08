import { cn } from "@/lib/cn";

interface SparklineProps {
  data: { label: string; value: number; sub?: number }[];
  height?: number;
  className?: string;
}

/** Build a smooth cubic-bezier path through points (Catmull-Rom style tangents). */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;
  }
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Smooth gradient-filled line chart for 3-7 day activity trends. */
export function Sparkline({ data, height = 120, className }: SparklineProps) {
  const W = 300;
  const H = height;
  const PAD_Y = 10;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  const points: [number, number][] = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : W / 2;
    const y = H - PAD_Y - (d.value / max) * (H - PAD_Y * 2);
    return [x, y];
  });

  const linePath = smoothPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1][0]},${H} L ${points[0][0]},${H} Z`
    : "";

  const gradientId = "sparkline-fill";

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" stroke="hsl(var(--bg-elev))" strokeWidth="1.5">
            <title>{`${data[i].label}: ${data[i].value}${data[i].sub != null ? ` (${data[i].sub} pending)` : ""}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-end gap-1.5 mt-1">
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
