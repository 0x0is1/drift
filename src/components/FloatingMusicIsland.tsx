import { usePathname, useRouter } from "expo-router";
import { Play, Pause, SkipBack, SkipForward } from "@tamagui/lucide-icons";
import { View, XStack, YStack, Image, useThemeName } from "tamagui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, {
  State,
  useProgress,
  useTrackPlayerEvents,
  Event,
} from "react-native-track-player";
import { tokens } from "@theme/tokens";
import { usePlayer } from "@contexts/PlayerContext";
import { islandHiddenOnRoutes, routes, FEED_BUTTON_PROTRUSION } from "@constants/routes";
import { MarqueeText } from "@components/MarqueeText";

const TAB_BAR_HEIGHT_BASE = 56;
const TAB_BAR_PADDING = 8;
// Must clear the raised Feed button's visible protrusion (FEED_BUTTON_PROTRUSION)
// plus a little breathing room, or the island's bottom edge overlaps its top edge.
const ISLAND_GAP_DEFAULT = FEED_BUTTON_PROTRUSION + 8;
const ISLAND_GAP_ALBUM = -24;

/**
 * Persistent "floating island" mini-player — Dynamic-Island-style pill,
 * mounted inside the tabs layout (not as a root-level sibling of the
 * Stack) so it survives tab navigation. expo-router's <Stack> backs each
 * route with a native Android Fragment that always wins touch dispatch
 * over a plain RN sibling regardless of JS zIndex — rendering the island
 * inside a screen's own native container avoids that entirely.
 *
 * The open-player tap target, transport buttons, and seek bar are
 * siblings, not nested Touchables — RN's legacy responder system always
 * resolves nested onPress handlers to the outer-most one, so a parent
 * onPress here would swallow every button tap underneath it.
 */
