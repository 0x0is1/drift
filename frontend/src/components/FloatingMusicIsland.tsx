import { usePathname, useRouter } from "expo-router";
import { Play, Pause, SkipBack, SkipForward, Users, Wifi } from "@tamagui/lucide-icons";
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
import {
  islandHiddenOnRoutes,
  tabBarRoutes,
  routes,
  FEED_BUTTON_PROTRUSION,
  TAB_BAR_HEIGHT_BASE,
  TAB_BAR_PADDING,
} from "@constants/routes";
import { useDrawerUi } from "@contexts/DrawerUiContext";
import { MarqueeText } from "@components/MarqueeText";

// Must clear the raised Feed button's visible protrusion (FEED_BUTTON_PROTRUSION)
// plus a little breathing room, or the island's bottom edge overlaps its top edge.
const FEED_BUTTON_CLEARANCE = FEED_BUTTON_PROTRUSION + 8;
const NO_TAB_BAR_GAP = 8;

/**
 * Persistent "floating island" mini-player — Dynamic-Island-style pill,
 * mounted once at the root (sibling of the Stack, see app/_layout.tsx) so
 * it survives navigation across every screen, including stack siblings
 * outside the tabs tree like /album/[id]. Self-hides via isDrawerOpen
 * (DrawerUiContext) and islandHiddenOnRoutes/activeTitle checks below
 * instead of unmounting structurally, since it has no native container of
 * its own to hide behind.
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
  const {
    playState,
    playingIndex,
    nextActionOverrider,
    previousActionOverrider,
    playurlOverrider,
    syncSession,
    localSync,
    isTrackLoading,
  } = usePlayer();
  const { isDrawerOpen } = useDrawerUi();
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<string | undefined>(undefined);
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

  if (isDrawerOpen) return null;
  if (islandHiddenOnRoutes.some((r) => pathname.startsWith(r))) return null;
  if (!activeTitle) return null;

  // See player.tsx — Buffering/Loading count as "playing" so a tap pauses
  // instead of falling through to a destructive reset+reload.
  const isPlaying = playState === State.Playing || playState === State.Buffering || playState === State.Loading;
  const isIdle = playState === State.None;
  // Self-arranges off whatever's actually below it: a real tab bar on tab
  // routes (cleared past the raised Feed button), or just the safe-area
  // edge everywhere else — no more per-route magic-number gaps.
  const hasTabBar = tabBarRoutes.includes(pathname);
  const islandBottom = hasTabBar
    ? TAB_BAR_HEIGHT_BASE + Math.max(insets.bottom, 16) + TAB_BAR_PADDING + FEED_BUTTON_CLEARANCE - 14
    : Math.max(insets.bottom, 16) + NO_TAB_BAR_GAP;

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
    if (isTrackLoading) return;
    if (isPlaying) {
      await TrackPlayer.pause();
      return;
    }
    if (!isIdle) {
      await TrackPlayer.play();
      return;
    }
    await playurlOverrider(playingIndex);
  };

  return (
    <YStack
      position="absolute"
      bottom={islandBottom}
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
          {isTrackLoading ? (
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
        {localSync && (
          <Pressable
            style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30 }}
            onPress={() => router.push(routes.syncNearby as any)}
          >
            <Wifi size={18} color={tokens.color.tealAccent.val} />
          </Pressable>
        )}
        {syncSession && (
          <Pressable
            style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30 }}
            onPress={() => router.push(routes.listenTogether as any)}
          >
            <Users size={18} color={tokens.color.tealAccent.val} />
          </Pressable>
        )}
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
