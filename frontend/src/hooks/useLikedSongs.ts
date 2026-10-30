import { useEffect, useState } from "react";
import { supabase } from "@lib/supabase";
import { logPlayEvent } from "@lib/eventLog";

/**
 * Liked state derived from drift_play_events (kind: like/unlike) ordered by
 * time — last event per track wins. No separate likes table needed; RLS
 * already scopes rows to auth.uid() so no client-side user filter required.
 */
export function useLikedSongs() {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(() => !supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("drift_play_events")
      .select("track_id, kind, created_at")
      .in("kind", ["like", "unlike"])
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          const next: Record<string, boolean> = {};
          for (const row of data) {
            next[row.track_id as string] = row.kind === "like";
          }
          setLiked(next);
        }
        setLoaded(true);
      });
  }, []);

  const toggleLike = (trackId: string, artist?: string) => {
    const nextVal = !liked[trackId];
    setLiked((prev) => ({ ...prev, [trackId]: nextVal }));
    logPlayEvent({ trackId, kind: nextVal ? "like" : "unlike", ...(artist ? { meta: { artist } } : {}) });
  };

  const isLiked = (trackId: string) => !!liked[trackId];

  return { liked, isLiked, toggleLike, loaded };
}
