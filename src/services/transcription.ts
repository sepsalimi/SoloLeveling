// Sends one finished recording to the authenticated transcription function.
import { recordedAudio } from "@/lib/audioCapture";
import { transcriptFromInvoke } from "@/lib/transcriptionResult";
import { supabase } from "./supabase";

type RecordingInput = { blob: Blob } | { uri: string; name: string; type: string };

export async function transcribeRecording(input: RecordingInput) {
  if (!supabase) throw new Error("Voice transcription is not connected. Type below.");
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError || !auth.session) throw new Error("Sign in to transcribe. You can type below.");
  const form = new FormData();
  if ("uri" in input) {
    form.append("file", { uri: input.uri, name: input.name, type: input.type } as unknown as Blob);
  } else {
    const audio = recordedAudio(input.blob);
    form.append("file", new File([audio.blob], audio.name, { type: audio.type }));
  }
  const { data, error } = await supabase.functions.invoke("transcribe-note", { body: form });
  return transcriptFromInvoke(data, error);
}
