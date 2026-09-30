import { describe, expect, it } from "vitest";
import { cueStates, defaultCues, hearActivities, makeEveningSession, mentionedCues, morningTasks, spokenMinutes } from "../src/lib/checkIn";
import { draftTasks } from "../src/lib/tasks";
import { summarizeActivities } from "../src/lib/analytics";
describe("evening activity cues", () => {
  it("separates work and workout without assigning exercise time to work", () => {
    const entries = hearActivities("I went to work today and after I worked out for 30 min", defaultCues);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ cueId: "work", minutes: null });
    expect(entries[1]).toMatchObject({ cueId: "workout", category: "Health", minutes: 30 });
    expect([...mentionedCues("I worked out for 30 min", defaultCues)]).toEqual(["workout"]);
  });
  it("ignores skipped and planned activities", () => {
    expect(hearActivities("I didn't work out. I plan to study for my P.Eng tomorrow", defaultCues)).toEqual([]);
    expect([...mentionedCues("I skipped the gym but I studied for my P.Eng for an hour", defaultCues)]).toEqual(["workout", "peng"]);
    expect(cueStates("I didn't work out; I'll do it tomorrow", defaultCues).get("workout")).toBe("skipped");
  });
  it("preserves separate durations, decimals and spoken numbers", () => {
    expect(spokenMinutes("one and a half hours")).toBe(90);
    expect(spokenMinutes("forty-five minutes")).toBe(45);
    expect(spokenMinutes("1 hour 20 minutes")).toBe(80);
    expect(spokenMinutes("half an hour")).toBe(30);
    expect(spokenMinutes("30 hours")).toBeNull();
    expect(hearActivities("I worked 8 hours. I worked out 0.5 hours.", defaultCues).map(a => a.minutes)).toEqual([480,30]);
  });
  it("does not duplicate ambiguous shared time", () => {
    const entries = hearActivities("I played games with friends for 60 minutes", defaultCues);
    expect(entries).toHaveLength(2);
    expect(entries.every(a => a.minutes === null)).toBe(true);
  });
  it("feeds confirmed dated durations to analytics", () => {
    const session = makeEveningSession("evening-test", "2026-09-28", "I worked out 30 minutes", hearActivities("I worked out 30 minutes", defaultCues));
    expect(session.entries[0]).toMatchObject({ activityDate: "2026-09-28", durationMinutes: 30, primaryCategory: "Health" });
    expect(summarizeActivities(session.entries).totalMinutes).toBe(30);
    expect(makeEveningSession("evening-test", "2026-09-28", "", hearActivities("I worked out 30 minutes", defaultCues)).entries[0].id).toBe(session.entries[0].id);
  });
  it("requires valid dates and actual durations", () => {
    expect(() => makeEveningSession("x","2026-02-30","",hearActivities("I worked out 30 minutes",defaultCues))).toThrow();
    expect(() => makeEveningSession("x","2026-09-28","",hearActivities("I worked today",defaultCues))).toThrow();
  });
});
describe("morning plan", () => {
  it("prioritizes unfinished high priority tasks and never logs their estimates", () => {
    const tasks = draftTasks("Read, low priority, 1 hour. Pay taxes, high priority, 2 hours. Clean 1 hour. Submit report, high priority, 1 hour");
    tasks[3].status = "Done";
    expect(morningTasks(tasks).map(t=>t.title)).toEqual([tasks[1].title,tasks[2].title,tasks[0].title]);
    expect(morningTasks(tasks)).toHaveLength(3);
  });
});
