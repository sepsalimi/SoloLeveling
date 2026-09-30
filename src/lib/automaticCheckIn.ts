// Converts validated reasoning output into stable, retry-safe dated activity records.
import { CheckInSession } from "../types/activity";
import { defaultPurpose } from "./areas";
import { CheckInReasoning, ReasonedActivity, validateCheckInReasoning } from "./reasoningContracts";

export type ExtractedActivity = ReasonedActivity;

export function validateExtraction(
  value: unknown,
  captureDate: string,
  taskIds?: ReadonlySet<string>,
  projectIds?: ReadonlySet<string>,
): CheckInReasoning {
  return validateCheckInReasoning(value, { captureDate, taskIds, projectIds });
}

function stableId(sessionId: string, item: ReasonedActivity) {
  const value = [item.occurredOn, item.title, item.source, item.taskId ?? "", item.projectId ?? ""].join("|").toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${sessionId}-${(hash >>> 0).toString(36)}`;
}

export function automaticSession(
  id: string,
  captureDate: string,
  capturedAt: string,
  transcript: string,
  items: ExtractedActivity[],
  model: string,
): CheckInSession {
  if (!items.length) throw new Error("No completed activities were found. Add what you did and try again.");
  const now = new Date().toISOString();
  return {
    id, sessionDate: captureDate, sessionType: "evening", status: "completed", createdAt: capturedAt, completedAt: now, transcripts: [transcript],
    entries: items.filter(a => a.minutes !== null).map((a) => ({
      id: stableId(id, a), sessionId: id, title: a.title, activityDate: a.occurredOn, recordedAt: capturedAt,
      durationMinutes: a.minutes!, primaryCategory: a.category, projectId: a.projectId, taskId: a.taskId,
      outcome: a.outcome, socialContext: "unknown", purposeTags: defaultPurpose(a.category),
      sourceTranscriptSegment: a.source, needsReview: false,
    })),
    untimedActivities: items.filter(a => a.minutes === null).map(a => ({
      id: stableId(id, a), title: a.title, category: a.category, occurredOn: a.occurredOn, recordedAt: capturedAt,
      source: a.source, projectId: a.projectId, taskId: a.taskId, outcome: a.outcome,
    })),
    processingModel: model,
    unresolvedIssues: [],
  };
}
