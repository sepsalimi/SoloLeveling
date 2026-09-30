// Provides consistent accessible text fields across light and dark native themes.
import { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";

export const Input = forwardRef<TextInput, TextInputProps>(function Input({ style, placeholderTextColor, ...props }, ref) {
  const dark = useColorScheme() === "dark";
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? (dark ? palette.darkMuted : palette.muted)}
      style={[styles.input, dark && styles.inputDark, style]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#E9E5DA",
    color: palette.ink
  },
  inputDark: {
    borderColor: palette.darkLine,
    backgroundColor: palette.surfaceDark,
    color: palette.darkInk
  }
});
