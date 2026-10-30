import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@lib/errors";

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

export type SyncSessionPatch = Partial<
  Pick<SyncSessionRow, "queue" | "current_index" | "is_playing" | "position_seconds">
>;

/** Data access for drift_sessions/drift_session_members ("Listen Together"). */
export class SyncSessionModel {
  constructor(private db: SupabaseClient) {}

  async create(hostUserId: string, initial: SyncSessionPatch): Promise<SyncSessionRow> {
    const { data, error } = await this.db
      .from("drift_sessions")
      .insert({ host_user_id: hostUserId, ...initial })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async get(id: string): Promise<SyncSessionRow> {
    const { data, error } = await this.db.from("drift_sessions").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Session not found");
      throw error;
    }
    return data;
  }

  async update(id: string, patch: SyncSessionPatch): Promise<void> {
    const { error } = await this.db
      .from("drift_sessions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async end(id: string): Promise<void> {
    const { error } = await this.db.from("drift_sessions").delete().eq("id", id);
    if (error) throw error;
  }

  async join(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("drift_session_members")
      .insert({ session_id: sessionId, user_id: userId });
    if (error) throw error;
  }

  async leave(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("drift_session_members")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);
    if (error) throw error;
  }
}
