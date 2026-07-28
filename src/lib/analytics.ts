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
  dailyTracked: { date: string; minutes: number }[];
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
    socialMinutes: entries
      .filter((entry) => ["with_partner", "with_family", "with_friends", "with_coworkers"].includes(entry.socialContext))
      .reduce((sum, entry) => sum + entry.durationMinutes, 0),
    averageEfficiency: efficiencies.length
      ? Math.round(efficiencies.reduce((sum, value) => sum + value, 0) / efficiencies.length)
      : undefined,
    effectiveFocusedMinutes: entries.reduce((sum, entry) => sum + effectiveFocusedMinutes(entry), 0),
    dailyTracked
  };
}

export function filterEntriesForPeriod(entries: ActivityEntry[], period: AnalyticsPeriod, now = new Date()): ActivityEntry[] {
  const { start, end } = periodBounds(period, now);
  return filterBetween(entries, start, end);
}

export function filterEntriesForPreviousPeriod(entries: ActivityEntry[], period: AnalyticsPeriod, now = new Date()) {
  const { start, end } = previousPeriodBounds(period, now);
  return filterBetween(entries, start, end);
}

export function trackedSeries(entries: ActivityEntry[], period: AnalyticsPeriod, now = new Date()) {
  const { start, end } = periodBounds(period, now);
  if (period === "ytd") {
    const months: { date: string; minutes: number }[] = [];
    for (let month = 0; month <= end.getMonth(); month += 1) {
      const key = `${end.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
      months.push({
        date: key,
        minutes: entries
          .filter((entry) => entry.activityDate.startsWith(key))
          .reduce((sum, entry) => sum + entry.durationMinutes, 0)
      });
    }
    return months;
  }

  const dates: { date: string; minutes: number }[] = [];
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const key = isoDate(date);
    dates.push({
      date: key,
      minutes: entries.filter((entry) => sameDate(entry.activityDate, key)).reduce((sum, entry) => sum + entry.durationMinutes, 0)
    });
  }
  return dates;
}

function periodBounds(period: AnalyticsPeriod, now: Date) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start =
    period === "today"
      ? new Date(end)
      : period === "week"
        ? startOfWeek(end)
        : period === "month"
          ? new Date(end.getFullYear(), end.getMonth(), 1)
          : new Date(end.getFullYear(), 0, 1);
  return { start, end };
}

function previousPeriodBounds(period: AnalyticsPeriod, now: Date) {
  const current = periodBounds(period, now);
  if (period === "today") {
    const day = addDays(current.start, -1);
    return { start: day, end: day };
  }
  if (period === "week") {
    return { start: addDays(current.start, -7), end: addDays(current.end, -7) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    return { start, end: new Date(start.getFullYear(), start.getMonth(), Math.min(now.getDate(), lastDay)) };
  }
  return {
    start: new Date(now.getFullYear() - 1, 0, 1),
    end: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  };
}

function filterBetween(entries: ActivityEntry[], start: Date, end: Date) {
  const first = isoDate(start);
  const last = isoDate(end);
  return entries.filter((entry) => entry.activityDate >= first && entry.activityDate <= last);
}

