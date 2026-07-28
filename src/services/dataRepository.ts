// Maps the Supabase schema to the app's domain types and performs user-scoped persistence.
import { defaultPreferences } from "@/data/sample";
import { supabase } from "@/services/supabase";
import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function toActivity(row: Record<string, unknown>): ActivityEntry {
  return {
    id: row.id as string,
    sessionId: (row.session_id as string | null) ?? undefined,
    activityDate: row.activity_date as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    startTime: (row.start_time as string | null)?.slice(0, 5),
    endTime: (row.end_time as string | null)?.slice(0, 5),
    durationMinutes: row.duration_minutes as number,
    primaryCategory: row.primary_category as ActivityEntry["primaryCategory"],
    socialContext: row.social_context as ActivityEntry["socialContext"],
    purposeTags: row.purpose_tags as ActivityEntry["purposeTags"],
    efficiencyPercent: (row.efficiency_percent as number | null) ?? undefined,
    energyLevel: (row.energy_level as number | null) ?? undefined,
    mood: (row.mood as number | null) ?? undefined,
    confidence: Number(row.confidence),
    needsReview: row.needs_review as boolean,
    sourceTranscriptSegment: (row.source_transcript_segment as string | null) ?? undefined
  };
}

function toPreferences(row: Record<string, unknown>): UserPreferences {
  return {
    afternoonReminderTime: String(row.afternoon_reminder_time).slice(0, 5),
    eveningReminderTime: String(row.evening_reminder_time).slice(0, 5),
    reminderDays: row.reminder_days as number[],
    efficiencyEnabled: row.efficiency_enabled as boolean,
    moodEnabled: row.mood_enabled as boolean,
    retainAudio: row.retain_audio as boolean,
    notificationsEnabled: row.notifications_enabled as boolean,
    onboardingCompleted: row.onboarding_completed as boolean
  };
}

function toDatabaseActivity(entry: ActivityEntry, userId: string, sessionId?: string) {
  return {
    user_id: userId,
    session_id: sessionId ?? entry.sessionId ?? null,
    activity_date: entry.activityDate,
    title: entry.title.trim(),
    description: entry.description?.trim() || null,
    start_time: entry.startTime || null,
    end_time: entry.endTime || null,
    duration_minutes: entry.durationMinutes,
    primary_category: entry.primaryCategory,
    social_context: entry.socialContext,
    purpose_tags: entry.purposeTags,
    efficiency_percent: entry.efficiencyPercent ?? null,
    energy_level: entry.energyLevel ?? null,
    mood: entry.mood ?? null,
    confidence: entry.confidence,
    needs_review: entry.needsReview,
    source_transcript_segment: entry.sourceTranscriptSegment ?? null
  };
}

export async function loadUserData(userId: string) {
  const db = client();
  const [activityResult, sessionResult, noteResult, preferenceResult] = await Promise.all([
    db.from("activity_entries").select("*").eq("user_id", userId).order("activity_date", { ascending: false }),
    db.from("check_in_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("voice_notes").select("session_id, transcript").eq("user_id", userId).order("created_at"),
    db.from("user_preferences").select("*").eq("user_id", userId).maybeSingle()
  ]);

  throwIfError(activityResult.error);
  throwIfError(sessionResult.error);
  throwIfError(noteResult.error);
  throwIfError(preferenceResult.error);

  let preferences = preferenceResult.data ? toPreferences(preferenceResult.data) : undefined;
  if (!preferences) {
    const { data, error } = await db
      .from("user_preferences")
      .insert({
        user_id: userId,
        afternoon_reminder_time: defaultPreferences.afternoonReminderTime,
        evening_reminder_time: defaultPreferences.eveningReminderTime,
        reminder_days: defaultPreferences.reminderDays
      })
      .select()
      .single();
    throwIfError(error);
    preferences = toPreferences(data);
  }

  const activities = (activityResult.data ?? []).map(toActivity);
  const sessions: CheckInSession[] = (sessionResult.data ?? []).map((row) => ({
    id: row.id,
    sessionDate: row.session_date,
    sessionType: row.session_type,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    transcripts: (noteResult.data ?? [])
      .filter((note) => note.session_id === row.id && note.transcript)
      .map((note) => note.transcript as string),
    entries: activities.filter((entry) => entry.sessionId === row.id),
    unresolvedIssues: []
  }));

  return { activities, sessions, preferences };
}

export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  const { error } = await client()
    .from("user_preferences")
    .upsert({
      user_id: userId,
      afternoon_reminder_time: preferences.afternoonReminderTime,
      evening_reminder_time: preferences.eveningReminderTime,
      reminder_days: preferences.reminderDays,
      efficiency_enabled: preferences.efficiencyEnabled,
      mood_enabled: preferences.moodEnabled,
      retain_audio: preferences.retainAudio,
      notifications_enabled: preferences.notificationsEnabled,
      onboarding_completed: preferences.onboardingCompleted
    });
  throwIfError(error);
}

export async function completeCheckIn(userId: string, sessionId: string, entries: ActivityEntry[]) {
  const db = client();
  const { error: deleteError } = await db.from("activity_entries").delete().eq("session_id", sessionId);
  throwIfError(deleteError);

  const { error: insertError } = await db
    .from("activity_entries")
    .insert(entries.map((entry) => toDatabaseActivity({ ...entry, needsReview: false }, userId, sessionId)));
  throwIfError(insertError);

  const { error: sessionError } = await db
    .from("check_in_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  throwIfError(sessionError);
}

export async function updateStoredActivity(userId: string, entry: ActivityEntry) {
  const { error } = await client()
    .from("activity_entries")
    .update(toDatabaseActivity(entry, userId))
    .eq("id", entry.id);
  throwIfError(error);
}

export async function deleteStoredActivity(id: string) {
  const { error } = await client().from("activity_entries").delete().eq("id", id);
  throwIfError(error);
}
