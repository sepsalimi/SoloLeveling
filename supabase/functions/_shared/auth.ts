// Authenticates an Edge Function request without exposing privileged credentials.
import { createClient, type User } from "npm:@supabase/supabase-js@2.110.7";

export type AuthenticatedRequest = {
  user: User;
  client: ReturnType<typeof createClient>;
};

export async function authenticateRequest(req: Request): Promise<AuthenticatedRequest> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw new Error("Unauthorized");

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");

  return { user: data.user, client };
}
