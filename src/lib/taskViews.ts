// Selects the tasks that belong in each Plan shortcut.
import { occurrenceId, taskOccursOn } from "./recurrence";
import { LifePlan, LifeTask } from "@/types/life";

export const planShortcuts = ["Open", "Inbox", "Today", "Tomorrow", "Next 7 Days", "Completed"] as const;
export type PlanShortcut = (typeof planShortcuts)[number];
export type PlanView = PlanShortcut | `project:${string}`;

export function tasksForView(plan: LifePlan, view: PlanView, today: string, tomorrow: string, weekEnd: string): LifeTask[] {
  return plan.tasks.filter((task) => {
    const doneToday = plan.occurrences.find((item) => item.id === occurrenceId(task.id, today))?.status === "done";
    if (view === "Completed") return task.status === "Done" || plan.occurrences.some((item) => item.taskId === task.id && item.status === "done");
    if (task.status === "Done") return false;
    if (view === "Open") return true;
    if (view === "Inbox") return !task.projectId && !task.dueDate && !task.recurrence;
    if (view === "Today") return !doneToday && (task.dueDate === today || taskOccursOn(task, today));
    if (view === "Tomorrow") return task.dueDate === tomorrow || taskOccursOn(task, tomorrow);
    if (view === "Next 7 Days") {
      return Boolean((task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd)
        || plan.occurrences.some((item) => item.taskId === task.id && item.scheduledFor >= today && item.scheduledFor <= weekEnd && item.status === "pending"));
    }
    return task.projectId === view.slice("project:".length);
  });
}
