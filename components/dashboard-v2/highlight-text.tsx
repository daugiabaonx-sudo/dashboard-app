"use client";

// components/dashboard-v2/highlight-text.tsx
// Wraps children in <mark class="highlight-text"> and re-triggers the
// brush animation when scrolled into view via IntersectionObserver. The
// initial entrance animation is fired by the keyframes themselves on
// first paint; this component only handles replay on re-entry.

import { useEffect, useRef, type ReactNode } from "react";

interface HighlightTextProps {
  children: ReactNode;
  threshold?: number;
}

export function HighlightText({ children, threshold = 0.5 }: HighlightTextProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.classList.add("hl-replay");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove("hl-replay");
            // Force a reflow so the animation can restart even when the
            // element was already in view on first paint.
            void el.offsetWidth;
            el.classList.add("hl-replay");
          }
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <mark ref={ref as React.Ref<HTMLElement>} className="highlight-text">
      {children}
    </mark>
  );
}