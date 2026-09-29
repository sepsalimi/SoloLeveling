import { useEffect, useRef, useState } from "react";
import { Linking, TextInput, useColorScheme } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Text } from "./Text";
import { useAppState } from "@/context/AppState";
import { normalizeSteamProfile } from "@/lib/steam";
import { supabase } from "@/services/supabase";
import { palette } from "@/theme/colors";
type Game = { appid: number; name: string; playtime_2weeks: number };
export function SteamConnection() {
  const { preferences, updatePreferences } = useAppState();
  const [url, setUrl] = useState(preferences?.steamProfileUrl ?? "");
  const [games, setGames] = useState<Game[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const request = useRef(0);
  const dark = useColorScheme() === "dark";
  useEffect(() => { setUrl(preferences?.steamProfileUrl ?? ""); }, [preferences?.steamProfileUrl]);
  async function save() {
    if (!preferences) return;
    setBusy(true); setMessage(""); setGames(null); setCheckedAt(null);
    try {
      const canonical = normalizeSteamProfile(url);
      await updatePreferences({ ...preferences, steamProfileUrl: canonical });
      setUrl(canonical); setMessage("Steam profile saved. Check recent games whenever you want.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save profile."); }
    finally { setBusy(false); }
  }
  async function checkGames() {
    if (!preferences?.steamProfileUrl) return;
    const generation = ++request.current;
    setBusy(true); setMessage(""); setGames(null); setCheckedAt(null);
    try {
      if (!supabase) throw new Error("Your profile is saved. Live game checks need the Steam service connected by the app owner.");
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Sign in to check Steam activity.");
      const { data, error } = await supabase.functions.invoke("steam-activity", { body: { profileUrl: preferences.steamProfileUrl } });
      if (error) {
        const details = await error.context?.json?.().catch(() => null);
        throw new Error(details?.error ?? "Could not reach Steam. Please try again later.");
      }
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.games)) throw new Error("Steam returned an unexpected response.");
      if (generation !== request.current) return;
      setGames(data.games); setCheckedAt(new Date().toLocaleString());
      if (!data.games.length) setMessage("No recent games were returned. This can mean no play in the last two weeks, or private game details.");
    } catch (error) { if (generation === request.current) setMessage(error instanceof Error ? error.message : "Could not check games."); }
    finally { if (generation === request.current) setBusy(false); }
  }
  async function disconnect() {
    if (!preferences) return;
    ++request.current; setBusy(true);
    try { await updatePreferences({ ...preferences, steamProfileUrl: undefined }); setUrl(""); setGames(null); setCheckedAt(null); setMessage("Steam profile disconnected."); }
    catch { setMessage("Could not disconnect. Please try again."); }
    finally { setBusy(false); }
  }
  return <Card>
    <Text variant="heading">Steam · optional</Text>
    <Text>See games played recently alongside your life planning. Connect only a profile you want to share.</Text>
    <TextInput accessibilityLabel="Steam profile URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://steamcommunity.com/id/your-name" placeholderTextColor={palette.muted} style={{ minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 8, padding: 12, color: dark ? palette.darkInk : palette.ink }} />
    <Button label="Save Steam profile" disabled={busy || !url.trim()} onPress={() => void save()} />
    {preferences?.steamProfileUrl && <>
      <Button label={busy ? "Please wait…" : "Check recent games"} variant="secondary" disabled={busy} onPress={() => void checkGames()} />
      <Button label="Open Steam profile" variant="ghost" onPress={() => { try { void Linking.openURL(normalizeSteamProfile(preferences.steamProfileUrl!)); } catch { setMessage("Please save a valid Steam URL."); } }} />
      <Button label="Disconnect Steam" variant="ghost" disabled={busy} onPress={() => void disconnect()} />
    </>}
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
    {games?.map(game => <Text key={game.appid}>{game.name} · {(game.playtime_2weeks / 60).toFixed(1)} h in the last two weeks</Text>)}
    {checkedAt && <Text variant="caption">Last checked: {checkedAt}</Text>}
    <Text variant="caption">Checks happen only when you tap. Steam game details must be public. Two-week playtime is not a daily activity log and is never automatically added to your tracked hours.</Text>
  </Card>;
}
