// Expressive web stacks with platform-native faces when bundled fonts are unavailable.
import { Platform } from "react-native";

export const fonts = {
  display: Platform.select({
    web: "Fraunces, Georgia, \"Times New Roman\", serif",
    default: "System"
  })!,
  displayBold: Platform.select({
    web: "Fraunces, Georgia, \"Times New Roman\", serif",
    default: "System"
  })!,
  body: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "System"
  })!,
  bodySemi: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "System"
  })!,
  bodyBold: Platform.select({
    web: "\"Source Sans 3\", \"Source Sans Pro\", Helvetica, Arial, sans-serif",
    default: "System"
  })!
};
