import { useState } from "react";
import { ImageBackground, type ImageSourcePropType } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { Play, Pause, SkipBack, SkipForward } from "@tamagui/lucide-icons";
import { decode } from "html-entities";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { PlayerSeekBar } from "@components/player/PlayerSeekBar";
import { tokens } from "@theme/tokens";

type FeedSong = {
  id: string;
  song: string;
  image: string;
  primary_artists?: string;
};

type Props = {
  item: FeedSong;
  source: ImageSourcePropType;
  cardHeight: number;
  isActive: boolean;
  playlistArtist: string;
  isPlaying: boolean;
  progress: { position: number; duration: number };
  formatTime: (seconds: number) => string;
  onTogglePlayback: () => void;
  onSkip: (delta: 1 | -1) => void;
};

/**
 * One full-bleed feed card. Image fades in on load instead of popping in —
 * the surrounding dark background (not a flash of white/blank) is the
 * placeholder, so a slow network just shows dark-then-art, never a jarring
 * blank frame.
 */
export function FeedCard({
  item,
  source,
  cardHeight,
  isActive,
  playlistArtist,
  isPlaying,
  progress,
  formatTime,
  onTogglePlayback,
  onSkip,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View height={cardHeight} width="100%" backgroundColor={tokens.color.surfaceDark2.val}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <ImageBackground
          source={source}
          resizeMode="cover"
          onLoadEnd={() => {
            setLoaded(true);
            // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation is the correct API here, not a React state write (same pattern as PlayerSeekBar/FloatingMusicIsland)
            opacity.value = withTiming(1, { duration: 220 });
          }}
          style={{ height: cardHeight, width: "100%", justifyContent: "flex-end" }}
        >
          <View position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor="$overlay" />
          <YStack padding={24} paddingBottom={60} gap={12}>
            <Text fontFamily="heading" fontSize="9" color={tokens.color.white.val} numberOfLines={2}>
              {decode(item.song)}
            </Text>
            <Text fontFamily="body" fontSize="4" color={tokens.color.gray100.val}>
              {item.primary_artists || playlistArtist || "Unknown Artist"}
            </Text>
            {isActive && (
              <YStack gap={10} marginTop={28}>
                <PlayerSeekBar
                  position={progress.position}
                  duration={progress.duration}
                  formatTime={formatTime}
                  fillColor={tokens.color.white.val}
                  trackColor={tokens.color.whiteTrackDim.val}
                  textColor={tokens.color.gray100.val}
                />
                <XStack alignItems="center" justifyContent="center" gap={28}>
                  <View onPress={() => onSkip(-1)}>
                    <SkipBack color={tokens.color.white.val} size={26} />
                  </View>
                  <View
                    width={56}
                    height={56}
                    borderRadius={28}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={tokens.color.white.val}
                    onPress={onTogglePlayback}
                  >
                    {isPlaying ? (
                      <Pause color={tokens.color.black.val} size={24} fill={tokens.color.black.val} />
                    ) : (
                      <Play color={tokens.color.black.val} size={24} fill={tokens.color.black.val} />
                    )}
                  </View>
                  <View onPress={() => onSkip(1)}>
                    <SkipForward color={tokens.color.white.val} size={26} />
                  </View>
                </XStack>
              </YStack>
            )}
          </YStack>
        </ImageBackground>
      </Animated.View>
      {!loaded && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <Text fontFamily="heading" fontSize="9" color={tokens.color.gray600.val} numberOfLines={2} textAlign="center" paddingHorizontal={40}>
            {decode(item.song)}
          </Text>
        </View>
      )}
    </View>
  );
}
