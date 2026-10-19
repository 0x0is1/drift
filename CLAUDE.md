# drift — agent instructions

Rewrite of `lissen-mobile` (sibling folder `D:\codes\lissen-mobile`, old codebase kept untouched until cutover), renamed **Drift**. Same app identity on the store/EAS side (see Identity below), same JioSaavn API, new UI stack. Read `MEMORY.md` for the decision log and phase plan before making architecture calls.

## Identity (decided — don't re-litigate)

- **Display name**: Drift (was Lissen). `expo.name` / `extra.displayName` → `"Drift"`.
- **Package/EAS stay the old ones**: `android.package: com.lissenmobile`, `extra.eas.projectId: edf2085f-2a08-4fbe-990f-e33ee757f0d6`, same `owner`. This ships as an update to the *same* installed app, not a new store listing — don't change these even though the name changed.
- **Slug**: keep `lissen-mobile` (EAS update manifest/channel linkage keys off this + projectId, not off the display name) unless told otherwise.
- Old icon/splash assets get replaced by the new Drift mark (see Branding below) but `app.json`'s identity fields above do not move.

## Non-negotiables (decided, do not re-litigate)

- **Language**: TypeScript everywhere. `strict: true`. No `any` without a comment explaining why.
- **Path aliases**: hardcore use, see `tsconfig.json` `paths`. Never write `../../../contexts/X` — always `@contexts/X`. Metro does not read tsconfig paths natively — install `babel-plugin-module-resolver` and mirror the same alias map in `babel.config.js`, or aliases resolve in the editor but crash at runtime.
- **UI**: Tamagui for every component. No raw `StyleSheet.create`, no inline `style={{...}}` with literal colors/spacing. If Tamagui is missing a primitive, check `@expo/ui` before reaching for a RN community lib.
- **Theming**: all design values live in `src/theme/tokens.ts` (Tamagui `createTokens`) + `src/theme/themes.ts` (light/dark). Zero hardcoded hex/rgba in component files — grep for `#[0-9a-fA-F]{3,6}` and `rgba(` in `src/` before merging; both should only match inside `src/theme/`.
- **Color source of truth**: port every value from old `src/constants/colors.js` into tokens 1:1 first (same visual identity), then let Tamagui's semantic layer (`background`, `color`, `borderColor`, etc.) reference them. Teal `#38c999` (old `albumPlayButtonBg`) is the one signature accent — kept deliberately, don't drift the palette away from it.
- **Navigation**: Expo Router (file-based, `app/`). Bottom tabs = primary nav (Home, Search, Library, **Feed** — the new TikTok-style tab). Sidebar = drawer, nested, for secondary stuff (Downloads, Settings, About, Version) — mirrors old `DashboardScreen` drawer. Route *names/behavior* carry over from old `Constants.screenRoutes` / `drawerRoutes`, just reimplemented as Router segments.
- **API layer**: port `ServiceProvider` (old `src/libs/APIParser.js`) near-verbatim into `src/lib/jiosaavn.ts` — same JioSaavn `api.php` endpoints, same `playById`/`playByMediaUrl` two-step auth-token flow, same `Referer: https://www.jiosaavn.com/` header requirement (this was a real bug fixed in the old app — do not drop it). Add TS types for responses incrementally; don't block the port on perfect typing.
- **Player**: `react-native-track-player` stays. Carry forward the race-condition lesson from old `PlayerContext.jsx`: queue mutation (`addTracks`) must be awaited and fully settled *before* anything reads `TrackPlayer.getQueue()` to resolve/override a stream URL. Any rewrite of this flow must preserve that ordering guarantee.
- **New player page UX** (the actual reason for this rewrite): the player screen has a "curtain" banner (ported from old `PlayerBanner`/`panResponder`) — drag it down to reveal the queue list below (curtain shrinks, now-playing art/progress crossfade out), drag it up to return to the now-playing view (curtain grows, progress bar crossfades in). Driven by a single worklet progress value (`usePlayerCurtain`) so it tracks the finger continuously, not a threshold snap. Queue/curtain mode always shows the fixed splash placeholder, never a real album cover — there's no reliable per-queue cover data (same as the old app). This is the centerpiece interaction — get the gesture feel right before polishing anything else downstream.
- **Componentization**: every page file stays under ~150 lines — extract to components the moment it grows past that. Two tiers: `src/components/<feature>/` for feature-local pieces (e.g. `src/components/player/PlayerCurtain.tsx`) used by one screen, `src/components/` root for cross-screen globals (`FloatingMusicIsland`, `IntroSplash`). Pull gesture/animation/data logic into `src/hooks/` (e.g. `usePlayerCurtain`, `useQueue`) instead of inlining it in the page — pages should mostly just compose components and wire hook output to props. Reuse existing components/hooks before writing new ones; reach for `PlayerContext`/other contexts before threading props more than one level.
- **Backend**: Supabase. Reusing a project already provisioned under the same account as `fw-flextudy` (project ref `kzuvsgxqanawydghfqqp`, name "srcc", status paused/idle) — a genuinely separate, isolated Cloud project, NOT flextudy's live `api.flextudy.in` backend. See "Backend correction" below for why this matters and Multi-tenancy below for table-naming rules.
- **Auth**: optional by design (decided 2026-10-19) — the app is always fully usable anonymously; a minimal email/password upgrade flow (`src/app/login.tsx`, `supabase.auth.updateUser`) lets a user attach a real email to their *existing* anonymous id (no new id, no data migration — same pattern phase 8's full OAuth version must follow). Personalized features (saved playlists, cross-device sync, real recommendations) are gated on `!isAnonymous` via `src/hooks/useSession.ts`; everything else works the same for anon and real users. Google/Apple OAuth + a "sign into an existing different account" flow are still phase-8 scope, not built yet.
- **Sync-listen sessions**: queue + transport-state sync only (play/pause/seek/track-change broadcast via Supabase Realtime channels + shared queue row). Each device fetches/streams audio independently. Explicitly NOT sample-accurate synced audio — don't build clock-drift correction, don't let scope creep there.
- **Feed tab (Resso/TikTok-style)**: vertical swipe, one song per screen, autoplay on focus. Song source = JioSaavn search/trending (no separate content API). v1 ranking = heuristic SQL/rules over a Postgres event log (plays, skips, likes, language/artist/genre overlap, recency) — no ML model yet. Every swipe/like/skip event must be logged to Supabase regardless of whether the heuristic uses it yet; that log is the future ML training set, don't let it rot.
- **Playlists**: keep existing mental model from old `PlayerContext` (`addTracks(trackList, index)` builds a `TrackPlayer` queue from a track list + starting index) — reimplement, don't redesign.
- **Commits**: no AI co-author attribution, no description body — title only, caveman-terse, imperative.

## Backend correction (2026-10-11 — read this before touching Supabase)

**2026-10-19 correction**: `kzuvsgxqanawydghfqqp` ("srcc") is NOT idle — it's `fw-srcc`'s (`D:\codes\fw-srcc`) real, actively-developed coaching-center platform backend (spun off from flextudy 2026-09-05, recent commits, own `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in `fw-srcc/services/.env.local`, confirmed linked via `fw-srcc/supabase/.temp/linked-project.json`). Flagged to the user explicitly; **user confirmed sharing it anyway** ("use the same") — this is a deliberate, acknowledged shared-infra decision, not a mistake like the flextudy-credential near-miss below. Drift tables still stay `drift_`-prefixed (see Multi-tenancy) but understand this project also serves fw-srcc's real production-adjacent data — don't run destructive/broad operations against it without considering fw-srcc's side too.

An earlier pass wired up `.env.local` with URL `https://tmjxmeygagcdvaieabjt.supabase.co` believing it was flextudy's idle *original* Supabase Cloud project. Verified wrong:

- That hostname does not resolve (`curl`/`nslookup` both fail — no such Cloud project exists at that ref, deleted or never real).
- The anon key paired with it was byte-for-byte identical to the `EXPO_PUBLIC_SUPABASE_ANON_KEY` flextudy's own apps (`fw-flextudy-app/apps/*/.env.local`) use against `https://api.flextudy.in` — their real, live, self-hosted production gateway serving real students/teachers.
- So the earlier config would have shipped Drift with flextudy's live production credential, just pointed at a dead URL (which accidentally prevented real coupling, but the leaked-into-Drift credential was still live prod — don't repeat this).

Project: `crqpjtezprlxhpwrhwkc` ("nmi", ACTIVE_HEALTHY) is a separate real live thing, do not touch. `kzuvsgxqanawydghfqqp` ("srcc") is the one Drift uses — see the 2026-10-19 correction above for what it actually is. It's fully isolated from flextudy's actual running infra either way (flextudy's real backend is a custom Node/Express microservice stack with its own auth-service, per `fw-flextudy/services/`; their Supabase usage is just the `@supabase/supabase-js` client against a self-hosted GoTrue-compatible endpoint, not a Cloud project with RLS tables at all).

**Resolved (2026-10-19)**: project unpaused, `.env.local` has the real publishable key + URL (`supabase` CLI 2.112.0's `projects api-keys`/`link` stayed broken throughout — `SchemaError` on the `inserted_at` field, a CLI bug confirmed via `--debug`, not a project-state issue — anon key was retrieved manually from the dashboard instead). `supabase/schema.sql` applied via the dashboard SQL editor. A real bug was found and fixed during verification — see the file's own header comment and MEMORY.md for the `drift_sessions`/`drift_session_members` RLS-recursion fix.

## Multi-tenancy on the shared Supabase project

Even though this project is isolated from flextudy's live traffic, it's still an account-shared Cloud project (could have other tables from whatever "srcc" originally was). Non-negotiable to avoid collisions:

- Every Drift table is prefixed `drift_` (`drift_profiles`, `drift_play_events`, `drift_playlists`, `drift_sessions`, ...). Never create an unprefixed table.
- Drift's own RLS policies, scoped to `auth.uid()`, written from scratch (standard Supabase RLS patterns — flextudy's real backend doesn't use Postgres RLS at all, so there's no existing style to match). See `supabase/schema.sql` for the policies as written.
- Auth users table (`auth.users`) is shared infrastructure for this project — fine, since nothing else should be relying on it (it's an idle project), but don't assume it's empty; check before assuming id `1` is Drift's first user.
- If this ever becomes a real scaling problem, splitting to a dedicated project later is a config change (new URL/key), not a rewrite — don't over-engineer for that now.

## Branding

- **Name**: Drift.
- **Logo concept**: abstract mark, not a literal music note — ties visually to the drag-transition gesture (player ↔ album) and the idea of easing from one state/song into another. Teal `#38c999` as the mark's signature color against black/white.
- **Design variants / screens**: generated via the Stitch MCP server (`@_davideast/stitch-mcp`). Project ID `441617297005208316` ("Drift") — screens generated: Home, Search, Library, Feed Discovery, Now Playing/Player, Settings, About, Downloads, Album Tracklist, plus a brand-mark concept and an album-art style concept. `list_screens` on this project ID returns the live screen set + per-screen IDs/screenshots — don't re-generate from scratch, fetch and reconcile against these first.
- Logo itself (not a "screen") was produced via a local SVG + Playwright-render + ffmpeg pipeline, not Stitch — Stitch is for app screens/mockups, not icon/mark design.

## Phase plan (see MEMORY.md for the live/current status of each)

1. Scaffold: Expo Router + TS + Tamagui + tsconfig/babel aliases wired end to end, old `app.json`/`eas.json` ported with Drift identity changes above.
2. Theme tokens + Tamagui config from old `colors.js`; Drift logo/icon assets in.
3. Core screens: Home, Search, Library, Album viewer, Player (drag sheet), Settings/About/Downloads/Version drawer — design via Stitch once MCP is live, build against it.
4. JioSaavn API port + playback (track-player, race-condition-safe queue flow).
5. Supabase schema on the isolated `kzuvsgxqanawydghfqqp` project: `drift_`-prefixed tables for users (anon-first), play-event log, playlists, sessions.
6. Feed tab: vertical swipe UI + heuristic ranking reading the event log.
7. Sync-listen sessions: realtime channel, shared queue/transport state.
8. Auth phase: email/password + Google/Apple OAuth, link anonymous identity.
9. Multi-device synced party playback: phones on same WiFi/LAN play the same track in sample-sync (AmpMe/Sonos-style), for combined/louder sound off multiple low-end speakers. Needs: LAN peer discovery (mDNS, e.g. `react-native-zeroconf`), NTP-style clock-offset exchange between phones, scheduled-start-at-absolute-timestamp instead of "play now", periodic drift correction via small playback-rate nudges (not hard seeks). Separate subsystem from phase 7's queue sync — phase 7 is remote-control (one device plays, others send commands), this is every device actually playing audio together.

Work phases in order. Don't start Realtime sessions (7) before the event log (5) exists — the heuristic and the session feature both read/write the same Postgres tables, build them together in phase order, not in parallel ad hoc.

## Things to NOT do

- Don't restyle old `lissen-mobile` in place — it's a reference, not a target. Diff against it for behavior parity, never copy its RN StyleSheet patterns.
- Don't build a custom ML model for the feed — heuristic only until told otherwise.
- Don't skip the anonymous-auth bootstrap thinking "auth is later" — later means *UI*, the Supabase user id must exist from day one for any table with a `user_id` column to make sense.
- Don't create unprefixed Supabase tables — shared account-level project, collision risk is real.
- Don't point `.env.local` at `api.flextudy.in` or any `tmjxmeygagcdvaieabjt`-ref key ever again — that's flextudy's live production credential, not Drift's.
- Don't change `android.package` / `extra.eas.projectId` / slug when touching `app.json` for the rename — only display-name/branding fields move.
