import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ToastAndroid } from "react-native";
import { Text, View, XStack, Image, useTheme } from "tamagui";
import { ChevronLeft, Play, Pause, Shuffle, Heart, Download, Share2, MoreVertical } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR, { useSWRConfig } from "swr";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@contexts/PlayerContext";
import { fetchCollection, type CollectionType } from "@lib/collectionParser";
import { downloadTrack } from "@lib/downloads";
import { Skeleton } from "@components/ui/Skeleton";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

export default function AlbumViewerScreen() {
  const { id, type, name, image } = useLocalSearchParams<{
    id: string;
    type?: CollectionType;
    name?: string;
    image?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addTracks, playurlOverrider, formatTime, playState, isLiked, toggleLike } = usePlayer();
  const { data: album, error, isLoading: loading } = useSWR(
    ["collection", type ?? "album", id],
    () => fetchCollection(type ?? "album", id, { name, image }),
  );
  const [startingIndex, setStartingIndex] = useState<number | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { mutate } = useSWRConfig();

  // Mirrors FloatingMusicIsland's pattern — poll the native module's current
  // track on mount (a listener alone only sees future transitions) plus a
  // live event subscription, so the Play button can tell "this album is the
  // active queue" apart from "nothing/something-else is playing" and avoid
  // a destructive reset+reload when all it needs to do is pause/resume.
  useEffect(() => {
    let cancelled = false;
    TrackPlayer.getActiveTrack().then((track) => {
      if (!cancelled) setActiveTrackId((track?.id as string) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async () => {
    const track = await TrackPlayer.getActiveTrack();
    setActiveTrackId((track?.id as string) ?? null);
  });

  const isPlaying = playState === State.Playing || playState === State.Buffering || playState === State.Loading;
  const isAlbumActive = !!album && album.list.some((t) => t.id === activeTrackId);

  const playFrom = async (index: number, shuffle = false) => {
    if (!album) return;
    setStartingIndex(index);
    try {
      await TrackPlayer.reset();
      await addTracks({
        items: album.list.map((item) => ({
          id: item.id,
          playUrl: item.url,
          songName: decode(item.title),
          songCover: item.image.replace("150x150", "500x500"),
          artistName: album.subtitle,
          duration: Number(item.duration),
        })),
        albumName: decode(album.title),
        artistName: album.subtitle,
      });
      const startAt = shuffle ? Math.floor(Math.random() * album.list.length) : index;
      await playurlOverrider(startAt);
    } catch {
      ToastAndroid.show("Couldn't play this album", ToastAndroid.SHORT);
    } finally {
      setStartingIndex(null);
    }
  };

  const notImplemented = () => ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT);

  const handleDownloadAlbum = async () => {
    if (!album || downloading) return;
    setDownloading(true);
    try {
      for (const item of album.list) {
        await downloadTrack({
          id: item.id,
          playUrl: item.url,
          songName: decode(item.title),
          artistName: album.subtitle,
          songCover: item.image.replace("150x150", "500x500"),
          duration: Number(item.duration),
        });
      }
      await mutate("downloads");
      ToastAndroid.show("Downloaded for offline listening", ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show("Couldn't download this album", ToastAndroid.SHORT);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View flex={1} backgroundColor="$background">
      <XStack paddingTop={insets.top + 8} paddingHorizontal={16} alignItems="center" justifyContent="space-between" marginBottom={8}>
        <View
          width={32}
          height={32}
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$backgroundHover"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.home))}
        >
          <ChevronLeft color={theme.color?.val as string} size={20} />
        </View>
        <XStack gap={10}>
          <View width={32} height={32} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor="$backgroundHover" onPress={notImplemented}>
            <Share2 color={theme.color?.val as string} size={16} />
          </View>
          <View width={32} height={32} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor="$backgroundHover" onPress={notImplemented}>
            <MoreVertical color={theme.color?.val as string} size={18} />
          </View>
        </XStack>
      </XStack>

      {loading ? (
        <View flex={1}>
          <View alignItems="center" paddingHorizontal={24} marginBottom={12} gap={14}>
            <Skeleton width={160} height={160} borderRadius={18} />
            <Skeleton width="70%" height={20} borderRadius={6} />
            <Skeleton width="45%" height={14} borderRadius={6} />
            <Skeleton width={60} height={60} borderRadius={30} />
          </View>
          <View gap={14} paddingHorizontal={24} paddingTop={16}>
            {Array.from({ length: 6 }).map((_, i) => (
              <XStack key={i} alignItems="center" gap={12}>
                <Skeleton width={24} height={14} borderRadius={4} />
                <Skeleton width="75%" height={14} borderRadius={4} />
              </XStack>
            ))}
          </View>
        </View>
      ) : error || !album ? (
        <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24}>
          <Text fontFamily="body" fontSize="5" color="$colorSecondary" textAlign="center">
            Couldn&apos;t load this album.
          </Text>
        </View>
      ) : (
        <>
          <View alignItems="center" paddingHorizontal={24} marginBottom={12}>
            <Image
              source={{ uri: album.image.replace("150x150", "500x500") }}
              width={160}
              height={160}
              borderRadius={18}
              backgroundColor="$backgroundHover"
            />
            <Text fontFamily="heading" fontSize="8" color="$color" marginTop={14} textAlign="center" numberOfLines={2}>
              {decode(album.title)}
            </Text>
            <Text fontFamily="body" fontSize="4" color="$colorSecondary" marginTop={4} textAlign="center">
              {decode(album.subtitle)} · {album.list.length} songs
            </Text>
            <XStack gap={16} alignItems="center" marginTop={16}>
              <View
                width={60}
                height={60}
                borderRadius={30}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$accent"
                onPress={() => {
                  if (isAlbumActive) {
                    isPlaying ? TrackPlayer.pause() : TrackPlayer.play();
                  } else {
                    playFrom(0);
                  }
                }}
              >
                {isAlbumActive && isPlaying ? (
                  <Pause color={theme.background?.val as string} size={26} fill={theme.background?.val as string} />
                ) : (
                  <Play color={theme.background?.val as string} size={26} fill={theme.background?.val as string} />
                )}
              </View>
              <View
                width={44}
                height={44}
                borderRadius={22}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundHover"
                onPress={() => playFrom(0, true)}
              >
                <Shuffle color={theme.color?.val as string} size={20} />
              </View>
              <View
                width={44}
                height={44}
                borderRadius={22}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundHover"
                onPress={() => {
                  const likeTargetId = activeTrackId ?? album.list[0]?.id;
                  if (likeTargetId) toggleLike(likeTargetId, album.subtitle);
                }}
              >
                <Heart
                  color={
                    (activeTrackId ?? album.list[0]?.id) && isLiked(activeTrackId ?? album.list[0]?.id ?? "")
                      ? tokens.color.dangerRed.val
                      : (theme.color?.val as string)
                  }
                  fill={
                    (activeTrackId ?? album.list[0]?.id) && isLiked(activeTrackId ?? album.list[0]?.id ?? "")
                      ? tokens.color.dangerRed.val
                      : "transparent"
                  }
                  size={20}
                />
              </View>
              <View
                width={44}
                height={44}
                borderRadius={22}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundHover"
                opacity={downloading ? 0.6 : 1}
                onPress={handleDownloadAlbum}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={theme.color?.val as string} />
                ) : (
                  <Download color={theme.color?.val as string} size={20} />
                )}
              </View>
            </XStack>
          </View>

          <FlatList
            data={album.list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isRowActive = item.id === activeTrackId;
              return (
                <XStack
                  alignItems="center"
                  gap={12}
                  paddingVertical={10}
                  paddingHorizontal={24}
                  backgroundColor={isRowActive ? tokens.color.tealAccentGlow.val : "transparent"}
                  onPress={() => {
                    if (isRowActive) {
                      isPlaying ? TrackPlayer.pause() : TrackPlayer.play();
                    } else if (isAlbumActive) {
                      playurlOverrider(index);
                    } else {
                      playFrom(index);
                    }
                  }}
                  opacity={startingIndex === index ? 0.6 : 1}
                >
                  <View width={24} alignItems="center">
                    {isRowActive ? (
                      isPlaying ? (
                        <Pause color={tokens.color.tealAccent.val} size={16} />
                      ) : (
                        <Play color={tokens.color.tealAccent.val} size={16} fill={tokens.color.tealAccent.val} />
                      )
                    ) : (
                      <Text fontFamily="numeric" fontSize="5" color="$colorSecondary">
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View flex={1}>
                    <Text
                      fontFamily="body"
                      fontWeight="600"
                      fontSize="4"
                      color={isRowActive ? tokens.color.tealAccent.val : "$color"}
                      numberOfLines={1}
                    >
                      {decode(item.title)}
                    </Text>
                  </View>
                  <Text fontFamily="numeric" fontSize="4" color="$colorSecondary">
                    {formatTime(Number(item.duration))}
                  </Text>
                </XStack>
              );
            }}
          />
        </>
      )}
    </View>
  );
}
