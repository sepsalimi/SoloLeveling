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
import { isLocalMode } from "@/services/runtime";
import {
  clearLocalData,
  loadLocalData,
  saveLocalActivities,
  saveLocalPreferences,
  saveLocalSessions
} from "@/services/localStore";
import { isoDate } from "@/lib/dates";

const localUser = { id: "local-user" } as User;

type AppStateValue = {
  user: User | null;
  activities: ActivityEntry[];
  sessions: CheckInSession[];
  preferences?: UserPreferences;
  authReady: boolean;
  dataReady: boolean;
  localMode: boolean;
  error?: string;
  refresh: () => Promise<void>;
  saveCheckIn: (sessionId: string, entries: ActivityEntry[], transcripts?: string[]) => Promise<void>;
  updateActivity: (entry: ActivityEntry) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  exportAllData: () => Promise<unknown>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(isLocalMode ? localUser : null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [sessions, setSessions] = useState<CheckInSession[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [authReady, setAuthReady] = useState(isLocalMode || !supabase);
  const [dataReady, setDataReady] = useState(!isLocalMode && !supabase);
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
    if (isLocalMode) {
      loadLocalData()
        .then((data) => {
          setActivities(data.activities);
          setSessions(data.sessions);
          setPreferences(data.preferences);
          setDataReady(true);
        })
        .catch((reason) => {
          setError(reason instanceof Error ? reason.message : "Could not load local data.");
          setDataReady(true);
        });
      return;
    }
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
      localMode: isLocalMode,
      error: !isLocalMode && !isSupabaseConfigured ? "Supabase environment variables are required." : error,
      async refresh() {
        if (isLocalMode) {
          const data = await loadLocalData();
          setActivities(data.activities);
          setSessions(data.sessions);
          setPreferences(data.preferences);
        } else if (user) {
          await hydrate(user);
        }
      },
      async saveCheckIn(sessionId, entries, transcripts = []) {
        if (!user) throw new Error("Sign in before saving a check-in.");
        if (isLocalMode) {
          const approved = entries.map((entry, index) => ({
            ...entry,
            id: `local-${Date.now()}-${index}`,
            sessionId,
            needsReview: false
          }));
          const nextActivities = [...activities.filter((entry) => entry.sessionId !== sessionId), ...approved];
          const nextSessions: CheckInSession[] = [
            {
              id: sessionId,
              sessionDate: isoDate(),
              sessionType: "manual",
              status: "completed",
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              transcripts,
              entries: approved,
              unresolvedIssues: []
            },
            ...sessions.filter((session) => session.id !== sessionId)
          ];
          await Promise.all([saveLocalActivities(nextActivities), saveLocalSessions(nextSessions)]);
          setActivities(nextActivities);
          setSessions(nextSessions);
          return;
        }
        await completeCheckIn(user.id, sessionId, entries);
        await hydrate(user);
      },
      async updateActivity(entry) {
        if (!user) throw new Error("Sign in before editing an activity.");
        if (isLocalMode) {
          const next = activities.map((item) => item.id === entry.id ? entry : item);
          await saveLocalActivities(next);
          setActivities(next);
          return;
        }
        await updateStoredActivity(user.id, entry);
        await hydrate(user);
      },
      async deleteActivity(id) {
        if (isLocalMode) {
          const next = activities.filter((entry) => entry.id !== id);
          await saveLocalActivities(next);
          setActivities(next);
          return;
        }
        await deleteStoredActivity(id);
        if (user) await hydrate(user);
      },
      async updatePreferences(nextPreferences) {
        if (!user) throw new Error("Sign in before changing preferences.");
        if (isLocalMode) {
          await saveLocalPreferences(nextPreferences);
          setPreferences(nextPreferences);
          return;
        }
        await saveUserPreferences(user.id, nextPreferences);
        setPreferences(nextPreferences);
      },
      async exportAllData() {
        return { activities, sessions, preferences };
      },
      async logOut() {
        if (isLocalMode) return;
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      },
      async deleteAccount() {
        if (isLocalMode) {
          await clearLocalData();
          setActivities([]);
          setSessions([]);
          setPreferences(undefined);
          return;
        }
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

