import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { View, Text } from "tamagui";
import { tokens } from "@theme/tokens";

/**
 * NFS/F1-style boot intro: a teal speed-streak sweeps across the screen,
 * then the DRIFT wordmark snaps in with a hard-easing scale-flash, then
 * calls onFinish. Shown once per cold launch, gating the root layout —
 * see src/app/_layout.tsx.
 */
export function IntroSplash({ onFinish }: { onFinish: () => void }) {
  const streakX = useSharedValue(-400);
  const streakOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.6);
  const wordmarkOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    streakOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(220, withTiming(0, { duration: 140 })),
    );
    streakX.value = withTiming(400, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });

    wordmarkOpacity.value = withDelay(260, withTiming(1, { duration: 120 }));
    wordmarkScale.value = withDelay(
      260,
      withSequence(
        withTiming(1.12, { duration: 140, easing: Easing.out(Easing.exp) }),
        withTiming(1, { duration: 120, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    flashOpacity.value = withDelay(
      260,
      withSequence(
        withTiming(0.9, { duration: 60 }),
        withTiming(0, { duration: 180 }),
      ),
    );

    const timeout = setTimeout(() => {
      runOnJS(onFinish)();
    }, 1500);
    return () => clearTimeout(timeout);
    // Shared values are stable refs across renders (like useRef) — listing
    // them doesn't change this effect's mount-once behavior.
  }, [onFinish, streakOpacity, streakX, wordmarkOpacity, wordmarkScale, flashOpacity]);

  const streakStyle = useAnimatedStyle(() => ({
    opacity: streakOpacity.value,
    transform: [{ translateX: streakX.value }, { skewX: "-20deg" }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      zIndex="introSplash"
    >
      <Animated.View style={[styles.streak, streakStyle]} />
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
      <Animated.View style={wordmarkStyle}>
        <Text
          fontFamily="heading"
          fontSize={56}
          letterSpacing={2}
          color="$accent"
        >
          DRIFT
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  streak: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: tokens.color.tealAccent.val,
  },
  flash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.color.white.val,
  },
});
