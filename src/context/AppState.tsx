import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import {
  exportData,
  loadActivities,
  loadPreferences,
  loadSessions,
  saveActivities,
  savePreferences,
  saveSessions
} from "@/services/localStore";

type AppStateValue = {
  activities: ActivityEntry[];
  sessions: CheckInSession[];
  preferences?: UserPreferences;
  ready: boolean;
  upsertActivities: (entries: ActivityEntry[]) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  addSession: (session: CheckInSession) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  exportAllData: () => Promise<unknown>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [sessions, setSessions] = useState<CheckInSession[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadActivities(), loadSessions(), loadPreferences()]).then(([activityData, sessionData, preferenceData]) => {
      setActivities(activityData);
      setSessions(sessionData);
      setPreferences(preferenceData);
      setReady(true);
    });
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      activities,
      sessions,
      preferences,
      ready,
      async upsertActivities(entries) {
        const next = [...activities.filter((entry) => !entries.some((item) => item.id === entry.id)), ...entries];
        setActivities(next);
        await saveActivities(next);
      },
      async deleteActivity(id) {
        const next = activities.filter((entry) => entry.id !== id);
        setActivities(next);
        await saveActivities(next);
      },
      async addSession(session) {
        const next = [session, ...sessions.filter((item) => item.id !== session.id)];
        setSessions(next);
        await saveSessions(next);
      },
      async updatePreferences(nextPreferences) {
        setPreferences(nextPreferences);
        await savePreferences(nextPreferences);
      },
      exportAllData: exportData
    }),
    [activities, preferences, ready, sessions]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}

