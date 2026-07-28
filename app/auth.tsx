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

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function authenticate(mode: "login" | "register") {
    if (!supabase) {
      Alert.alert("Setup required", "Configure the Supabase URL and anonymous key before signing in.");
      return;
    }
    if (!email.trim() || password.length < 8) {
      Alert.alert("Check your details", "Enter a valid email and a password with at least eight characters.");
      return;
    }
    setLoading(true);
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
    setLoading(false);
    if (response.error) {
      Alert.alert("Authentication failed", response.error.message);
    } else if (mode === "register" && !response.data.session) {
      Alert.alert("Check your email", "Confirm your email address, then return here to sign in.");
    } else {
      router.replace("/");
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
        <Text variant="title">Life Analytics</Text>
        <Text>Understand where your time goes from quick voice or text check-ins. No passive tracking.</Text>
      </View>
      <Card>
        <Text variant="heading">Sign in</Text>
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
        <Button label="Log in" icon="log-in-outline" onPress={() => authenticate("login")} disabled={loading} />
        <Button label="Create account" icon="person-add-outline" variant="secondary" onPress={() => authenticate("register")} disabled={loading} />
        <Button label="Reset password" icon="mail-outline" variant="ghost" onPress={resetPassword} />
      </Card>
      <Text variant="caption">
        Your account keeps activity data private with user-scoped database policies. AI requests are handled only by authenticated server functions.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, paddingTop: 20 }
});

