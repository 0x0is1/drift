/**
 * Route name constants — mirrors old lissen-mobile's Constants.screenRoutes
 * / drawerRoutes, just as Expo Router segment paths instead of
 * React Navigation screen names.
 */
export const routes = {
  home: "/(drawer)/(tabs)",
  search: "/(drawer)/(tabs)/search",
  library: "/(drawer)/(tabs)/library",
  profile: "/(drawer)/(tabs)/profile",
  feed: "/(drawer)/(tabs)/feed",
  downloads: "/(drawer)/downloads",
  settings: "/(drawer)/settings",
  about: "/(drawer)/about",
  version: "/(drawer)/version",
  player: "/player",
  login: "/login",
  likedSongs: "/liked-songs",
  album: (id: string) => `/album/${id}`,
  playlist: (id: string) => `/playlist/${id}`,
  addToPlaylist: (trackId: string) => `/add-to-playlist?trackId=${trackId}`,
  listenTogether: "/listen-together",
} as const;

/** Routes where the floating music island must stay hidden (full player is showing itself). */
export const islandHiddenOnRoutes = ["/player", "/feed"];

/**
 * Shared between the tabs layout (raised circular Feed button) and
 * FloatingMusicIsland (must clear it) — one source of truth so the two
 * can't drift out of sync and overlap again.
 */
export const FEED_CIRCLE_SIZE = 60;
export const FEED_BORDER_WIDTH = 4;
/** Visible protrusion above the bar's top edge, capped at 1/4 of the circle. */
export const FEED_BUTTON_PROTRUSION = FEED_CIRCLE_SIZE / 4;
/** overflow:hidden on the circle clips the border inward (border-box), so raise = protrusion exactly, no compensation needed. */
export const FEED_RAISE = FEED_BUTTON_PROTRUSION;
