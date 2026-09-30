// Life-plan migration and merge logic for model-organized goals, projects, and tasks.
import { emptyLifePlan, LifeArea, LifePlan, LifeTask, OrganizationResult, lifeAreas } from "@/types/life";

const projectColors = ["#FFD447", "#FF7F6E", "#67D7BE", "#A998FF", "#75C9FF", "#F3A5ED"];

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stableId(prefix: string, ...values: string[]) {
  const value = values.map(normalized).join("|");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

export function canonicalLifeArea(value: unknown): LifeArea {
  if (value === "Finance") return "Finances";
  if (typeof value === "string" && lifeAreas.includes(value as LifeArea)) return value as LifeArea;
  return "Life Admin";
}

export function migrateLifePlan(value: unknown): LifePlan {
  const now = new Date().toISOString();
  if (Array.isArray(value)) {
    return {
      ...emptyLifePlan(),
      tasks: value
        .filter((task): task is Record<string, unknown> => Boolean(task && typeof task === "object"))
        .map((task, index) => ({
          id: typeof task.id === "string" ? task.id : `legacy-task-${index}`,
          title: typeof task.title === "string" ? task.title : "Untitled task",
          category: canonicalLifeArea(task.category),
          priority: task.priority === "low" || task.priority === "high" ? task.priority : "medium",
          estimatedHours: typeof task.estimatedHours === "number" && task.estimatedHours > 0 ? task.estimatedHours : null,
          dueDate: typeof task.dueDate === "string" ? task.dueDate : null,
          status: task.status === "In Progress" || task.status === "Done" ? task.status : "To Do",
          createdAt: typeof task.createdAt === "string" ? task.createdAt : now,
          updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : undefined,
        })),
      updatedAt: now,
    };
  }
  if (!value || typeof value !== "object") return emptyLifePlan();
  const plan = value as Partial<LifePlan>;
  return {
    version: 2,
    goals: Array.isArray(plan.goals) ? plan.goals.map((goal) => ({ ...goal, area: canonicalLifeArea(goal.area) })) : [],
    projects: Array.isArray(plan.projects) ? plan.projects.map((project) => ({ ...project, area: canonicalLifeArea(project.area), goalIds: project.goalIds ?? [] })) : [],
    tasks: Array.isArray(plan.tasks) ? plan.tasks.map((task) => ({ ...task, category: canonicalLifeArea(task.category), goalIds: task.goalIds ?? [] })) : [],
    occurrences: Array.isArray(plan.occurrences) ? plan.occurrences : [],
    contextNotes: Array.isArray(plan.contextNotes) ? plan.contextNotes.filter((note): note is string => typeof note === "string") : [],
    updatedAt: typeof plan.updatedAt === "string" ? plan.updatedAt : now,
  };
}

export function mergeOrganization(plan: LifePlan, result: OrganizationResult, now = new Date().toISOString()): LifePlan {
  const goals = [...plan.goals];
  for (const item of result.goals) {
    const existing = goals.find((goal) => normalized(goal.title) === normalized(item.title));
    if (existing) {
      existing.area = item.area;
      existing.status = "active";
    } else {
      goals.push({ id: stableId("goal", item.area, item.title), title: item.title.trim(), area: item.area, status: "active", createdAt: now });
    }
  }

  const goalId = (title: string) => goals.find((goal) => normalized(goal.title) === normalized(title))?.id;
  const projects = [...plan.projects];
  for (const item of result.projects) {
    const linkedGoals = item.goalTitles.map(goalId).filter((id): id is string => Boolean(id));
    const existing = projects.find((project) => normalized(project.title) === normalized(item.title));
    if (existing) {
      existing.area = item.area;
      existing.goalIds = [...new Set([...existing.goalIds, ...linkedGoals])];
      existing.status = "active";
    } else {
      projects.push({
        id: stableId("project", item.area, item.title),
        title: item.title.trim(),
        area: item.area,
        status: "active",
        goalIds: linkedGoals,
        color: projectColors[projects.length % projectColors.length],
        createdAt: now,
      });
    }
  }

  const projectId = (title: string | null) => title
    ? projects.find((project) => normalized(project.title) === normalized(title))?.id
    : undefined;
  const tasks = [...plan.tasks];
  for (const item of result.tasks) {
    const linkedProject = projectId(item.projectTitle);
    const linkedGoals = item.goalTitles.map(goalId).filter((id): id is string => Boolean(id));
    const existing = tasks.find((task) =>
      normalized(task.title) === normalized(item.title)
      && (task.projectId ?? "") === (linkedProject ?? ""));
    const update: Partial<LifeTask> = {
      title: item.title.trim(),
      category: item.area,
      priority: item.priority,
      prioritySource: item.prioritySource,
      estimatedHours: item.estimatedHours,
      estimateSource: item.estimateSource ?? undefined,
      dueDate: item.dueDate,
      dueDateSource: item.dueDateSource ?? undefined,
      projectId: linkedProject,
      goalIds: linkedGoals,
      recurrence: item.recurrence ?? undefined,
      updatedAt: now,
    };
    if (existing) Object.assign(existing, update);
    else {
      tasks.push({
        id: stableId("task", item.area, item.projectTitle ?? "", item.title),
        title: item.title.trim(),
        category: item.area,
        priority: item.priority,
        estimatedHours: item.estimatedHours,
        status: "To Do",
        createdAt: now,
        ...update,
      });
    }
  }

  return {
    version: 2,
    goals,
    projects,
    tasks,
    occurrences: plan.occurrences,
    contextNotes: [...new Set([...plan.contextNotes, ...result.contextNotes.map((note) => note.trim()).filter(Boolean)])],
    updatedAt: now,
  };
}
