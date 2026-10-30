import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persisted playback preferences. Bitrate values match JioSaavn's
 * song.generateAuthToken `bitrate` param (see lib/jiosaavn.ts).
 */
export type Quality = "96" | "160" | "320";

export const QUALITY_LABELS: Record<Quality, string> = {
  "96": "Low (96 kbps)",
  "160": "Normal (160 kbps)",
  "320": "High (320 kbps)",
};

const QUALITY_ORDER: Quality[] = ["96", "160", "320"];

const STREAM_QUALITY_KEY = "drift:stream-quality";
const DOWNLOAD_QUALITY_KEY = "drift:download-quality";
const NOTIFICATIONS_KEY = "drift:notifications-enabled";

export async function getStreamQuality(): Promise<Quality> {
  const stored = await AsyncStorage.getItem(STREAM_QUALITY_KEY);
  return (QUALITY_ORDER as string[]).includes(stored ?? "") ? (stored as Quality) : "160";
}

export async function setStreamQuality(value: Quality) {
  await AsyncStorage.setItem(STREAM_QUALITY_KEY, value);
}

export async function getDownloadQuality(): Promise<Quality> {
  const stored = await AsyncStorage.getItem(DOWNLOAD_QUALITY_KEY);
  return (QUALITY_ORDER as string[]).includes(stored ?? "") ? (stored as Quality) : "320";
}

export async function setDownloadQuality(value: Quality) {
  await AsyncStorage.setItem(DOWNLOAD_QUALITY_KEY, value);
}

export function nextQuality(current: Quality): Quality {
  return QUALITY_ORDER[(QUALITY_ORDER.indexOf(current) + 1) % QUALITY_ORDER.length] ?? "160";
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return stored === null ? true : stored === "1";
}

export async function setNotificationsEnabled(value: boolean) {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? "1" : "0");
}
