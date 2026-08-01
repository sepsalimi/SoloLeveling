// Primary actions with theme-aware fills and light haptic feedback on press.
import { Platform, Pressable, StyleProp, StyleSheet, useColorScheme, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/Text";
import { palette, surfaces } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({ label, icon, variant = "primary", onPress, disabled, style, compact = false }: Props) {
  const dark = useColorScheme() === "dark";
  const theme = surfaces(dark);
  const isPrimary = variant === "primary";
  const foreground = isPrimary
    ? "#FFFFFF"
    : variant === "danger"
      ? dark ? "#FFB4A8" : "#9A2E2E"
      : dark ? palette.mint : palette.teal;

  function handlePress() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        variant === "primary" && { backgroundColor: palette.coral },
        variant === "secondary" && { backgroundColor: theme.tint },
        variant === "danger" && { backgroundColor: theme.accent },
        variant === "ghost" && { backgroundColor: "transparent" },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  compact: { minHeight: 40, paddingHorizontal: 14 }
});
