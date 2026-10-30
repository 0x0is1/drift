import type { SupabaseClient } from "@supabase/supabase-js";

export type Playlist = { id: string; name: string; created_at: string };
export type PlaylistTrack = { track_id: string; position: number };

/**
 * Data access for drift_playlists/drift_playlist_tracks. `addTrack` relies
 * on the unique(playlist_id, track_id) constraint added in schema.sql —
 * an upsert against that constraint is atomic (DB-enforced), unlike the
 * old read-then-insert-if-missing check which raced under concurrent adds.
 */
export class PlaylistModel {
  constructor(private db: SupabaseClient) {}

  async list(): Promise<Playlist[]> {
    const { data, error } = await this.db
      .from("drift_playlists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async create(userId: string, name: string): Promise<Playlist> {
    const { data, error } = await this.db
      .from("drift_playlists")
      .insert({ name, user_id: userId })
      .select("id, name, created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("drift_playlists").delete().eq("id", id);
    if (error) throw error;
  }

  async tracks(playlistId: string): Promise<PlaylistTrack[]> {
    const { data, error } = await this.db
      .from("drift_playlist_tracks")
      .select("track_id, position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async addTrack(playlistId: string, trackId: string): Promise<void> {
    const existing = await this.tracks(playlistId);
    const { error } = await this.db.from("drift_playlist_tracks").upsert(
      { playlist_id: playlistId, track_id: trackId, position: existing.length },
      { onConflict: "playlist_id,track_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  async removeTrack(playlistId: string, trackId: string): Promise<void> {
    const { error } = await this.db
      .from("drift_playlist_tracks")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("track_id", trackId);
    if (error) throw error;
  }
}
