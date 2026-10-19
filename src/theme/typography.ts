/**
 * Centralized typography — every font family/size/weight/letterSpacing
 * decision lives here. Nothing else in src/ should reference a font family
 * string directly.
 *
 * Fonts: Racing Sans One (display/headers — F1/NFS speed-lettering feel)
 * + Rajdhani (UI/body — condensed technical HUD face, pairs with the
 * display font without clashing) + Teko (numeric/stat faces — durations,
 * BPM-style counters, track numbers).
 *
 * Loaded via @expo-google-fonts/* packages (no manual font file management).
 */
import { createFont } from "@tamagui/core";
import { RacingSansOne_400Regular } from "@expo-google-fonts/racing-sans-one";
import {
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";
import { Teko_500Medium, Teko_700Bold } from "@expo-google-fonts/teko";

export const fontFamilies = {
  display: "RacingSansOne_400Regular",
  body: "Rajdhani_500Medium",
  bodyBold: "Rajdhani_700Bold",
  bodySemibold: "Rajdhani_600SemiBold",
  numeric: "Teko_500Medium",
  numericBold: "Teko_700Bold",
} as const;

// Pass directly to expo-font's useFonts() in src/app/_layout.tsx:
// const [fontsLoaded] = useFonts(googleFontsToLoad);
export const googleFontsToLoad = {
  RacingSansOne_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
  Teko_500Medium,
  Teko_700Bold,
};

const size = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 16,
  7: 18,
  8: 20,
  9: 23,
  10: 27,
  11: 32,
  12: 38,
  13: 46,
  14: 56,
} as const;

const lineHeight = {
  1: 14,
  2: 16,
  3: 17,
  4: 19,
  5: 20,
  6: 21,
  7: 23,
  8: 25,
  9: 28,
  10: 32,
  11: 37,
  12: 43,
  13: 51,
  14: 61,
} as const;

// Racing Sans One is already a display/condensed face — give it wide
// positive tracking at large sizes for the "logotype" feel, tighten at
// small sizes so it stays legible.
const letterSpacing = {
  1: 0,
  2: 0,
  3: 0.2,
  4: 0.2,
  5: 0.4,
  6: 0.4,
  7: 0.6,
  8: 0.8,
  9: 1,
  10: 1.2,
  11: 1.4,
  12: 1.6,
  13: 1.8,
  14: 2,
} as const;

const weight = {
  4: "400",
  5: "500",
  6: "600",
  7: "700",
} as const;

export const headingFont = createFont({
  family: fontFamilies.display,
  size,
  lineHeight,
  letterSpacing,
  weight,
  face: {
    400: { normal: fontFamilies.display },
  },
});

export const bodyFont = createFont({
  family: fontFamilies.body,
  size,
  lineHeight,
  letterSpacing: {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.2, 8: 0.2,
    9: 0.3, 10: 0.3, 11: 0.4, 12: 0.4, 13: 0.5, 14: 0.5,
  },
  weight,
  face: {
    500: { normal: fontFamilies.body },
    600: { normal: fontFamilies.bodySemibold },
    700: { normal: fontFamilies.bodyBold },
  },
});

export const numericFont = createFont({
  family: fontFamilies.numeric,
  size,
  lineHeight,
  letterSpacing: {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
    9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0,
  },
  weight: { 500: "500", 700: "700" },
  face: {
    500: { normal: fontFamilies.numeric },
    700: { normal: fontFamilies.numericBold },
  },
});
