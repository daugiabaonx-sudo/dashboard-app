"use client";

// components/dashboard-v2/greeting-typewriter.tsx
// Cycles through a list of words with a typewriter effect. The first word
// is rendered server-side so initial paint is real; the client island
// starts the cycle after mount. Honors `prefers-reduced-motion` by simply
// showing the first word.

import { useEffect, useRef, useState } from "react";

interface GreetingTypewriterProps {
  prefix: string;
  words: string[];
  className?: string;
}

const TYPE_MS = 65;
const DELETE_MS = 35;
const PAUSE_AFTER_MS = 1800;
const PAUSE_BEFORE_MS = 300;
const START_DELAY_MS = 400;
const SESSION_KEY = "sunext_greeted_v1";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function GreetingTypewriter({
  prefix,
  words,
  className,
}: GreetingTypewriterProps) {
  const [typed, setTyped] = useState(words[0] ?? "");
  const reducedMotion = usePrefersReducedMotion();
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || words.length === 0) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(SESSION_KEY)) {
      // already greeted this session — show the last word and stop
      return;
    }

    let wordIdx = 0;
    let charIdx = words[0]?.length ?? 0;
    let deleting = false;
    let stopped = false;

    function schedule(fn: () => void, ms: number) {
      tickRef.current = window.setTimeout(fn, ms);
    }

    function tick() {
      if (stopped) return;
      const word = words[wordIdx];
      if (word === undefined) return;

      if (!deleting) {
        if (charIdx < word.length) {
          charIdx += 1;
          setTyped(word.slice(0, charIdx));
          schedule(tick, TYPE_MS);
        } else {
          // finished typing — if all words are the same, stop with cursor
          const others = words.filter((_, i) => i !== wordIdx);
          if (others.every((w) => w === word)) {
            stopped = true;
            return;
          }
          schedule(() => {
            deleting = true;
            schedule(tick, DELETE_MS);
          }, PAUSE_AFTER_MS);
        }
      } else {
        if (charIdx > 0) {
          charIdx -= 1;
          setTyped(word.slice(0, charIdx));
          schedule(tick, DELETE_MS);
        } else {
          deleting = false;
          wordIdx = (wordIdx + 1) % words.length;
          schedule(tick, PAUSE_BEFORE_MS);
        }
      }
    }

    schedule(tick, START_DELAY_MS);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    }

    return () => {
      stopped = true;
      if (tickRef.current !== null) window.clearTimeout(tickRef.current);
    };
  }, [reducedMotion, words]);

  return (
    <span className={className}>
      {prefix}
      <span className="text-brand" aria-live="polite">
        {typed}
      </span>
      <span className="tw-cursor" aria-hidden="true" />
    </span>
  );
}