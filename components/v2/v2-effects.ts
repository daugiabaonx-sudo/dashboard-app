// components/v2/v2-effects.ts
// "HIỆU ỨNG" block of the V2 template (lines 2860–2966): typewriter greeting,
// character-morph subtitle, highlight marker, liquid-metal nav glow, stagger
// indexes + search highlight after renders, toasts, and the light/dark theme
// toggle (`<html data-theme>` + localStorage "sunext-theme").

import {
  DARK_THEME,
  LIGHT_THEME,
  THEME_KEY,
  clearSavedTheme,
  readSavedTheme,
  readSystemTheme,
  resolveThemeState,
  writeSavedTheme,
  type V2Theme,
} from "@/lib/v2/v2-theme";
import type { V2Ctx, V2ToastType } from "./v2-context";
import { esc } from "./v2-core";

const STAGGER = [
  "#tBody tr.row",
  "#pBody tr.row",
  "#bBody tr.bk-main",
  "#hstats .hs",
  "#tvBody .tvt tbody tr",
  "#tvBody .lr",
  "#tvBody .lgh",
  "#tvBody .kcard",
  "#tvBody .gt-bar",
  "#tvBody .gt-span",
  "#pjStrip .pjc",
];

export function stagger(root: HTMLElement) {
  STAGGER.forEach((sel) =>
    root.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
      const v = Math.min(i, 18);
      el.style.setProperty("--i", String(v));
      el.querySelectorAll<HTMLElement>(".bar span").forEach((b) => b.style.setProperty("--i", String(v)));
    }),
  );
}

export function markSearch(root: HTMLElement, query: string) {
  const q = query.trim();
  if (q.length < 2) return;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  root.querySelectorAll("#tBody .ttl,#tBody .who,#tvBody .lt,#tvBody .kt,#tvBody .ttl,#tvBody .who").forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) if (walker.currentNode.parentNode?.nodeName !== "MARK") nodes.push(walker.currentNode as Text);
    nodes.forEach((t) => {
      if (!re.test(t.nodeValue ?? "")) return;
      re.lastIndex = 0;
      const span = document.createElement("span");
      span.innerHTML = esc(t.nodeValue).replace(re, (m) => `<mark class="search-hl">${m}</mark>`);
      t.replaceWith(span);
    });
  });
}

