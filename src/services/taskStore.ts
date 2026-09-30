// Tenant-scoped local planning storage with explicit, idempotent account synchronization.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { migrateLifePlan } from "@/lib/lifePlan";
import { emptyLifePlan, LifePlan, LifeTask } from "@/types/life";
import { checkInScope } from "./dailyCheckIns";
import { supabase } from "./supabase";

const legacyKey = "life.analytics.tasks";
export const taskStorageKey = (scope: string) => `life.analytics.plan.v2:${scope}`;

async function currentScope() {
  return checkInScope();
}

export async function loadLifePlan(): Promise<LifePlan> {
  const scope = await currentScope();
  const raw = await AsyncStorage.getItem(taskStorageKey(scope));
  if (raw) return migrateLifePlan(JSON.parse(raw));
  if (scope !== "device") return emptyLifePlan();

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return emptyLifePlan();
  const migrated = migrateLifePlan(JSON.parse(legacy));
  await AsyncStorage.setItem(taskStorageKey(scope), JSON.stringify(migrated));
  return migrated;
}

export async function saveLifePlan(plan: LifePlan): Promise<"device" | "synced" | "pending"> {
  const scope = await currentScope();
  const value = { ...plan, version: 2 as const, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(taskStorageKey(scope), JSON.stringify(value));
  if (!supabase || scope === "device") return "device";
  const { error } = await supabase.from("life_plans").upsert({ user_id: scope, payload: value, updated_at: value.updatedAt });
  return error ? "pending" : "synced";
}

export async function syncLifePlan(): Promise<LifePlan> {
  const scope = await currentScope();
  if (!supabase || scope === "device") throw new Error("Sign in to sync your plan across devices.");
  const local = await loadLifePlan();
  const { data, error } = await supabase.from("life_plans").select("payload,updated_at").eq("user_id", scope).maybeSingle();
  if (error) throw new Error("Could not sync your plan. Your local copy is unchanged.");

  const remote = data?.payload ? migrateLifePlan(data.payload) : undefined;
  if (remote && remote.updatedAt > local.updatedAt) {
    await AsyncStorage.setItem(taskStorageKey(scope), JSON.stringify(remote));
    return remote;
  }
  const result = await saveLifePlan(local);
  if (result === "pending") throw new Error("Could not sync your plan. Your local copy is safe.");
  return local;
}

export async function loadTasks(): Promise<LifeTask[]> {
  return (await loadLifePlan()).tasks;
}

export async function saveTasks(tasks: LifeTask[]) {
  const plan = await loadLifePlan();
  return saveLifePlan({ ...plan, tasks });
}
