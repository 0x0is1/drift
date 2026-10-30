import { useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const CURTAIN_HEIGHT_TRACK = 500;
const CURTAIN_HEIGHT_ALBUM = 440;
const DRAG_THRESHOLD = 20;

/**
 * Ported 1:1 from old lissen-mobile PlayerBanner/panResponder: a boolean
 * albumMode flips as soon as the drag crosses a 20px threshold (down ->
 * track view, up -> album/queue view), then the curtain height animates to
 * its resting value with a 400ms ease timing — no continuous drag-follow.
 * See CLAUDE.md "New player page UX".
 */
export function usePlayerCurtain() {
  const [albumMode, setAlbumModeState] = useState(true);
  const height = useSharedValue(CURTAIN_HEIGHT_ALBUM);

  const setAlbumMode = (next: boolean) => {
    setAlbumModeState(next);
    height.value = withTiming(next ? CURTAIN_HEIGHT_ALBUM : CURTAIN_HEIGHT_TRACK, {
      duration: 220,
      easing: Easing.ease,
    });
  };

  const panGesture = Gesture.Pan().onUpdate((event) => {
    if (event.translationY <= -DRAG_THRESHOLD) {
      runOnJS(setAlbumMode)(true);
    } else if (event.translationY >= DRAG_THRESHOLD) {
      runOnJS(setAlbumMode)(false);
    }
  });

  const curtainStyle = useAnimatedStyle(() => ({ height: height.value }));

  return { albumMode, panGesture, curtainStyle, curtainHeight: height };
}
