import AsyncStorage from "@react-native-async-storage/async-storage";
import { LifeTask, taskCategories } from "@/types/task";
const key = "life.analytics.tasks";
export async function loadTasks(): Promise<LifeTask[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(t => t && typeof t.id === "string" && typeof t.title === "string" && taskCategories.includes(t.category) && ["low", "medium", "high"].includes(t.priority) && ["To Do", "In Progress", "Done"].includes(t.status) && (t.estimatedHours === null || (typeof t.estimatedHours === "number" && Number.isFinite(t.estimatedHours) && t.estimatedHours > 0)))) throw new Error("Saved tasks could not be read. Your stored data has not been changed.");
  return value;
}
export async function saveTasks(tasks: LifeTask[]) { await AsyncStorage.setItem(key, JSON.stringify(tasks)); }
