import { View, XStack, useTheme } from "tamagui";
import { ChevronLeft, Users, Heart } from "@tamagui/lucide-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, { State, useProgress } from "react-native-track-player";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";
import { usePlayer } from "@contexts/PlayerContext";
import { usePlayerCurtain } from "@hooks/usePlayerCurtain";
import { useQueue } from "@hooks/useQueue";
import { useRepeatMode } from "@hooks/useRepeatMode";
import { PlayerCurtain } from "@components/player/PlayerCurtain";
import { PlayerSeekBar } from "@components/player/PlayerSeekBar";
import { PlayerQueueList } from "@components/player/PlayerQueueList";
import { PlayerTransportControls } from "@components/player/PlayerTransportControls";

/**
 * Full-screen player — 1:1 port of old lissen-mobile PlayerScreen layout,
 * but themed to the app's dark/light setting. The curtain itself stays a
 * fixed black-with-white-text surface (matches IntroSplash branding) on
 * purpose — everything else here follows $background/$color.
 */
export default function PlayerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    playState,
    playingIndex,
    onShuffle,
    setOnShuffle,
    isTrackAddingCompleted,
    formatTime,
    nextActionOverrider,
    previousActionOverrider,
    playurlOverrider,
    isLiked,
    toggleLike,
  } = usePlayer();

  const queue = useQueue(isTrackAddingCompleted, playingIndex);
  const { onRepeat, toggleRepeat } = useRepeatMode();
  const { albumMode, panGesture, curtainStyle } = usePlayerCurtain();
  const progress = useProgress();
  const [isTogglingPlayback, setIsTogglingPlayback] = useState(false);

  // Treat Buffering/Loading as "playing" (a stall mid-playback, not idle) so
  // the icon doesn't flicker to Play and so a tap pauses rather than falling
  // through to the full reset+reload path below — that path must only run
  // when nothing is loaded at all (State.None), not for every non-exact
  // match to Playing/Paused, or a tap during a buffering blip restarts the
  // track from 0 instead of pausing/resuming it.
  const isPlaying = playState === State.Playing || playState === State.Buffering || playState === State.Loading;
  const isIdle = playState === State.None;
  const activeTrack = queue[playingIndex];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View flex={1} backgroundColor="$background" alignItems="center">
        <XStack
          position="absolute"
          top={insets.top}
          left={0}
          right={0}
          zIndex={10}
          paddingHorizontal={12}
          justifyContent="space-between"
        >
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
            <View
              width={32}
              height={32}
              borderRadius={16}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$backgroundHover"
              onPress={() => activeTrack && toggleLike(String(activeTrack.id), activeTrack.artist as string | undefined)}
            >
              <Heart
                color={activeTrack && isLiked(String(activeTrack.id)) ? tokens.color.dangerRed.val : (theme.color?.val as string)}
                fill={activeTrack && isLiked(String(activeTrack.id)) ? tokens.color.dangerRed.val : "transparent"}
                size={18}
              />
            </View>
            <View
              width={32}
              height={32}
              borderRadius={16}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$backgroundHover"
              onPress={() => router.push(routes.listenTogether as any)}
            >
              <Users color={theme.color?.val as string} size={18} />
            </View>
          </XStack>
        </XStack>

        <PlayerCurtain
          panGesture={panGesture}
          curtainStyle={curtainStyle}
          albumMode={albumMode}
          activeTrack={activeTrack}
        />

        {albumMode && (
          <Animated.View
            key="queue"
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(220)}
            style={{ width: "100%" }}
          >
            <PlayerQueueList
              queue={queue}
              playingIndex={playingIndex}
              formatTime={formatTime}
              onSelectTrack={playurlOverrider}
            />
          </Animated.View>
        )}

        <View position="absolute" bottom={0} left={0} right={0} backgroundColor="$background">
          <PlayerSeekBar position={progress.position} duration={progress.duration} formatTime={formatTime} />
          <PlayerTransportControls
            bottomInset={insets.bottom}
            isPlaying={isPlaying}
            isLoading={isTogglingPlayback}
            onRepeat={onRepeat}
            onShuffle={onShuffle}
            onToggleRepeat={toggleRepeat}
            onToggleShuffle={() => setOnShuffle(!onShuffle)}
            onPrevious={previousActionOverrider}
            onNext={nextActionOverrider}
            onPlayPause={async () => {
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
            }}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
