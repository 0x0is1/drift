import { supabase } from "@lib/supabase";

export type Playlist = { id: string; name: string; created_at: string };
export type PlaylistTrack = { track_id: string; position: number };

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function listPlaylists(): Promise<Playlist[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("drift_playlists")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPlaylist(name: string): Promise<Playlist> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("drift_playlists")
    .insert({ name, user_id: userId })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlaylist(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("drift_playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("drift_playlist_tracks")
    .select("track_id, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTrackToPlaylist(playlistId: string, trackId: string) {
  if (!supabase) return;
  const existing = await getPlaylistTracks(playlistId);
  if (existing.some((t) => t.track_id === trackId)) return;
  const { error } = await supabase
    .from("drift_playlist_tracks")
    .insert({ playlist_id: playlistId, track_id: trackId, position: existing.length });
  if (error) throw error;
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("drift_playlist_tracks")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);
  if (error) throw error;
}
