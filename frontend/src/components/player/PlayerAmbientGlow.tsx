import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { CURTAIN_WIDTH } from "@components/player/PlayerCurtain";
import { usePlayerAmbientColors } from "@hooks/usePlayerAmbientColors";

// Alexa-ring style halo: many thin concentric layers hugging the curtain's
// own silhouette, each a fraction of a px further out with opacity falling
// off on a curve — stacking enough layers fakes a true gaussian blur (no
// native blur filter available here, see PlayerAmbientGlow history), so the
// edge reads as one continuous soft glow wrapping the whole curtain rather
// than a hard outline or a handful of isolated spots. LAYER_COUNT has to be
// high and the color has to interpolate smoothly between layers (never
// alternate outright) or the steps show up as visible banding/rings.
const LAYER_COUNT = 26;
const MAX_PAD = 24;
const BASE_OPACITY = 0.13;
const FALLOFF = 1.4;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

function GlowLayer({
  pad,
  opacity,
  color,
  curtainHeight,
  pulse,
  intensity,
}: {
  pad: number;
  opacity: number;
  color: string;
  curtainHeight: SharedValue<number>;
  pulse: SharedValue<number>;
  intensity: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const breathing = 0.88 + 0.12 * Math.sin(pulse.value * Math.PI);
    return {
      width: CURTAIN_WIDTH + pad * 2,
      height: curtainHeight.value + pad * 2,
      left: -pad,
      top: -pad,
      borderBottomLeftRadius: 150 + pad,
      borderBottomRightRadius: 150 + pad,
      backgroundColor: color,
      opacity: opacity * intensity.value * breathing,
    };
  });

  return <Animated.View pointerEvents="none" style={[{ position: "absolute" }, style]} />;
}

/**
 * Behind-the-curtain ambient glow — a continuous soft halo wrapping the
 * curtain's full silhouette (Echo/Alexa light-ring style), tinted with
 * colors sampled from the current track's artwork.
 */
export function PlayerAmbientGlow({
  artworkUri,
  playing,
  curtainHeight,
}: {
  artworkUri: string | undefined;
  playing: boolean;
  curtainHeight: SharedValue<number>;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const colors = usePlayerAmbientColors(artworkUri);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const intensity = useSharedValue(playing ? 1 : 0.6);
  useEffect(() => {
    intensity.value = withTiming(playing ? 1 : 0.6, { duration: 500 });
  }, [playing]);

  const layers = Array.from({ length: LAYER_COUNT }, (_, i) => {
    const t = (i + 1) / LAYER_COUNT;
    return {
      pad: t * MAX_PAD,
      opacity: BASE_OPACITY * Math.pow(1 - t, FALLOFF),
      color: lerpColor(colors[0], colors[1], t),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: windowWidth / 2 - CURTAIN_WIDTH / 2,
        width: CURTAIN_WIDTH,
        height: 1,
      }}
    >
      {layers.map((layer, i) => (
        <GlowLayer
          key={i}
          pad={layer.pad}
          opacity={layer.opacity}
          color={layer.color}
          curtainHeight={curtainHeight}
          pulse={pulse}
          intensity={intensity}
        />
      ))}
    </Animated.View>
  );
}
