// Life Analytics palette with light/dark surface tokens for chips, inputs, and chrome.
export const palette = {
  ink: "#12302C",
  muted: "#4F655F",
  paper: "#F3EFE5",
  surface: "#FFFCF5",
  surfaceMuted: "#E9E5DA",
  surfaceTint: "#DDEBE4",
  surfaceAccent: "#F5DDD4",
  surfaceDark: "#102B28",
  forest: "#123D37",
  teal: "#1F5F57",
  mint: "#9EC9B8",
  coral: "#C2472E",
  clay: "#A85A3A",
  gold: "#C4922A",
  sky: "#AFCFCE",
  rose: "#B85A4E",
  line: "#DDD6C8",
  darkInk: "#F7F2E8",
  darkMuted: "#9DB1AA",
  darkPaper: "#071A18",
  darkLine: "#27433E",
  darkSurface: "#102B28",
  darkSurfaceMuted: "#17332F",
  darkSurfaceTint: "#1A3D37",
  darkSurfaceAccent: "#3A2420",
  darkChip: "#1C3833"
};

export const categoryColors: Record<string, string> = {
  work: "#1F5F57",
  learning: "#2F6F86",
  health: "#A85A3A",
  exercise: "#C2472E",
  food: "#8A6A1A",
  chores: "#5F6B4A",
  social: "#A84F42",
  entertainment: "#3D6470",
  rest: "#3F6F5F",
  travel: "#8A5A35",
  personal_care: "#3F6B62",
  other: "#6A6358"
};

export function surfaces(dark: boolean) {
  return {
    paper: dark ? palette.darkPaper : palette.paper,
    surface: dark ? palette.darkSurface : palette.surface,
    muted: dark ? palette.darkSurfaceMuted : palette.surfaceMuted,
    tint: dark ? palette.darkSurfaceTint : palette.surfaceTint,
    accent: dark ? palette.darkSurfaceAccent : palette.surfaceAccent,
    chip: dark ? palette.darkChip : palette.surfaceMuted,
    line: dark ? palette.darkLine : palette.line,
    ink: dark ? palette.darkInk : palette.ink,
    softText: dark ? palette.darkMuted : palette.muted,
    inverse: "#FFFFFF",
    forest: palette.forest,
    coral: palette.coral,
    gold: palette.gold,
    mint: palette.mint,
    teal: palette.teal
  };
}
