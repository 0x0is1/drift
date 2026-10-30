import type { IJioSaavnService } from "@services/JioSaavnService";

/** Thin orchestration over IJioSaavnService — keeps routes from importing the concrete service directly. */
export class JioSaavnController {
  constructor(private jiosaavn: IJioSaavnService) {}

  getLaunchData() {
    return this.jiosaavn.getLaunchData();
  }
  getArtist(id: string, songCount: number) {
    return this.jiosaavn.getArtist(id, songCount);
  }
  getTopSearches() {
    return this.jiosaavn.getTopSearches();
  }
  getAlbums(count: number, page: number) {
    return this.jiosaavn.getAlbums(count, page);
  }
  getCharts() {
    return this.jiosaavn.getCharts();
  }
  getFeaturedPlaylists(count: number, page: number) {
    return this.jiosaavn.getFeaturedPlaylists(count, page);
  }
  getTopShows(count: number, page: number) {
    return this.jiosaavn.getTopShows(count, page);
  }
  getTopArtists() {
    return this.jiosaavn.getTopArtists();
  }
  getFeaturedStations() {
    return this.jiosaavn.getFeaturedStations();
  }
  getPlaylistById(id: string) {
    return this.jiosaavn.getPlaylistById(id);
  }
  getStationById(name: string, count: number) {
    return this.jiosaavn.getStationById(name, count);
  }
  getAlbumById(id: string) {
    return this.jiosaavn.getAlbumById(id);
  }
  getSongById(id: string) {
    return this.jiosaavn.getSongById(id);
  }
  getSongsByIds(ids: string[]) {
    return this.jiosaavn.getSongsByIds(ids);
  }
  getLyrics(id: string) {
    return this.jiosaavn.getLyrics(id);
  }
  search(q: string, page: number, type: number) {
    return this.jiosaavn.getSearch(q, page, type);
  }
  async resolve(mediaUrl: string) {
    return { url: await this.jiosaavn.resolveStreamUrl(mediaUrl) };
  }
}
