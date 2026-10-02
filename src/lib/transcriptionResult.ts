// Accepts one transcription response and rejects empty or unavailable results.
import { functionErrorMessage } from "./functionError";

export function transcriptionFailure(detail?: string) {
  if (!detail) return "Could not transcribe this recording. Try again or type below.";
  if (detail === "OPENAI_API_KEY is not configured.") return "Voice transcription is not set up yet. Type below for now.";
  if (/function was not found|requested function/i.test(detail)) return "Voice transcription is not available yet. Type below for now.";
  return detail;
}

export async function transcriptFromInvoke(data: { transcript?: unknown } | null, error: unknown) {
  if (error) throw new Error(transcriptionFailure(await functionErrorMessage(error)));
  const transcript = typeof data?.transcript === "string" ? data.transcript.trim() : "";
  if (!transcript) throw new Error("No speech was detected. Tap to try again or type.");
  return transcript;
}
