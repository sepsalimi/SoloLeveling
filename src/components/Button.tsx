import { Pressable, StyleProp, StyleSheet, TextStyle, useColorScheme, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { palette } from "@/theme/colors";

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
  const isPrimary = variant === "primary";
  const dark = useColorScheme() === "dark";
  const foreground = isPrimary ? "#FFFFFF" : variant === "danger" ? "#9A2E2E" : dark ? palette.mint : palette.teal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        styles[variant],
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

type ButtonStyles = {
  button: ViewStyle;
  primary: ViewStyle;
  secondary: ViewStyle;
  danger: ViewStyle;
  ghost: ViewStyle;
  label: TextStyle;
  disabled: ViewStyle;
  pressed: ViewStyle;
  compact: ViewStyle;
};

const styles = StyleSheet.create<ButtonStyles>({
  button: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  primary: { backgroundColor: palette.coral },
  secondary: { backgroundColor: "#DCEAE3" },
  danger: { backgroundColor: "#F5D9D1" },
  ghost: { backgroundColor: "transparent" },
  label: { fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  compact: { minHeight: 40, paddingHorizontal: 14 }
});

