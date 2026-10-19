import { supabase } from "@lib/supabase";
import { scoreArtist, type WeightedEvent } from "@lib/feedModel";

export type ArtistAffinity = Record<string, number>;

/**
 * Phase 6/8: per-artist affinity from the user's own event log. The actual
 * scoring (recency decay + squash) lives in feedModel.ts, a fake stand-in
 * for the real phase 8 model until drift_play_events has enough volume to
 * train on — this file just groups events by artist and feeds them in.
 */
const EVENT_WEIGHT: Record<string, number> = { like: 2, play: 1, skip: -1, unlike: -2 };
const RECENT_EVENT_LIMIT = 500;

export async function getArtistAffinity(): Promise<ArtistAffinity> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("drift_play_events")
    .select("kind, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_EVENT_LIMIT);
  if (error || !data) return {};

  const eventsByArtist: Record<string, WeightedEvent[]> = {};
  for (const row of data) {
    const artist = (row.meta as Record<string, unknown> | null)?.artist;
    if (typeof artist !== "string" || !artist) continue;
    const weight = EVENT_WEIGHT[row.kind as string] ?? 0;
    if (weight === 0) continue;
    (eventsByArtist[artist] ??= []).push({ weight, createdAt: row.created_at as string });
  }

  const affinity: ArtistAffinity = {};
  for (const [artist, events] of Object.entries(eventsByArtist)) {
    affinity[artist] = scoreArtist(events);
  }
  return affinity;
}

/**
 * Stable re-sort: ties (including the all-zero/no-history case) keep the
 * original chart order, so this degrades to a no-op for a fresh user.
 */
export function rankByAffinity<T extends { primary_artists?: string }>(
  songs: T[],
  affinity: ArtistAffinity,
): T[] {
  if (Object.keys(affinity).length === 0) return songs;
  return songs
    .map((song, index) => {
      const artists = (song.primary_artists ?? "").split(",").map((a) => a.trim());
      const score = artists.reduce((sum, artist) => sum + (affinity[artist] ?? 0), 0);
      return { song, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.song);
}
