// Coordinates draft sessions, transcription, extraction, bounded transcript storage, and audio retention.
import { File } from "expo-file-system";
import { isoDate } from "@/lib/dates";
import { extractActivities } from "@/services/extraction";
import { supabase } from "@/services/supabase";
import { ActivityEntry, CheckInDraft } from "@/types/activity";

const transcriptStorageLimit = 50_000;

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function retainedTranscript(transcript: string) {
  return new TextEncoder().encode(transcript).length <= transcriptStorageLimit ? transcript : null;
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
  return data.id as string;
}

export async function ensureDraft(userId: string, draft: CheckInDraft | null): Promise<CheckInDraft> {
  if (draft?.userId === userId) return draft;
  return {
    userId,
    sessionId: await createSession(userId),
    transcripts: [],
    entries: [],
    unresolvedIssues: [],
    transcriptRetentionNotices: []
  };
}

async function extractIntoDraft(draft: CheckInDraft, transcript: string) {
  const result = await extractActivities(transcript, draft.entries, isoDate());
  const stored = retainedTranscript(transcript);
  return {
    ...draft,
    transcripts: [...draft.transcripts, transcript],
    entries: result.activities,
    unresolvedIssues: result.unresolvedIssues,
    transcriptRetentionNotices: stored
      ? draft.transcriptRetentionNotices
      : [...draft.transcriptRetentionNotices, "This transcript was processed but not retained because it exceeded 50 KB."]
  };
}

export async function processTextCheckIn(draft: CheckInDraft, transcript: string): Promise<CheckInDraft> {
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

  const nextDraft = await extractIntoDraft(draft, transcript);
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
  const db = client();
  const file = new File(audioUri);
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

  let storagePath: string | null = null;
  if (retainAudio) {
    storagePath = `${draft.userId}/${note.id}.m4a`;
    const { error: uploadError } = await db.storage
      .from("voice-notes")
      .upload(storagePath, await file.arrayBuffer(), { contentType: "audio/mp4", upsert: false });
    throwIfError(uploadError);
  }

  const form = new FormData();
  form.append("file", file);
  const { data: transcription, error: transcriptionError } = await db.functions.invoke("transcribe-note", { body: form });
  throwIfError(transcriptionError);
  if (!transcription?.transcript) throw new Error("The transcription was empty.");

  const nextDraft = await extractIntoDraft(draft, transcription.transcript);
  const { error: updateError } = await db
    .from("voice_notes")
    .update({
      storage_path: storagePath,
      transcript: retainedTranscript(transcription.transcript),
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

  file.delete();
  return { ...nextDraft, pendingAudioUri: undefined };
}

export function replaceDraftEntries(draft: CheckInDraft, entries: ActivityEntry[]): CheckInDraft {
  return { ...draft, entries };
}
