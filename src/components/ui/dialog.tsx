"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
};

/**
 * Accessible modal built on the native <dialog> element so we get
 * focus trap, ESC-to-close, and ARIA roles for free — no portal needed.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Close on backdrop click (target === dialog element itself)
  const onClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onClick}
      className={cn(
        "p-0 m-auto bg-transparent backdrop:bg-black/40 backdrop:backdrop-blur-sm",
        "rounded-xl w-full",
        sizeMap[size],
      )}
    >
      <div className="bg-bg-elev border border-border rounded-xl shadow-lg overflow-hidden">
        {(title || description) && (
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-start justify-between gap-3">
            <div>
              {title && <h2 className="text-sm font-semibold text-fg">{title}</h2>}
              {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-fg-subtle hover:text-fg p-1 -m-1 rounded-md hover:bg-bg-muted"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 bg-bg-muted/50 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
