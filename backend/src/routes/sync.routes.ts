import { Elysia, t } from "elysia";
import { authPlugin } from "@middleware/auth";
import { SyncController } from "@controllers/SyncController";

const syncQueueItem = t.Object({
  id: t.String(),
  playUrl: t.String(),
  songName: t.String(),
  songCover: t.Optional(t.String()),
  artistName: t.Optional(t.String()),
  duration: t.Number(),
});

const syncPatchBody = t.Object({
  queue: t.Optional(t.Array(syncQueueItem)),
  current_index: t.Optional(t.Number()),
  is_playing: t.Optional(t.Boolean()),
  position_seconds: t.Optional(t.Number()),
});

/**
 * "Listen Together" sessions, fully proxied. Members poll GET /:id every
 * couple seconds instead of subscribing to Supabase Realtime directly —
 * this feature already tolerates ~2s drift (see PlayerContext.applyRemoteState),
 * so a short poll reads the same as a push without a websocket relay.
 */
export const syncRoutes = new Elysia({ prefix: "/sync/sessions" })
  .use(authPlugin)
  .post(
    "/",
    ({ body, userId, db }) => new SyncController(db).create(userId, body),
    {
      body: t.Object({
        queue: t.Array(syncQueueItem),
        current_index: t.Number(),
        is_playing: t.Boolean(),
        position_seconds: t.Number(),
      }),
    },
  )
  .get("/:id", ({ params, db }) => new SyncController(db).get(params.id))
  .patch("/:id", ({ params, body, db }) => new SyncController(db).update(params.id, body), {
    body: syncPatchBody,
  })
  .delete("/:id", ({ params, db }) => new SyncController(db).end(params.id))
  .post("/:id/members", ({ params, userId, db }) => new SyncController(db).join(params.id, userId))
  .delete("/:id/members", ({ params, userId, db }) => new SyncController(db).leave(params.id, userId));