export function FloatingMusicIsland() {
  const pathname = usePathname();
  const router = useRouter();
  const themeName = useThemeName();
  const islandBg = themeName === "dark" ? tokens.color.surfaceDark2.val : tokens.color.black.val;
  const insets = useSafeAreaInsets();
  const { playState, playingIndex, nextActionOverrider, previousActionOverrider, playurlOverrider } =
    usePlayer();
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<string | undefined>(undefined);
  const [isTogglingPlayback, setIsTogglingPlayback] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useProgress();
  const isSeeking = useSharedValue(false);
  const seekFraction = useSharedValue(0);
  const pendingSeekFraction = useSharedValue<number | null>(null);

  const refreshActiveTrack = async () => {
    const track = await TrackPlayer.getActiveTrack();
    setActiveTitle(track?.title ?? null);
    setActiveArtist((track?.artist as string) || null);
    setArtwork(track?.artwork as string | undefined);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing React state from the native TrackPlayer module's current track, not derived render state
    refreshActiveTrack();
  }, [playingIndex]);

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], () => {
    refreshActiveTrack();
  });

  const liveFraction =
    progress.duration > 0 ? Math.min(progress.position / progress.duration, 1) : 0;

  // Mirrors PlayerSeekBar — keep showing the dragged-to position until
  // the player actually reports being there, since position polling
  // lags behind seekTo().
  useEffect(() => {
    if (pendingSeekFraction.value === null || progress.duration <= 0) return;
    const target = pendingSeekFraction.value * progress.duration;
    if (Math.abs(progress.position - target) < 1.5) {
      pendingSeekFraction.value = null;
      isSeeking.value = false;
    }
  }, [progress.position, progress.duration]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(isSeeking.value ? seekFraction.value : liveFraction) * 100}%`,
  }));

  if (islandHiddenOnRoutes.some((r) => pathname.startsWith(r))) return null;
  if (!activeTitle) return null;

  // See player.tsx — Buffering/Loading count as "playing" so a tap pauses
  // instead of falling through to a destructive reset+reload.
  const isPlaying = playState === State.Playing || playState === State.Buffering || playState === State.Loading;
  const isIdle = playState === State.None;
  const tabBarHeight = TAB_BAR_HEIGHT_BASE + Math.max(insets.bottom, 16) + TAB_BAR_PADDING;
  const islandGap = pathname.startsWith("/album") ? ISLAND_GAP_ALBUM : ISLAND_GAP_DEFAULT;

  const commitSeek = (fraction: number) => {
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation, not React state; this is the correct API for a worklet-driven value
    pendingSeekFraction.value = fraction;
    TrackPlayer.seekTo(fraction * progress.duration);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation inside a worklet, not React state
      isSeeking.value = true;
      seekFraction.value = Math.min(Math.max(e.x / Math.max(trackWidth, 1), 0), 1);
    })
    .onUpdate((e) => {
      seekFraction.value = Math.min(Math.max(e.x / Math.max(trackWidth, 1), 0), 1);
    })
    .onEnd(() => {
      runOnJS(commitSeek)(seekFraction.value);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const fraction = Math.min(Math.max(e.x / Math.max(trackWidth, 1), 0), 1);
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation inside a worklet, not React state
    isSeeking.value = true;
    seekFraction.value = fraction;
    runOnJS(commitSeek)(fraction);
  });

  const seekGesture = Gesture.Race(pan, tap);

  const togglePlayback = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
      return;
    }
    if (!isIdle) {
      await TrackPlayer.play();
      return;
    }
    setIsTogglingPlayback(true);
    try {
      await playurlOverrider(playingIndex);
    } finally {
      setIsTogglingPlayback(false);
    }
  };

  return (
    <YStack
      position="absolute"
      bottom={tabBarHeight + islandGap}
      left={8}
      right={8}
      zIndex="floatingIsland"
      backgroundColor={islandBg}
      borderRadius="island"
      overflow="hidden"
      shadowColor={tokens.color.shadowPrimary.val}
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={1}
      shadowRadius={12}
      style={{ elevation: 16 }}
    >
      <XStack alignItems="center" gap={10} paddingVertical={10} paddingHorizontal={14}>
        <XStack
          flex={1}
          alignItems="center"
          gap={10}
          onPress={() => router.push(routes.player)}
        >
          {artwork ? (
            <Image source={{ uri: artwork }} width={36} height={36} borderRadius={10} />
          ) : (
            <View width={36} height={36} borderRadius={10} backgroundColor={tokens.color.gray600.val} />
          )}
          <YStack flex={1} gap={2}>
            <MarqueeText
              text={activeTitle ?? ""}
              color={tokens.color.white.val}
              fontFamily="body"
              fontWeight="700"
              fontSize={14}
              align="left"
            />
            <MarqueeText
              text={activeArtist ?? "Unknown Artist"}
              color={tokens.color.gray600.val}
              fontFamily="body"
              fontSize={12}
              align="left"
            />
          </YStack>
        </XStack>
        <Pressable
          style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30 }}
          onPress={previousActionOverrider}
        >
          <SkipBack size={18} color={tokens.color.white.val} />
        </Pressable>
        <Pressable
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: tokens.color.white.val,
          }}
          onPress={togglePlayback}
        >
          {isTogglingPlayback ? (
            <ActivityIndicator size="small" color={tokens.color.black.val} />
          ) : isPlaying ? (
            <Pause size={16} color={tokens.color.black.val} />
          ) : (
            <Play size={16} color={tokens.color.black.val} />
          )}
        </Pressable>
        <Pressable
          style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30 }}
          onPress={nextActionOverrider}
        >
          <SkipForward size={18} color={tokens.color.white.val} />
        </Pressable>
      </XStack>
      <GestureDetector gesture={seekGesture}>
        <View
          width="100%"
          height={6}
          justifyContent="flex-end"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View width="100%" height={2} backgroundColor={tokens.color.gray600.val}>
            <Animated.View
              style={[{ height: "100%", backgroundColor: tokens.color.white.val }, fillStyle]}
            />
          </View>
        </View>
      </GestureDetector>
    </YStack>
  );
}
