import { cn } from "@/lib/cn";

interface SparklineProps {
  data: { label: string; value: number; sub?: number }[];
  height?: number;
  className?: string;
}

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through evenly-spaced points.
 * Unlike a naive Catmull-Rom spline, this never overshoots past a point's
 * neighbors — flat runs stay flat and peaks stay peaks, so the curve never
 * implies a rise/dip that isn't actually in the data.
 */
function monotonePath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return "";
  if (n === 2) {
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;
  }

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / (h[i] || 1));
  }

  const m = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] === 0 || d[i] === 0 || (d[i - 1] > 0) !== (d[i] > 0) ? 0 : (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }

  let path = `M ${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = xs[i] + h[i] / 3;
    const c1y = ys[i] + (m[i] * h[i]) / 3;
    const c2x = xs[i + 1] - h[i] / 3;
    const c2y = ys[i + 1] - (m[i + 1] * h[i]) / 3;
    path += ` C ${c1x},${c1y} ${c2x},${c2y} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return path;
}

/** Smooth gradient-filled line chart for 3-7 day activity trends. */
export function Sparkline({ data, height = 120, className }: SparklineProps) {
  const W = 300;
  const H = height;
  const PAD_Y = 10;
  const hasSub = data.some((d) => d.sub != null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  const toPoints = (key: "value" | "sub"): [number, number][] =>
    data.map((d, i) => {
      const x = data.length > 1 ? i * stepX : W / 2;
      const v = key === "value" ? d.value : d.sub ?? 0;
      const y = H - PAD_Y - (v / max) * (H - PAD_Y * 2);
      return [x, y];
    });

  const points = toPoints("value");
  const subPoints = hasSub ? toPoints("sub") : [];

  const linePath = monotonePath(points);
  const subLinePath = hasSub ? monotonePath(subPoints) : "";
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
        {subLinePath && (
          <path d={subLinePath} fill="none" stroke="hsl(var(--warning))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity="0.85" />
        )}
        {linePath && (
          <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" stroke="hsl(var(--bg-elev))" strokeWidth="1.5">
            <title>{`${data[i].label}: ${data[i].value}${data[i].sub != null ? ` (${data[i].sub} pending)` : ""}`}</title>
          </circle>
        ))}
        {hasSub && subPoints.map(([x, y], i) => (
          <circle key={`sub-${i}`} cx={x} cy={y} r="2" fill="hsl(var(--warning))" stroke="hsl(var(--bg-elev))" strokeWidth="1.25" />
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
