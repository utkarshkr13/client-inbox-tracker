"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, ListChecks, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard",           label: "Projects",  icon: LayoutGrid },
  { href: "/dashboard/digest",    label: "Digest",    icon: ListChecks },
  { href: "/dashboard/search",    label: "Search",    icon: Search },
  { href: "/dashboard/analytics", label: "Stats",     icon: BarChart3 },
  { href: "/dashboard/settings",  label: "Settings",  icon: Settings },
];

export function MobileNav({ urgentCount = 0 }: { urgentCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-elev/90 backdrop-blur-md border-t border-border">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
          const showBadge = it.href === "/dashboard/digest" && urgentCount > 0;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium relative",
                  active ? "text-primary" : "text-fg-subtle",
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{it.label}</span>
                {showBadge && (
                  <span className="absolute top-1.5 right-1/4 w-1.5 h-1.5 rounded-full bg-danger" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
