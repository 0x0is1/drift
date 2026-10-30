import { supabase } from "@lib/supabase";

/**
 * Sync-listen sessions (phase 7, see CLAUDE.md): queue + transport-state
 * sync only, no sample-accurate audio sync — deliberately descoped. One row
 * per session in drift_sessions, realtime UPDATE on that row is the only
 * channel; drift_session_members is just membership (join = insert a row,
 * leave = delete it). RLS already handles host-vs-member access, see
 * supabase/schema.sql.
 */
export type SyncQueueItem = {
  id: string;
  playUrl: string;
  songName: string;
  songCover?: string;
  artistName?: string;
  duration: number;
};

export type SyncSessionRow = {
  id: string;
  host_user_id: string;
  queue: SyncQueueItem[];
  current_index: number;
  is_playing: boolean;
  position_seconds: number;
  updated_at: string;
};

export type SyncSessionMember = {
  user_id: string;
  display_name: string | null;
  joined_at: string;
};

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function createSession(
  queue: SyncQueueItem[],
  currentIndex: number,
  isPlaying: boolean,
  positionSeconds: number,
): Promise<SyncSessionRow> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("drift_sessions")
    .insert({
      host_user_id: userId,
      queue,
      current_index: currentIndex,
      is_playing: isPlaying,
      position_seconds: positionSeconds,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SyncSessionRow;
}

export async function getSession(sessionId: string): Promise<SyncSessionRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("drift_sessions").select("*").eq("id", sessionId).single();
  if (error) return null;
  return data as SyncSessionRow;
}

export async function updateSession(
  sessionId: string,
  patch: Partial<Pick<SyncSessionRow, "queue" | "current_index" | "is_playing" | "position_seconds">>,
) {
  if (!supabase) return;
  const { error } = await supabase
    .from("drift_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) console.warn("drift_sessions update failed", error.message);
}

export async function endSession(sessionId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("drift_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export async function joinSession(sessionId: string, displayName?: string | null): Promise<SyncSessionRow> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await requireUserId();
  const { error: joinError } = await supabase
    .from("drift_session_members")
    .insert({ session_id: sessionId, user_id: userId, display_name: displayName ?? null });
  if (joinError) throw joinError;
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found");
  return session;
}

export async function getSessionMembers(sessionId: string): Promise<SyncSessionMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("drift_session_members")
    .select("user_id, display_name, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) return [];
  return data as SyncSessionMember[];
}

/** Realtime subscription to one session's membership INSERT/DELETE. Returns an unsubscribe function. */
export function subscribeToSessionMembers(sessionId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`drift_session_members:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "drift_session_members", filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "drift_session_members", filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export async function leaveSession(sessionId: string) {
  if (!supabase) return;
  const userId = await requireUserId();
  const { error } = await supabase
    .from("drift_session_members")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) console.warn("drift_session_members delete failed", error.message);
}

/** Realtime subscription to one session row's UPDATE/DELETE. Returns an unsubscribe function. */
export function subscribeToSession(
  sessionId: string,
  onUpdate: (row: SyncSessionRow) => void,
  onDelete: () => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`drift_sessions:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "drift_sessions", filter: `id=eq.${sessionId}` },
      (payload: { new: SyncSessionRow }) => onUpdate(payload.new),
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "drift_sessions", filter: `id=eq.${sessionId}` },
      () => onDelete(),
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
