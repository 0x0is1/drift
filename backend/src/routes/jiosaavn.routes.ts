import { Elysia, t } from "elysia";
import { JioSaavnController } from "@controllers/JioSaavnController";
import { jioSaavnService } from "@services/JioSaavnService";

const controller = new JioSaavnController(jioSaavnService);

/** Public metadata/search proxy — no auth required. `/resolve` hands back a direct stream URL; the device fetches it itself. */
export const jiosaavnRoutes = new Elysia({ prefix: "/jiosaavn" })
  .get("/launch", () => controller.getLaunchData())
  .get(
    "/artist/:id",
    ({ params, query }) => controller.getArtist(params.id, Number(query.songCount ?? 20)),
    { query: t.Object({ songCount: t.Optional(t.String()) }) },
  )
  .get("/top-searches", () => controller.getTopSearches())
  .get(
    "/albums",
    ({ query }) => controller.getAlbums(Number(query.count ?? 50), Number(query.page ?? 1)),
    { query: t.Object({ count: t.Optional(t.String()), page: t.Optional(t.String()) }) },
  )
  .get("/charts", () => controller.getCharts())
  .get(
    "/featured-playlists",
    ({ query }) => controller.getFeaturedPlaylists(Number(query.count ?? 50), Number(query.page ?? 1)),
    { query: t.Object({ count: t.Optional(t.String()), page: t.Optional(t.String()) }) },
  )
  .get(
    "/top-shows",
    ({ query }) => controller.getTopShows(Number(query.count ?? 50), Number(query.page ?? 1)),
    { query: t.Object({ count: t.Optional(t.String()), page: t.Optional(t.String()) }) },
  )
  .get("/top-artists", () => controller.getTopArtists())
  .get("/featured-stations", () => controller.getFeaturedStations())
  .get("/playlist/:id", ({ params }) => controller.getPlaylistById(params.id))
  .get(
    "/station/:name",
    ({ params, query }) => controller.getStationById(params.name, Number(query.count ?? 20)),
    { query: t.Object({ count: t.Optional(t.String()) }) },
  )
  .get("/album/:id", ({ params }) => controller.getAlbumById(params.id))
  .get("/song/:id", ({ params }) => controller.getSongById(params.id))
  .get(
    "/songs",
    ({ query }) => controller.getSongsByIds(query.ids ? query.ids.split(",") : []),
    { query: t.Object({ ids: t.Optional(t.String()) }) },
  )
  .get("/lyrics/:id", ({ params }) => controller.getLyrics(params.id))
  .get(
    "/search",
    ({ query }) => controller.search(query.q, Number(query.page ?? 1), Number(query.type ?? 1)),
    { query: t.Object({ q: t.String(), page: t.Optional(t.String()), type: t.Optional(t.String()) }) },
  )
  .post("/resolve", ({ body }) => controller.resolve(body.mediaUrl), {
    body: t.Object({ mediaUrl: t.String() }),
  });
