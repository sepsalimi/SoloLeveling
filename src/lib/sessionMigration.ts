// In-memory migration keeps legacy activity categories and untimed events visible after upgrades.
import { normalizeArea } from "./areas";
import { CheckInSession } from "@/types/activity";

export function migrateSession(session: CheckInSession): CheckInSession {
  return {
    ...session,
    entries: session.entries.map((entry) => ({
      ...entry,
      primaryCategory: normalizeArea(entry.primaryCategory),
      recordedAt: entry.recordedAt ?? session.createdAt,
      outcome: entry.outcome ?? "completed",
    })),
    untimedActivities: session.untimedActivities?.map((entry, index) => ({
      ...entry,
      id: entry.id ?? `${session.id}-untimed-${index}`,
      category: normalizeArea(entry.category),
      occurredOn: entry.occurredOn ?? session.sessionDate,
      recordedAt: entry.recordedAt ?? session.createdAt,
      outcome: entry.outcome ?? "completed",
    })),
  };
}
