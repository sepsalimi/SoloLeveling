// Persists only an unfinished check-in so a failed upload can be retried.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckInDraft } from "@/types/activity";

const draftKey = "life.analytics.pending-check-in";

export async function loadCheckInDraft(): Promise<CheckInDraft | null> {
  const raw = await AsyncStorage.getItem(draftKey);
  return raw ? (JSON.parse(raw) as CheckInDraft) : null;
}

export async function saveCheckInDraft(draft: CheckInDraft): Promise<void> {
  await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
}

export async function clearCheckInDraft(): Promise<void> {
  await AsyncStorage.removeItem(draftKey);
}

