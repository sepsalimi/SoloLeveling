// Deterministic recurrence expansion and completion helpers for dated task occurrences.
import { LifePlan, LifeTask, TaskOccurrence } from "@/types/life";

function parseDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateIsValid(value: string) {
  const parsed = parseDate(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.valueOf()) && formatDate(parsed) === value;
}

function daysBetween(start: string, end: string) {
  return Math.floor((parseDate(end).valueOf() - parseDate(start).valueOf()) / 86_400_000);
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDate(date);
}

export function occurrenceId(taskId: string, date: string) {
  return `${taskId}:${date}`;
}

export function taskOccursOn(task: LifeTask, date: string) {
  const recurrence = task.recurrence;
  if (!recurrence || !dateIsValid(date)) return task.dueDate === date;
  const startsOn = recurrence.startsOn ?? task.createdAt.slice(0, 10);
  if (!dateIsValid(startsOn) || date < startsOn) return false;

  if (recurrence.frequency === "daily") {
    return daysBetween(startsOn, date) % recurrence.interval === 0;
  }
  if (recurrence.frequency === "weekly") {
    const weekday = parseDate(date).getUTCDay();
    const activeDays = recurrence.weekdays?.length ? recurrence.weekdays : [parseDate(startsOn).getUTCDay()];
    return activeDays.includes(weekday) && Math.floor(daysBetween(startsOn, date) / 7) % recurrence.interval === 0;
  }

  const day = recurrence.dayOfMonth ?? parseDate(startsOn).getUTCDate();
  const current = parseDate(date);
  const first = parseDate(startsOn);
  const monthDistance = (current.getUTCFullYear() - first.getUTCFullYear()) * 12 + current.getUTCMonth() - first.getUTCMonth();
  return current.getUTCDate() === day && monthDistance % recurrence.interval === 0;
}

export function occurrencesForRange(task: LifeTask, start: string, end: string): TaskOccurrence[] {
  if (!dateIsValid(start) || !dateIsValid(end) || end < start) throw new Error("Choose a valid task date range.");
  const dates: TaskOccurrence[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (taskOccursOn(task, date)) dates.push({ id: occurrenceId(task.id, date), taskId: task.id, scheduledFor: date, status: "pending" });
  }
  return dates;
}

export function expandOccurrences(plan: LifePlan, start: string, end: string): LifePlan {
  const known = new Map(plan.occurrences.map((occurrence) => [occurrence.id, occurrence]));
  for (const task of plan.tasks.filter((item) => item.status !== "Done" || item.recurrence)) {
    for (const occurrence of occurrencesForRange(task, start, end)) {
      if (!known.has(occurrence.id)) known.set(occurrence.id, occurrence);
    }
  }
  return { ...plan, occurrences: [...known.values()].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)) };
}

export function completeTaskOccurrence(plan: LifePlan, taskId: string, date: string, completedAt = new Date().toISOString(), actualMinutes?: number): LifePlan {
  const task = plan.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("The linked task no longer exists.");
  const id = occurrenceId(taskId, date);
  const occurrence: TaskOccurrence = { id, taskId, scheduledFor: date, status: "done", completedAt, actualMinutes };
  const occurrences = [...plan.occurrences.filter((item) => item.id !== id), occurrence].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const tasks = task.recurrence
    ? plan.tasks
    : plan.tasks.map((item) => item.id === taskId ? { ...item, status: "Done" as const, updatedAt: completedAt } : item);
  return { ...plan, tasks, occurrences, updatedAt: completedAt };
}
