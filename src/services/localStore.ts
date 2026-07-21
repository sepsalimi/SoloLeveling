import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { defaultPreferences, sampleActivities, sampleSessions } from "@/data/sample";

const keys = {
  activities: "life.analytics.activities",
  sessions: "life.analytics.sessions",
  preferences: "life.analytics.preferences",
  onboarded: "life.analytics.onboarded"
};

async function getJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadActivities(): Promise<ActivityEntry[]> {
  return getJson(keys.activities, sampleActivities);
}

export async function saveActivities(entries: ActivityEntry[]): Promise<void> {
  await setJson(keys.activities, entries);
}

export async function loadSessions(): Promise<CheckInSession[]> {
  return getJson(keys.sessions, sampleSessions);
}

export async function saveSessions(sessions: CheckInSession[]): Promise<void> {
  await setJson(keys.sessions, sessions);
}

export async function loadPreferences(): Promise<UserPreferences> {
  return getJson(keys.preferences, defaultPreferences);
}

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  await setJson(keys.preferences, preferences);
  await AsyncStorage.setItem(keys.onboarded, "true");
}

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(keys.onboarded)) === "true";
}

export async function exportData() {
  return {
    activities: await loadActivities(),
    sessions: await loadSessions(),
    preferences: await loadPreferences()
  };
}

