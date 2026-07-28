import { PropsWithChildren } from "react";
import { StyleSheet, Text as RNText, TextProps, TextStyle, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";

type Variant = "title" | "heading" | "body" | "caption" | "metric";

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
  base: { fontWeight: "500", letterSpacing: 0 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: "800" },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 23 },
  caption: { fontSize: 13, lineHeight: 18, color: palette.muted },
  metric: { fontSize: 28, lineHeight: 34, fontWeight: "800" }
});

