// Shared life-planning model for areas, goals, projects, tasks, and recurring task occurrences.
export const lifeAreas = [
  "Life Admin",
  "Finances",
  "Leisure",
  "Career",
  "Health",
  "Learning",
  "Creative",
  "Relationships",
] as const;

export type LifeArea = (typeof lifeAreas)[number];
export type Priority = "low" | "medium" | "high";
export type ValueSource = "explicit" | "inferred";
export type TaskStatus = "To Do" | "In Progress" | "Done";

export type Goal = {
  id: string;
  title: string;
  area: LifeArea;
  status: "active" | "achieved" | "paused";
  createdAt: string;
};

export type Project = {
  id: string;
  title: string;
  area: LifeArea;
  status: "active" | "completed" | "paused";
  goalIds: string[];
  color: string;
  createdAt: string;
};

export type TaskRecurrence = {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekdays?: number[];
  dayOfMonth?: number;
  startsOn?: string;
};

export type LifeTask = {
  id: string;
  title: string;
  category: LifeArea;
  priority: Priority;
  estimatedHours: number | null;
  dueDate?: string | null;
  projectId?: string;
  goalIds?: string[];
  recurrence?: TaskRecurrence;
  status: TaskStatus;
  prioritySource?: ValueSource;
  estimateSource?: ValueSource;
  dueDateSource?: ValueSource;
  createdAt: string;
  updatedAt?: string;
};

export type TaskOccurrence = {
  id: string;
  taskId: string;
  scheduledFor: string;
  status: "pending" | "done" | "skipped";
  completedAt?: string;
  actualMinutes?: number;
};

export type LifePlan = {
  version: 2;
  goals: Goal[];
  projects: Project[];
  tasks: LifeTask[];
  occurrences: TaskOccurrence[];
  contextNotes: string[];
  updatedAt: string;
};

export type OrganizationResult = {
  goals: { title: string; area: LifeArea }[];
  projects: { title: string; area: LifeArea; goalTitles: string[] }[];
  tasks: {
    title: string;
    area: LifeArea;
    projectTitle: string | null;
    goalTitles: string[];
    priority: Priority;
    prioritySource: ValueSource;
    estimatedHours: number | null;
    estimateSource: ValueSource | null;
    dueDate: string | null;
    dueDateSource: ValueSource | null;
    recurrence: TaskRecurrence | null;
  }[];
  contextNotes: string[];
  clarificationQuestion: string | null;
};

export function emptyLifePlan(): LifePlan {
  return {
    version: 2,
    goals: [],
    projects: [],
    tasks: [],
    occurrences: [],
    contextNotes: [],
    updatedAt: new Date(0).toISOString(),
  };
}
