import { createTamagui } from "@tamagui/core";
import { createAnimations } from "@tamagui/animations-reanimated";
import { shorthands } from "@tamagui/config/v5";
import { tokens } from "./tokens";
import { themes } from "./themes";
import { headingFont, bodyFont, numericFont } from "./typography";

const animations = createAnimations({
  bouncy: { type: "spring", damping: 10, mass: 0.9, stiffness: 100 },
  lazy: { type: "spring", damping: 20, mass: 1.2, stiffness: 60 },
  quick: { type: "timing", duration: 150 },
  drag: { type: "spring", damping: 24, mass: 1, stiffness: 220 },
});

export const config = createTamagui({
  animations,
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    numeric: numericFont,
  },
  tokens,
  themes,
});

export type DriftTamaguiConfig = typeof config;

declare module "@tamagui/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required Tamagui module-augmentation pattern, body is always empty
  interface TamaguiCustomConfig extends DriftTamaguiConfig {}
}
