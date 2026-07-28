// Transcribes a foreground recording for an authenticated user.
import { authenticateRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await authenticateRequest(req);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Missing audio file.");
    if (file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error("Audio must be between 1 byte and 25 MB.");

    const upstream = new FormData();
    upstream.set("file", file, file.name || "check-in.m4a");
    upstream.set("model", Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") ?? "gpt-4o-mini-transcribe");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream
    });

    if (!response.ok) {
      throw new Error("The transcription provider rejected the recording.");
    }

    const data = await response.json();
    return new Response(JSON.stringify({ transcript: data.text ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: unauthorized ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});