import { openDatabaseAsync } from "expo-sqlite";
import { CheckInSession } from "@/types/activity";
export type StoredCheckIn = { key: string; scope: string; synced: boolean; session: CheckInSession };
const connection = openDatabaseAsync("life-analytics.db").then(async db => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS daily_check_ins (key TEXT PRIMARY KEY, scope TEXT NOT NULL, session_date TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS daily_check_ins_scope ON daily_check_ins(scope);
    CREATE TABLE IF NOT EXISTS daily_activity_entries (key TEXT PRIMARY KEY, session_key TEXT NOT NULL, activity_date TEXT NOT NULL, title TEXT NOT NULL, duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0 AND duration_minutes <= 1440), category TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS daily_activity_date ON daily_activity_entries(activity_date);
  `);
  return db;
});
export async function writeCheckIn(record: StoredCheckIn) {
  const db = await connection;
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync("INSERT OR REPLACE INTO daily_check_ins(key,scope,session_date,payload) VALUES(?,?,?,?)", record.key, record.scope, record.session.sessionDate, JSON.stringify(record));
    await tx.runAsync("DELETE FROM daily_activity_entries WHERE session_key = ?", record.key);
    for (const entry of record.session.entries) await tx.runAsync(
      "INSERT OR REPLACE INTO daily_activity_entries(key,session_key,activity_date,title,duration_minutes,category,payload) VALUES(?,?,?,?,?,?,?)",
      record.scope + ":" + entry.id, record.key, entry.activityDate, entry.title, entry.durationMinutes, entry.primaryCategory, JSON.stringify(entry)
    );
  });
}
export async function readCheckIns(scope: string): Promise<StoredCheckIn[]> {
  const db = await connection;
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM daily_check_ins WHERE scope = ?", scope);
  return rows.map(row => JSON.parse(row.payload));
}
