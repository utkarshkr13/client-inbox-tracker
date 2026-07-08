"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting from its previous displayed value to `value`
 * whenever `value` changes — including the very first render (counts up
 * from 0 on mount) and again whenever `value` changes later, e.g. switching
 * the dashboard's 7d/30d/90d chart tabs re-animates to the new total
 * instead of freezing on whatever the first value happened to be.
 * Falls back to the plain final value instantly under reduced-motion.
 */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let finished = false;

    if (reduceMotion) {
      raf = requestAnimationFrame(() => {
        setDisplay(value);
        currentRef.current = value;
        finished = true;
      });
    } else {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = Math.round(from + (value - from) * eased);
        setDisplay(next);
        currentRef.current = next;
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          finished = true;
        }
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      // If value changes again mid-animation (e.g. rapid tab switching),
      // resume the next run from wherever this one visually landed rather
      // than jumping back to its original starting point.
      fromRef.current = finished ? value : currentRef.current;
    };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}
