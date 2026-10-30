import { useEffect, useState } from "react";
import { getColors } from "react-native-image-colors";
import { tokens } from "@theme/tokens";

const FALLBACK: [string, string, string] = [
  tokens.color.tealAccent.val as string,
  tokens.color.surfaceDark2.val as string,
  tokens.color.tealAccent.val as string,
];

/**
 * YouTube-Music-style ambient glow colors, extracted from the current
 * track's artwork — see PlayerAmbientGlow. Cross-platform result shapes
 * differ (android/ios/web, see react-native-image-colors types), normalized
 * here to a fixed 3-tuple so the glow component never branches on platform.
 */
export function usePlayerAmbientColors(artworkUri: string | undefined): [string, string, string] {
  const [colors, setColors] = useState<[string, string, string]>(FALLBACK);

  useEffect(() => {
    if (!artworkUri) {
      setColors(FALLBACK);
      return;
    }
    let cancelled = false;
    getColors(artworkUri, {
      fallback: FALLBACK[0],
      cache: true,
      key: artworkUri,
      quality: "low",
      pixelSpacing: 10,
    })
      .then((result) => {
        if (cancelled) return;
        // Favor dominant/muted swatches over vibrant — vibrant picks out a
        // single saturated accent pixel (e.g. a stray highlight) that can
        // read as a color nowhere near what the banner actually looks like.
        // Dominant/muted track the banner's real overall palette.
        if (result.platform === "android") {
          setColors([
            result.dominant || result.vibrant,
            result.lightMuted || result.lightVibrant || result.dominant,
            result.darkMuted || result.darkVibrant || result.dominant,
          ]);
        } else if (result.platform === "ios") {
          setColors([result.background, result.secondary, result.primary]);
        } else {
          setColors([result.dominant || result.vibrant, result.lightMuted || result.lightVibrant, result.darkMuted || result.darkVibrant]);
        }
      })
      .catch(() => {
        if (!cancelled) setColors(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [artworkUri]);

  return colors;
}
