"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const opts: { value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }[] = [
    { value: "light",  icon: <Sun className="w-3.5 h-3.5" />,    label: "Light"  },
    { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
    { value: "dark",   icon: <Moon className="w-3.5 h-3.5" />,   label: "Dark"   },
  ];
  return (
    <div className="inline-flex bg-bg-muted rounded-lg p-0.5 border border-border" role="radiogroup" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
            theme === o.value ? "bg-bg-elev text-fg shadow-sm" : "text-fg-subtle hover:text-fg",
          )}
          title={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
