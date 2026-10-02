// Completes a Supabase email or Google redirect before the app chooses its first screen.
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authCallbackFromUrl, authReturnUrl } from "@/lib/authFlow";
import { supabase } from "@/services/supabase";

const consumedCodes = new Set<string>();

export function currentAuthReturnUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") return authReturnUrl(window.location);
  return Linking.createURL("/");
}

export async function completeAuthCallback() {
  if (!supabase) return { recovery: false };
  const href = Platform.OS === "web" ? window.location.href : await Linking.getInitialURL();
  if (!href) return { recovery: false };
  const callback = authCallbackFromUrl(href);
  const otpTypes = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);
  if (callback.tokenHash && callback.otpType && otpTypes.has(callback.otpType)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: callback.tokenHash, type: callback.otpType as "signup" });
    if (error) throw error;
    return { recovery: callback.recovery };
  }
  if (callback.code) {
    if (consumedCodes.has(callback.code)) return { recovery: false };
    consumedCodes.add(callback.code);
    const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
    if (error) {
      consumedCodes.delete(callback.code);
      throw error;
    }
    if (Platform.OS === "web") {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } else if (callback.accessToken && callback.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
    if (error) throw error;
  }
  return { recovery: callback.recovery };
}
