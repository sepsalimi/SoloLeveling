import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import {
  completeCheckIn,
  deleteStoredActivity,
  loadUserData,
  saveUserPreferences,
  updateStoredActivity
} from "@/services/dataRepository";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

type AppStateValue = {
  user: User | null;
  activities: ActivityEntry[];
  sessions: CheckInSession[];
  preferences?: UserPreferences;
  authReady: boolean;
  dataReady: boolean;
  error?: string;
  refresh: () => Promise<void>;
  saveCheckIn: (sessionId: string, entries: ActivityEntry[]) => Promise<void>;
  updateActivity: (entry: ActivityEntry) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  exportAllData: () => Promise<unknown>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [sessions, setSessions] = useState<CheckInSession[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [authReady, setAuthReady] = useState(!supabase);
  const [dataReady, setDataReady] = useState(!supabase);
  const [error, setError] = useState<string>();
  const hydrateGeneration = useRef(0);

  const hydrate = useCallback(async (nextUser: User) => {
    const generation = ++hydrateGeneration.current;
    setDataReady(false);
    setError(undefined);
    const data = await loadUserData(nextUser.id);
    if (generation !== hydrateGeneration.current) return;
    setActivities(data.activities);
    setSessions(data.sessions);
    setPreferences(data.preferences);
    setDataReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        setAuthReady(true);
        if (sessionUser) {
          void hydrate(sessionUser).catch((reason) => {
            setError(reason instanceof Error ? reason.message : "Could not load account data.");
            setDataReady(true);
          });
        } else {
          setDataReady(true);
        }
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not restore the session.");
        setAuthReady(true);
        setDataReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        void hydrate(sessionUser).catch((reason) => {
          setError(reason instanceof Error ? reason.message : "Could not load account data.");
          setDataReady(true);
        });
      } else {
        hydrateGeneration.current += 1;
        setActivities([]);
        setSessions([]);
        setPreferences(undefined);
        setDataReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [hydrate]);

  const value = useMemo<AppStateValue>(
    () => ({
      user,
      activities,
      sessions,
      preferences,
      authReady,
      dataReady,
      error: !isSupabaseConfigured ? "Supabase environment variables are required." : error,
      async refresh() {
        if (user) await hydrate(user);
      },
      async saveCheckIn(sessionId, entries) {
        if (!user) throw new Error("Sign in before saving a check-in.");
        await completeCheckIn(user.id, sessionId, entries);
        await hydrate(user);
      },
      async updateActivity(entry) {
        if (!user) throw new Error("Sign in before editing an activity.");
        await updateStoredActivity(user.id, entry);
        await hydrate(user);
      },
      async deleteActivity(id) {
        await deleteStoredActivity(id);
        if (user) await hydrate(user);
      },
      async updatePreferences(nextPreferences) {
        if (!user) throw new Error("Sign in before changing preferences.");
        await saveUserPreferences(user.id, nextPreferences);
        setPreferences(nextPreferences);
      },
      async exportAllData() {
        return { activities, sessions, preferences };
      },
      async logOut() {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      },
      async deleteAccount() {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error: deleteError } = await supabase.functions.invoke("delete-account");
        if (deleteError) throw deleteError;
        await supabase.auth.signOut({ scope: "local" });
      }
    }),
    [activities, authReady, dataReady, error, hydrate, preferences, sessions, user]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}

