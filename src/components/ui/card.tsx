import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-bg-elev border border-border rounded-xl shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-fg", className)} {...props} />;
}

/** Compact KPI tile. */
export function StatCard({
  label, value, hint, accent = "default", icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}) {
  const accentBar: Record<string, string> = {
    default: "bg-border",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger:  "bg-danger",
    info:    "bg-info",
  };
  const valueColor: Record<string, string> = {
    default: "text-fg",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger:  "text-danger",
    info:    "text-info",
  };
  const iconBadge: Record<string, string> = {
    default: "bg-bg-muted text-fg-muted",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger:  "bg-danger-soft text-danger",
    info:    "bg-info-soft text-info",
  };
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", accentBar[accent])} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-fg-muted">{label}</span>
          {icon && (
            <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", iconBadge[accent])}>
              {icon}
            </span>
          )}
        </div>
        <p className={cn("text-2xl font-bold tracking-tight tabular-nums", valueColor[accent])}>{value}</p>
        {hint && <p className="text-[11px] text-fg-subtle mt-1">{hint}</p>}
      </div>
    </Card>
  );
}
