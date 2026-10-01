import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/dashboard-data";

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

  it("every KPI carries a delta, deltaLabel, trend and intent", () => {
    for (const kpi of summary.kpis) {
      expect(typeof kpi.delta).toBe("number");
      expect(typeof kpi.deltaLabel).toBe("string");
      expect(kpi.deltaLabel.length).toBeGreaterThan(0);
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
      expect(typeof slice.label).toBe("string");
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