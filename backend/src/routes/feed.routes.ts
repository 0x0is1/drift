import { Elysia } from "elysia";
import { authPlugin } from "@middleware/auth";
import { FeedController } from "@controllers/FeedController";
import { jioSaavnService } from "@services/JioSaavnService";

export const feedRoutes = new Elysia({ prefix: "/feed" })
  .use(authPlugin)
  .get("/", ({ db }) => new FeedController(db, jioSaavnService).getFeed());
