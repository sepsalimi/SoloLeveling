// Account-scoped recoverable check-in drafts retain the original date and timezone across retries.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkInScope } from "./dailyCheckIns";
export type CheckInDraft = {
  id: string;
  date: string;
  capturedAt: string;
  timezone: string;
  text: string;
  clarificationQuestion?: string;
};
let writes: Promise<unknown> = Promise.resolve();
export async function readDraft(): Promise<CheckInDraft | null> {
  await writes.catch(() => {});
  const raw = await AsyncStorage.getItem("check-in-draft:" + await checkInScope());
  if (!raw) return null;
  const draft = JSON.parse(raw);
  if (!draft || typeof draft.id !== "string" || typeof draft.date !== "string" || typeof draft.text !== "string") return null;
  return {
    ...draft,
    capturedAt: typeof draft.capturedAt === "string" ? draft.capturedAt : `${draft.date}T12:00:00.000Z`,
    timezone: typeof draft.timezone === "string" ? draft.timezone : "UTC",
  };
}
export function writeDraft(draft: CheckInDraft | null) {
  const task = writes.catch(() => {}).then(async () => {
    const key = "check-in-draft:" + await checkInScope();
    if (draft) await AsyncStorage.setItem(key, JSON.stringify(draft));
    else await AsyncStorage.removeItem(key);
  });
  writes = task; return task;
}
