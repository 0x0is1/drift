import { supabase } from "@lib/supabase";

export type PlayEventKind = "play" | "skip" | "like" | "unlike";

/**
 * Fire-and-forget event log — feeds the feed-tab heuristic ranking (phase 6)
 * and is the future ML training set (phase 8+). Must never block or crash
 * playback if the write fails (offline, RLS misconfigured, etc).
 */
export function logPlayEvent(event: { trackId: string; kind: PlayEventKind; meta?: Record<string, unknown> }) {
  if (!supabase) return;

  // user_id is NOT NULL + RLS-checked against auth.uid() — must be read from
  // the current session, not left for a DB default (there isn't one).
  supabase.auth.getSession().then(({ data }) => {
    const userId = data.session?.user?.id;
    if (!userId || !supabase) return;
    supabase
      .from("drift_play_events")
      .insert({
        user_id: userId,
        track_id: event.trackId,
        kind: event.kind,
        meta: event.meta ?? {},
      })
      .then(({ error }) => {
        if (error) console.warn("drift_play_events insert failed", error.message);
      });
  });
}
