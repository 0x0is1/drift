import { Image } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from "react-native-reanimated";
import { View, Text, useThemeName } from "tamagui";
import { MarqueeText } from "@components/MarqueeText";
import { tokens } from "@theme/tokens";
import type { Track } from "react-native-track-player";
import type { ViewStyle } from "react-native";

export const CURTAIN_WIDTH = 250;
// Matches usePlayerCurtain's CURTAIN_HEIGHT_TRACK (its tallest resting state).
export const CURTAIN_MAX_HEIGHT = 500;

type Props = {
  panGesture: GestureType;
  curtainStyle: AnimatedStyle<ViewStyle>;
  albumMode: boolean;
  activeTrack: Track | undefined;
};

/** The "curtain" banner — 1:1 port of old lissen-mobile PlayerBanner. */
export function PlayerCurtain({ panGesture, curtainStyle, albumMode, activeTrack }: Props) {
  const hasTrack = Boolean(activeTrack?.artwork);
  const showWordmark = albumMode || !hasTrack;
  const themeName = useThemeName();
  const curtainBg = themeName === "dark" ? tokens.color.surfaceDark2.val : tokens.color.black.val;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            width: CURTAIN_WIDTH,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderBottomLeftRadius: 150,
            borderBottomRightRadius: 150,
            backgroundColor: curtainBg,
            shadowColor: tokens.color.shadowPrimary.val,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 1,
            shadowRadius: 16,
            elevation: 24,
          },
          curtainStyle,
        ]}
      >
        <Animated.View
          key={showWordmark ? "wordmark" : "track-art"}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        >
          {showWordmark ? (
            <View
              width="100%"
              height="100%"
              backgroundColor={curtainBg}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontFamily="heading" fontSize={32} letterSpacing={2} color={tokens.color.white.val}>
                DRIFT
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: activeTrack?.artwork as string }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          )}
        </Animated.View>
        <View
          position="absolute"
          width="100%"
          height="100%"
          backgroundColor={tokens.color.overlaySecondary.val}
        />
        <Animated.View
          key={albumMode ? "album-title" : "track-title"}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          style={{
            position: "absolute",
            bottom: 80,
            width: 140,
            alignSelf: "center",
          }}
        >
          <MarqueeText
            text={
              albumMode
                ? (activeTrack?.album as string) || "My Queue"
                : ((activeTrack?.title as string) ?? "Unknown Title")
            }
            fontFamily="heading"
            fontSize={18}
            color={tokens.color.white.val}
          />
        </Animated.View>
        <Animated.View
          key={albumMode ? "album-subtitle" : "track-subtitle"}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          style={{
            position: "absolute",
            bottom: 50,
            width: 140,
            alignSelf: "center",
          }}
        >
          <MarqueeText
            text={albumMode ? "You" : ((activeTrack?.artist as string) ?? "Unknown Artist")}
            fontFamily="body"
            fontSize={12}
            textTransform="uppercase"
            color={tokens.color.white.val}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
