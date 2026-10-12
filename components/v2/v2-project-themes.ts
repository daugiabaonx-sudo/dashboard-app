// components/v2/v2-project-themes.ts
// Project card themes of the V2 template (PROJECT_THEMES). The template keys
// themes by its sample project names; real Planner plans get the same five
// palettes assigned in order, so every card keeps the template's look.

export interface V2ProjectTheme {
  readonly c: string;
  readonly cLight: string;
  readonly cBg: string;
  readonly icon: string;
}

const icon = (body: string) =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ALL_PROJECTS_THEME: V2ProjectTheme = {
  c: "#6366F1",
  cLight: "#818CF8",
  cBg: "rgba(99,102,241,0.12)",
  icon: icon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>'),
};

const PALETTE: readonly V2ProjectTheme[] = [
  {
    c: "#F59E0B",
    cLight: "#FBBF24",
    cBg: "rgba(245,158,11,0.12)",
    icon: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 3v9l6 3.5"/>'),
  },
  {
    c: "#0284C7",
    cLight: "#38BDF8",
    cBg: "rgba(2,132,199,0.12)",
    icon: icon('<circle cx="12" cy="12" r="9"/><line x1="3.6" y1="9" x2="20.4" y2="9"/><line x1="3.6" y1="15" x2="20.4" y2="15"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/>'),
  },
  {
    c: "#10B981",
    cLight: "#34D399",
    cBg: "rgba(16,185,129,0.12)",
    icon: icon('<rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5"/>'),
  },
  {
    c: "#8B5CF6",
    cLight: "#A78BFA",
    cBg: "rgba(139,92,246,0.12)",
    icon: icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
  },
  {
    c: "#EC4899",
    cLight: "#F472B6",
    cBg: "rgba(236,72,153,0.12)",
    icon: icon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  },
];

/** Theme for the i-th project (cycles through the template palettes). */
export function themeFor(index: number): V2ProjectTheme {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
