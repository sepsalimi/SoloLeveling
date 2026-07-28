// Lets a user finish the Supabase recovery flow inside the app.
import { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/services/supabase";
import { Input } from "@/components/Input";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (password.length < 8) {
      Alert.alert("Password is too short", "Use at least eight characters.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      Alert.alert("Password update failed", error.message);
    } else {
      Alert.alert("Password updated", "You can continue using your account.");
      router.replace("/");
    }
  }

  return (
    <Screen>
      <Text variant="title">Choose a new password</Text>
      <Card>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="New password"
          accessibilityLabel="New password"
        />
        <Button label={saving ? "Saving" : "Update password"} icon="key-outline" onPress={updatePassword} disabled={saving} />
      </Card>
    </Screen>
  );
}
