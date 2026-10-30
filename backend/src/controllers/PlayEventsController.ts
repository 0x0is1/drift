import type { SupabaseClient } from "@supabase/supabase-js";
import { PlayEventModel, type PlayEventKind } from "@models/PlayEventModel";

export class PlayEventsController {
  private model: PlayEventModel;
  constructor(db: SupabaseClient) {
    this.model = new PlayEventModel(db);
  }

  async logEvent(userId: string, trackId: string, kind: PlayEventKind, meta?: Record<string, unknown>) {
    await this.model.insert(userId, trackId, kind, meta ?? {});
    return { ok: true };
  }
}
