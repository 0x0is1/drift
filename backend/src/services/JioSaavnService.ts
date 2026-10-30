/**
 * JioSaavn integration, behind an interface so controllers depend on the
 * abstraction (dependency inversion) rather than a concrete fetch-based
 * client — swapping providers or mocking in tests touches only this file.
 * Ported from frontend/src/lib/jiosaavn.ts; same two-step auth-token flow
 * and Referer header requirement (JioSaavn 403s without it).
 */
export interface IJioSaavnService {
  getLaunchData(): Promise<unknown>;
  getArtist(artistId: string, songCount: number): Promise<unknown>;
  getTopSearches(): Promise<unknown>;
  getAlbums(count: number, page: number): Promise<unknown>;
  getCharts(): Promise<unknown>;
  getFeaturedPlaylists(count: number, page: number): Promise<unknown>;
  getTopShows(count: number, page: number): Promise<unknown>;
  getTopArtists(): Promise<unknown>;
  getFeaturedStations(): Promise<unknown>;
  getPlaylistById(id: string): Promise<unknown>;
  getStationById(name: string, count: number): Promise<unknown>;
  getAlbumById(albumId: string): Promise<unknown>;
  getSongById(id: string): Promise<unknown>;
  getSongsByIds(ids: string[]): Promise<unknown[]>;
  getLyrics(id: string): Promise<unknown>;
  getSearch(query: string, page: number, type: number): Promise<unknown>;
  resolveStreamUrl(mediaUrl: string): Promise<string>;
}

const baseURL = process.env.JIOSAAVN_BASE_URL ?? "https://www.jiosaavn.com/api.php?__call=";

export class JioSaavnService implements IJioSaavnService {
  private async request<T = unknown>(dir: string): Promise<T> {
    const response = await fetch(`${baseURL}${dir}`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.jiosaavn.com/",
      },
    });
    if (response.status >= 400) {
      throw new Error(`JioSaavn request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  getLaunchData() {
    return this.request(`webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0`);
  }

  getArtist(artistId: string, songCount: number) {
    return this.request(
      `artist.getArtistPageDetails&artistId=${artistId}&type=songs&n_song=${songCount}&category=&sort_order=&_format=json&ctx=web6dot0`,
    );
  }

  getTopSearches() {
    return this.request(`content.getTopSearches&ctx=web6dot0&api_version=4&_format=json&_marker=0`);
  }

  getAlbums(count: number, page: number) {
    return this.request(
      `content.getAlbums&n=${count}&p=${page}&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=web6dot0`,
    );
  }

  getCharts() {
    return this.request(`content.getCharts&api_version=4&_format=json&_marker=0&ctx=web6dot0`);
  }

  getFeaturedPlaylists(count: number, page: number) {
    return this.request(
      `content.getFeaturedPlaylists&fetch_from_serialized_files=true&p=${page}&n=${count}&_format=json&_marker=0&ctx=web6dot0`,
    );
  }

  getTopShows(count: number, page: number) {
    return this.request(`content.getTopShows&n=${count}&p=${page}&_format=json&_marker=0&ctx=web6dot0`);
  }

  getTopArtists() {
    return this.request(`social.getTopArtists&_format=json&_marker=0&ctx=web6dot0`);
  }

  getFeaturedStations() {
    return this.request(`webradio.getFeaturedStations&api_version=4&_format=json&_marker=0&ctx=web6dot0`);
  }

  getPlaylistById(id: string) {
    return this.request(`playlist.getDetails&listid=${id}&_format=json`);
  }

  async getStationById(name: string, count: number) {
    const station = await this.request<{ stationid: string }>(
      `webradio.createFeaturedStation&language=hindi&pid=&query=&name=${name.replaceAll(" ", "+")}&mode=&artistid=&_format=json&_marker=0&ctx=web6dot0`,
    );
    return this.request(
      `webradio.getSong&stationid=${station.stationid}&k=${count}&next=1&_format=json&_marker=0&ctx=web6dot0&api_version=4`,
    );
  }

  getAlbumById(albumId: string) {
    return this.request(
      `webapi.get&token=${albumId}&type=album&includeMetaTags=0&ctx=web6dot0&api_version=4&_format=json&_marker=0`,
    );
  }

  async getSongById(id: string) {
    const data = await this.request<Record<string, unknown>>(
      `song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${id}`,
    );
    return data[id];
  }

  async getSongsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const data = await this.request<Record<string, unknown>>(
      `song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${ids.join(",")}`,
    );
    return ids.map((id) => data[id]).filter(Boolean);
  }

  getLyrics(id: string) {
    return this.request(`lyrics.getLyrics&lyrics_id=${id}&ctx=web6dot0&api_version=4&_format=json&_marker=0`);
  }

  getSearch(query: string, page: number, type: number) {
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

  async resolveStreamUrl(mediaUrl: string) {
    const authTokenData = await this.request<{ auth_url: string }>(
      `song.generateAuthToken&url=${encodeURIComponent(mediaUrl)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
    );
    return authTokenData.auth_url.replace("ac.cf.", "aac.");
  }
}

export const jioSaavnService: IJioSaavnService = new JioSaavnService();
