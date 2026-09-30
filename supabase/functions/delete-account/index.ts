// Permanently deletes the authenticated user's app data, retained audio, and account.
import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { authenticateRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user } = await authenticateRequest(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const paths: string[] = [];
    let offset = 0;
    while (true) {
      const { data: objects, error: listError } = await admin.storage
        .from("voice-notes")
        .list(user.id, { limit: 1000, offset });
      if (listError) throw new Error("Could not inspect retained recordings.");
      paths.push(...objects.map((object) => `${user.id}/${object.name}`));
      if (objects.length < 1000) break;
      offset += objects.length;
    }

    for (let index = 0; index < paths.length; index += 100) {
      const { error: removeError } = await admin.storage
        .from("voice-notes")
        .remove(paths.slice(index, index + 100));
      if (removeError) throw new Error("Could not delete retained recordings.");
    }

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw new Error("Could not delete the authentication account.");

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: unauthorized ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
