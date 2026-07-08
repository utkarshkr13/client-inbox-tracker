"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` on mount. Purely
 * cosmetic — falls back to the plain final value instantly if the user
 * has requested reduced motion.
 */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    if (reduceMotion || value === 0) {
      // Defer to a rAF tick rather than setting state synchronously in the
      // effect body — avoids the cascading-render footgun while still
      // landing the final value on the very next frame (imperceptible).
      raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString()}</>;
}
