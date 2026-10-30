import type { SupabaseClient } from "@supabase/supabase-js";
import { PlayEventModel } from "@models/PlayEventModel";
import { scoreArtist, type WeightedEvent } from "@services/FeedScoringService";
import type { IJioSaavnService } from "@services/JioSaavnService";

const EVENT_WEIGHT: Record<string, number> = { like: 2, play: 1, skip: -1, unlike: -2 };
const RECENT_EVENT_LIMIT = 500;

type FeedSong = {
  id: string;
  song: string;
  image: string;
  duration: string;
  encrypted_media_url: string;
  primary_artists?: string;
};

/**
 * Charts → first chart's playlist → ranked by the caller's own
 * drift_play_events affinity (phase 6/8 heuristic). One call returns the
 * ready-to-render feed; the app never touches JioSaavn or the event log
 * directly for this.
 */
export class FeedController {
  private events: PlayEventModel;
  constructor(db: SupabaseClient, private jiosaavn: IJioSaavnService) {
    this.events = new PlayEventModel(db);
  }

  async getFeed() {
    const charts = (await this.jiosaavn.getCharts()) as { charts?: { id: string }[] } | { id: string }[];
    const chartList: { id: string }[] = Array.isArray(charts) ? charts : charts.charts ?? [];
    const firstChart = chartList[0];
    if (!firstChart) return { songs: [], playlistArtist: "" };

    const playlist = (await this.jiosaavn.getPlaylistById(firstChart.id)) as {
      songs?: FeedSong[];
      firstname?: string;
    };
    const songs = playlist.songs ?? [];
    const playlistArtist = playlist.firstname ?? "";

    const events = await this.events.recent(RECENT_EVENT_LIMIT);
    const affinity = this.computeAffinity(events);

    const ranked = this.rankByAffinity(songs, affinity);
    return { songs: ranked, playlistArtist };
  }

  private computeAffinity(
    events: { kind: string; meta: Record<string, unknown> | null; created_at: string }[],
  ): Record<string, number> {
    const eventsByArtist: Record<string, WeightedEvent[]> = {};
    for (const row of events) {
      const artist = row.meta?.artist;
      if (typeof artist !== "string" || !artist) continue;
      const weight = EVENT_WEIGHT[row.kind] ?? 0;
      if (weight === 0) continue;
      (eventsByArtist[artist] ??= []).push({ weight, createdAt: row.created_at });
    }
    const affinity: Record<string, number> = {};
    for (const [artist, evs] of Object.entries(eventsByArtist)) affinity[artist] = scoreArtist(evs);
    return affinity;
  }

  private rankByAffinity(songs: FeedSong[], affinity: Record<string, number>): FeedSong[] {
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
}
