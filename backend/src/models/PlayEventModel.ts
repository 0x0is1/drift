import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayEventKind = "play" | "skip" | "like" | "unlike";
export type PlayEventRow = { track_id: string; kind: PlayEventKind; meta: Record<string, unknown> | null; created_at: string };

/** Data access for drift_play_events — the append-only training-data log. */
export class PlayEventModel {
  constructor(private db: SupabaseClient) {}

  async insert(userId: string, trackId: string, kind: PlayEventKind, meta: Record<string, unknown>): Promise<void> {
    const { error } = await this.db
      .from("drift_play_events")
      .insert({ user_id: userId, track_id: trackId, kind, meta });
    if (error) throw error;
  }

  async recent(limit: number): Promise<Pick<PlayEventRow, "kind" | "meta" | "created_at">[]> {
    const { data, error } = await this.db
      .from("drift_play_events")
      .select("kind, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async likeEvents(): Promise<Pick<PlayEventRow, "track_id" | "kind" | "created_at">[]> {
    const { data, error } = await this.db
      .from("drift_play_events")
      .select("track_id, kind, created_at")
      .in("kind", ["like", "unlike"])
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
}
