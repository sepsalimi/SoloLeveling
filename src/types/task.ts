// Backward-compatible task exports backed by the shared life-planning model.
import { lifeAreas } from "./life";

export const taskCategories = lifeAreas;
export type { LifeTask, Priority } from "./life";
export type TaskCategory = (typeof taskCategories)[number];
export const taskTypes = ["⚠️ No Hours Set", "🍒 Low Hanging", "🪨 Big Rock", "☕️ Nice to Do", "🐌 Time Sink", "⚠️ Unknown Priority"] as const;
