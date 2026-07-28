// Persists the temporary local runtime and recoverable check-in draft on this device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultPreferences } from "@/data/sample";
import { ActivityEntry, CheckInDraft, CheckInSession, UserPreferences } from "@/types/activity";

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

export async function saveCheckInDraft(draft: CheckInDraft): Promise<void> {
  await AsyncStorage.setItem(keys.draft, JSON.stringify(draft));
}

export async function clearCheckInDraft(): Promise<void> {
  await AsyncStorage.removeItem(keys.draft);
}

export async function loadLocalData() {
  const [activities, sessions, preferences] = await Promise.all([
    loadJson<ActivityEntry[]>(keys.activities, []),
    loadJson<CheckInSession[]>(keys.sessions, []),
    loadJson<UserPreferences>(keys.preferences, defaultPreferences)
  ]);
  return { activities, sessions, preferences };
}

export async function saveLocalActivities(activities: ActivityEntry[]) {
  await AsyncStorage.setItem(keys.activities, JSON.stringify(activities));
}

export async function saveLocalSessions(sessions: CheckInSession[]) {
  await AsyncStorage.setItem(keys.sessions, JSON.stringify(sessions));
}

export async function saveLocalPreferences(preferences: UserPreferences) {
  await AsyncStorage.setItem(keys.preferences, JSON.stringify(preferences));
}

export async function clearLocalData() {
  await AsyncStorage.multiRemove(Object.values(keys));
}

