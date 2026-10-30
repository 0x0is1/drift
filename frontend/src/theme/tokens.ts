/**
 * Every color/space/radius/zIndex value in the app lives here. No
 * component may hardcode a hex/rgba literal — grep `#[0-9a-fA-F]{3,6}`
 * and `rgba(` in src/ should only ever match this file.
 *
 * Base palette ported 1:1 from old lissen-mobile/src/constants/colors.js
 * (see CLAUDE.md "Color source of truth"). Teal #38c999 is the kept
 * signature accent.
 */
import { createTokens } from "@tamagui/core";
import { tokens as baseTokens } from "@tamagui/config/v5";

const color = {
  // --- ported 1:1 from old colors.js ---
  black: "#000000",
  white: "#ffffff",
  gray600: "#666666",
  gray700: "#333333",
  gray100: "#e7e9eb",
  gray50: "#f5f5f5",
  tealAccent: "#38c999",
  navbarBg: "#f0f0f0",
  overlayPrimary: "rgba(0, 0, 0, 0.4)",
  overlaySecondary: "rgba(0, 0, 0, 0.35)",
  buttonsBg: "#f5f5f4",
  shadowPrimary: "#010101",
  shadowSecondary: "#dddddd",
  borderPrimary: "#cccccc",
  borderSecondary: "#e4e4e4",
  placeholder: "#999999",
  drawerBg: "#f5f5f5",
  drawerItemActive: "#1f1e1e",
  drawerItemInactive: "#333131",
  progressTrack: "gray",
  progressFill: "#000000",
  floatingPlayerBg: "#000000",
  floatingPlayerTextSecondary: "#B0B0B0",
  categoryPrimary: "#46494d",
  cardBg: "rgba(20, 34, 51, 0.73)",

  // --- new for Drift (dark-first racing theme, teal stays the only accent) ---
  surfaceDark0: "#0a0a0a",
  surfaceDark1: "#141414",
  surfaceDark2: "#1e1e1e",
  tealAccentDim: "#2a9c75",
  tealAccentGlow: "rgba(56, 201, 153, 0.35)",
  dangerRed: "#e5484d",
  whiteTrackDim: "rgba(255, 255, 255, 0.3)",
} as const;

export const tokens = createTokens({
  ...baseTokens,
  color: {
    ...color,
  },
  radius: {
    ...baseTokens.radius,
    island: 18,
  },
  zIndex: {
    ...baseTokens.zIndex,
    floatingIsland: 500,
    introSplash: 1000,
  },
});

export type DriftTokens = typeof tokens;
