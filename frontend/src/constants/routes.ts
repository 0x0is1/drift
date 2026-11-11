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
  licenses: "/(drawer)/licenses",
  version: "/(drawer)/version",
  player: "/player",
  login: "/login",
  likedSongs: "/liked-songs",
  album: (id: string) => `/album/${id}`,
  playlist: (id: string) => `/playlist/${id}`,
  addToPlaylist: (trackId: string) => `/add-to-playlist?trackId=${trackId}`,
  listenTogether: "/listen-together",
  syncNearby: "/sync-nearby",
  onboarding: "/onboarding",
  languages: "/languages",
} as const;

/** Routes where the floating music island must stay hidden (full player is showing itself, or modal actions at bottom). */
export const islandHiddenOnRoutes = ["/player", "/feed", "/onboarding", "/languages"];

/**
 * Routes rendered inside the (tabs) group — the only ones with a real tab
 * bar underneath. FloatingMusicIsland uses this to self-arrange: rest
 * directly above the tab bar where one exists, or above the safe-area edge
 * where it doesn't, instead of a hardcoded per-route offset.
 */
export const tabBarRoutes = ["/", "/search", "/library", "/profile"];

/**
 * Shared between the tabs layout (raised circular Feed button) and
 * FloatingMusicIsland (must clear it) — one source of truth so the two
 * can't drift out of sync and overlap again.
 */
export const FEED_CIRCLE_SIZE = 72;
export const FEED_BORDER_WIDTH = 4;
/** Visible protrusion above the bar's top edge — 1/4 of the circle. */
export const FEED_BUTTON_PROTRUSION = FEED_CIRCLE_SIZE / 4;

/**
 * The tab bar's own height formula (see (tabs)/_layout.tsx's tabBarStyle),
 * duplicated here as the single source of truth so FeedRaisedButton and
 * FloatingMusicIsland can both compute exact screen-space offsets against
 * it without drifting out of sync with the bar's actual rendered height.
 */
export const TAB_BAR_HEIGHT_BASE = 56;
export const TAB_BAR_PADDING = 8;
