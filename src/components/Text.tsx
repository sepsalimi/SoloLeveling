// Themed text with Fraunces display faces and Source Sans 3 for body copy.
import { PropsWithChildren } from "react";
import { StyleSheet, Text as RNText, TextProps, TextStyle, useColorScheme } from "react-native";
import { palette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

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
  base: { fontFamily: fonts.body, letterSpacing: 0 },
  display: { fontFamily: fonts.display, fontSize: 46, lineHeight: 50, letterSpacing: -1.4 },
  title: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted },
  metric: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: "uppercase" },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18 }
});
