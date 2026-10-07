// tests/unit/sx-dates.test.ts
import { describe, expect, it } from "vitest";
import { addDays, dayMonthLabel, mondayOf, vnDayKey, weekdayMon0 } from "@/lib/sx-dates";

describe("sx-dates", () => {
  it("formats instants as Vietnam days", () => {
    expect(vnDayKey("2026-10-06T17:30:00Z")).toBe("2026-10-07");
    expect(vnDayKey("2026-10-06T16:59:00Z")).toBe("2026-10-06");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("computes Monday-based weekdays and week starts", () => {
    expect(weekdayMon0("2026-10-05")).toBe(0); // Monday
    expect(weekdayMon0("2026-10-11")).toBe(6); // Sunday
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
  });

  it("labels days as DD/MM", () => {
    expect(dayMonthLabel("2026-09-28")).toBe("28/09");
  });
});
