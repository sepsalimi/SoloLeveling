import {
  effectiveFocusedMinutes,
  filterEntriesForPreviousPeriod,
  summarizeActivities,
  trackedSeries
} from "@/lib/analytics";
import { sampleActivities } from "@/data/sample";

describe("analytics calculations", () => {
  it("calculates productive effective focused time", () => {
    expect(effectiveFocusedMinutes(sampleActivities[0])).toBe(96);
    expect(effectiveFocusedMinutes(sampleActivities[1])).toBe(0);
  });

  it("summarizes category, social, and efficiency metrics", () => {
    const summary = summarizeActivities(sampleActivities);
    expect(summary.totalMinutes).toBe(215);
    expect(summary.byCategory.work).toBe(120);
    expect(summary.socialMinutes).toBe(45);
    expect(summary.averageEfficiency).toBe(80);
  });

  it("builds equivalent previous periods and period-aware series", () => {
    const now = new Date(2026, 6, 28);
    const previous = filterEntriesForPreviousPeriod(
      [{ ...sampleActivities[0], activityDate: "2026-07-21" }],
      "week",
      now
    );
    expect(previous).toHaveLength(1);
    expect(trackedSeries(sampleActivities, "today", now)).toHaveLength(1);
  });
});

