import type { SupabaseClient } from "@supabase/supabase-js";
import { PlayEventModel } from "@models/PlayEventModel";

/** Liked state derived from drift_play_events (kind: like/unlike) — last event per track wins. */
export class LikedSongsController {
  private model: PlayEventModel;
  constructor(db: SupabaseClient) {
    this.model = new PlayEventModel(db);
  }

  async getLiked() {
    const events = await this.model.likeEvents();
    const liked: Record<string, boolean> = {};
    for (const row of events) liked[row.track_id] = row.kind === "like";
    return { liked };
  }
}
