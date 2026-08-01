// Coordinates draft sessions, transcription, extraction, bounded transcript storage, and audio retention.
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { isoDate } from "@/lib/dates";
import { appendTranscript, retainedTranscript } from "@/lib/transcripts";
import { extractActivities } from "@/services/extraction";
import { supabase } from "@/services/supabase";
import { ActivityEntry, CheckInDraft } from "@/types/activity";
import { isLocalMode } from "@/services/runtime";
import { extractLocalActivities } from "@/services/localExtraction";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function createSession(userId: string) {
  const { data, error } = await client()
    .from("check_in_sessions")
    .insert({
      user_id: userId,
      session_date: isoDate(),
      session_type: "manual",
      status: "draft"
    })
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("The check-in session was not created.");
  return data.id as string;
}

async function sessionExists(userId: string, sessionId: string) {
  const { data, error } = await client()
    .from("check_in_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  return Boolean(data);
}

export async function ensureDraft(userId: string, draft: CheckInDraft | null): Promise<CheckInDraft> {
  if (draft?.userId === userId) {
    if (isLocalMode) return draft;
    if (await sessionExists(userId, draft.sessionId)) return draft;
  }
  return {
    userId,
    sessionId: isLocalMode ? `local-session-${Date.now()}` : await createSession(userId),
    transcripts: [],
    entries: [],
    unresolvedIssues: [],
    transcriptRetentionNotices: []
  };
}

async function extractIntoDraft(draft: CheckInDraft, transcript: string) {
  const result = await extractActivities(transcript, draft.entries, isoDate());
  const retention = appendTranscript(draft.transcripts, draft.transcriptRetentionNotices, transcript);
  return {
    ...draft,
    ...retention,
    entries: result.activities,
    unresolvedIssues: [...new Set([...draft.unresolvedIssues, ...result.unresolvedIssues])]
  };
}

async function markNoteFailed(noteId: string, storagePath: string | null, code: string, cause: unknown) {
  const { error } = await client()
    .from("voice_notes")
    .update({
      storage_path: storagePath,
      processing_status: "failed",
      processing_error: code
    })
    .eq("id", noteId);
  if (error) {
    const original = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${original} (also failed to mark note as failed: ${error.message})`);
  }
}

export async function processTextCheckIn(draft: CheckInDraft, transcript: string): Promise<CheckInDraft> {
  if (isLocalMode) {
    const result = await extractLocalActivities(transcript, draft.entries);
    const retention = appendTranscript(draft.transcripts, draft.transcriptRetentionNotices, transcript);
    return {
      ...draft,
      ...retention,
      entries: result.activities,
      unresolvedIssues: [...new Set([...draft.unresolvedIssues, ...result.unresolvedIssues])]
    };
  }
  const db = client();
  const { data: note, error: noteError } = await db
    .from("voice_notes")
    .insert({
      session_id: draft.sessionId,
      user_id: draft.userId,
      processing_status: "processing"
    })
    .select("id")
    .single();
  throwIfError(noteError);
  if (!note) throw new Error("The text note was not created.");

  let nextDraft: CheckInDraft;
  try {
    nextDraft = await extractIntoDraft(draft, transcript);
  } catch (error) {
    await markNoteFailed(note.id, null, "EXTRACTION_FAILED", error);
    throw error;
  }
  const { error: updateError } = await db
    .from("voice_notes")
    .update({
      transcript: retainedTranscript(transcript),
      processing_status: "completed",
      processing_error: null
    })
    .eq("id", note.id);
  throwIfError(updateError);

  const { error: sessionError } = await db
    .from("check_in_sessions")
    .update({ status: "review" })
    .eq("id", draft.sessionId);
  throwIfError(sessionError);
  return nextDraft;
}

export async function processVoiceCheckIn(
  draft: CheckInDraft,
  audioUri: string,
  retainAudio: boolean
): Promise<CheckInDraft> {
  if (isLocalMode) {
    throw new Error("Voice transcription requires the private backend. Use the text check-in while local mode is active.");
  }
  const db = client();
  const file = new File(audioUri);
  let noteId = draft.pendingVoiceNoteId;

  if (noteId) {
    const { error: resetError } = await db
      .from("voice_notes")
      .update({ processing_status: "processing", processing_error: null })
      .eq("id", noteId)
      .eq("user_id", draft.userId);
    throwIfError(resetError);
  } else {
    const { data: note, error: noteError } = await db
      .from("voice_notes")
      .insert({
        session_id: draft.sessionId,
        user_id: draft.userId,
        processing_status: "processing"
      })
      .select("id")
      .single();
    throwIfError(noteError);
    if (!note) throw new Error("The voice note was not created.");
    noteId = note.id as string;
  }

  let storagePath: string | null = null;
  if (retainAudio) {
    storagePath = `${draft.userId}/${noteId}.m4a`;
    const { error: uploadError } = await db.storage
      .from("voice-notes")
      .upload(storagePath, await file.arrayBuffer(), { contentType: "audio/mp4", upsert: true });
    throwIfError(uploadError);
  }

  let transcription: { transcript?: string };
  let nextDraft: CheckInDraft;
  try {
    const form = new FormData();
    if (Platform.OS === "web") {
      form.append("file", file);
    } else {
      form.append("file", {
        uri: audioUri,
        name: "check-in.m4a",
        type: "audio/mp4"
      } as unknown as Blob);
    }
    const result = await db.functions.invoke("transcribe-note", { body: form });
    throwIfError(result.error);
    transcription = result.data;
    if (!transcription?.transcript) throw new Error("The transcription was empty.");
    nextDraft = await extractIntoDraft({ ...draft, pendingVoiceNoteId: noteId }, transcription.transcript);
  } catch (error) {
    await markNoteFailed(noteId, storagePath, "VOICE_PROCESSING_FAILED", error);
    throw error;
  }
  const { error: updateError } = await db
    .from("voice_notes")
    .update({
      storage_path: storagePath,
      transcript: retainedTranscript(transcription.transcript),
      processing_status: "completed",
      processing_error: null
    })
    .eq("id", noteId);
  throwIfError(updateError);

  const { error: sessionError } = await db
    .from("check_in_sessions")
    .update({ status: "review" })
    .eq("id", draft.sessionId);
  throwIfError(sessionError);

  const completed = { ...nextDraft, pendingAudioUri: undefined, pendingVoiceNoteId: undefined };
  if (file.exists) file.delete();
  return completed;
}

export function replaceDraftEntries(draft: CheckInDraft, entries: ActivityEntry[]): CheckInDraft {
  return { ...draft, entries };
}
