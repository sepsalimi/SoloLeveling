// Lets a user finish the Supabase recovery flow inside the app.
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/services/supabase";
import { Input } from "@/components/Input";
import { BrandMark } from "@/components/BrandMark";
import { palette } from "@/theme/colors";

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
      <BrandMark />
      <View style={styles.intro}>
        <Text variant="display">A fresh{"\n"}thread.</Text>
        <Text style={styles.lede}>Choose a new password to keep your archive private.</Text>
      </View>
      <Card variant="tint">
        <Text variant="eyebrow">Account recovery</Text>
        <Text variant="heading">Set a new password</Text>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least eight characters"
          accessibilityLabel="New password"
        />
        <Button label={saving ? "Saving" : "Update password"} icon="key-outline" onPress={updatePassword} disabled={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 10, marginVertical: 12 },
  lede: { color: palette.muted, fontSize: 17, lineHeight: 25, maxWidth: 480 }
});
