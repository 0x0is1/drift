import { Elysia } from "elysia";
import { authPlugin } from "@middleware/auth";
import { LikedSongsController } from "@controllers/LikedSongsController";

export const likedSongsRoutes = new Elysia({ prefix: "/liked-songs" })
  .use(authPlugin)
  .get("/", ({ db }) => new LikedSongsController(db).getLiked());
