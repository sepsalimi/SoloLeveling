// Persists the temporary local runtime and recoverable check-in draft on this device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { defaultPreferences } from "@/data/sample";

import { loadDailyCheckIns } from "./dailyCheckIns";
import { loadTasks } from "./taskStore";
const keys = {
  draft: "life.analytics.pending-check-in",
  activities: "life.analytics.local.activities",
  sessions: "life.analytics.local.sessions",
  preferences: "life.analytics.local.preferences"
};

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export async function loadCheckInDraft(): Promise<CheckInDraft | null> {
  const raw = await AsyncStorage.getItem(keys.draft);
  return raw ? (JSON.parse(raw) as CheckInDraft) : null;
}

export async function loadActivities(): Promise<ActivityEntry[]> {
  return getJson(keys.activities, []);
}

export async function clearCheckInDraft(): Promise<void> {
  await AsyncStorage.removeItem(keys.draft);
}

export async function loadSessions(): Promise<CheckInSession[]> {
  return getJson(keys.sessions, []);
}

export async function saveLocalActivities(activities: ActivityEntry[]) {
  await AsyncStorage.setItem(keys.activities, JSON.stringify(activities));
}

export async function loadPreferences(): Promise<UserPreferences> {
  return { ...defaultPreferences, ...await getJson<Partial<UserPreferences>>(keys.preferences, {}) };
}

export async function saveLocalPreferences(preferences: UserPreferences) {
  await AsyncStorage.setItem(keys.preferences, JSON.stringify(preferences));
}

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(keys.onboarded)) === "true";
}

export async function exportData() {
  const dailyCheckIns = await loadDailyCheckIns();
  return {
    dailyCheckIns,
    tasks: await loadTasks(),
    activities: await loadActivities(),
    sessions: await loadSessions(),
    preferences: await loadPreferences()
  };
}

