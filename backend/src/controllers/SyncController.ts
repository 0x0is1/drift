import type { SupabaseClient } from "@supabase/supabase-js";
import { SyncSessionModel, type SyncQueueItem, type SyncSessionPatch } from "@models/SyncSessionModel";

export class SyncController {
  private model: SyncSessionModel;
  constructor(db: SupabaseClient) {
    this.model = new SyncSessionModel(db);
  }

  async create(
    userId: string,
    initial: { queue: SyncQueueItem[]; current_index: number; is_playing: boolean; position_seconds: number },
  ) {
    return { session: await this.model.create(userId, initial) };
  }

  async get(id: string) {
    return { session: await this.model.get(id) };
  }

  async update(id: string, patch: SyncSessionPatch) {
    await this.model.update(id, patch);
    return { ok: true };
  }

  async end(id: string) {
    await this.model.end(id);
    return { ok: true };
  }

  async join(id: string, userId: string) {
    await this.model.join(id, userId);
    return { session: await this.model.get(id) };
  }

  async leave(id: string, userId: string) {
    await this.model.leave(id, userId);
    return { ok: true };
  }
}
