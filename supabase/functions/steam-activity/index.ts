import { normalizeSteamProfile } from "../../../src/lib/steam.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function reply(data: unknown, status = 200) { return Response.json(data, { status, headers: cors }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  try {
    // Require a real user session, not just the public anon key.
    const auth = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", {
      headers: { Authorization: req.headers.get("authorization") ?? "", apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      signal: AbortSignal.timeout(10000),
    });
    if (!auth.ok) return reply({ error: "Sign in to check Steam activity." }, 401);
    const key = Deno.env.get("STEAM_WEB_API_KEY");
    if (!key) return reply({ error: "Steam activity is not configured yet. Ask the app owner to connect the Steam service." }, 503);
    const body = await req.json();
    if (typeof body.profileUrl !== "string") return reply({ error: "Enter a Steam profile URL." }, 400);
    const profile = new URL(normalizeSteamProfile(body.profileUrl));
    const [, kind, id] = profile.pathname.split("/");
    async function steam(path: string, params: Record<string, string>) {
      const url = new URL("https://api.steampowered.com/" + path);
      url.search = new URLSearchParams({ key: key!, ...params }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Steam is unavailable. Try again later.");
      return response.json();
    }
    let steamid = id;
    if (kind === "id") {
      const result = await steam("ISteamUser/ResolveVanityURL/v1/", { vanityurl: id });
      if (result.response?.success !== 1 || !/^\d{17}$/.test(result.response?.steamid)) return reply({ error: "Steam profile not found. Check the URL." }, 404);
      steamid = result.response.steamid;
    }
    const result = await steam("IPlayerService/GetRecentlyPlayedGames/v1/", { steamid, count: "10" });
    if (!result.response || typeof result.response !== "object") throw new Error("Steam returned an unexpected response.");
    const games = (Array.isArray(result.response.games) ? result.response.games : []).map((g: { appid: number; name: string; playtime_2weeks?: number }) => ({
      appid: g.appid, name: g.name, playtime_2weeks: Math.max(0, g.playtime_2weeks ?? 0),
    }));
    return reply({ games, checkedAt: new Date().toISOString(), window: "last_two_weeks" });
  } catch (error) {
    return reply({ error: error instanceof Error && /Steam|profile URL/.test(error.message) ? error.message : "Could not check Steam. Try again later." }, 400);
  }
});
