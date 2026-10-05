// components/dashboard-v2/shutter-text.tsx
// Server-renderable: splits the input text into per-character spans, each
// with a `.sc-inner` (the visible char) and a `.sc-shutter` (the gradient
// overlay that wipes away). CSS handles all the animation. Stagger the
// animation-delay inline so characters reveal left-to-right with a small
// cascade.

import { type ReactNode } from "react";

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

interface ShutterTextProps {
  text: string;
  className?: string;
  stepMs?: number;
  baseDelayMs?: number;
}

function nextIsEmoji(text: string, idx: number): boolean {
  // Match a single emoji code-point if the slice at idx starts with one.
  const slice = text.slice(idx);
  return EMOJI_REGEX.test(slice);
}

function getChar(text: string, idx: number): { ch: string; next: number } {
  const code = text.codePointAt(idx);
  if (code === undefined) return { ch: "", next: idx };
  const ch = String.fromCodePoint(code);
  // Emoji and surrogate pairs occupy 2 UTF-16 code units.
  const size = ch.length;
  return { ch, next: idx + size };
}

export function ShutterText({
  text,
  className,
  stepMs = 28,
  baseDelayMs = 60,
}: ShutterTextProps): ReactNode {
  const segments: ReactNode[] = [];
  let idx = 0;
  let charCounter = 0;
  while (idx < text.length) {
    const { ch, next } = getChar(text, idx);
    idx = next;
    if (ch === " ") {
      // Render the space as a real text node so the DOM text content
      // matches what's visible (e.g. "Featured tasks" → "Featured tasks"
      // not "Featuredtasks"). The space contributes its natural
      // ≈0.25em width between two inline-block chars. aria-hidden
      // keeps it out of the a11y tree so screen readers announce
      // the full word.
      segments.push(
        <span
          key={`space-${idx}`}
          className="shutter-space"
          aria-hidden="true"
        >
          {" "}
        </span>,
      );
      continue;
    }
    if (nextIsEmoji(text, idx - ch.length)) {
      const delay = baseDelayMs + charCounter * stepMs;
      segments.push(
        <span
          key={`emoji-${idx}`}
          className="shutter-emoji"
          style={{ animationDelay: `${delay}ms` }}
        >
          {ch}
        </span>,
      );
      charCounter += 1;
      continue;
    }
    const delay = baseDelayMs + charCounter * stepMs;
    segments.push(
      <span
        key={`char-${idx}`}
        className="shutter-char"
        style={{ animationDelay: `${delay}ms` }}
      >
        <span
          className="sc-inner"
          style={{ animationDelay: `${delay}ms` }}
        >
          {ch}
        </span>
        <span
          className="sc-shutter"
          style={{ animationDelay: `${delay}ms` }}
        />
      </span>,
    );
    charCounter += 1;
  }
  return <span className={className}>{segments}</span>;
}