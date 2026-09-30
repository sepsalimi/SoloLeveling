// Tenant-scoped legacy records and preferences kept separate from the normalized daily database.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeArea } from "@/lib/areas";
import { migrateSession } from "@/lib/sessionMigration";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { defaultPreferences } from "@/data/sample";
import { checkInScope, loadDailyCheckIns } from "./dailyCheckIns";
import { loadLifePlan } from "./taskStore";

const prefix = "life.analytics.local.v2";
const legacy = {
  activities: ["life.analytics.activities", "life.analytics.local.activities"],
  sessions: ["life.analytics.sessions", "life.analytics.local.sessions"],
  preferences: ["life.analytics.preferences", "life.analytics.local.preferences"],
  onboarded: ["life.analytics.onboarded"],
};

async function storageKey(name: string) {
  return `${prefix}:${await checkInScope()}:${name}`;
}

async function loadJson<T>(name: string, fallback: T): Promise<T> {
  const key = await storageKey(name);
  const raw = await AsyncStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  if ((await checkInScope()) !== "device") return fallback;
  for (const oldKey of legacy[name as keyof typeof legacy] ?? []) {
    const old = await AsyncStorage.getItem(oldKey);
    if (old) {
      await AsyncStorage.setItem(key, old);
      return JSON.parse(old) as T;
    }
  }
  return fallback;
}

async function setJson<T>(name: string, value: T) {
  await AsyncStorage.setItem(await storageKey(name), JSON.stringify(value));
}

export async function loadActivities(): Promise<ActivityEntry[]> {
  const entries = await loadJson<ActivityEntry[]>("activities", []);
  return entries.map((entry) => ({ ...entry, primaryCategory: normalizeArea(entry.primaryCategory), outcome: entry.outcome ?? "completed" }));
}

export async function saveActivities(entries: ActivityEntry[]) {
  await setJson("activities", entries);
}

export async function loadSessions(): Promise<CheckInSession[]> {
  return (await loadJson<CheckInSession[]>("sessions", [])).map(migrateSession);
}

export async function saveSessions(sessions: CheckInSession[]) {
  await setJson("sessions", sessions);
}

export async function loadPreferences(): Promise<UserPreferences> {
  return { ...defaultPreferences, ...await loadJson<Partial<UserPreferences>>("preferences", {}) };
}

export async function savePreferences(preferences: UserPreferences) {
  await setJson("preferences", preferences);
  await AsyncStorage.setItem(await storageKey("onboarded"), "true");
}

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(await storageKey("onboarded"))) === "true";
}

export async function exportData() {
  return {
    dailyCheckIns: await loadDailyCheckIns(),
    lifePlan: await loadLifePlan(),
    activities: await loadActivities(),
    sessions: await loadSessions(),
    preferences: await loadPreferences(),
  };
}

