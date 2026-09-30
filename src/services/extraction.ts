import { ActivityEntry } from "@/types/activity";
import { supabase } from "@/services/supabase";
import { validateExtractionResponse } from "@/lib/validation";
import { removeDuplicateActivities } from "@/lib/duplicates";

export async function extractActivities(transcript: string, existing: ActivityEntry[] = [], activityDate?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.functions.invoke("process-check-in", {
    body: { transcript, existingActivities: existing, activityDate }
  });
  if (error) throw new Error(error.message);

  const parsed = validateExtractionResponse(data);
  if (!parsed.success) throw new Error("The extraction response did not match the expected schema.");
  return {
    activities: removeDuplicateActivities([...existing, ...parsed.data.activities]),
    unresolvedIssues: parsed.data.unresolvedIssues
  };
}

