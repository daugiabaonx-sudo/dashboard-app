import { describe, expect, it } from "vitest";
import {
  getDashboardSummary,
  localizeKpis,
  type DashboardKpi,
} from "@/lib/dashboard-data";

describe("getDashboardSummary", () => {
  const summary = getDashboardSummary({ userId: "u-001", role: "admin" });

  it("returns a profile with name, initials, role and avatar color", () => {
    expect(summary.profile).toMatchObject({
      userId: "u-001",
      role: "admin",
    });
    expect(summary.profile.name).toMatch(/[a-z]+/i);
    expect(summary.profile.initials).toMatch(/^[a-z]{2}$/i);
    expect(summary.profile.avatarColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns exactly 5 KPI tiles in the locked order", () => {
    expect(summary.kpis).toHaveLength(5);
    expect(summary.kpis.map((k) => k.id)).toEqual([
      "total",
      "completed",
      "inProgress",
      "overdue",
      "blocked",
    ]);
  });

  it("each KPI has a sparkline of 8–12 points", () => {
    for (const kpi of summary.kpis) {
      expect(Array.isArray(kpi.sparkline)).toBe(true);
      expect(kpi.sparkline.length).toBeGreaterThanOrEqual(8);
      expect(kpi.sparkline.length).toBeLessThanOrEqual(12);
      for (const point of kpi.sparkline) {
        expect(typeof point).toBe("number");
        expect(Number.isFinite(point)).toBe(true);
      }
    }
  });

  it("every KPI carries a delta, deltaLabelKey, trend and intent", () => {
    for (const kpi of summary.kpis) {
      expect(typeof kpi.delta).toBe("number");
      expect(typeof kpi.deltaLabelKey).toBe("string");
      expect(kpi.deltaLabelKey.length).toBeGreaterThan(0);
      expect(typeof kpi.labelKey).toBe("string");
      expect(kpi.labelKey.length).toBeGreaterThan(0);
      expect(["up", "down", "flat"]).toContain(kpi.trend);
      expect(["neutral", "good", "warning", "critical"]).toContain(kpi.intent);
    }
  });

  it("returns exactly 5 featured tasks", () => {
    expect(summary.featured).toHaveLength(5);
    for (const row of summary.featured) {
      expect(row.id).toMatch(/^t\d+$/);
      expect(typeof row.title).toBe("string");
      expect(typeof row.projectName).toBe("string");
      expect(row.ownerInitials).toMatch(/^[a-z]{2}$/i);
      expect(row.ownerColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(["high", "medium", "low"]).toContain(row.priority);
      expect(typeof row.dueDate).toBe("string");
      expect(row.progress).toBeGreaterThanOrEqual(0);
      expect(row.progress).toBeLessThanOrEqual(100);
    }
  });

  it("returns exactly 4 blockers", () => {
    expect(summary.blockers).toHaveLength(4);
    for (const row of summary.blockers) {
      expect(row.id).toMatch(/^t\d+$/);
      expect(typeof row.title).toBe("string");
      expect(typeof row.taskProject).toBe("string");
      expect(row.assigneeInitials).toMatch(/^[a-z]{2}$/i);
      expect(row.assigneeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof row.daysStuck).toBe("number");
      expect(row.daysStuck).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(row.severity);
    }
  });

  it("status donut slices sum to the reported total", () => {
    const sum = summary.statusDonut.slices.reduce(
      (acc, slice) => acc + slice.value,
      0,
    );
    expect(sum).toBe(summary.statusDonut.total);
    expect(summary.statusDonut.total).toBeGreaterThan(0);
    expect(summary.statusDonut.slices.length).toBeGreaterThan(0);
    for (const slice of summary.statusDonut.slices) {
      expect(typeof slice.labelKey).toBe("string");
      expect(slice.labelKey.length).toBeGreaterThan(0);
      expect(typeof slice.value).toBe("number");
      expect(typeof slice.color).toBe("string");
    }
  });
});

describe("getDashboardSummary role gating", () => {
  it("admin scope returns the same shape as member scope", () => {
    const admin = getDashboardSummary({ userId: "u-002", role: "admin" });
    const member = getDashboardSummary({ userId: "u-002", role: "member" });
    expect(Object.keys(admin).sort()).toEqual(Object.keys(member).sort());
    expect(admin.kpis).toHaveLength(member.kpis.length);
    expect(admin.featured).toHaveLength(member.featured.length);
    expect(admin.blockers).toHaveLength(member.blockers.length);
  });
});

describe("localizeKpis", () => {
  const summary = getDashboardSummary({ userId: "u-001", role: "admin" });

  it("resolves every labelKey and deltaLabelKey to a translated string", () => {
    const t = (path: string) => {
      const labels: Record<string, string> = {
        "kpiLabels.total": "Tổng công việc",
        "kpiLabels.completed": "Hoàn thành",
        "kpiLabels.inProgress": "Đang làm",
        "kpiLabels.overdue": "Quá hạn",
        "kpiLabels.blocked": "Bị chặn",
        "kpiLabels.vsLastWeek": "so với tuần trước",
        "kpiLabels.thisWeek": "tuần này",
        "kpiLabels.ofTotal": "trên tổng số",
      };
      return labels[path] ?? path;
    };

    const localized = localizeKpis(summary.kpis, t);
    expect(localized).toHaveLength(summary.kpis.length);
    for (const k of localized) {
      expect(k.label).toBeDefined();
      expect(k.label).not.toMatch(/\./); // no raw dotted key
      expect(k.deltaLabel).toBeDefined();
      expect(k.deltaLabel).not.toMatch(/\./);
    }
    expect(localized[0]?.label).toBe("Tổng công việc");
    expect(localized[3]?.label).toBe("Quá hạn");
    expect(localized[3]?.deltaLabel).toBe("trên tổng số");
  });

  it("preserves identity fields untouched", () => {
    const t = (path: string) => path;
    const localized = localizeKpis(summary.kpis, t);
    expect(localized.map((k) => k.id)).toEqual(summary.kpis.map((k) => k.id));
    expect(localized.map((k) => k.value)).toEqual(
      summary.kpis.map((k) => k.value),
    );
    expect(localized.map((k) => k.delta)).toEqual(
      summary.kpis.map((k) => k.delta),
    );
    expect(localized.map((k) => k.trend)).toEqual(
      summary.kpis.map((k) => k.trend),
    );
  });

  it("does not mutate the input array (immutable)", () => {
    const t = (path: string) => path;
    const before = summary.kpis.map((k) => ({ ...k }));
    localizeKpis(summary.kpis, t);
    expect(summary.kpis).toEqual(before);
    for (let i = 0; i < summary.kpis.length; i++) {
      expect((summary.kpis[i] as DashboardKpi).label).toBeUndefined();
    }
  });
});