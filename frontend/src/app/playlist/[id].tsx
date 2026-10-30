import { FlatList, ToastAndroid, Alert } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { ChevronLeft, Play, Pause, Trash2, ListMusic } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR from "swr";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@contexts/PlayerContext";
import { serviceProvider } from "@lib/jiosaavn";
import { listPlaylists, getPlaylistTracks, removeTrackFromPlaylist, deletePlaylist } from "@lib/playlists";
import { Skeleton } from "@components/ui/Skeleton";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

export default function PlaylistViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addTracks, playurlOverrider, formatTime, playState } = usePlayer();

  const { data: playlists } = useSWR("playlists", listPlaylists);
  const playlist = playlists?.find((p) => p.id === id);

  const { data: trackRows, isLoading: tracksLoading, mutate: mutateTracks } = useSWR(
    ["playlist-tracks", id],
    () => getPlaylistTracks(id),
  );
  const trackIds = (trackRows ?? []).map((t) => t.track_id);

  const { data: songs, error, isLoading: songsLoading } = useSWR(
    trackIds.length > 0 ? ["playlist-songs", trackIds.join(",")] : null,
    () => serviceProvider.getSongsByIds(trackIds),
  );
  const loading = tracksLoading || songsLoading;

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [startingIndex, setStartingIndex] = useState<number | null>(null);

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
  const list = songs ?? [];
  const isListActive = list.some((t) => t.id === activeTrackId);

  const playFrom = async (index: number) => {
    setStartingIndex(index);
    try {
      await TrackPlayer.reset();
      await addTracks({
        items: list.map((item) => ({
          id: item.id,
          playUrl: item.encrypted_media_url,
          songName: decode(item.song),
          songCover: item.image.replace("150x150", "500x500"),
          artistName: item.primary_artists,
          duration: Number(item.duration),
        })),
        albumName: playlist?.name ?? "Playlist",
      });
      await playurlOverrider(index);
    } catch {
      ToastAndroid.show("Couldn't play this track", ToastAndroid.SHORT);
    } finally {
      setStartingIndex(null);
    }
  };

  const handleRemove = async (trackId: string) => {
    try {
      await removeTrackFromPlaylist(id, trackId);
      await mutateTracks();
    } catch {
      ToastAndroid.show("Couldn't remove track", ToastAndroid.SHORT);
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert("Delete playlist", `Delete "${playlist?.name ?? "this playlist"}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlaylist(id);
            router.back();
          } catch {
            ToastAndroid.show("Couldn't delete playlist", ToastAndroid.SHORT);
          }
        },
      },
    ]);
  };

  return (
    <View flex={1} backgroundColor="$background">
      <XStack paddingTop={insets.top + 8} paddingHorizontal={16} alignItems="center" justifyContent="space-between" marginBottom={8}>
        <XStack alignItems="center" gap={12} flex={1}>
          <View
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$backgroundHover"
            onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.library))}
          >
            <ChevronLeft color={theme.color?.val as string} size={20} />
          </View>
          <Text fontFamily="heading" fontSize="7" color="$color" numberOfLines={1} flex={1}>
            {playlist?.name ?? "Playlist"}
          </Text>
        </XStack>
        <View width={32} height={32} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor="$backgroundHover" onPress={handleDeletePlaylist}>
          <Trash2 color={tokens.color.dangerRed.val} size={16} />
        </View>
      </XStack>

      {!loading && trackIds.length === 0 ? (
        <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24} gap={8}>
          <ListMusic color={theme.colorSecondary?.val as string} size={28} />
          <Text fontFamily="body" fontSize="4" color="$colorSecondary" textAlign="center">
            No songs in this playlist yet.
          </Text>
        </View>
      ) : loading ? (
        <View gap={14} paddingHorizontal={24} paddingTop={16}>
          {Array.from({ length: 6 }).map((_, i) => (
            <XStack key={i} alignItems="center" gap={12}>
              <Skeleton width={24} height={14} borderRadius={4} />
              <Skeleton width="75%" height={14} borderRadius={4} />
            </XStack>
          ))}
        </View>
      ) : error || list.length === 0 ? (
        <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24}>
          <Text fontFamily="body" fontSize="5" color="$colorSecondary" textAlign="center">
            Couldn&apos;t load this playlist.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
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
                opacity={startingIndex === index ? 0.6 : 1}
              >
                <XStack
                  flex={1}
                  alignItems="center"
                  gap={12}
                  onPress={() => {
                    if (isRowActive) {
                      isPlaying ? TrackPlayer.pause() : TrackPlayer.play();
                    } else if (isListActive) {
                      playurlOverrider(index);
                    } else {
                      playFrom(index);
                    }
                  }}
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
                      {decode(item.song)}
                    </Text>
                    <Text fontFamily="body" fontSize="3" color="$colorSecondary" numberOfLines={1}>
                      {decode(item.primary_artists ?? "")}
                    </Text>
                  </View>
                  <Text fontFamily="numeric" fontSize="4" color="$colorSecondary">
                    {formatTime(Number(item.duration))}
                  </Text>
                </XStack>
                <View width={32} height={32} alignItems="center" justifyContent="center" onPress={() => handleRemove(item.id)}>
                  <Trash2 color={theme.colorSecondary?.val as string} size={16} />
                </View>
              </XStack>
            );
          }}
        />
      )}
    </View>
  );
}
