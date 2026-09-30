// Application state combines tenant-scoped legacy data with normalized local-first daily check-ins.
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { exportData, loadActivities, loadPreferences, loadSessions, saveActivities, savePreferences, saveSessions } from "@/services/localStore";
import { loadDailyCheckIns, persistDailyCheckIn, syncDailyCheckIns } from "@/services/dailyCheckIns";
import { supabase } from "@/services/supabase";

type AppStateValue = {
  user: User | null;
  activities: ActivityEntry[];
  sessions: CheckInSession[];
  preferences?: UserPreferences;
  ready: boolean;
  storageError: string;
  upsertActivities: (entries: ActivityEntry[]) => Promise<void>;
  updateActivity: (entry: ActivityEntry) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  updateUntimedActivity: (entry: NonNullable<CheckInSession["untimedActivities"]>[number]) => Promise<void>;
  deleteUntimedActivity: (id: string) => Promise<void>;
  addSession: (session: CheckInSession) => Promise<void>;
  saveEvening: (session: CheckInSession) => Promise<string>;
  syncCheckIns: () => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  exportAllData: () => Promise<unknown>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const AppStateContext = createContext<AppStateValue | undefined>(undefined);
export function AppStateProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [legacyActivities, setActivities] = useState<ActivityEntry[]>([]);
  const [legacySessions, setSessions] = useState<CheckInSession[]>([]);
  const [dailySessions, setDailySessions] = useState<CheckInSession[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const reload = useCallback(async () => {
    setStorageError("");
    const [auth, entries, sessions, prefs, daily] = await Promise.all([
      supabase?.auth.getSession(),
      loadActivities(),
      loadSessions(),
      loadPreferences(),
      loadDailyCheckIns(),
    ]);
    if (auth?.error) throw auth.error;
    setUser(auth?.data.session?.user ?? null);
    setActivities(entries);
    setSessions(sessions);
    setPreferences(prefs);
    setDailySessions(daily);
    setReady(true);
  }, []);

  useEffect(() => {
    let generation = 0;
    let active = true;
    const refresh = () => {
      const current = ++generation;
      setReady(false);
      setDailySessions([]);
      void reload()
        .catch(() => {
          if (active && current === generation) setStorageError("Could not load your private data. Reload to try again.");
        });
    };
    refresh();
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(refresh, 0); });
    return () => { active = false; generation++; subscription?.data.subscription.unsubscribe(); };
  }, [reload]);

  const value = useMemo<AppStateValue>(() => {
    const dailyEntries = dailySessions.flatMap(s => s.entries);
    const activities = [...legacyActivities.filter(a => !dailyEntries.some(d => d.id === a.id)), ...dailyEntries];
    return {
      user, activities, sessions: [...legacySessions, ...dailySessions], preferences, ready, storageError,
      async upsertActivities(entries) {
        const next = [...legacyActivities.filter(entry => !entries.some(item => item.id === entry.id)), ...entries];
        await saveActivities(next); setActivities(next);
      },
      async updateActivity(entry) {
        const session = dailySessions.find((item) => item.entries.some((candidate) => candidate.id === entry.id));
        if (session) {
          const next = { ...session, entries: session.entries.map((candidate) => candidate.id === entry.id ? entry : candidate) };
          await persistDailyCheckIn(next);
          setDailySessions((items) => items.map((item) => item.id === next.id ? next : item));
          return;
        }
        const next = legacyActivities.map((candidate) => candidate.id === entry.id ? entry : candidate);
        await saveActivities(next);
        setActivities(next);
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
      async deleteUntimedActivity(id) {
        const session = dailySessions.find((item) => item.untimedActivities?.some((entry) => entry.id === id));
        if (!session) throw new Error("The untimed activity no longer exists.");
        const next = { ...session, untimedActivities: session.untimedActivities?.filter((entry) => entry.id !== id) };
        await persistDailyCheckIn(next);
        setDailySessions((items) => items.map((item) => item.id === next.id ? next : item));
      },
      async updateUntimedActivity(entry) {
        const session = dailySessions.find((item) => item.untimedActivities?.some((candidate) => candidate.id === entry.id));
        if (!session) throw new Error("The untimed activity no longer exists.");
        const next = { ...session, untimedActivities: session.untimedActivities?.map((candidate) => candidate.id === entry.id ? entry : candidate) };
        await persistDailyCheckIn(next);
        setDailySessions((items) => items.map((item) => item.id === next.id ? next : item));
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
      async logOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async deleteAccount() {
        if (!supabase || !user) throw new Error("Sign in before deleting an account.");
        const { error } = await supabase.functions.invoke("delete-account");
        if (error) throw new Error("Account deletion did not complete.");
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      },
    };
  }, [user, legacyActivities, legacySessions, dailySessions, preferences, ready, storageError]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
