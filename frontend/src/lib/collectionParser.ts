import { serviceProvider } from "@lib/jiosaavn";

/**
 * Ported from old lissen-mobile/src/utils/albumParser.js — normalizes the
 * different JioSaavn collection shapes (album/playlist/radio_station/
 * artist/song) into one flat track-list shape the viewer screen renders.
 * "show" is intentionally unhandled — the old app never implemented it
 * either (no getShowById-style endpoint exists).
 */

export type CollectionTrack = {
  id: string;
  title: string;
  image: string;
  duration: string | number;
  url: string;
};

export type CollectionData = {
  title: string;
  subtitle: string;
  image: string;
  list: CollectionTrack[];
};

export type CollectionType = "album" | "playlist" | "radio_station" | "artist" | "song" | "show";

const fixHttps = (url?: string) => (url ? url.replace(/^http:\/\//i, "https://") : "");

export async function fetchCollection(
  type: CollectionType,
  id: string,
  fallback: {
    name?: string | undefined;
    image?: string | undefined;
    language?: string | undefined;
    isArtist?: boolean | undefined;
  } = {},
): Promise<CollectionData> {
  if (type === "playlist") {
    const data = await serviceProvider.getPlaylistById(id);
    return {
      title: data.listname,
      subtitle: data.firstname ?? "",
      image: fixHttps(data.image),
      list: (data.songs ?? []).map((item: any) => ({
        id: item.id,
        title: item.song,
        image: fixHttps(item.image),
        duration: item.duration,
        url: item.encrypted_media_url,
      })),
    };
  }

  if (type === "radio_station") {
    const data = await serviceProvider.getStation({
      name: fallback.name || id,
      id,
      isArtist: fallback.isArtist,
      language: fallback.language,
    });
    const list: CollectionTrack[] = [];
    for (const key of Object.keys(data)) {
      if (key === "stationid" || key === "error") continue;
      const song = data[key]?.song;
      if (!song || !song.id) continue;
      list.push({
        id: song.id,
        title: song.title ?? song.song ?? "Unknown",
        image: fixHttps(song.image),
        duration: song.more_info?.duration ?? song.duration ?? 0,
        url: song.more_info?.encrypted_media_url ?? "",
      });
    }
    return {
      title: fallback.name ?? id,
      subtitle: fallback.isArtist ? "Artist Station" : "Radio Station",
      image: fixHttps(fallback.image ?? list[0]?.image ?? ""),
      list,
    };
  }

  if (type === "show") {
    const data = await serviceProvider.getShowById(id);
    const details = data.show_details ?? {};
    const episodes = (data.episodes ?? []).map((ep: any) => ({
      id: ep.id,
      title: ep.title,
      image: fixHttps(ep.image ?? ep.more_info?.square_image),
      duration: ep.more_info?.duration ?? ep.duration ?? 0,
      url: ep.more_info?.encrypted_media_url ?? "",
    }));
    return {
      title: details.title ?? fallback.name ?? id,
      subtitle: details.subtitle || "Podcast",
      image: fixHttps(details.image ?? fallback.image ?? episodes[0]?.image ?? ""),
      list: episodes,
    };
  }

  if (type === "artist") {
    const data = await serviceProvider.getArtist(id, 50);
    return {
      title: data.name,
      subtitle: "Artist",
      image: fixHttps(data.image),
      list: (data.topSongs ?? []).map((item: any) => ({
        id: item.id,
        title: item.song,
        image: fixHttps(item.image),
        duration: item.duration,
        url: item.encrypted_media_url,
      })),
    };
  }

  if (type === "song") {
    const data = await serviceProvider.getSongById(id);
    return {
      title: data.song,
      subtitle: data.primary_artists ?? "",
      image: fixHttps(data.image),
      list: [
        {
          id,
          title: data.song,
          image: fixHttps(data.image),
          duration: data.duration,
          url: data.encrypted_media_url,
        },
      ],
    };
  }

  // Album ids come in two shapes depending on caller: a perma_url token/slug
  // (home screen rows, via item.perma_url) or a plain numeric database id
  // (feed song objects only carry `albumid`, no token) — each needs its own
  // JioSaavn endpoint, see getAlbumDetailsById's comment in jiosaavn.ts.
  const data = /^\d+$/.test(id) ? await serviceProvider.getAlbumDetailsById(id) : await serviceProvider.getAlbumById(id);
  return {
    title: data.title,
    subtitle: data.subtitle,
    image: fixHttps(data.image),
    list: (data.list ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      image: fixHttps(item.image),
      duration: item.more_info?.duration ?? item.duration ?? 0,
      url: item.more_info?.encrypted_media_url ?? "",
    })),
  };
}
