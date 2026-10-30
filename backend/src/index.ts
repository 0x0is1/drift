import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jiosaavnRoutes } from "@routes/jiosaavn.routes";
import { playEventsRoutes } from "@routes/playEvents.routes";
import { likedSongsRoutes } from "@routes/likedSongs.routes";
import { playlistsRoutes } from "@routes/playlists.routes";
import { feedRoutes } from "@routes/feed.routes";
import { syncRoutes } from "@routes/sync.routes";
import { NotFoundError, UnauthorizedError } from "@lib/errors";

const port = Number(process.env.PORT ?? 4000);

const app = new Elysia()
  .use(cors())
  .get("/health", () => ({ ok: true }))
  .group("/api", (app) =>
    app
      .use(jiosaavnRoutes)
      .use(playEventsRoutes)
      .use(likedSongsRoutes)
      .use(playlistsRoutes)
      .use(feedRoutes)
      .use(syncRoutes),
  )
  // Single place that maps domain errors to HTTP status — routes/controllers
  // stay HTTP-agnostic, adding a new error type never touches an existing route.
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: error.message };
    }
    if (error instanceof NotFoundError) {
      set.status = 404;
      return { error: error.message };
    }
    if (error instanceof UnauthorizedError) {
      set.status = 401;
      return { error: error.message };
    }
    set.status = 500;
    return { error: error instanceof Error ? error.message : "Internal error" };
  })
  .listen(port);

console.log(`drift-backend listening on :${app.server?.port}`);
