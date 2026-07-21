import { ActivityEntry } from "@/types/activity";
import { extractActivitiesMock } from "@/services/mockExtraction";
import { supabase } from "@/services/supabase";
import { validateExtractionResponse } from "@/lib/validation";
import { removeDuplicateActivities } from "@/lib/duplicates";

const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false";

export async function extractActivities(transcript: string, existing: ActivityEntry[] = []) {
  if (!supabase || demoMode) return extractActivitiesMock(transcript, existing);

  const { data, error } = await supabase.functions.invoke("process-check-in", {
    body: { transcript, existingActivities: existing }
  });
  if (error) throw new Error(error.message);

  const parsed = validateExtractionResponse(data);
  if (!parsed.success) throw new Error("The extraction response did not match the expected schema.");
  return {
    activities: removeDuplicateActivities(parsed.data.activities),
    unresolvedIssues: parsed.data.unresolvedIssues
  };
}

