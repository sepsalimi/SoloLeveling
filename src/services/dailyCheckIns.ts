// Account-scoped local-first check-in persistence with explicit cloud synchronization state.
import { CheckInSession } from "@/types/activity";
import { migrateSession } from "@/lib/sessionMigration";
import { supabase } from "./supabase";
import { readCheckIns, writeCheckIn, StoredCheckIn } from "./checkInDb";

export async function checkInScope() {
  if (!supabase) return "device";
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Could not verify your session. Please retry.");
  return data.session?.user.id ?? "device";
}
export async function loadDailyCheckIns() {
  const records = await readCheckIns(await checkInScope());
  return records.map(record => migrateSession(record.session));
}
export async function persistDailyCheckIn(session: CheckInSession) {
  const scope = await checkInScope();
  const record: StoredCheckIn = { key: scope + ":" + session.id, scope, synced: false, session };
  await writeCheckIn(record);
  if (!supabase || scope === "device") return "Saved on this device. Your analytics are updated.";
  try {
    const { error } = await supabase.rpc("save_daily_check_in", { payload: session });
    if (error) return "Saved on this device. Cloud sync is pending; use Retry cloud sync in Settings.";
    await writeCheckIn({ ...record, synced: true });
    return "Saved to your database and synced to your account.";
  } catch { return "Saved on this device. Cloud sync is pending; use Retry cloud sync in Settings."; }
}
export async function syncDailyCheckIns() {
  const scope = await checkInScope();
  if (!supabase || scope === "device") throw new Error("Sign in to a connected Supabase account to sync. Local database records are already saved.");
  const records = await readCheckIns(scope);
  for (const record of records.filter(r => !r.synced)) {
    const { error } = await supabase.rpc("save_daily_check_in", { payload: record.session });
    if (error) throw new Error("Cloud sync is unavailable. Your local records are safe; check the database setup and try again.");
    await writeCheckIn({ ...record, synced: true });
  }
  // Fetch account-owned records so another device's check-ins also feed analytics.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("daily_check_ins").select("payload").eq("user_id", scope).order("client_id").range(offset, offset + 499);
    if (error) throw new Error("Could not load cloud check-ins. Your local records are safe.");
    for (const row of data ?? []) {
      const session = migrateSession(row.payload as CheckInSession);
      await writeCheckIn({ key: scope + ":" + session.id, scope, synced: true, session });
    }
    if (!data || data.length < 500) break;
  }
  return loadDailyCheckIns();
}
