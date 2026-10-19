import { File, Directory, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { serviceProvider } from "@lib/jiosaavn";

/**
 * Offline downloads — deliberately device-local only (AsyncStorage index +
 * files under Paths.document), not synced through Supabase. A downloaded
 * audio file doesn't belong in a jsonb column, and "what's downloaded on
 * this phone" isn't data that needs to follow the account across devices.
 */
export type DownloadedTrack = {
  id: string;
  songName: string;
  artistName?: string;
  songCover?: string;
  duration: number;
  localUri: string;
  downloadedAt: string;
};

const INDEX_KEY = "drift_downloads_index_v1";
const downloadsDir = new Directory(Paths.document, "downloads");

function ensureDir() {
  if (!downloadsDir.exists) downloadsDir.create({ intermediates: true, idempotent: true });
}

export async function getDownloadsIndex(): Promise<DownloadedTrack[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? (JSON.parse(raw) as DownloadedTrack[]) : [];
}

async function saveIndex(list: DownloadedTrack[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export async function isDownloaded(trackId: string): Promise<boolean> {
  const list = await getDownloadsIndex();
  return list.some((t) => t.id === trackId);
}

export async function downloadTrack(track: {
  id: string;
  playUrl: string;
  songName: string;
  artistName?: string;
  songCover?: string;
  duration: number;
}): Promise<DownloadedTrack> {
  const list = await getDownloadsIndex();
  const existing = list.find((t) => t.id === track.id);
  if (existing) return existing;

  ensureDir();
  // Same two-step auth-token flow as live playback (see playurlOverrider /
  // CLAUDE.md) — encrypted_media_url is a token, not a fetchable URL, until
  // resolved through playByMediaUrl.
  const resolvedUrl = track.playUrl.includes("https://")
    ? track.playUrl
    : await serviceProvider.playByMediaUrl(track.playUrl);

  const destination = new File(downloadsDir, `${track.id}.m4a`);
  const file = await File.downloadFileAsync(resolvedUrl, destination, { idempotent: true });

  const entry: DownloadedTrack = {
    id: track.id,
    songName: track.songName,
    ...(track.artistName ? { artistName: track.artistName } : {}),
    ...(track.songCover ? { songCover: track.songCover } : {}),
    duration: track.duration,
    localUri: file.uri,
    downloadedAt: new Date().toISOString(),
  };
  await saveIndex([...list.filter((t) => t.id !== track.id), entry]);
  return entry;
}

export async function removeDownload(trackId: string) {
  const list = await getDownloadsIndex();
  const entry = list.find((t) => t.id === trackId);
  if (entry) {
    try {
      new File(entry.localUri).delete();
    } catch {
      // File already gone (e.g. app storage was cleared) — index cleanup below still matters.
    }
  }
  await saveIndex(list.filter((t) => t.id !== trackId));
}
