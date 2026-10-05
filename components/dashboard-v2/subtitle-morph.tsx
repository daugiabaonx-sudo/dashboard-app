"use client";

// components/dashboard-v2/subtitle-morph.tsx
// Cycles through a list of subtitle lines, scrambling each non-special
// character to a random printable ASCII char before settling on the real
// one. Space and emoji characters snap in immediately. Server-renders the
// first line as static text so the first paint is real.

import { useEffect, useRef, useState } from "react";

interface SubtitleMorphProps {
  lines: string[];
  holdMs?: number;
  scrambleMs?: number;
  className?: string;
}

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

function isSpecial(ch: string): boolean {
  if (ch === " ") return true;
  // Non-ASCII characters (emoji, Vietnamese diacritics) skip the scramble.
  const cp = ch.codePointAt(0);
  return cp !== undefined && cp > 127;
}

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

interface CharCell {
  ch: string;
  state: "settled" | "scrambling";
}

export function SubtitleMorph({
  lines,
  holdMs = 2500,
  scrambleMs = 480,
  className,
}: SubtitleMorphProps) {
  const initialLine = lines[0] ?? "";
  const [cells, setCells] = useState<CharCell[]>(() =>
    [...initialLine].map((ch) => ({ ch, state: "settled" })),
  );
  const reducedMotion = usePrefersReducedMotion();
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const linesRef = useRef(lines);
  const idxRef = useRef(0);
  const charsRef = useRef(SCRAMBLE_CHARS);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    if (reducedMotion || lines.length < 2) return;

    let cancelled = false;

    function randChar(): string {
      const c = charsRef.current;
      return c[Math.floor(Math.random() * c.length)];
    }

    function morphTo(targetText: string) {
      if (cancelled) return;
      const target = [...targetText];
      const total = scrambleMs;
      const start = performance.now();
      // Stagger each non-special character's settle time so the line
      // appears to type from left to right with a tail of scramble.
      const settleAt = target.map((ch, i) =>
        isSpecial(ch) ? 0 : (i / Math.max(1, target.length)) * total * 0.85,
      );

      function frame(now: number) {
        if (cancelled) return;
        const elapsed = now - start;
        const next: CharCell[] = target.map((ch, i) => {
          if (isSpecial(ch)) {
            return { ch, state: "settled" };
          }
          if (elapsed >= settleAt[i]) {
            return { ch, state: "settled" };
          }
          return { ch: randChar(), state: "scrambling" };
        });
        setCells(next);

        if (elapsed < total) {
          frameRef.current = window.requestAnimationFrame(frame);
        } else {
          // All settled — schedule next morph.
          timerRef.current = window.setTimeout(() => {
            idxRef.current = (idxRef.current + 1) % linesRef.current.length;
            morphTo(linesRef.current[idxRef.current] ?? "");
          }, holdMs);
        }
      }

      frameRef.current = window.requestAnimationFrame(frame);
    }

    timerRef.current = window.setTimeout(() => {
      idxRef.current = 1 % linesRef.current.length;
      morphTo(linesRef.current[idxRef.current] ?? "");
    }, holdMs);

    return () => {
      cancelled = true;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [reducedMotion, lines.length, holdMs, scrambleMs]);

  return (
    <span className={className} aria-live="polite">
      {cells.map((cell, i) => (
        <span
          key={i}
          className={cell.state === "scrambling" ? "cm-char cm-scrambling" : "cm-char cm-settled"}
        >
          {cell.ch}
        </span>
      ))}
    </span>
  );
}