import { supabase } from "./supabase";
import { automaticSession, validateExtraction } from "@/lib/automaticCheckIn";
export async function processEvening(id: string, date: string, transcript: string) {
  if (!supabase) throw new Error("Automatic processing is not connected yet. Your transcript is kept on this device.");
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError || !auth.session) throw new Error("Sign in to process your check-in. Your transcript is kept.");
  const { data, error } = await supabase.functions.invoke("reason-check-in", { body: { transcript, activityDate: date }, timeout: 120000 });
  if (error || !data) throw new Error("Could not process your check-in. Your transcript is kept; tap Retry when the connection is ready.");
  if (data.error) throw new Error(data.error);
  const items = validateExtraction(data);
  return automaticSession(id, date, transcript, items, typeof data.model === "string" ? data.model : "deepseek-flash");
}
