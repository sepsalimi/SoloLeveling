import { ActivityEntry } from "@/types/activity";
import { isoDate } from "@/lib/dates";
import { normalizeDuration } from "@/lib/duration";
import { removeDuplicateActivities } from "@/lib/duplicates";

let idCounter = 0;

function nextId() {
  idCounter += 1;
  return `mock-${Date.now()}-${idCounter}`;
}

function entry(partial: Omit<ActivityEntry, "id" | "activityDate" | "confidence" | "needsReview"> & Partial<ActivityEntry>): ActivityEntry {
  return {
    id: partial.id ?? nextId(),
    activityDate: partial.activityDate ?? isoDate(),
    confidence: partial.confidence ?? 0.82,
    needsReview: partial.needsReview ?? false,
    ...partial
  };
}

export async function extractActivitiesMock(transcript: string, existing: ActivityEntry[] = []) {
  const lower = transcript.toLowerCase();
  const activities: ActivityEntry[] = [];
  const unresolvedIssues: string[] = [];

  if (lower.includes("work")) {
    const duration = normalizeDuration(lower.match(/worked[^.]+/)?.[0] ?? transcript) ?? 120;
    activities.push(
      entry({
        title: lower.includes("presentation") ? "Client presentation" : "Focused work",
        startTime: lower.includes("nine") || lower.includes("9") ? "09:00" : undefined,
        endTime: lower.includes("eleven") || lower.includes("11") ? "11:00" : undefined,
        durationMinutes: duration,
        primaryCategory: "work",
        socialContext: "solo",
        purposeTags: ["productive"],
        efficiencyPercent: lower.includes("80") ? 80 : undefined,
        sourceTranscriptSegment: transcript
      })
    );
  }

  if (lower.includes("gym") || lower.includes("exercise")) {
    activities.push(
      entry({
        title: "Gym",
        durationMinutes: normalizeDuration(lower.match(/gym[^.]+/)?.[0] ?? transcript) ?? 60,
        primaryCategory: "exercise",
        socialContext: "public",
        purposeTags: ["growth", "recovery"],
        sourceTranscriptSegment: transcript
      })
    );
  }

  if (lower.includes("dinner") || lower.includes("lunch")) {
    activities.push(
      entry({
        title: lower.includes("dinner") ? "Dinner" : "Lunch",
        durationMinutes: normalizeDuration(lower.match(/(?:dinner|lunch)[^.]+/)?.[0] ?? transcript) ?? 60,
        primaryCategory: "food",
        socialContext: lower.includes("friends") ? "with_friends" : lower.includes("aya") ? "with_friends" : "unknown",
        purposeTags: ["necessary", "fun"],
        needsReview: !lower.includes("hour") && !lower.includes("minute"),
        sourceTranscriptSegment: transcript
      })
    );
  }

  if (lower.includes("youtube") || lower.includes("movie")) {
    activities.push(
      entry({
        title: lower.includes("movie") ? "Movie" : "YouTube",
        durationMinutes: normalizeDuration(transcript) ?? 90,
        primaryCategory: "entertainment",
        socialContext: lower.includes("alone") ? "solo" : "unknown",
        purposeTags: ["fun", "recovery"],
        sourceTranscriptSegment: transcript
      })
    );
  }

  if (lower.includes("clean")) {
    activities.push(
      entry({
        title: "Cleaned apartment",
        durationMinutes: normalizeDuration(transcript) ?? 40,
        primaryCategory: "chores",
        socialContext: "solo",
        purposeTags: ["necessary"],
        sourceTranscriptSegment: transcript
      })
    );
  }

  if (activities.length === 0) {
    unresolvedIssues.push("No clear activity duration was found. Add an activity manually or retry with more detail.");
  }

  return {
    activities: removeDuplicateActivities([...existing, ...activities]),
    unresolvedIssues
  };
}

