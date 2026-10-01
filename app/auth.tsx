// Supabase email authentication with an explicit local-preview path when no backend is configured.
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/services/supabase";
import { Input } from "@/components/Input";
import { BrandMark } from "@/components/BrandMark";
import { palette } from "@/theme/colors";
import { agentDebug } from "@/lib/agentDebug";

let authenticationAttempt = 0;

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function authenticate(mode: "login" | "register") {
    const attempt = ++authenticationAttempt;
    // #region agent log
    agentDebug({ hypothesisId: "A/B", location: "auth.tsx:authenticate", message: "Authentication action entered", data: { attempt, mode, configured: Boolean(supabase), hasEmail: Boolean(email.trim()), passwordLongEnough: password.length >= 8, loading } });
    // #endregion
    if (!supabase) {
      router.replace("/onboarding");
      return;
    }
    if (!email.trim() || password.length < 8) {
      // #region agent log
      agentDebug({ hypothesisId: "B", location: "auth.tsx:validation", message: "Authentication blocked by local validation", data: { attempt, hasEmail: Boolean(email.trim()), passwordLongEnough: password.length >= 8 } });
      // #endregion
      Alert.alert("Check your details", "Enter a valid email and a password with at least eight characters.");
      return;
    }
    setLoading(true);
    try {
      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: Linking.createURL("/"),
                data: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
              }
            });
      // #region agent log
      agentDebug({ hypothesisId: "A/C", location: "auth.tsx:response", message: "Authentication request settled", data: { attempt, mode, hasError: Boolean(response.error), hasSession: Boolean(response.data.session), hasUser: Boolean(response.data.user) } });
      // #endregion
      setLoading(false);
      if (response.error) {
        Alert.alert("Authentication failed", response.error.message);
      } else if (mode === "register" && !response.data.session) {
        Alert.alert("Check your email", "Confirm your email address, then return here to sign in.");
      } else {
        // #region agent log
        agentDebug({ hypothesisId: "C", location: "auth.tsx:route", message: "Authentication navigating to root", data: { attempt, mode } });
        // #endregion
        router.replace("/");
      }
    } catch (error) {
      // #region agent log
      agentDebug({ hypothesisId: "A", location: "auth.tsx:exception", message: "Authentication request threw", data: { attempt, mode, errorType: error instanceof Error ? error.name : typeof error } });
      // #endregion
      throw error;
    }
  }

  async function resetPassword() {
    if (!supabase) {
      Alert.alert("Demo mode", "Password reset is available once Supabase environment variables are configured.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("/reset-password")
    });
    Alert.alert(error ? "Password reset failed" : "Check your email", error?.message ?? "A reset link has been sent.");
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
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          accessibilityLabel="Email"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          accessibilityLabel="Password"
        />
        <Button label="Sign in" icon="arrow-forward" onPress={() => authenticate("login")} disabled={loading} />
        <Button label="Create a private archive" icon="person-add-outline" variant="secondary" onPress={() => authenticate("register")} disabled={loading} />
        <Button label="I forgot my password" icon="mail-outline" variant="ghost" compact onPress={resetPassword} />
      </Card>
      <Text variant="caption">
        Without Supabase keys, Continue opens a device-only preview. Reasoning and account sync require a configured, signed-in account.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, paddingTop: 16, marginBottom: 10 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 480 }
});
