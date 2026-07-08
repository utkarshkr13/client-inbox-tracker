import * as React from "react";
import { cn } from "@/lib/cn";

type Tone =
  | "neutral" | "primary" | "success" | "warning" | "danger" | "info"
  | "tier-ba" | "tier-l2";

const toneMap: Record<Tone, string> = {
  neutral:  "bg-bg-muted text-fg-muted border-border",
  primary:  "bg-primary-soft text-primary border-primary/20",
  success:  "bg-success-soft text-success border-success/20",
  warning:  "bg-warning-soft text-warning border-warning/20",
  danger:   "bg-danger-soft text-danger border-danger/20",
  info:     "bg-info-soft text-info border-info/20",
  "tier-ba": "bg-tier-ba-soft text-tier-ba border-tier-ba/20",
  "tier-l2": "bg-tier-l2-soft text-tier-l2 border-tier-l2/20",
};

export function Badge({
  tone = "neutral", className, children, dot, ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium",
        "rounded-md border whitespace-nowrap",
        toneMap[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", `bg-current`)} />}
      {children}
    </span>
  );
}

/** Status pill (pending / done / dismissed / escalated). */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    pending:   { tone: "warning",  label: "Pending"   },
    done:      { tone: "success",  label: "Resolved"  },
    dismissed: { tone: "neutral",  label: "Dismissed" },
    escalated: { tone: "danger",   label: "Escalated" },
  };
  const cfg = map[status] ?? { tone: "neutral" as Tone, label: status };
  return <Badge tone={cfg.tone} dot>{cfg.label}</Badge>;
}

/** Routing pill (BA / L2). */
export function TierBadge({ tier }: { tier?: string }) {
  return tier === "l2"
    ? <Badge tone="tier-l2">L2</Badge>
    : <Badge tone="tier-ba">BA</Badge>;
}
