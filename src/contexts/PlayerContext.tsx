import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
  usePlaybackState,
  type Track,
} from "react-native-track-player";
import { decode } from "html-entities";
import { serviceProvider } from "@lib/jiosaavn";
import { logPlayEvent } from "@lib/eventLog";
import { useLikedSongs } from "@hooks/useLikedSongs";
import {
  createSession,
  joinSession,
  leaveSession,
  endSession,
  updateSession,
  subscribeToSession,
  type SyncSessionRow,
  type SyncQueueItem,
} from "@lib/syncSession";

export type DriftTrackSource = {
  id: string;
  playUrl: string;
  songName: string;
  songCover: string;
  artistName?: string;
  duration: number;
};

export type DriftTrackList = {
  items: DriftTrackSource[];
  albumName?: string;
  artistName?: string;
};

export type SyncSessionState = { id: string; isHost: boolean } | null;

type PlayerContextValue = {
  playingIndex: number;
  onShuffle: boolean;
  playState: State;
  likedList: Record<string, boolean>;
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string, artist?: string) => void;
  isTrackAddingCompleted: boolean;
  formatTime: (totalSeconds: number) => string;
  setOnShuffle: (value: boolean) => void;
  addTracks: (trackList: DriftTrackList, addAtIndex?: number) => Promise<void>;
  playurlOverrider: (index: number) => Promise<void>;
  nextActionOverrider: () => Promise<void>;
  previousActionOverrider: () => Promise<void>;
  syncSession: SyncSessionState;
  startSyncSession: () => Promise<string>;
  joinSyncSession: (sessionId: string) => Promise<void>;
  leaveSyncSession: () => Promise<void>;
};

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [playingIndex, setPlayingIndex] = useState(0);
  const [onShuffle, setOnShuffle] = useState(false);
  // usePlaybackState (not a manual Event.PlaybackState listener) because it
  // queries the native module's CURRENT state on mount — a listener only
  // sees future transitions, so after a JS reload (native player keeps
  // playing across reloads) the button stayed stuck on its stale initial
  // state until some other transition happened to fire.
  const rntpPlayState = usePlaybackState();
  const playState = rntpPlayState.state ?? State.None;
  const { liked: likedList, isLiked, toggleLike } = useLikedSongs();
  const [isTrackAddingCompleted, setIsTrackAddingCompleted] = useState(true);
  const [syncSession, setSyncSession] = useState<SyncSessionState>(null);
  // Last-write-wins snapshot, read by host-push and member-apply below —
  // kept in a ref (not state) since it's write-only bookkeeping, never
  // rendered.
  const lastPushAtRef = useRef(0);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}:${formattedSeconds}`;
  };

  /**
   * Builds the TrackPlayer queue from a track list. Callers MUST `await`
   * this fully before calling playurlOverrider — reading
   * TrackPlayer.getQueue() while this is still mutating the queue was a
   * real race condition in the old app (FileNotFoundException from a raw
   * unresolved encrypted_media_url token hitting ExoPlayer). See CLAUDE.md.
   */
  const addTracks = async (trackList: DriftTrackList, addAtIndex = -1) => {
    setIsTrackAddingCompleted(false);
    for (const item of trackList.items) {
      const reparsedItem: Track = {
        id: item.id,
        url: item.playUrl,
        title: decode(item.songName),
        artwork: item.songCover,
        artist: item.artistName || trackList.artistName || "",
        album: trackList.albumName ?? "",
        duration: item.duration,
        isLiveStream: true,
        headers: {
          Referer: "https://www.jiosaavn.com/",
        },
      };
      if (addAtIndex !== -1) {
        await TrackPlayer.add(reparsedItem, addAtIndex);
      } else {
        await TrackPlayer.add(reparsedItem);
      }
    }
    setIsTrackAddingCompleted(true);
  };

  const playurlOverrider = async (index: number) => {
    const trackPlayerQueue = await TrackPlayer.getQueue();
    const current = trackPlayerQueue[index];

    // Skip detection, single chokepoint: every path that switches tracks
    // (next/previous, remote buttons, tapping a queue/album/playlist row,
    // a feed swipe) funnels through this function, so whichever track is
    // about to be replaced gets checked here. A track that hadn't basically
    // finished (>5s left) counts as a deliberate skip — natural
    // end-of-track also reaches here via nextActionOverrider, but by then
    // position is already within 5s of duration, so it's excluded by the
    // same guard without needing a separate "was this manual" flag.
    const abandoned = await TrackPlayer.getActiveTrack();
    if (abandoned && current && String(abandoned.id) !== current.id) {
      const abandonedProgress = await TrackPlayer.getProgress();
      if (abandonedProgress.duration > 0 && abandonedProgress.duration - abandonedProgress.position > 5) {
        const abandonedArtist = abandoned.artist as string | undefined;
        logPlayEvent({
          trackId: String(abandoned.id),
          kind: "skip",
          ...(abandonedArtist ? { meta: { artist: abandonedArtist } } : {}),
        });
      }
    }

    if (current && !current.url.toString().includes("https://")) {
      current.url = await serviceProvider.playByMediaUrl(current.url as string);
    }
    await TrackPlayer.reset();
    await TrackPlayer.add(trackPlayerQueue);
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
    setPlayingIndex(index);

    if (current) {
      const artist = current.artist as string | undefined;
      logPlayEvent({ trackId: String(current.id), kind: "play", ...(artist ? { meta: { artist } } : {}) });
    }

    if (syncSession?.isHost) pushHostState(index);
  };

  const trackToSyncItem = (track: Track): SyncQueueItem => ({
    id: String(track.id),
    playUrl: track.url as string,
    songName: (track.title as string) ?? "",
    ...(track.artwork ? { songCover: track.artwork as string } : {}),
    ...(track.artist ? { artistName: track.artist as string } : {}),
    duration: track.duration ?? 0,
  });

  /**
   * Host-only: pushes the local queue/transport-state to drift_sessions so
   * joined members can mirror it. Fired on track change, play/pause, and a
   * throttled tick off the existing progress-update handler below — not on
   * every seek individually (there's no reliable per-seek RNTP event), so
   * drift beyond ~2s is corrected opportunistically by the next tick/apply.
   */
  const pushHostState = async (indexOverride?: number) => {
    if (!syncSession?.isHost) return;
    const queue = await TrackPlayer.getQueue();
    const progress = await TrackPlayer.getProgress();
    const { state } = await TrackPlayer.getPlaybackState();
    await updateSession(syncSession.id, {
      queue: queue.map(trackToSyncItem),
      current_index: indexOverride ?? playingIndex,
      is_playing: state === State.Playing || state === State.Buffering || state === State.Loading,
      position_seconds: progress.position,
    });
  };

  /**
   * Member-only: mirrors a drift_sessions row onto the local player. Skips
   * the reset+add churn when the queue hasn't actually changed (track-level
   * id comparison), and only seeks when drift exceeds 2s to avoid fighting
   * normal playback ticks.
   */
  const applyRemoteState = async (row: SyncSessionRow) => {
    const localQueue = await TrackPlayer.getQueue();
    const localIds = localQueue.map((t) => String(t.id));
    const remoteIds = row.queue.map((t) => t.id);
    const queueChanged =
      localIds.length !== remoteIds.length || localIds.some((id, i) => id !== remoteIds[i]);

    if (queueChanged) {
      await TrackPlayer.reset();
      await addTracks({ items: row.queue.map((item) => ({ ...item, songCover: item.songCover ?? "" })) });
    }

    if (queueChanged || row.current_index !== playingIndex) {
      await TrackPlayer.skip(row.current_index);
      setPlayingIndex(row.current_index);
    }

    const progress = await TrackPlayer.getProgress();
    if (Math.abs(progress.position - row.position_seconds) > 2) {
      await TrackPlayer.seekTo(row.position_seconds);
    }

    if (row.is_playing) {
      await TrackPlayer.play();
    } else {
      await TrackPlayer.pause();
    }
  };

  const startSyncSession = async () => {
    const queue = await TrackPlayer.getQueue();
    const progress = await TrackPlayer.getProgress();
    const { state } = await TrackPlayer.getPlaybackState();
    const session = await createSession(
      queue.map(trackToSyncItem),
      playingIndex,
      state === State.Playing || state === State.Buffering || state === State.Loading,
      progress.position,
    );
    setSyncSession({ id: session.id, isHost: true });
    return session.id;
  };

  const joinSyncSession = async (sessionId: string) => {
    const session = await joinSession(sessionId);
    setSyncSession({ id: session.id, isHost: false });
    await applyRemoteState(session);
  };

  const leaveSyncSession = async () => {
    if (!syncSession) return;
    if (syncSession.isHost) {
      await endSession(syncSession.id);
    } else {
      await leaveSession(syncSession.id);
    }
    setSyncSession(null);
  };

  // Stale-closure guard — subscribeToSession's callback is registered once
  // per session id (see effect below), but applyRemoteState closes over
  // playingIndex/addTracks from whatever render was active at subscribe
  // time. Routing through a ref kept fresh every render (same pattern as
  // feed.tsx's latestPlaySongRef) means the callback always runs the
  // current version instead of a snapshot from session-join time.
  const latestApplyRemoteStateRef = useRef(applyRemoteState);
  useEffect(() => {
    latestApplyRemoteStateRef.current = applyRemoteState;
  });

  useEffect(() => {
    if (!syncSession || syncSession.isHost) return;
    const unsubscribe = subscribeToSession(
      syncSession.id,
      (row) => latestApplyRemoteStateRef.current(row),
      () => setSyncSession(null),
    );
    return unsubscribe;
  }, [syncSession?.id, syncSession?.isHost]);

  const nextActionOverrider = async () => {
    const queue = await TrackPlayer.getQueue();
    const repeatMode = await TrackPlayer.getRepeatMode();
    if (onShuffle) {
      await playurlOverrider(Math.floor(Math.random() * queue.length));
    } else if (repeatMode !== 0) {
      await playurlOverrider(playingIndex);
    } else {
      await playurlOverrider(playingIndex < queue.length - 1 ? playingIndex + 1 : 0);
    }
  };

  const previousActionOverrider = async () => {
    const queue = await TrackPlayer.getQueue();
    const repeatMode = await TrackPlayer.getRepeatMode();
    if (onShuffle) {
      await playurlOverrider(Math.floor(Math.random() * queue.length));
    } else if (repeatMode !== 0) {
      await playurlOverrider(playingIndex);
    } else {
      await playurlOverrider(playingIndex > 0 ? playingIndex - 1 : queue.length - 1);
    }
  };

  // Ported from old lissen-mobile's PlayerContext, this handler used to also
  // force TrackPlayer.play()/pause() every tick based on buffer health. That
  // raced against any manual pause (tap, notification): the next progress
  // tick would read the native state before the pause had propagated and
  // immediately call play() again, so pausing looked like it did nothing.
  // RNTP/ExoPlayer already manage buffering internally — only the near-end
  // auto-skip is actually needed here.
  useTrackPlayerEvents([Event.PlaybackProgressUpdated], async (event) => {
    if (syncSession?.isHost && Date.now() - lastPushAtRef.current > 5000) {
      lastPushAtRef.current = Date.now();
      pushHostState();
    }
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Paused) return;
    if (event.duration - event.position < 5) {
      await nextActionOverrider();
    }
  });

  // Host's own manual play/pause taps happen via TrackPlayer.play()/pause()
  // called directly from FloatingMusicIsland/PlayerSeekBar/album screens
  // (not through this context), so the progress-tick push above would lag
  // by up to 5s — push immediately on the actual state transition instead.
  useTrackPlayerEvents([Event.PlaybackState], () => {
    if (syncSession?.isHost) pushHostState();
  });

  useTrackPlayerEvents([Event.PlaybackQueueEnded], async () => {
    const repeatMode = await TrackPlayer.getRepeatMode();
    if (repeatMode === 0) {
      await nextActionOverrider();
    } else {
      await TrackPlayer.seekTo(0);
      await playurlOverrider(playingIndex);
    }
  });

  useTrackPlayerEvents([Event.RemoteNext], async () => {
    await nextActionOverrider();
  });

  useTrackPlayerEvents([Event.RemotePrevious], async () => {
    await previousActionOverrider();
  });

  useTrackPlayerEvents([Event.RemoteSeek], async (event) => {
    if (event.position !== undefined) {
      await TrackPlayer.seekTo(event.position);
    }
  });

  return (
    <PlayerContext.Provider
      value={{
        playingIndex,
        onShuffle,
        playState,
        likedList,
        isLiked,
        toggleLike,
        isTrackAddingCompleted,
        formatTime,
        setOnShuffle,
        addTracks,
        playurlOverrider,
        nextActionOverrider,
        previousActionOverrider,
        syncSession,
        startSyncSession,
        joinSyncSession,
        leaveSyncSession,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
