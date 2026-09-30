// Covers multi-day reasoning validation, untimed events, and retry-stable activity identities.
import { automaticSession, validateExtraction } from "../src/lib/automaticCheckIn";

const captureDate = "2026-09-30";
const capturedAt = "2026-09-30T18:00:00.000Z";

it("saves several historical dates and keeps unknown duration out of time totals", () => {
  const result = validateExtraction({
    activities: [
      { title: "Study", minutes: 120, category: "Learning", source: "two days ago I studied two hours", occurredOn: "2026-09-28", outcome: "partial" },
      { title: "Edited photos", minutes: 60, category: "Creative", source: "yesterday I edited photos one hour", occurredOn: "2026-09-29", outcome: "partial" },
      { title: "Took out trash", minutes: null, category: "Life Admin", source: "today I took out the trash", occurredOn: "2026-09-30", outcome: "completed" },
    ],
    clarificationQuestion: null,
  }, captureDate);
  const session = automaticSession("test", captureDate, capturedAt, "multi-day update", result.activities, "deepseek-v4-flash");
  expect(session.entries.map((entry) => entry.activityDate)).toEqual(["2026-09-28", "2026-09-29"]);
  expect(session.untimedActivities?.[0]).toMatchObject({ occurredOn: "2026-09-30", outcome: "completed" });
  expect(session.entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)).toBe(180);
  expect(automaticSession("test", captureDate, capturedAt, "multi-day update", result.activities, "deepseek-v4-flash").entries[0].id).toBe(session.entries[0].id);
});

it.each([0, -5, 1441, 1.5, "30", undefined])("rejects invalid model duration %s", (minutes) => {
  expect(() => validateExtraction({
    activities: [{ title: "Work", minutes, category: "Career", source: "work", occurredOn: captureDate, outcome: "partial" }],
    clarificationQuestion: null,
  }, captureDate)).toThrow();
});

it("checks plausibility separately for each actual date", () => {
  const activities = ["2026-09-29", "2026-09-30"].flatMap((occurredOn) => [
    { title: "Work", minutes: 720, category: "Career", source: `work ${occurredOn}`, occurredOn, outcome: "partial" },
    { title: "Rest", minutes: 720, category: "Leisure", source: `rest ${occurredOn}`, occurredOn, outcome: "completed" },
  ]);
  expect(validateExtraction({ activities, clarificationQuestion: null }, captureDate).activities).toHaveLength(4);
  expect(() => validateExtraction({
    activities: [...activities, { title: "Extra", minutes: 1, category: "Career", source: "extra", occurredOn: captureDate, outcome: "partial" }],
    clarificationQuestion: null,
  }, captureDate)).toThrow();
});

it("rejects future dates and unknown task identifiers", () => {
  expect(() => validateExtraction({
    activities: [{ title: "Future", minutes: 30, category: "Career", source: "future", occurredOn: "2026-10-01", outcome: "partial" }],
    clarificationQuestion: null,
  }, captureDate)).toThrow();
  expect(() => validateExtraction({
    activities: [{ title: "Task", minutes: 30, category: "Career", source: "task", occurredOn: captureDate, taskId: "unknown", outcome: "completed" }],
    clarificationQuestion: null,
  }, captureDate, new Set(["known"]))).toThrow();
});
