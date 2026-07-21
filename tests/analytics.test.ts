import { effectiveFocusedMinutes, summarizeActivities } from "@/lib/analytics";
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
    expect(summary.socialMinutes).toBe(95);
    expect(summary.averageEfficiency).toBe(80);
  });
});

