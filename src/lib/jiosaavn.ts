import { ToastAndroid, Platform } from "react-native";

/**
 * Ported near-verbatim from old lissen-mobile/src/libs/APIParser.js.
 * Same endpoints, same two-step auth-token flow for streaming, same
 * Referer header requirement (JioSaavn returns 403 without it — this
 * was a real bug fixed in the old app, do not drop it). See CLAUDE.md.
 */

const baseURL =
  process.env.EXPO_PUBLIC_JIOSAAVN_BASE_URL ??
  "https://www.jiosaavn.com/api.php?__call=";

function notifyError(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    console.error(message);
  }
}

class ServiceProvider {
  private async request<T = any>(dir: string): Promise<T> {
    try {
      const response = await fetch(`${baseURL}${dir}`, {
        headers: {
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.jiosaavn.com/",
        },
      });
      if (response.status < 400) {
        return (await response.json()) as T;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error: any) {
      notifyError(String(error?.message || error));
      throw error;
    }
  }

  async getLaunchData() {
    return this.request(
      `webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  async getArtist(artistId: string, songCount: number) {
    return this.request(
      `artist.getArtistPageDetails&artistId=${artistId}&type=songs&n_song=${songCount}&category=&sort_order=&_format=json&ctx=web6dot0`,
    );
  }

  async getTopSearches() {
    return this.request(
      `content.getTopSearches&ctx=web6dot0&api_version=4&_format=json&_marker=0`,
    );
  }

  async getAlbums(count: number, page: number) {
    return this.request(
      `content.getAlbums&n=${count}&p=${page}&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=web6dot0`,
    );
  }

  async getCharts() {
    return this.request(
      `content.getCharts&api_version=4&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  async getFeaturedPlaylists(count: number, page: number) {
    return this.request(
      `content.getFeaturedPlaylists&fetch_from_serialized_files=true&p=${page}&n=${count}&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  async getTopShows(count: number, page: number) {
    return this.request(
      `content.getTopShows&n=${count}&p=${page}&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  async getTopArtists() {
    return this.request(`social.getTopArtists&_format=json&_marker=0&ctx=web6dot0`);
  }

  async getFeaturedStations() {
    return this.request(
      `webradio.getFeaturedStations&api_version=4&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  async getPlaylistById(id: string) {
    return this.request(`playlist.getDetails&listid=${id}&_format=json`);
  }

  async getStationById(name: string, count = 20) {
    const station = await this.request<{ stationid: string }>(
      `webradio.createFeaturedStation&language=hindi&pid=&query=&name=${name.replaceAll(" ", "+")}&mode=&artistid=&_format=json&_marker=0&ctx=web6dot0`,
    );
    return this.request(
      `webradio.getSong&stationid=${station.stationid}&k=${count}&next=1&_format=json&_marker=0&ctx=web6dot0&api_version=4`,
    );
  }

  async getAlbumById(albumId: string) {
    return this.request(
      `webapi.get&token=${albumId}&type=album&includeMetaTags=0&ctx=web6dot0&api_version=4&_format=json&_marker=0`,
    );
  }

  async getSongById(id: string) {
    const data = await this.request<Record<string, any>>(
      `song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${id}`,
    );
    return data[id];
  }

  /** Bulk variant — song.getDetails accepts comma-separated pids, returns one object per id. */
  async getSongsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const data = await this.request<Record<string, any>>(
      `song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${ids.join(",")}`,
    );
    return ids.map((id) => data[id]).filter(Boolean);
  }

  async getLyrics(id: string) {
    return this.request(
      `lyrics.getLyrics&lyrics_id=${id}&ctx=web6dot0&api_version=4&_format=json&_marker=0`,
    );
  }

  async getSearch(query: string, page: number, type: number) {
    const command = [
      "getPlaylistResults",
      "getResults",
      "getAlbumResults",
      `getMoreResults&params=%7B%22type%22:%22podcasts%22%7D&query=${query.replaceAll(" ", "+")}`,
      "getArtistResults",
    ][type];
    return this.request(
      `search.${command}&p=${page}&q=${query}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=50`,
    );
  }

  async playById(id: string) {
    const songDetails = await this.request<Record<string, any>>(
      `song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${id}`,
    );
    const token = songDetails[id].encrypted_media_url;
    const authTokenData = await this.request<{ auth_url: string }>(
      `song.generateAuthToken&url=${encodeURIComponent(token)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
    );
    authTokenData.auth_url = authTokenData.auth_url.replace("ac.cf.", "aac.");
    return {
      ...songDetails[id],
      streamurl: authTokenData,
    };
  }

  /**
   * Resolves a raw encrypted_media_url token into a playable https stream
   * URL. Caller must have already finished mutating the player queue
   * before calling this — see CLAUDE.md's race-condition note on
   * PlayerContext.addTracks.
   */
  async playByMediaUrl(mediaUrl: string) {
    const authTokenData = await this.request<{ auth_url: string }>(
      `song.generateAuthToken&url=${encodeURIComponent(mediaUrl)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
    );
    return authTokenData.auth_url.replace("ac.cf.", "aac.");
  }
}

export default ServiceProvider;
export const serviceProvider = new ServiceProvider();
