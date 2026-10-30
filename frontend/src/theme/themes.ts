import { tokens } from "./tokens";

export const darkTheme = {
  accent: tokens.color.white.val,
  accentDim: tokens.color.gray600.val,
  accentGlow: tokens.color.overlayPrimary.val,
  background: tokens.color.surfaceDark0.val,
  backgroundStrong: tokens.color.black.val,
  backgroundHover: tokens.color.surfaceDark1.val,
  backgroundPress: tokens.color.surfaceDark2.val,
  color: tokens.color.white.val,
  colorSecondary: tokens.color.floatingPlayerTextSecondary.val,
  colorPlaceholder: tokens.color.placeholder.val,
  borderColor: tokens.color.surfaceDark2.val,
  shadowColor: tokens.color.shadowPrimary.val,
  overlay: tokens.color.overlayPrimary.val,
  drawerBackground: tokens.color.surfaceDark2.val,
  drawerItemActive: tokens.color.tealAccent.val,
  drawerItemInactive: tokens.color.floatingPlayerTextSecondary.val,
  cardBackground: tokens.color.cardBg.val,
  floatingIslandBackground: tokens.color.floatingPlayerBg.val,
};

export const lightTheme = {
  accent: tokens.color.black.val,
  accentDim: tokens.color.gray600.val,
  accentGlow: tokens.color.overlaySecondary.val,
  background: tokens.color.white.val,
  backgroundStrong: tokens.color.gray100.val,
  backgroundHover: tokens.color.gray50.val,
  backgroundPress: tokens.color.navbarBg.val,
  color: tokens.color.black.val,
  colorSecondary: tokens.color.gray600.val,
  colorPlaceholder: tokens.color.placeholder.val,
  borderColor: tokens.color.borderSecondary.val,
  shadowColor: tokens.color.shadowSecondary.val,
  overlay: tokens.color.overlaySecondary.val,
  drawerBackground: tokens.color.drawerBg.val,
  drawerItemActive: tokens.color.drawerItemActive.val,
  drawerItemInactive: tokens.color.drawerItemInactive.val,
  cardBackground: tokens.color.cardBg.val,
  floatingIslandBackground: tokens.color.black.val,
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
};
