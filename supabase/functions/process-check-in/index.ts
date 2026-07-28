// Converts an authenticated user's transcript into strictly structured activities.
import { authenticateRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const schema = {
  name: "life_activity_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      activities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            activityDate: { type: "string" },
            startTime: { type: ["string", "null"] },
            endTime: { type: ["string", "null"] },
            durationMinutes: { type: "integer", minimum: 1, maximum: 1440 },
            primaryCategory: { enum: ["work", "learning", "health", "exercise", "food", "chores", "social", "entertainment", "rest", "travel", "personal_care", "other"] },
            socialContext: { enum: ["solo", "with_partner", "with_family", "with_friends", "with_coworkers", "public", "unknown"] },
            purposeTags: { type: "array", items: { enum: ["productive", "fun", "recovery", "necessary", "growth"] } },
            efficiencyPercent: { type: ["integer", "null"], minimum: 0, maximum: 100 },
            energyLevel: { type: ["integer", "null"], minimum: 1, maximum: 5 },
            mood: { type: ["integer", "null"], minimum: 1, maximum: 5 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sourceTranscriptSegment: { type: ["string", "null"], maxLength: 2000 },
            needsReview: { type: "boolean" }
          },
          required: ["id", "title", "description", "activityDate", "startTime", "endTime", "durationMinutes", "primaryCategory", "socialContext", "purposeTags", "efficiencyPercent", "energyLevel", "mood", "confidence", "sourceTranscriptSegment", "needsReview"]
        }
      },
      unresolvedIssues: { type: "array", items: { type: "string" } }
    },
    required: ["activities", "unresolvedIssues"]
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await authenticateRequest(req);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const { transcript, existingActivities = [], activityDate = new Date().toISOString().slice(0, 10) } = await req.json();
    if (!transcript || typeof transcript !== "string") throw new Error("Missing transcript.");
    if (new TextEncoder().encode(transcript).length > 200000) throw new Error("Transcript is too large to process.");
    if (!Array.isArray(existingActivities) || existingActivities.length > 100) throw new Error("Invalid existing activities.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_EXTRACTION_MODEL") ?? "gpt-4.1-mini",
        response_format: { type: "json_schema", json_schema: schema },
        messages: [
          {
            role: "system",
            content:
              "Extract personal activity entries from check-in transcripts. Normalize durations to minutes and calculate them only from an explicit or reasonably implied range. Never invent a duration. If duration is unknown, do not create the activity; add a concise unresolved issue instead. Mark uncertainty with needsReview. Resolve relative dates using activityDate. Avoid duplicates with existing activities. Preserve useful user wording. Return unresolved issues instead of questions."
          },
          {
            role: "user",
            content: JSON.stringify({ activityDate, transcript, existingActivities })
          }
        ]
      })
    });
    if (!response.ok) throw new Error("The extraction provider rejected the request.");

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("No extraction output.");
    return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: unauthorized ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

