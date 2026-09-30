// Covers conversational organization, recurring occurrence history, and tenant-scoped storage keys.
import { mergeOrganization } from "@/lib/lifePlan";
import { completeTaskOccurrence, expandOccurrences, occurrenceId } from "@/lib/recurrence";
import { validateOrganization } from "@/lib/reasoningContracts";
import { taskStorageKey } from "@/lib/storageKeys";
import { emptyLifePlan } from "@/types/life";

const organized = validateOrganization({
  goals: [
    { title: "Change careers", area: "Career" },
    { title: "Lose weight", area: "Health" },
  ],
  projects: [
    { title: "Photography business", area: "Creative", goalTitles: [] },
    { title: "Machine learning job search", area: "Career", goalTitles: ["Change careers"] },
  ],
  tasks: [
    {
      title: "Do taxes",
      area: "Finances",
      projectTitle: null,
      goalTitles: [],
      priority: "medium",
      prioritySource: "inferred",
      estimatedHours: 2,
      estimateSource: "inferred",
      dueDate: null,
      dueDateSource: null,
      recurrence: null,
    },
    {
      title: "Take out the trash",
      area: "Life Admin",
      projectTitle: null,
      goalTitles: [],
      priority: "medium",
      prioritySource: "inferred",
      estimatedHours: 0.25,
      estimateSource: "inferred",
      dueDate: null,
      dueDateSource: null,
      recurrence: { frequency: "weekly", interval: 1, weekdays: [2], startsOn: "2026-09-29" },
    },
  ],
  contextNotes: ["Works a nine-to-five", "Photography is a side business"],
  clarificationQuestion: null,
});

it("links goals, projects, and tasks without fabricating due dates", () => {
  const plan = mergeOrganization(emptyLifePlan(), organized, "2026-09-30T18:00:00.000Z");
  expect(plan.goals.map((goal) => goal.title)).toEqual(["Change careers", "Lose weight"]);
  expect(plan.projects.find((project) => project.title === "Machine learning job search")?.goalIds).toEqual([plan.goals[0].id]);
  expect(plan.tasks.find((task) => task.title === "Do taxes")).toMatchObject({ category: "Finances", dueDate: null, prioritySource: "inferred" });
  expect(plan.contextNotes).toContain("Works a nine-to-five");
});

it("keeps past and future recurring occurrences when one Tuesday is completed", () => {
  const plan = mergeOrganization(emptyLifePlan(), organized, "2026-09-29T08:00:00.000Z");
  const task = plan.tasks.find((item) => item.title === "Take out the trash")!;
  const expanded = expandOccurrences(plan, "2026-09-29", "2026-10-06");
  const completed = completeTaskOccurrence(expanded, task.id, "2026-09-29", "2026-09-29T20:00:00.000Z");
  expect(completed.occurrences.find((item) => item.id === occurrenceId(task.id, "2026-09-29"))?.status).toBe("done");
  expect(completed.occurrences.find((item) => item.id === occurrenceId(task.id, "2026-10-06"))?.status).toBe("pending");
  expect(completed.tasks.find((item) => item.id === task.id)?.status).toBe("To Do");
});

it("uses distinct local keys for device and account records", () => {
  expect(taskStorageKey("device")).not.toBe(taskStorageKey("user-a"));
  expect(taskStorageKey("user-a")).not.toBe(taskStorageKey("user-b"));
});
