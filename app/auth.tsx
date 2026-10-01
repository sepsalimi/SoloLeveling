// Email and Google sign-in. A successful session leaves this screen only after app state has it.
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppState } from "@/context/AppState";
import { supabase } from "@/services/supabase";
import { currentAuthReturnUrl } from "@/services/authCallback";
import { Input } from "@/components/Input";
import { BrandMark } from "@/components/BrandMark";
import { palette } from "@/theme/colors";

export default function AuthScreen() {
  const { user, ready, preferences } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(preferences?.onboardingCompleted ? "/(tabs)/tasks" : "/onboarding");
  }, [preferences?.onboardingCompleted, ready, user]);

  async function authenticate(mode: "login" | "register") {
    if (!supabase) {
      router.replace("/onboarding");
      return;
    }
    if (!email.trim() || password.length < 8) {
      setMessage("Enter a valid email and a password with at least eight characters.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: currentAuthReturnUrl(),
              data: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            },
          });
      if (response.error) setMessage(response.error.message);
      else if (!response.data.session) setMessage("Check your email and confirm the address, then come back and sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in did not finish. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabase) {
      router.replace("/onboarding");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: currentAuthReturnUrl(), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setMessage(error.message.includes("provider") ? "Google sign-in is not enabled for this project yet." : error.message);
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!supabase) {
      setMessage("Password reset is available once the account service is configured.");
      return;
    }
    if (!email.trim()) {
      setMessage("Enter your email first, then ask for the reset link.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: currentAuthReturnUrl() + "reset-password" });
    setLoading(false);
    setMessage(error ? error.message : "A reset link has been sent. Open it on this device.");
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandMark />
        <Text variant="display">Your days have{"\n"}a pattern.</Text>
        <Text style={styles.lede}>A few words at a time can make it visible—without passive tracking.</Text>
      </View>
      <Card variant="tint">
        <Text variant="eyebrow">Your private archive</Text>
        <Text variant="heading">Come back to your thread</Text>
        <Button label={loading ? "Opening Google..." : "Continue with Google"} icon="logo-google" onPress={() => void signInWithGoogle()} disabled={loading} />
        <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="Email" accessibilityLabel="Email" />
        <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoComplete="current-password" accessibilityLabel="Password" />
        <Button label={loading ? "Signing in..." : "Sign in"} icon="arrow-forward" onPress={() => void authenticate("login")} disabled={loading} />
        <Button label="Create a private archive" icon="person-add-outline" variant="secondary" onPress={() => void authenticate("register")} disabled={loading} />
        <Button label="I forgot my password" icon="mail-outline" variant="ghost" compact onPress={() => void resetPassword()} disabled={loading} />
        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      </Card>
      <Text variant="caption">
        Email confirmation and Google both return to this site. A successful sign-in continues automatically.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, paddingTop: 16, marginBottom: 10 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 480 },
  message: { color: palette.clay, lineHeight: 22 },
});
