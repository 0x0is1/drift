import { Elysia, t } from "elysia";
import { authPlugin } from "@middleware/auth";
import { PlayEventsController } from "@controllers/PlayEventsController";

export const playEventsRoutes = new Elysia({ prefix: "/play-events" }).use(authPlugin).post(
  "/",
  ({ body, userId, db }) => new PlayEventsController(db).logEvent(userId, body.trackId, body.kind, body.meta),
  {
    body: t.Object({
      trackId: t.String(),
      kind: t.Union([t.Literal("play"), t.Literal("skip"), t.Literal("like"), t.Literal("unlike")]),
      meta: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
  },
);
