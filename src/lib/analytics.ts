// Exact actual-time aggregation with honest range capacity and canonical area totals.
import { ActivityEntry, AnalyticsPeriod, PurposeTag } from "@/types/activity";
import { addDays, isoDate, sameDate, startOfWeek } from "@/lib/dates";
import { normalizeArea } from "./areas";

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
  if (!entry.purposeTags.includes("productive") || entry.efficiencyPercent == null) return 0;
  return Math.round(entry.durationMinutes * (entry.efficiencyPercent / 100));
}

export function summarizeActivities(entries: ActivityEntry[], window?: { start: Date; end: Date }): AnalyticsSummary {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const byCategory: Record<string, number> = {};
  const byPurpose = { productive: 0, fun: 0, recovery: 0, necessary: 0, growth: 0 };
  const efficiencies = entries
    .map((entry) => entry.efficiencyPercent)
    .filter((value): value is number => typeof value === "number");

  for (const entry of entries) {
    const category = normalizeArea(entry.primaryCategory);
    byCategory[category] = (byCategory[category] ?? 0) + entry.durationMinutes;
    for (const tag of entry.purposeTags) byPurpose[tag] += entry.durationMinutes;
  }

  const start = window?.start ?? new Date();
  const end = window?.end ?? start;
  const days: string[] = [];
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) days.push(isoDate(date));
  const dailyTracked = days.map((date) => ({
    date,
    minutes: entries.filter((entry) => sameDate(entry.activityDate, date)).reduce((sum, entry) => sum + entry.durationMinutes, 0)
  }));

  return {
    totalMinutes,
    untrackedMinutes: Math.max(0, days.length * 24 * 60 - totalMinutes),
    byCategory,
    byPurpose,
    soloMinutes: entries.filter((entry) => entry.socialContext === "solo").reduce((sum, entry) => sum + entry.durationMinutes, 0),
    socialMinutes: entries.filter((entry) => entry.socialContext !== "solo" && entry.socialContext !== "unknown").reduce((sum, entry) => sum + entry.durationMinutes, 0),
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

export function customPeriodBounds(start: string, end: string) {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
    || Number.isNaN(first.valueOf()) || Number.isNaN(last.valueOf()) || first > last) {
    throw new Error("Choose a valid custom date range.");
  }
  return { start: first, end: last };
}

export function filterEntriesForRange(entries: ActivityEntry[], start: string, end: string) {
  const bounds = customPeriodBounds(start, end);
  return filterBetween(entries, bounds.start, bounds.end);
}

export function trackedSeriesForRange(entries: ActivityEntry[], start: string, end: string) {
  const bounds = customPeriodBounds(start, end);
  const dates: { date: string; minutes: number }[] = [];
  for (let date = new Date(bounds.start); date <= bounds.end; date = addDays(date, 1)) {
    const key = isoDate(date);
    dates.push({ date: key, minutes: entries.filter((entry) => sameDate(entry.activityDate, key)).reduce((sum, entry) => sum + entry.durationMinutes, 0) });
  }
  return dates;
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

export function periodBounds(period: AnalyticsPeriod, now: Date) {
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

