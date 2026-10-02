import { shortDate } from "../src/lib/dates";
import { tasksForView } from "../src/lib/taskViews";
import { emptyLifePlan, LifeTask } from "../src/types/life";

function task(patch: Partial<LifeTask> & Pick<LifeTask, "id" | "title">): LifeTask {
  return {
    category: "Learning",
    priority: "medium",
    estimatedHours: 1,
    status: "To Do",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...patch,
  };
}

it("shows undated open tasks without hiding them behind today", () => {
  const plan = emptyLifePlan();
  plan.tasks = [
    task({ id: "study", title: "Study the branch" }),
    task({ id: "due", title: "Send photos", dueDate: "2026-10-02", status: "In Progress" }),
    task({ id: "done", title: "Find baklava", status: "Done" }),
  ];
  const open = tasksForView(plan, "Open", "2026-10-01", "2026-10-02", "2026-10-08").map((item) => item.title);
  const today = tasksForView(plan, "Today", "2026-10-01", "2026-10-02", "2026-10-08").map((item) => item.title);
  expect(open).toEqual(["Study the branch", "Send photos"]);
  expect(today).toEqual([]);
  expect(shortDate("2026-10-02", new Date("2026-06-01T00:00:00Z"))).toBe("Oct 2");
});
