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

export type CollectionType = "album" | "playlist" | "radio_station" | "artist" | "song";

export async function fetchCollection(
  type: CollectionType,
  id: string,
  fallback: { name?: string | undefined; image?: string | undefined } = {},
): Promise<CollectionData> {
  if (type === "playlist") {
    const data = await serviceProvider.getPlaylistById(id);
    return {
      title: data.listname,
      subtitle: data.firstname ?? "",
      image: data.image,
      list: (data.songs ?? []).map((item: any) => ({
        id: item.id,
        title: item.song,
        image: item.image,
        duration: item.duration,
        url: item.encrypted_media_url,
      })),
    };
  }

  if (type === "radio_station") {
    const data = await serviceProvider.getStationById(id);
    const list = Object.keys(data)
      .filter((key) => key !== "stationid")
      .map((key) => {
        const item = data[key].song;
        return {
          id: item.id,
          title: item.title,
          image: item.image,
          duration: item.more_info.duration,
          url: item.more_info.encrypted_media_url,
        };
      });
    return {
      title: fallback.name ?? id,
      subtitle: "Various Artists",
      image: fallback.image ?? list[0]?.image ?? "",
      list,
    };
  }

  if (type === "artist") {
    const data = await serviceProvider.getArtist(id, 50);
    return {
      title: data.name,
      subtitle: "Artist",
      image: data.image,
      list: (data.topSongs ?? []).map((item: any) => ({
        id: item.id,
        title: item.song,
        image: item.image,
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
      image: data.image,
      list: [
        {
          id,
          title: data.song,
          image: data.image,
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
    image: data.image,
    list: (data.list ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      duration: item.more_info.duration,
      url: item.more_info.encrypted_media_url,
    })),
  };
}
