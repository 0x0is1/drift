import { useEffect, useState } from "react";
import TrackPlayer, { type Track } from "react-native-track-player";

export function useQueue(isTrackAddingCompleted: boolean, playingIndex: number) {
  const [queue, setQueue] = useState<Track[]>([]);

  useEffect(() => {
    if (!isTrackAddingCompleted) return;
    TrackPlayer.getQueue().then(setQueue);
  }, [isTrackAddingCompleted, playingIndex]);

  return queue;
}
