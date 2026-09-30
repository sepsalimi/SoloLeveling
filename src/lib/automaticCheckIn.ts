import { activityCategories, ActivityCategory, CheckInSession } from "../types/activity";
export type ExtractedActivity = { title: string; minutes: number | null; category: ActivityCategory; source: string };
export function validateExtraction(value: unknown): ExtractedActivity[] {
  if (!value || typeof value !== "object" || !("activities" in value) || !Array.isArray(value.activities) || value.activities.length > 100) throw new Error("Invalid activity response.");
  const items: ExtractedActivity[] = value.activities.map((a: unknown) => {
    if (!a || typeof a !== "object") throw new Error("Invalid activity.");
    const row = a as Record<string, unknown>;
    if (typeof row.title !== "string" || !row.title.trim() || row.title.length > 200
      || typeof row.source !== "string" || row.source.length > 12000
      || !activityCategories.includes(row.category as ActivityCategory)
      || !(row.minutes === null || (typeof row.minutes === "number" && Number.isInteger(row.minutes) && row.minutes >= 1 && row.minutes <= 1440))) throw new Error("Invalid activity fields.");
    return { title: row.title.trim(), category: row.category as ActivityCategory, minutes: row.minutes as number | null, source: row.source };
  });
  if (items.reduce((sum, a) => sum + (a.minutes ?? 0), 0) > 1440) throw new Error("Activity durations exceed one day.");
  return items;
}
export function automaticSession(id: string, date: string, transcript: string, items: ExtractedActivity[], model: string): CheckInSession {
  if (!items.length) throw new Error("No completed activities were found. Add what you did and try again.");
  const now = new Date().toISOString();
  return {
    id, sessionDate: date, sessionType: "evening", status: "completed", createdAt: now, completedAt: now, transcripts: [transcript],
    entries: items.filter(a => a.minutes !== null).map((a, i) => ({
      id: id + "-" + i, title: a.title, activityDate: date, durationMinutes: a.minutes!, primaryCategory: a.category,
      socialContext: "unknown", purposeTags: a.category === "work" ? ["productive"] : a.category === "learning" ? ["growth"] : a.category === "entertainment" ? ["fun"] : a.category === "rest" ? ["recovery"] : ["necessary"], confidence: 1, sourceTranscriptSegment: a.source, needsReview: false,
    })),
    untimedActivities: items.filter(a => a.minutes === null).map(a => ({ title: a.title, category: a.category, source: a.source })),
    processingModel: model,
    unresolvedIssues: [],
  };
}
