import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

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
            durationMinutes: { type: "integer" },
            primaryCategory: { enum: ["work", "learning", "health", "exercise", "food", "chores", "social", "entertainment", "rest", "travel", "personal_care", "other"] },
            socialContext: { enum: ["solo", "with_partner", "with_family", "with_friends", "with_coworkers", "public", "unknown"] },
            purposeTags: { type: "array", items: { enum: ["productive", "fun", "recovery", "necessary", "growth"] } },
            efficiencyPercent: { type: ["integer", "null"] },
            energyLevel: { type: ["integer", "null"] },
            mood: { type: ["integer", "null"] },
            confidence: { type: "number" },
            sourceTranscriptSegment: { type: ["string", "null"] },
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
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const { transcript, existingActivities = [], activityDate = new Date().toISOString().slice(0, 10) } = await req.json();
    if (!transcript || typeof transcript !== "string") throw new Error("Missing transcript.");

    const completion = await openai.chat.completions.create({
      model: Deno.env.get("OPENAI_EXTRACTION_MODEL") ?? "gpt-4.1-mini",
      response_format: { type: "json_schema", json_schema: schema },
      messages: [
        {
          role: "system",
          content:
            "Extract personal activity entries from check-in transcripts. Normalize durations to minutes. Calculate duration from explicit start/end times. Never invent a duration. Mark uncertainty with needsReview. Avoid duplicates with existing activities. Return unresolved issues instead of asking follow-up questions."
        },
        {
          role: "user",
          content: JSON.stringify({ activityDate, transcript, existingActivities })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No extraction output.");
    return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

