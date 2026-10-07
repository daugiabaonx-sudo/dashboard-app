"use client";

// Hero greeting (TypewriterText + CharacterMorph inline scripts, html lines
// 7020-7221) and the 5 KPI stat cards (lines 6384-6591, dashboard.js
// renderKPIs). Timings and charsets are copied from the template.

import { useEffect, useRef, useState, type ComponentType } from "react";
import { CircleCheckBig, ClipboardList, Clock3, OctagonPause, TriangleAlert } from "lucide-react";
import { percentOf, vnDateLabel, type SxKpis } from "@/lib/sx-dashboard";

// ── Typewriter ────────────────────────────────────────────────────────
const TYPE_SPEED = 65;
const DELETE_SPEED = 35;
const PAUSE_AFTER = 1800;
const PAUSE_BEFORE = 300;

function useTypewriter(words: string[]): string {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const chars = words.map((w) => Array.from(w));
    let wordIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: number | undefined;
    const allSame = words.every((w) => w === words[0]);

    function tick() {
      const word = chars[wordIdx];
      if (!deleting) {
        charIdx++;
        setTyped(word.slice(0, charIdx).join(""));
        if (charIdx === word.length) {
          if (allSame) return;
          timer = window.setTimeout(() => {
            deleting = true;
            timer = window.setTimeout(tick, DELETE_SPEED);
          }, PAUSE_AFTER);
          return;
        }
      } else {
        charIdx--;
        setTyped(word.slice(0, charIdx).join(""));
        if (charIdx === 0) {
          deleting = false;
          wordIdx = (wordIdx + 1) % chars.length;
          timer = window.setTimeout(tick, PAUSE_BEFORE);
          return;
        }
      }
      timer = window.setTimeout(tick, deleting ? DELETE_SPEED : TYPE_SPEED);
    }

    timer = window.setTimeout(tick, 400);
    return () => window.clearTimeout(timer);
  }, [words]);
  return typed;
}

// ── Character morph ───────────────────────────────────────────────────
const MORPH_TEXTS = [
  "Chúc bạn một ngày làm việc hiệu quả! ✨",
  "Hãy tập trung vào điều quan trọng nhất 🎯",
  "Team đang chờ quyết định của bạn 💡",
  "Chúc bạn một ngày làm việc hiệu quả! ✨",
];
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
const HOLD_MS = 3000;
const SCRAMBLE_MS = 480;

interface MorphChar {
  ch: string;
  cls: string;
}

const isSpecial = (ch: string) => (ch.codePointAt(0) ?? 0) > 127 || ch === " ";
const randChar = () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
const toChars = (text: string): MorphChar[] => Array.from(text).map((ch) => ({ ch, cls: "cm-char" }));

function useCharacterMorph(): MorphChar[] {
  const [chars, setChars] = useState<MorphChar[]>(() => toChars(MORPH_TEXTS[0]));
  useEffect(() => {
    let textIdx = 0;
    let timer: number | undefined;
    let raf: number | undefined;

    function morphTo(text: string) {
      const target = Array.from(text);
      const start = performance.now();
      const settleAt = target.map((ch, i) => (isSpecial(ch) ? 0 : (i / target.length) * SCRAMBLE_MS * 0.85));
      function frame(now: number) {
        const elapsed = now - start;
        setChars(
          target.map((ch, i) =>
            isSpecial(ch) || elapsed >= settleAt[i]
              ? { ch, cls: "cm-char cm-settled" }
              : { ch: randChar(), cls: "cm-char cm-scrambling" },
          ),
        );
        if (elapsed < SCRAMBLE_MS) raf = requestAnimationFrame(frame);
        else
          timer = window.setTimeout(() => {
            textIdx = (textIdx + 1) % MORPH_TEXTS.length;
            morphTo(MORPH_TEXTS[textIdx]);
          }, HOLD_MS);
      }
      raf = requestAnimationFrame(frame);
    }

    timer = window.setTimeout(() => {
      textIdx = 1;
      morphTo(MORPH_TEXTS[textIdx]);
    }, HOLD_MS);
    return () => {
      window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return chars;
}

export function SxHero({ name, note }: { name: string; note?: string }) {
  const wordsRef = useRef([`${name} 👋`, "Manager Dashboard", `${name} 👋`]);
  const typed = useTypewriter(wordsRef.current);
  const morph = useCharacterMorph();
  const [today, setToday] = useState(() => vnDateLabel(new Date()));
  useEffect(() => setToday(vnDateLabel(new Date())), []);

  return (
    <section className="hero reveal">
      <div>
        <h1 id="heroGreeting" aria-label={`Xin chào, ${name}`}>
          <span className="tw-prefix">Xin chào, </span>
          <span className="tw-typed" aria-live="polite">
            {typed}
          </span>
          <span className="tw-cursor" aria-hidden="true" />
        </h1>
        <p role={note ? "status" : undefined}>{note ?? "Cùng xem tình hình công việc của team trong tuần này nhé!"}</p>
      </div>
      <div className="hero-date">
        <div id="todayText" suppressHydrationWarning>
          {today}
        </div>
        <div id="morphSubtitle">
          {morph.map((c, i) => (
            <span key={i} className={c.cls}>
              {c.ch}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── KPI cards ─────────────────────────────────────────────────────────

/** Port of ui.js#animateCounter — 0 → target, ease-out cubic, 900ms. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function update(time: number) {
      const progress = Math.min((time - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface StatCardProps {
  icon: ComponentType;
  tone: "purple" | "green" | "violet" | "red" | "orange";
  bars: "purple" | "green" | "red" | "orange";
  label: string;
  value: number;
  numberId: string;
  change: string;
  changeCls: "up" | "down" | "good";
  caption: string;
}

function StatCard({ icon: Icon, tone, bars, label, value, numberId, change, changeCls, caption }: StatCardProps) {
  const shown = useCountUp(value);
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon />
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-number-row">
          <div className="stat-number" id={numberId}>
            {shown}
          </div>
          <div className={`stat-change ${changeCls}`}>{change}</div>
        </div>
        <div className="stat-caption" id={`${numberId}Caption`}>
          {caption}
        </div>
      </div>
      <div className={`mini-bars ${bars}`}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

export function SxStatsGrid({ kpis }: { kpis: SxKpis }) {
  const ofTotal = (n: number) => `${percentOf(n, kpis.total)} tổng công việc`;
  return (
    <section className="stats-grid reveal delay-1">
      <StatCard icon={ClipboardList} tone="purple" bars="purple" label="Tổng công việc" value={kpis.total} numberId="kpiTotal" change="↑ 12%" changeCls="up" caption="so với tuần trước" />
      <StatCard icon={CircleCheckBig} tone="green" bars="green" label="Đã hoàn thành" value={kpis.completed} numberId="kpiCompleted" change="↑ 8%" changeCls="up" caption={ofTotal(kpis.completed)} />
      <StatCard icon={Clock3} tone="violet" bars="purple" label="Đang thực hiện" value={kpis.inProgress} numberId="kpiInProgress" change="↓ 5%" changeCls="down" caption={ofTotal(kpis.inProgress)} />
      <StatCard icon={TriangleAlert} tone="red" bars="red" label="Trễ hạn" value={kpis.overdue} numberId="kpiOverdue" change="↑ 3%" changeCls="down" caption={ofTotal(kpis.overdue)} />
      <StatCard icon={OctagonPause} tone="orange" bars="orange" label="Bị chặn" value={kpis.blocked} numberId="kpiBlocked" change="↓ 20%" changeCls="good" caption={ofTotal(kpis.blocked)} />
    </section>
  );
}
