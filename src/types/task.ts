export const taskCategories = ["Life Admin", "Leisure", "Finance", "Career", "Health", "Learning", "Creative", "Relationships"] as const;
export type TaskCategory = (typeof taskCategories)[number];
export type Priority = "low" | "medium" | "high";
export type LifeTask = {
  id: string;
  title: string;
  category: TaskCategory;
  priority: Priority;
  estimatedHours: number | null;
  status: "To Do" | "In Progress" | "Done";
  createdAt: string;
};
export const taskTypes = ["⚠️ No Hours Set", "🍒 Low Hanging", "🪨 Big Rock", "☕️ Nice to Do", "🐌 Time Sink", "⚠️ Unknown Priority"] as const;
