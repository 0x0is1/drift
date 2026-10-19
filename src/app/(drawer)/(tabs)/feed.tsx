import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, ToastAndroid, type ViewToken } from "react-native";
import { Text, View, XStack } from "tamagui";
import { ChevronLeft, Heart, Bookmark, Share2 } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR from "swr";
import TrackPlayer, { State, useProgress } from "react-native-track-player";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@contexts/PlayerContext";
import { FeedCard } from "@components/feed/FeedCard";
import { Skeleton } from "@components/ui/Skeleton";
import { serviceProvider } from "@lib/jiosaavn";
import { getArtistAffinity, rankByAffinity } from "@lib/feedRanking";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

type FeedSong = {
  id: string;
  song: string;
  image: string;
  duration: string;
  encrypted_media_url: string;
  primary_artists?: string;
};

// Basic version: swipeable cards sourced from today's top chart playlist in
// release order. The heuristic ranking over drift_play_events (phase 6 per
// CLAUDE.md) is a TODO — this just proves out the full-bleed swipe UI.
export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addTracks, playurlOverrider, playState, formatTime, isLiked, toggleLike } = usePlayer();
  const progress = useProgress();
  const { data, error, isLoading: loading } = useSWR("feed-chart-playlist", async () => {
    const charts = await serviceProvider.getCharts();
    const chartList = (charts?.charts ?? charts ?? []) as { id: string }[];
    const firstChart = chartList[0];
    if (!firstChart) throw new Error("No charts available");
    const playlist = await serviceProvider.getPlaylistById(firstChart.id);
    return { songs: (playlist.songs ?? []) as FeedSong[], playlistArtist: playlist.firstname ?? "" };
  });
  // Phase 6 v1 heuristic ranking (see CLAUDE.md) — reorders the chart by the
  // user's own play/like history, degrades to plain chart order with no history.
  const { data: affinity } = useSWR("feed-artist-affinity", getArtistAffinity);
  const songs = useMemo(
    () => (data ? rankByAffinity(data.songs, affinity ?? {}) : []),
    [data, affinity],
  );
  const playlistArtist = data?.playlistArtist ?? "";
  const [activeId, setActiveId] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const playRequestRef = useRef(0);
  const flatListRef = useRef<FlatList<FeedSong>>(null);
  // Starts at 0 and waits for onLayout — seeding this from
  // Dimensions.get("window") instead (full device height, including the
  // status bar and tab bar) made FlatList's pagingEnabled snapping and
  // getItemLayout math use a taller-than-real row height on the first
  // render, which misaligned every card's touch target against what was
  // visually drawn (the reported "tapping Play jumps to Home" bug).
  const [cardHeight, setCardHeight] = useState(0);

  const playSong = async (song: FeedSong) => {
    if (playingIdRef.current === song.id) return;
    playingIdRef.current = song.id;
    setActiveId(song.id);
    // Stale-response guard: a fling can queue up several playSong calls
    // before the debounce below settles on the final card. Each call does
    // a full reset+add+play, so if an older call's await resolves after a
    // newer one started, it must not stomp playback state back — that race
    // was the exact cause of the play/pause button flickering mid-scroll.
    const requestId = ++playRequestRef.current;
    try {
      await TrackPlayer.reset();
      await addTracks({
        items: [
          {
            id: song.id,
            playUrl: song.encrypted_media_url,
            songName: decode(song.song),
            songCover: song.image.replace("150x150", "500x500"),
            artistName: song.primary_artists || playlistArtist,
            duration: Number(song.duration),
          },
        ],
      });
      if (requestId !== playRequestRef.current) return;
      await playurlOverrider(0);
    } catch {
      if (requestId === playRequestRef.current) {
        ToastAndroid.show("Couldn't play that track", ToastAndroid.SHORT);
      }
    }
  };

  // Autoplay: whichever card is most visible as the user scrolls becomes
  // the active track. FlatList requires viewabilityConfig/onViewableItemsChanged
  // to keep a stable identity across renders — a state lazy-initializer gives
  // the config object that for free, and the handler stays stable via
  // useCallback with an empty dep array, reading the always-current playSong
  // through a ref (updated in an effect) instead of closing over it directly.
  // Debounced so a fast fling across several cards doesn't fire a full
  // reset+add+play for every card it passes through — only the card the
  // scroll actually settles on gets played.
  const [viewabilityConfig] = useState({ itemVisiblePercentThreshold: 60 });
  const pendingPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPlaySongRef = useRef(playSong);
  useEffect(() => {
    latestPlaySongRef.current = playSong;
  }, [playSong]);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const top = viewableItems[0]?.item as FeedSong | undefined;
    if (!top) return;
    if (pendingPlayTimerRef.current) clearTimeout(pendingPlayTimerRef.current);
    pendingPlayTimerRef.current = setTimeout(() => latestPlaySongRef.current(top), 150);
  }, []);

  useEffect(() => {
    const first = songs[0];
    if (first) playSong(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per fresh song list, not on every playSong identity change
  }, [songs]);

  // Prefetch the next couple of cards' art while the current one is showing,
  // so swiping forward rarely shows a blank-then-fade — the image is usually
  // already in RN's image cache by the time its card mounts.
  useEffect(() => {
    if (songs.length === 0) return;
    const currentIndex = Math.max(songs.findIndex((s) => s.id === activeId), 0);
    [1, 2].forEach((offset) => {
      const next = songs[currentIndex + offset];
      if (next) Image.prefetch(next.image.replace("150x150", "500x500"));
    });
  }, [songs, activeId]);

  const notImplemented = () => ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT);

  // Buffering/Loading count as "playing" (matches FloatingMusicIsland) so a
  // tap pauses instead of falling through to a destructive reset+reload.
  const isPlaying = playState === State.Playing || playState === State.Buffering || playState === State.Loading;
  const togglePlayback = () => (isPlaying ? TrackPlayer.pause() : TrackPlayer.play());

  // Each card holds exactly one track in the queue (see playSong), so the
  // context's own next/prev would just no-op against a 1-item queue —
  // scroll the feed instead, which re-triggers autoplay via onViewableItemsChanged.
  const skip = (delta: 1 | -1) => {
    const currentIndex = songs.findIndex((s) => s.id === activeId);
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), songs.length - 1);
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  return (
    <View
      flex={1}
      backgroundColor="$backgroundStrong"
      onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
    >
      {loading || cardHeight === 0 ? (
        cardHeight === 0 ? (
          <View flex={1} />
        ) : (
          <View flex={1} padding={24} justifyContent="flex-end" gap={12}>
            <Skeleton width="85%" height={28} borderRadius={6} />
            <Skeleton width="50%" height={16} borderRadius={6} />
          </View>
        )
      ) : error || songs.length === 0 ? (
        <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24}>
          <Text fontFamily="body" fontSize="5" color="$colorSecondary" textAlign="center">
            Couldn&apos;t load the feed.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={songs}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              source={{ uri: item.image.replace("150x150", "500x500") }}
              cardHeight={cardHeight}
              isActive={item.id === activeId}
              playlistArtist={playlistArtist}
              isPlaying={isPlaying}
              progress={progress}
              formatTime={formatTime}
              onTogglePlayback={togglePlayback}
              onSkip={skip}
            />
          )}
        />
      )}
      <XStack position="absolute" top={insets.top + 8} left={16} right={16} alignItems="center" justifyContent="space-between">
        <View
          width={36}
          height={36}
          borderRadius={18}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(20,20,20,0.6)"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.home as any))}
        >
          <ChevronLeft color={tokens.color.white.val} size={22} />
        </View>
        <XStack gap={12} alignItems="center">
          <View
            width={36}
            height={36}
            borderRadius={18}
            alignItems="center"
            justifyContent="center"
            backgroundColor="rgba(20,20,20,0.6)"
            onPress={() => {
              if (!activeId) return;
              const activeSong = songs.find((s) => s.id === activeId);
              toggleLike(activeId, activeSong?.primary_artists || playlistArtist);
            }}
          >
            <Heart
              color={activeId && isLiked(activeId) ? tokens.color.dangerRed.val : tokens.color.white.val}
              fill={activeId && isLiked(activeId) ? tokens.color.dangerRed.val : "transparent"}
              size={18}
            />
          </View>
          <View
            width={36}
            height={36}
            borderRadius={18}
            alignItems="center"
            justifyContent="center"
            backgroundColor="rgba(20,20,20,0.6)"
            onPress={() => activeId && router.push(routes.addToPlaylist(activeId) as any)}
          >
            <Bookmark color={tokens.color.white.val} size={18} />
          </View>
          <View width={36} height={36} borderRadius={18} alignItems="center" justifyContent="center" backgroundColor="rgba(20,20,20,0.6)" onPress={notImplemented}>
            <Share2 color={tokens.color.white.val} size={18} />
          </View>
        </XStack>
      </XStack>
    </View>
  );
}
