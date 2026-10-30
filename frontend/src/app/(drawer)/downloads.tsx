import { useEffect, useState } from "react";
import { FlatList, ToastAndroid } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { ChevronLeft, Download, Play, Pause, Trash2 } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR from "swr";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@contexts/PlayerContext";
import { getDownloadsIndex, removeDownload } from "@lib/downloads";
import { tokens } from "@theme/tokens";

export default function DownloadsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addTracks, playurlOverrider, formatTime, playState } = usePlayer();
  const { data: downloads, isLoading: loading, mutate } = useSWR("downloads", getDownloadsIndex);
  const list = downloads ?? [];

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
  const isListActive = list.some((t) => t.id === activeTrackId);

  const playFrom = async (index: number) => {
    setStartingIndex(index);
    try {
      await TrackPlayer.reset();
      await addTracks({
        items: list.map((item) => ({
          id: item.id,
          playUrl: item.localUri,
          songName: decode(item.songName),
          songCover: item.songCover ?? "",
          ...(item.artistName ? { artistName: item.artistName } : {}),
          duration: item.duration,
        })),
        albumName: "Downloads",
      });
      await playurlOverrider(index);
    } catch {
      ToastAndroid.show("Couldn't play this download", ToastAndroid.SHORT);
    } finally {
      setStartingIndex(null);
    }
  };

  const handleRemove = async (trackId: string) => {
    try {
      await removeDownload(trackId);
      await mutate();
    } catch {
      ToastAndroid.show("Couldn't remove download", ToastAndroid.SHORT);
    }
  };

  return (
    <View flex={1} backgroundColor="$background">
      <XStack paddingTop={insets.top + 8} paddingHorizontal={16} alignItems="center" gap={12} marginBottom={8}>
        <View
          width={32}
          height={32}
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$backgroundHover"
          onPress={() => router.back()}
        >
          <ChevronLeft color={theme.color?.val as string} size={20} />
        </View>
        <Text fontFamily="heading" fontSize="9" color="$color">
          Downloads
        </Text>
      </XStack>

      {!loading && list.length === 0 ? (
        <View flex={1} alignItems="center" justifyContent="center" gap={12} paddingHorizontal={40}>
          <Download color={theme.colorSecondary?.val as string} size={40} />
          <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
            No downloads yet
          </Text>
          <Text fontFamily="body" fontSize="4" color="$colorSecondary" textAlign="center">
            Downloaded songs will show up here and play without a connection.
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
                      {decode(item.songName)}
                    </Text>
                    <Text fontFamily="body" fontSize="3" color="$colorSecondary" numberOfLines={1}>
                      {decode(item.artistName ?? "")}
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
