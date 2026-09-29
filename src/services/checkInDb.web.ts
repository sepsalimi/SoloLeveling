import { CheckInSession } from "@/types/activity";
export type StoredCheckIn = { key: string; scope: string; synced: boolean; session: CheckInSession };
let connection: Promise<IDBDatabase> | undefined;
function openDb() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("life-analytics-check-ins", 1);
    request.onupgradeneeded = () => {
      const sessions = request.result.createObjectStore("sessions", { keyPath: "key" });
      sessions.createIndex("scope", "scope");
      const activities = request.result.createObjectStore("activities", { keyPath: "key" });
      activities.createIndex("sessionKey", "sessionKey");
      activities.createIndex("activityDate", "activityDate");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = undefined; reject(new Error("The local database could not open. Your check-in has not been saved.")); };
  });
  return connection;
}
export async function writeCheckIn(record: StoredCheckIn) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["sessions", "activities"], "readwrite");
    tx.objectStore("sessions").put(record);
    const activities = tx.objectStore("activities");
    const cursor = activities.index("sessionKey").openCursor(IDBKeyRange.only(record.key));
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (current) { current.delete(); current.continue(); }
      else for (const entry of record.session.entries) activities.put({ ...entry, key: record.scope + ":" + entry.id, sessionKey: record.key, scope: record.scope });
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error("Could not save to the database. Please keep this screen open and retry."));
    tx.onerror = () => reject(new Error("Could not save to the database. Please retry."));
  });
}
export async function readCheckIns(scope: string): Promise<StoredCheckIn[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("sessions").objectStore("sessions").index("scope").getAll(scope);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not read saved check-ins."));
  });
}
