import { useEffect, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
} from "react-native-reanimated";
import { Text, View as RNView, ScrollView } from "react-native";
import { View } from "tamagui";

type Props = {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  textTransform?: "uppercase" | "none";
  fontWeight?: "400" | "500" | "600" | "700";
  align?: "left" | "center";
};

const GAP = 40;
const SPEED_PX_PER_SEC = 40;
const START_DELAY = 900;

/**
 * Single-line text that scrolls horizontally when it overflows its container,
 * instead of ellipsizing/clipping. Measurement follows Reanimated's own
 * marquee example (docs.swmansion.com/react-native-reanimated/examples/marquee):
 * the text is rendered inside a hidden horizontal ScrollView, and its true
 * natural width is read via onLayout on a plain View wrapping it inside that
 * scroll content. A ScrollView's content is never width-clamped by its own
 * box or by an ancestor's overflow:hidden (that's the entire point of
 * scrolling), unlike a plain absolutely-positioned View, whose auto-sized
 * width Yoga can still clamp to the nearest ancestor's content box on
 * Android — which is what made every earlier non-ScrollView measurement
 * attempt here silently report a too-small width and never detect overflow.
 */
export function MarqueeText({ text, fontFamily, fontSize, color, textTransform, fontWeight, align = "center" }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);
  const measured = textWidth > 0;
  const overflow = measured && containerWidth > 0 && textWidth > containerWidth;
  const centerOffset = align === "center" ? Math.max((containerWidth - textWidth) / 2, 0) : 0;

  useEffect(() => {
    if (!measured) return;
    if (!overflow) {
      if (centerOffset === 0) {
        translateX.value = 0;
        return;
      }
      translateX.value = 0;
      translateX.value = withDelay(150, withTiming(centerOffset, { duration: 400 }));
      return;
    }
    const distance = textWidth + GAP;
    const duration = (distance / SPEED_PX_PER_SEC) * 1000;
    translateX.value = 0;
    translateX.value = withDelay(START_DELAY, withRepeat(withTiming(-distance, { duration }), -1, false));
    return () => cancelAnimation(translateX);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- centerOffset intentionally excluded, only re-run on overflow/textWidth changes
  }, [measured, overflow, textWidth]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const textStyle = { fontFamily, fontSize, color, textTransform, fontWeight };

  return (
    <View
      width="100%"
      height={Math.ceil(fontSize * 1.4)}
      overflow="hidden"
      position="relative"
      onLayout={(e: any) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Off-screen measurement copy: hidden horizontal ScrollView so its content
          is never width-clamped by this component's own overflow:hidden box. */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        pointerEvents="none"
        style={{ position: "absolute", opacity: 0 }}
      >
        <RNView onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}>
          <Text style={textStyle}>{text}</Text>
        </RNView>
      </ScrollView>
      {measured && (
        <Animated.View
          style={[
            { position: "absolute", top: 0, left: 0, flexDirection: "row" },
            animStyle,
          ]}
        >
          <Text style={textStyle}>{text}</Text>
          {overflow && <Text style={[textStyle, { marginLeft: GAP }]}>{text}</Text>}
        </Animated.View>
      )}
    </View>
  );
}
