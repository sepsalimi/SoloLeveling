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
};

export function Button({ label, icon, variant = "primary", onPress, disabled, style }: Props) {
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
};

const styles = StyleSheet.create<ButtonStyles>({
  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  primary: { backgroundColor: palette.teal },
  secondary: { backgroundColor: "#DDEBE6" },
  danger: { backgroundColor: "#F7DEDE" },
  ghost: { backgroundColor: "transparent" },
  label: { fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.88 }
});