export function createToaster(root: HTMLElement) {
  const box = document.createElement("div");
  box.className = "toasts";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  root.appendChild(box);
  return (msg: string, type?: V2ToastType) => {
    const c = { success: "var(--ok)", warning: "var(--warn)", error: "var(--bad)" }[type as string] ?? "var(--accent)";
    const t = document.createElement("div");
    t.className = "toast";
    t.style.setProperty("--c", c);
    t.innerHTML = `<i></i><span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 300);
    }, 2600);
  };
}

function applyThemeState(
  ctx: V2Ctx,
  selectedTheme: V2Theme | null,
  systemMql: { readonly matches: boolean } | null,
) {
  const state = resolveThemeState(selectedTheme, readSystemTheme(systemMql));
  const rootEl = document.documentElement;
  rootEl.dataset.theme = state.activeTheme;
  rootEl.style.colorScheme = state.activeTheme;

  const toggle = ctx.$("themeToggle") as HTMLInputElement | null;
  if (toggle) {
    toggle.checked = state.isLight;
    toggle.setAttribute("aria-label", state.isLight ? "Bật chế độ tối" : "Bật chế độ sáng");
  }

  const btn = ctx.$("themeBtn") as HTMLElement | null;
  if (btn) {
    btn.setAttribute("aria-pressed", String(!state.isLight));
    btn.setAttribute("data-source", state.source);
    btn.title = state.title;
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", state.metaThemeColor);
  }
  return state;
}

function installThemeSwitcher(ctx: V2Ctx) {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const systemMql =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  let selectedTheme = readSavedTheme(storage);
  applyThemeState(ctx, selectedTheme, systemMql);

  const btn = ctx.$("themeBtn") as HTMLElement | null;
  const toggle = ctx.$("themeToggle") as HTMLInputElement | null;

  if (btn) {
    ctx.on(btn, "click", (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      selectedTheme = null;
      clearSavedTheme(storage);
      applyThemeState(ctx, null, systemMql);
      ctx.toast("Đã đặt lại giao diện theo hệ thống");
    });
  }

  if (toggle) {
    ctx.on(toggle, "change", () => {
      selectedTheme = toggle.checked ? LIGHT_THEME : DARK_THEME;
      writeSavedTheme(selectedTheme, storage);
      const next = applyThemeState(ctx, selectedTheme, systemMql);
      ctx.toast(next.isLight ? "Chế độ sáng (Bạn đã chọn)" : "Chế độ tối (Bạn đã chọn)");
    });
  }

  if (systemMql && typeof systemMql.addEventListener === "function") {
    ctx.on(systemMql, "change", (e: MediaQueryListEvent) => {
      if (selectedTheme === null) {
        applyThemeState(ctx, null, typeof e?.matches === "boolean" ? e : systemMql);
      }
    });
  }

  ctx.on(window, "storage", (e: StorageEvent) => {
    if (e.key !== THEME_KEY && e.key !== null) return;
    selectedTheme = readSavedTheme(storage);
    applyThemeState(ctx, selectedTheme, systemMql);
  });
}

export function installEffects(ctx: V2Ctx) {
  const { $, on, later, profile } = ctx;
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

  installThemeSwitcher(ctx);

  /* Typewriter: "Xin chào, …" */
  const h1 = $("heroH");
  const WORDS = [`${profile.name} 👋`, "Manager Dashboard"];
  h1.innerHTML = 'Xin chào, <span class="tw-typed" aria-live="polite"></span><span class="tw-cursor" aria-hidden="true"></span>';
  const typed = h1.querySelector(".tw-typed");
  if (reduce) typed.textContent = WORDS[0];
  else {
    let w = 0;
    let c = 0;
    let del = false;
    const tick = () => {
      const word = [...WORDS[w]];
      if (!del) {
        c++;
        typed.textContent = word.slice(0, c).join("");
        if (c === word.length) {
          del = true;
          return later(tick, 1800);
        }
      } else {
        c--;
        typed.textContent = word.slice(0, c).join("");
        if (c === 0) {
          del = false;
          w = (w + 1) % WORDS.length;
          return later(tick, 300);
        }
      }
      later(tick, del ? 35 : 65);
    };
    tick();
  }

  /* Character morph: dòng phụ dưới lời chào */
  const sub = $("heroSub");
  const TEXTS = [
    sub.textContent,
    "Chúc bạn một ngày làm việc hiệu quả! ✨",
    "Hãy tập trung vào điều quan trọng nhất 🎯",
    "Team đang chờ quyết định của bạn 💡",
  ];
  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
  const special = (ch: string) => (ch.codePointAt(0) ?? 0) > 127 || ch === " ";
  let idx = 0;
  if (!reduce) {
    const morphTo = (text: string) => {
      const tgt = [...text];
      sub.innerHTML = "";
      const spans = tgt.map((ch) => {
        const s = document.createElement("span");
        s.className = "cm-char";
        s.textContent = ch;
        sub.appendChild(s);
        return s;
      });
      const total = 480;
      const t0 = performance.now();
      const settle = tgt.map((ch, i) => (special(ch) ? 0 : (i / tgt.length) * total * 0.85));
      const frame = (now: number) => {
        if (!ctx.alive()) return;
        const e = now - t0;
        spans.forEach((s, i) => {
          if (e >= settle[i]) {
            if (s.className !== "cm-char") {
              s.textContent = tgt[i];
              s.className = "cm-char";
            }
          } else {
            s.textContent = CH[(Math.random() * CH.length) | 0];
            s.className = "cm-char cm-scrambling";
          }
        });
        if (e < total) requestAnimationFrame(frame);
        else {
          sub.textContent = text;
          later(() => {
            idx = (idx + 1) % TEXTS.length;
            morphTo(TEXTS[idx]);
          }, 3000);
        }
      };
      frame(t0);
    };
    later(() => {
      idx = 1;
      morphTo(TEXTS[1]);
    }, 3000);
  }

  /* Highlight marker cho ghi chú */
  const note = $("heroNote");
  note.innerHTML = `<mark class="highlight-text">${esc(note.textContent)}</mark>`;
  later(() => note.firstChild?.classList.add("hl-replay"), 1600);

  /* Liquid metal: vệt sáng theo con trỏ trên menu */
  on(
    $("nav"),
    "pointermove",
    (e: PointerEvent) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>(".nav-item");
      if (!it) return;
      const r = it.getBoundingClientRect();
      it.style.setProperty("--mx", e.clientX - r.left + "px");
      it.style.setProperty("--my", e.clientY - r.top + "px");
    },
    { passive: true },
  );
}
