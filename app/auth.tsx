import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/services/supabase";
import { palette } from "@/theme/colors";

export default function AuthScreen() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function authenticate(mode: "login" | "register") {
    if (!supabase) {
      router.replace("/onboarding");
      return;
    }
    setLoading(true);
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (response.error) Alert.alert("Authentication failed", response.error.message);
    else router.replace("/onboarding");
  }

  async function resetPassword() {
    if (!supabase) {
      Alert.alert("Demo mode", "Password reset is available once Supabase environment variables are configured.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    Alert.alert(error ? "Password reset failed" : "Check your email", error?.message ?? "A reset link has been sent.");
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="title">Life Analytics</Text>
        <Text>Understand where your time goes from quick voice or text check-ins. No passive tracking.</Text>
      </View>
      <Card>
        <Text variant="heading">Sign in</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          style={styles.input}
          accessibilityLabel="Email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          accessibilityLabel="Password"
        />
        <Button label="Log in" icon="log-in-outline" onPress={() => authenticate("login")} disabled={loading} />
        <Button label="Create account" icon="person-add-outline" variant="secondary" onPress={() => authenticate("register")} disabled={loading} />
        <Button label="Reset password" icon="mail-outline" variant="ghost" onPress={resetPassword} />
      </Card>
      <Text variant="caption">
        Demo mode is enabled when Supabase keys are absent. Production OpenAI requests are handled only by the Supabase Edge Function.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, paddingTop: 20 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF"
  }
});

