import type { SupabaseClient } from "@supabase/supabase-js";
import { PlaylistModel } from "@models/PlaylistModel";

export class PlaylistsController {
  private model: PlaylistModel;
  constructor(db: SupabaseClient) {
    this.model = new PlaylistModel(db);
  }

  async list() {
    return { playlists: await this.model.list() };
  }

  async create(userId: string, name: string) {
    return { playlist: await this.model.create(userId, name) };
  }

  async remove(id: string) {
    await this.model.delete(id);
    return { ok: true };
  }

  async tracks(id: string) {
    return { tracks: await this.model.tracks(id) };
  }

  async addTrack(id: string, trackId: string) {
    await this.model.addTrack(id, trackId);
    return { ok: true };
  }

  async removeTrack(id: string, trackId: string) {
    await this.model.removeTrack(id, trackId);
    return { ok: true };
  }
}
