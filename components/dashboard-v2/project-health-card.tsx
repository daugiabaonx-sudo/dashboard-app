// components/dashboard-v2/project-health-card.tsx
// SVG radial health ring (purple → cyan linearGradient) with 3 per-project
// health bars below. Pure server component — the ring is static, the only
// motion is the CSS glow on hover via the .glass-card utility.

import { projects } from "@/lib/data";
import { formatPercent } from "@/lib/format";

const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const VIEWBOX = 110;

interface HealthCardLabels {
  title: string;
  subtitle: string;
  onTrack: string;
  atRisk: string;
  blocked: string;
  tasks: string;
  done: string;
}

interface ProjectHealthCardProps {
  labels: HealthCardLabels;
}

function deriveHealth(p: { status: string; progress: number; startDate: string; dueDate: string }) {
  if (p.status === "on_hold") return "blocked" as const;
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.dueDate).getTime();
  const now = Date.now();
  if (end <= start) return "on_track" as const;
  const expected = Math.min(
    100,
    Math.max(0, ((now - start) / (end - start)) * 100),
  );
  const variance = p.progress - expected;
  if (variance < -15) return "blocked" as const;
  if (variance < -5) return "at_risk" as const;
  return "on_track" as const;
}

const HEALTH_TONE: Record<
  "on_track" | "at_risk" | "blocked",
  { ring: string; label: string; dot: string }
> = {
  on_track: {
    ring: "var(--status-good)",
    label: "bg-status-good/15 text-status-good",
    dot: "bg-status-good",
  },
  at_risk: {
    ring: "var(--status-warning)",
    label: "bg-status-warning/15 text-status-warning",
    dot: "bg-status-warning",
  },
  blocked: {
    ring: "var(--status-critical)",
    label: "bg-status-critical/15 text-status-critical",
    dot: "bg-status-critical",
  },
};

export function ProjectHealthCard({ labels }: ProjectHealthCardProps) {
  // Sort active projects to the top, take the top 3 for the bar list.
  const ranked = [...projects]
    .sort((a, b) => {
      const aActive = a.status === "active" ? 0 : 1;
      const bActive = b.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return b.progress - a.progress;
    })
    .slice(0, 3);

  const overallProgress =
    projects.length === 0
      ? 0
      : projects.reduce((acc, p) => acc + p.progress, 0) / projects.length;
  const totalDone = projects.reduce((acc, p) => {
    // Approximation: use progress% as a stand-in for "done share".
    return acc + Math.round((p.progress / 100) * 8);
  }, 0);

  return (
    <div className="glass-card group rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {labels.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            className="size-28"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hcRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--sunext-purple)" />
                <stop offset="55%" stopColor="var(--cyan)" />
                <stop offset="100%" stopColor="var(--sunext-orange)" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth={10}
            />
            {/* Glow */}
            <circle
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="url(#hcRingGradient)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - overallProgress / 100)}
              transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
              className="opacity-25 blur-[3px] transition-opacity duration-300 group-hover:opacity-50"
            />
            {/* Fill */}
            <circle
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="url(#hcRingGradient)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - overallProgress / 100)}
              transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[24px] font-normal leading-none tabular-nums tracking-[-0.02em] text-foreground">
              {formatPercent(overallProgress)}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.done}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          {ranked.map((p) => {
            const tone = deriveHealth(p);
            const color = HEALTH_TONE[tone];
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {p.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color.label}`}
                  >
                    {tone === "on_track"
                      ? labels.onTrack
                      : tone === "at_risk"
                        ? labels.atRisk
                        : labels.blocked}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.progress}%`,
                      background: color.ring,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        {totalDone} {labels.tasks}
      </p>
    </div>
  );
}