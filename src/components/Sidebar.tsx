"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutGrid, Search, BarChart3, ListChecks, FileText, Settings, Mail } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard",            label: "Projects",  icon: LayoutGrid },
  { href: "/dashboard/digest",     label: "Digest",    icon: ListChecks, badgeKey: "urgent" as const },
  { href: "/dashboard/search",     label: "Search",    icon: Search },
  { href: "/dashboard/analytics",  label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/templates",  label: "Templates", icon: FileText },
  { href: "/dashboard/settings",   label: "Settings",  icon: Settings },
];

export function Sidebar({ urgentCount = 0 }: { urgentCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-bg-elev sticky top-0 h-screen">
      <Link href="/dashboard" className="px-4 py-4 flex items-center gap-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Mail className="w-4 h-4 text-primary-fg" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">Inbox Tracker</p>
          <p className="text-[10px] text-fg-subtle">Client escalation portal</p>
        </div>
      </Link>

      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const showBadge = item.badgeKey === "urgent" && urgentCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-fg-muted hover:bg-bg-muted hover:text-fg",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="text-[10px] font-bold bg-danger text-white px-1.5 rounded-full min-w-[18px] text-center leading-tight py-0.5">
                  {urgentCount > 99 ? "99+" : urgentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border text-[10px] text-fg-subtle flex items-center gap-1.5">
        <Inbox className="w-3 h-3" />
        <span>Developed by Utkarsh Rajput</span>
      </div>
    </aside>
  );
}
