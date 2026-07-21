import { ActivityEntry } from "@/types/activity";

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isPotentialDuplicate(a: ActivityEntry, b: ActivityEntry): boolean {
  if (a.activityDate !== b.activityDate) return false;
  if (a.primaryCategory !== b.primaryCategory) return false;
  const sameTitle = titleKey(a.title) === titleKey(b.title);
  const similarDuration = Math.abs(a.durationMinutes - b.durationMinutes) <= 10;
  const sameStart = Boolean(a.startTime && b.startTime && a.startTime === b.startTime);
  return sameTitle && (similarDuration || sameStart);
}

export function removeDuplicateActivities(entries: ActivityEntry[]): ActivityEntry[] {
  return entries.reduce<ActivityEntry[]>((acc, entry) => {
    if (!acc.some((existing) => isPotentialDuplicate(existing, entry))) acc.push(entry);
    return acc;
  }, []);
}

