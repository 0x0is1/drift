import { useEffect, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { View, Text, XStack, useTheme } from "tamagui";
import TrackPlayer from "react-native-track-player";

type Props = {
  position: number;
  duration: number;
  formatTime: (seconds: number) => string;
  /** Overrides for use on photo/video backdrops where theme tokens (near-black in light mode) would be invisible. */
  fillColor?: string;
  trackColor?: string;
  textColor?: string;
};

const THUMB_SIZE = 14;

/** Seekable progress bar — drag or tap to scrub, sits right above the transport controls. */
export function PlayerSeekBar({ position, duration, formatTime, fillColor, trackColor, textColor }: Props) {
  const theme = useTheme();
  const color = fillColor ?? (theme.color?.val as string);
  const colorSecondary = trackColor ?? (theme.colorSecondary?.val as string);
  const labelColor = textColor ?? (theme.color?.val as string);
  const [trackWidth, setTrackWidth] = useState(0);
  const isSeeking = useSharedValue(false);
  const seekFraction = useSharedValue(0);
  const pendingSeekFraction = useSharedValue<number | null>(null);
  const liveFraction = duration > 0 ? Math.min(position / duration, 1) : 0;

  const onLayout = (e: any) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const commitSeek = (fraction: number) => {
    pendingSeekFraction.value = fraction;
    TrackPlayer.seekTo(fraction * duration);
  };

  // Keep showing the dragged-to position until the player actually reports
  // being there — react-native-track-player's position polling lags behind
  // seekTo(), so clearing isSeeking right on release made the thumb snap
  // back to the stale position and then jump forward once the poll caught up.
  useEffect(() => {
    if (pendingSeekFraction.value === null || duration <= 0) return;
    const target = pendingSeekFraction.value * duration;
    if (Math.abs(position - target) < 1.5) {
      pendingSeekFraction.value = null;
      isSeeking.value = false;
    }
  }, [position, duration]);

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

  // Pan alone often doesn't recognize a plain tap-with-no-movement on
  // Android even with minDistance(0) — race it against a Tap gesture so a
  // quick tap still seeks instead of requiring an actual drag.
  const tap = Gesture.Tap().onEnd((e) => {
    const fraction = Math.min(Math.max(e.x / Math.max(trackWidth, 1), 0), 1);
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation inside a worklet, not React state
    isSeeking.value = true;
    seekFraction.value = fraction;
    runOnJS(commitSeek)(fraction);
  });

  const seekGesture = Gesture.Race(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(isSeeking.value ? seekFraction.value : liveFraction) * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${(isSeeking.value ? seekFraction.value : liveFraction) * 100}%`,
  }));

  return (
    <View width="100%" paddingHorizontal={20} paddingTop={4}>
      <GestureDetector gesture={seekGesture}>
        <View height={24} justifyContent="center" onLayout={onLayout}>
          <View
            width="100%"
            height={4}
            borderRadius={2}
            backgroundColor={colorSecondary}
            overflow="hidden"
          >
            <Animated.View style={[{ height: "100%", backgroundColor: color, borderRadius: 2 }, fillStyle]} />
          </View>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: color,
                marginLeft: -THUMB_SIZE / 2,
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <XStack justifyContent="space-between" marginTop={2}>
        <Text fontFamily="body" fontSize={12} color={labelColor} opacity={0.9}>
          {formatTime(position)}
        </Text>
        <Text fontFamily="body" fontSize={12} color={labelColor} opacity={0.9}>
          {formatTime(duration)}
        </Text>
      </XStack>
    </View>
  );
}
