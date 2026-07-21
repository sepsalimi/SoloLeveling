import { ActivityEntry, AnalyticsPeriod, PurposeTag } from "@/types/activity";
import { addDays, isoDate, sameDate, startOfWeek } from "@/lib/dates";

export type AnalyticsSummary = {
  totalMinutes: number;
  untrackedMinutes: number;
  byCategory: Record<string, number>;
  byPurpose: Record<PurposeTag, number>;
  soloMinutes: number;
  socialMinutes: number;
  averageEfficiency?: number;
  effectiveFocusedMinutes: number;
  dailyTracked: Array<{ date: string; minutes: number }>;
};

export function effectiveFocusedMinutes(entry: ActivityEntry): number {
  if (!entry.purposeTags.includes("productive")) return 0;
  return Math.round(entry.durationMinutes * ((entry.efficiencyPercent ?? 100) / 100));
}

export function summarizeActivities(entries: ActivityEntry[], today = new Date()): AnalyticsSummary {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const byCategory: Record<string, number> = {};
  const byPurpose = { productive: 0, fun: 0, recovery: 0, necessary: 0, growth: 0 };
  const efficiencies = entries
    .map((entry) => entry.efficiencyPercent)
    .filter((value): value is number => typeof value === "number");

  for (const entry of entries) {
    byCategory[entry.primaryCategory] = (byCategory[entry.primaryCategory] ?? 0) + entry.durationMinutes;
    for (const tag of entry.purposeTags) byPurpose[tag] += entry.durationMinutes;
  }

  const days = Array.from({ length: 7 }, (_, index) => isoDate(addDays(today, index - 6)));
  const dailyTracked = days.map((date) => ({
    date,
    minutes: entries.filter((entry) => sameDate(entry.activityDate, date)).reduce((sum, entry) => sum + entry.durationMinutes, 0)
  }));

  return {
    totalMinutes,
    untrackedMinutes: Math.max(0, 24 * 60 - totalMinutes),
    byCategory,
    byPurpose,
    soloMinutes: entries.filter((entry) => entry.socialContext === "solo").reduce((sum, entry) => sum + entry.durationMinutes, 0),
    socialMinutes: entries.filter((entry) => entry.socialContext !== "solo").reduce((sum, entry) => sum + entry.durationMinutes, 0),
    averageEfficiency: efficiencies.length
      ? Math.round(efficiencies.reduce((sum, value) => sum + value, 0) / efficiencies.length)
      : undefined,
    effectiveFocusedMinutes: entries.reduce((sum, entry) => sum + effectiveFocusedMinutes(entry), 0),
    dailyTracked
  };
}

export function filterEntriesForPeriod(entries: ActivityEntry[], period: AnalyticsPeriod, now = new Date()): ActivityEntry[] {
  const today = isoDate(now);
  if (period === "today") return entries.filter((entry) => sameDate(entry.activityDate, today));

  const start = period === "week" ? startOfWeek(now) : period === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return entries.filter((entry) => {
    const date = new Date(`${entry.activityDate}T12:00:00`);
    return date >= start && date <= end;
  });
}

