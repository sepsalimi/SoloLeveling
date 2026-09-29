import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { exportData, loadActivities, loadPreferences, loadSessions, saveActivities, savePreferences, saveSessions } from "@/services/localStore";
import { loadDailyCheckIns, persistDailyCheckIn, syncDailyCheckIns } from "@/services/dailyCheckIns";
import { supabase } from "@/services/supabase";

type AppStateValue = {
  activities: ActivityEntry[];
  sessions: CheckInSession[];
  preferences?: UserPreferences;
  ready: boolean;
  storageError: string;
  upsertActivities: (entries: ActivityEntry[]) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  addSession: (session: CheckInSession) => Promise<void>;
  saveEvening: (session: CheckInSession) => Promise<string>;
  syncCheckIns: () => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  exportAllData: () => Promise<unknown>;
};
const AppStateContext = createContext<AppStateValue | undefined>(undefined);
export function AppStateProvider({ children }: PropsWithChildren) {
  const [legacyActivities, setActivities] = useState<ActivityEntry[]>([]);
  const [legacySessions, setSessions] = useState<CheckInSession[]>([]);
  const [dailySessions, setDailySessions] = useState<CheckInSession[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([loadActivities(), loadSessions(), loadPreferences()])
      .then(([entries, sessions, prefs]) => { if (active) { setActivities(entries); setSessions(sessions); setPreferences(prefs); setReady(true); } })
      .catch(() => { if (active) setStorageError("Could not load your saved data. Reload to try again."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let generation = 0;
    let active = true;
    const reload = () => {
      const current = ++generation;
      setDailySessions([]);
      void loadDailyCheckIns().then(sessions => { if (active && current === generation) setDailySessions(sessions); })
        .catch(() => { if (active) setStorageError("Could not read the check-in database. Reload to try again."); });
    };
    reload();
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(reload, 0); });
    return () => { active = false; generation++; subscription?.data.subscription.unsubscribe(); };
  }, []);
  const value = useMemo<AppStateValue>(() => {
    const dailyEntries = dailySessions.flatMap(s => s.entries);
    const activities = [...legacyActivities.filter(a => !dailyEntries.some(d => d.id === a.id)), ...dailyEntries];
    return {
      activities, sessions: [...legacySessions, ...dailySessions], preferences, ready, storageError,
      async upsertActivities(entries) {
        const next = [...legacyActivities.filter(entry => !entries.some(item => item.id === entry.id)), ...entries];
        await saveActivities(next); setActivities(next);
      },
      async deleteActivity(id) {
        const session = dailySessions.find(s => s.entries.some(e => e.id === id));
        if (session) {
          const next = { ...session, entries: session.entries.filter(e => e.id !== id) };
          await persistDailyCheckIn(next);
          setDailySessions(items => items.map(s => s.id === next.id ? next : s));
        } else {
          const next = legacyActivities.filter(entry => entry.id !== id);
          await saveActivities(next); setActivities(next);
        }
      },
      async addSession(session) {
        const next = [session, ...legacySessions.filter(item => item.id !== session.id)];
        await saveSessions(next); setSessions(next);
      },
      async saveEvening(session) {
        const message = await persistDailyCheckIn(session);
        setDailySessions(items => [...items.filter(s => s.id !== session.id), session]);
        return message;
      },
      async syncCheckIns() { setDailySessions(await syncDailyCheckIns()); },
      async updatePreferences(next) { await savePreferences(next); setPreferences(next); },
      exportAllData: exportData,
    };
  }, [legacyActivities, legacySessions, dailySessions, preferences, ready, storageError]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
