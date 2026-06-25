import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:   "bg-primary text-primary-fg hover:bg-primary/90 shadow-sm",
  secondary: "bg-bg-muted text-fg hover:bg-bg-muted/70 border border-border",
  ghost:     "text-fg-muted hover:bg-bg-muted hover:text-fg",
  outline:   "border border-border bg-bg-elev text-fg hover:bg-bg-muted",
  danger:    "bg-danger text-white hover:bg-danger/90 shadow-sm",
  success:   "bg-success text-white hover:bg-success/90 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm:   "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md:   "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg:   "h-11 px-5 text-sm gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-md justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
