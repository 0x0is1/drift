import { useEffect, useState } from "react";
import TrackPlayer, { RepeatMode } from "react-native-track-player";

export function useRepeatMode() {
  const [onRepeat, setOnRepeat] = useState(false);

  useEffect(() => {
    TrackPlayer.getRepeatMode().then((mode) => setOnRepeat(mode !== RepeatMode.Off));
  }, []);

  const toggleRepeat = () => {
    const next = onRepeat ? RepeatMode.Off : RepeatMode.Queue;
    TrackPlayer.setRepeatMode(next);
    setOnRepeat(!onRepeat);
  };

  return { onRepeat, toggleRepeat };
}
