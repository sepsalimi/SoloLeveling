export function normalizeSteamProfile(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a Steam profile URL, such as https://steamcommunity.com/id/your-name"); }
  if (url.protocol !== "https:" || url.hostname !== "steamcommunity.com" || url.username || url.password || url.port) throw new Error("Use an https://steamcommunity.com profile URL.");
  const match = url.pathname.match(/^\/(id|profiles)\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match || (match[1] === "profiles" && !/^\d{17}$/.test(match[2]))) throw new Error("Use a Steam /id/name or /profiles/SteamID64 profile URL.");
  return "https://steamcommunity.com/" + match[1] + "/" + match[2];
}
