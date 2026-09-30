// Runtime contracts for life-organization and dated check-in model responses.
import { z } from "zod";
import { activityCategories, ActivityCategory } from "@/types/activity";
import { lifeAreas, OrganizationResult } from "@/types/life";

const validDate = (value: string) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(parsed.valueOf())
    && parsed.toISOString().slice(0, 10) === value;
};

const shortText = z.string().trim().min(1).max(200);
const date = z.string().refine(validDate, "Invalid calendar date");
const area = z.enum(lifeAreas);
const source = z.enum(["explicit", "inferred"]);
const recurrence = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startsOn: date.optional(),
}).strict();

const organizationSchema = z.object({
  goals: z.array(z.object({ title: shortText, area }).strict()).max(50),
  projects: z.array(z.object({ title: shortText, area, goalTitles: z.array(shortText).max(20) }).strict()).max(50),
  tasks: z.array(z.object({
    title: shortText,
    area,
    projectTitle: shortText.nullable(),
    goalTitles: z.array(shortText).max(20),
    priority: z.enum(["low", "medium", "high"]),
    prioritySource: source,
    estimatedHours: z.number().positive().max(1000).nullable(),
    estimateSource: source.nullable(),
    dueDate: date.nullable(),
    dueDateSource: source.nullable(),
    recurrence: recurrence.nullable(),
  }).strict()).max(100),
  contextNotes: z.array(z.string().trim().min(1).max(500)).max(30),
  clarificationQuestion: z.string().trim().min(1).max(240).nullable(),
}).strict();

export type ReasonedActivity = {
  title: string;
  minutes: number | null;
  category: ActivityCategory;
  source: string;
  occurredOn: string;
  taskId?: string;
  projectId?: string;
  outcome: "completed" | "partial";
};

export type CheckInReasoning = {
  activities: ReasonedActivity[];
  clarificationQuestion: string | null;
};

const activitySchema = z.object({
  title: shortText,
  minutes: z.number().int().min(1).max(1440).nullable(),
  category: z.enum(activityCategories),
  source: z.string().min(1).max(12000),
  occurredOn: date,
  taskId: z.string().min(1).max(200).optional(),
  projectId: z.string().min(1).max(200).optional(),
  outcome: z.enum(["completed", "partial"]),
}).strict();

const checkInSchema = z.object({
  activities: z.array(activitySchema).max(100),
  clarificationQuestion: z.string().trim().min(1).max(240).nullable(),
}).strict();

export function validateOrganization(value: unknown): OrganizationResult {
  return organizationSchema.parse(value);
}

export function validateCheckInReasoning(value: unknown, options: {
  captureDate: string;
  taskIds?: ReadonlySet<string>;
  projectIds?: ReadonlySet<string>;
}): CheckInReasoning {
  const result = checkInSchema.parse(value);
  const totals = new Map<string, number>();
  for (const item of result.activities) {
    if (item.occurredOn > options.captureDate) throw new Error("Check-in activities cannot be dated in the future.");
    if (item.taskId && options.taskIds && !options.taskIds.has(item.taskId)) throw new Error("Check-in referenced an unknown task.");
    if (item.projectId && options.projectIds && !options.projectIds.has(item.projectId)) throw new Error("Check-in referenced an unknown project.");
    totals.set(item.occurredOn, (totals.get(item.occurredOn) ?? 0) + (item.minutes ?? 0));
  }
  if ([...totals.values()].some((minutes) => minutes > 1440)) throw new Error("Activity durations exceed one day.");
  return result;
}
