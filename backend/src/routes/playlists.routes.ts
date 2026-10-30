import { Elysia, t } from "elysia";
import { authPlugin } from "@middleware/auth";
import { PlaylistsController } from "@controllers/PlaylistsController";

export const playlistsRoutes = new Elysia({ prefix: "/playlists" })
  .use(authPlugin)
  .get("/", ({ db }) => new PlaylistsController(db).list())
  .post("/", ({ body, userId, db }) => new PlaylistsController(db).create(userId, body.name), {
    body: t.Object({ name: t.String() }),
  })
  .delete("/:id", ({ params, db }) => new PlaylistsController(db).remove(params.id))
  .get("/:id/tracks", ({ params, db }) => new PlaylistsController(db).tracks(params.id))
  .post(
    "/:id/tracks",
    ({ params, body, db }) => new PlaylistsController(db).addTrack(params.id, body.trackId),
    { body: t.Object({ trackId: t.String() }) },
  )
  .delete(
    "/:id/tracks/:trackId",
    ({ params, db }) => new PlaylistsController(db).removeTrack(params.id, params.trackId),
  );
