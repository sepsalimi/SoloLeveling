// Expressive type faces: CSS family names on web, Expo font module names on native.
import { Platform } from "react-native";

export const fonts = {
  display: Platform.select({
    web: "Fraunces, Georgia, \"Times New Roman\", serif",
    default: "Fraunces_800ExtraBold"
  })!,
  displayBold: Platform.select({
    web: "Fraunces, Georgia, \"Times New Roman\", serif",
    default: "Fraunces_700Bold"
  })!,
  body: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "SourceSans3_400Regular"
  })!,
  bodySemi: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "SourceSans3_600SemiBold"
  })!,
  bodyBold: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "SourceSans3_700Bold"
  })!
};
