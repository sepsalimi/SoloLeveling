import { PropsWithChildren } from "react";
import { StyleSheet, Text as RNText, TextProps, TextStyle, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";

type Variant = "display" | "title" | "heading" | "body" | "caption" | "metric" | "eyebrow" | "label";

export function Text({ children, style, variant = "body", ...props }: PropsWithChildren<TextProps & { variant?: Variant }>) {
  const dark = useColorScheme() === "dark";
  const color = variant === "caption"
    ? dark ? palette.darkMuted : palette.muted
    : dark ? palette.darkInk : palette.ink;
  return (
    <RNText style={[styles.base, styles[variant], { color }, style]} {...props}>
      {children}
    </RNText>
  );
}

type TextStyles = Record<Variant | "base", TextStyle>;

const styles = StyleSheet.create<TextStyles>({
  base: { fontWeight: "400", letterSpacing: 0 },
  display: { fontSize: 48, lineHeight: 52, fontWeight: "800", letterSpacing: -1.8 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -1 },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "700", letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 19, color: palette.muted },
  metric: { fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "700" }
});

