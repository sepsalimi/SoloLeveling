import { automaticSession, validateExtraction } from "../src/lib/automaticCheckIn";
it("automatically saves timed activities and keeps unknown duration out of time totals", () => {
  const activities = validateExtraction({ activities: [
    { title: "Workout", minutes: 30, category: "exercise", source: "worked out for 30 minutes" },
    { title: "Work", minutes: null, category: "work", source: "I went to work" },
  ] });
  const session = automaticSession("test", "2026-09-29", "I went to work and worked out for 30 minutes", activities, "deepseek-flash");
  expect(session.status).toBe("completed"); expect(session.entries).toHaveLength(1);
  expect(session.entries[0].durationMinutes).toBe(30); expect(session.entries[0].needsReview).toBe(false);
  expect(session.untimedActivities?.[0].title).toBe("Work"); expect(session.processingModel).toBe("deepseek-flash");
});
it.each([0,-5,1441,1.5,"30",undefined])("rejects invalid model duration %s", minutes => {
  expect(() => validateExtraction({ activities: [{ title: "Work", minutes, category: "work", source: "work" }] })).toThrow();
});
it("rejects invalid categories and more than 24 hours", () => {
  expect(() => validateExtraction({ activities: [{ title: "Work", minutes: 2, category: "invalid", source: "work" }] })).toThrow();
  expect(() => validateExtraction({ activities: ["Work","Rest"].map(title => ({ title, minutes: 800, category: "work", source: title })) })).toThrow();
});
it("does not falsely save an empty response as a completed check-in", () => {
  expect(() => automaticSession("test","2026-09-29","hello",[],"deepseek-flash")).toThrow();
});
