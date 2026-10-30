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
import { getStreamQuality } from "@lib/settings";
import { useLikedSongs } from "@hooks/useLikedSongs";
import {
  createSession,
  joinSession,
  leaveSession,
  endSession,
  updateSession,
  subscribeToSession,
  getSessionMembers,
  subscribeToSessionMembers,
  type SyncQueueItem,
  type SyncSessionMember,
} from "@lib/syncSession";
import { supabase } from "@lib/supabase";
import { LocalSyncHost, discoverPeers, connectToPeer, type LocalPeer, type PeerConnection } from "@lib/localSync";

/** Shared by Supabase sync-sessions and local-WiFi sync — both just need these 4 fields. */
type RemoteSyncFrame = {
  queue: SyncQueueItem[];
  current_index: number;
  is_playing: boolean;
  position_seconds: number;
};

/** What applyRemoteState actually receives — both SyncSessionRow and LocalSyncState add updated_at. */
type IncomingSyncFrame = RemoteSyncFrame & { updated_at: string };

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
export type LocalSyncRole = { isHost: true } | { isHost: false; peer: LocalPeer } | null;

type PlayerContextValue = {
  playingIndex: number;
  onShuffle: boolean;
  playState: State;
  likedList: Record<string, boolean>;
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string, artist?: string) => void;
  isTrackAddingCompleted: boolean;
  isTrackLoading: boolean;
  formatTime: (totalSeconds: number) => string;
  setOnShuffle: (value: boolean) => void;
  addTracks: (trackList: DriftTrackList, addAtIndex?: number) => Promise<void>;
  playSingleTrack: (trackList: DriftTrackList) => Promise<void>;
  playurlOverrider: (index: number) => Promise<void>;
  nextActionOverrider: () => Promise<void>;
  previousActionOverrider: () => Promise<void>;
  syncSession: SyncSessionState;
  sessionMembers: SyncSessionMember[];
  startSyncSession: () => Promise<string>;
  joinSyncSession: (sessionId: string) => Promise<void>;
  leaveSyncSession: () => Promise<void>;
  localSync: LocalSyncRole;
  nearbyPeers: LocalPeer[];
  startScanningNearby: () => void;
  stopScanningNearby: () => void;
  startLocalSync: () => Promise<void>;
  joinLocalSync: (peer: LocalPeer) => void;
  leaveLocalSync: () => void;
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
  // True for the full duration of a genuine track switch (resolve raw url,
  // reset, rebuild queue, skip, play) — every play-button UI in the app
  // should show a real spinner during this window instead of guessing from
  // playState, which otherwise bounces None/Ready/Buffering/Playing fast
  // enough to look like the button flickering between play and pause.
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [syncSession, setSyncSession] = useState<SyncSessionState>(null);
  const [sessionMembers, setSessionMembers] = useState<SyncSessionMember[]>([]);
  const [localSync, setLocalSync] = useState<LocalSyncRole>(null);
  const [nearbyPeers, setNearbyPeers] = useState<LocalPeer[]>([]);
  // Last-write-wins snapshot, read by the push/apply functions below — kept
  // in a ref (not state) since it's write-only bookkeeping, never rendered.
  const lastPushAtRef = useRef(0);
  const localHostRef = useRef<LocalSyncHost | null>(null);
  const localConnectionRef = useRef<PeerConnection | null>(null);
  const discoveryStopRef = useRef<(() => void) | null>(null);
  // Bidirectional sync means applying a remote frame calls TrackPlayer.play/
  // pause/seek locally, which fires the same native events the push-on-
  // action handlers below listen to — without this guard, applying a remote
  // update would immediately push it right back out, and the other
  // device(s) would do the same, forever.
  const applyingRemoteRef = useRef(false);
  // Every TrackPlayer queue mutation (reset+add+skip+play) must be atomic
  // relative to every OTHER one. nextActionOverrider/previousActionOverrider
  // fire on their own from native events (PlaybackQueueEnded, the near-end
  // progress check, remote buttons) with no awareness of whatever a screen
  // like feed.tsx is doing with its own track list at that exact moment.
  // Without one shared lock here, an event-driven call could run its own
  // reset()+add()+skip() while feed.tsx's reset()+addTracks()+
  // playurlOverrider() sequence is only half done, corrupting the native
  // queue and exposing ExoPlayer to a still-raw (never url-resolved) token —
  // the exact FileDataSourceException/ENOENT this was chasing. A per-screen
  // mutex (feed.tsx's own playChainRef) only serializes that screen against
  // itself, not against this context's own event-driven callers, so the
  // lock has to live here instead.
  const playerLockRef = useRef<Promise<unknown>>(Promise.resolve());
  const withPlayerLock = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = playerLockRef.current.then(fn, fn);
    playerLockRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

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
  const addTracksInner = async (trackList: DriftTrackList, addAtIndex = -1) => {
    setIsTrackAddingCompleted(false);
    // Whichever track lands at native index 0 of an otherwise-empty queue
    // becomes RNTP's active track the instant TrackPlayer.add() resolves —
    // ExoPlayer starts preparing/buffering it immediately, well before
    // play() is ever called and before playurlOverrider gets a chance to
    // resolve+swap in a real stream URL. A raw JioSaavn token isn't a URL
    // at all; ExoPlayer's DefaultDataSource falls back to treating it as a
    // local file path and throws FileDataSourceException (ENOENT) almost
    // immediately. Resolving eagerly only for this one slot (not the rest
    // of a bulk album/playlist add, which stays raw until actually about
    // to play) keeps ExoPlayer from ever seeing a non-url string.
    const queueWasEmpty = (await TrackPlayer.getQueue()).length === 0;
    for (const [i, item] of trackList.items.entries()) {
      let playUrl = item.playUrl;
      if (queueWasEmpty && i === 0 && !playUrl.includes("https://")) {
        playUrl = await serviceProvider.playByMediaUrl(playUrl, await getStreamQuality());
      }
      const reparsedItem: Track = {
        id: item.id,
        url: playUrl,
        // Kept alongside `url` so it survives playurlOverrider resolving
        // `url` in place to a token'd CDN link — sync payloads must share
        // this raw form (see trackToSyncItem), never the resolved one.
        rawUrl: item.playUrl,
        title: decode(item.songName),
        artwork: item.songCover,
        artist: item.artistName || trackList.artistName || "",
        album: trackList.albumName ?? "",
        duration: item.duration,
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

  const addTracks = (trackList: DriftTrackList, addAtIndex = -1) =>
    withPlayerLock(() => addTracksInner(trackList, addAtIndex));

  const playurlOverriderInner = async (index: number) => {
    const trackPlayerQueue = await TrackPlayer.getQueue();
    const current = trackPlayerQueue[index];
    const activeTrack = await TrackPlayer.getActiveTrack();

    // Tapping the already-loaded track must resume it in place, not
    // reset+reload from 0. Two things both have to be true, not just one:
    // the native active track must match (not React's playingIndex, which
    // goes stale against a queue something else just reset — see below) AND
    // its url must already be a resolved https link. RNTP auto-promotes a
    // freshly add()-ed track to "active" the instant it's queued, before it
    // has ever been played — so id-matching alone let a brand-new,
    // never-resolved raw-url track (e.g. feed.tsx's TrackPlayer.reset()+
    // addTracks right before calling playurlOverrider(0)) take this
    // shortcut and skip resolution entirely. ExoPlayer then tried to open
    // the raw JioSaavn token as a literal local file path and failed
    // (FileDataSourceException: ENOENT) — silent "stuck at 0:00" with no
    // error surfaced to the UI. Requiring the url to already be https
    // guarantees a never-resolved track always goes through the full
    // resolve+reset+add+skip+play path below.
    if (
      current &&
      activeTrack &&
      String(activeTrack.id) === current.id &&
      playState !== State.None &&
      current.url.toString().includes("https://")
    ) {
      await TrackPlayer.play();
      return;
    }

    setIsTrackLoading(true);
    try {
      // Skip detection, single chokepoint: every path that switches tracks
      // (next/previous, remote buttons, tapping a queue/album/playlist row,
      // a feed swipe) funnels through this function, so whichever track is
      // about to be replaced gets checked here. A track that hadn't basically
      // finished (>5s left) counts as a deliberate skip — natural
      // end-of-track also reaches here via nextActionOverrider, but by then
      // position is already within 5s of duration, so it's excluded by the
      // same guard without needing a separate "was this manual" flag.
      if (activeTrack && current && String(activeTrack.id) !== current.id) {
        const abandonedProgress = await TrackPlayer.getProgress();
        if (abandonedProgress.duration > 0 && abandonedProgress.duration - abandonedProgress.position > 5) {
          const abandonedArtist = activeTrack.artist as string | undefined;
          logPlayEvent({
            trackId: String(activeTrack.id),
            kind: "skip",
            ...(abandonedArtist ? { meta: { artist: abandonedArtist } } : {}),
          });
        }
      }

      if (current && !current.url.toString().includes("https://")) {
        current.url = await serviceProvider.playByMediaUrl(current.url as string, await getStreamQuality());
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

      pushSyncState(index);
      pushLocalSyncState(index);
    } finally {
      setIsTrackLoading(false);
    }
  };

  const playurlOverrider = (index: number) => withPlayerLock(() => playurlOverriderInner(index));

  // Feed-style "replace the whole queue with one track and play it" as a
  // single atomic op under the shared lock above — feed.tsx previously ran
  // this as three separate top-level calls (reset, addTracks, playurlOverrider),
  // each only locked individually, leaving gaps between them where a
  // nextActionOverrider/previousActionOverrider firing from a native event
  // could interleave its own reset()+add()+skip() in the middle.
  const playSingleTrack = (trackList: DriftTrackList) =>
    withPlayerLock(async () => {
      await TrackPlayer.reset();
      await addTracksInner(trackList);
      await playurlOverriderInner(0);
    });

  const trackToSyncItem = (track: Track): SyncQueueItem => ({
    id: String(track.id),
    // Always the raw (unresolved) url, never `track.url` — once a track has
    // been played locally, `url` is a JioSaavn auth-token'd CDN link with a
    // short TTL. Sharing that verbatim goes stale by the time a member joins
    // or by the host's next sync tick, which is why members previously got
    // a track that silently failed to play. Each device resolves its own
    // fresh token from the raw url right before playing it (applyRemoteState).
    playUrl: (track.rawUrl as string | undefined) ?? (track.url as string),
    songName: (track.title as string) ?? "",
    ...(track.artwork ? { songCover: track.artwork as string } : {}),
    ...(track.artist ? { artistName: track.artist as string } : {}),
    duration: track.duration ?? 0,
  });

  /** Snapshot of the local player's current queue/transport-state, shared by both sync transports. */
  const captureState = async (indexOverride?: number): Promise<RemoteSyncFrame> => {
    const queue = await TrackPlayer.getQueue();
    const progress = await TrackPlayer.getProgress();
    const { state } = await TrackPlayer.getPlaybackState();
    return {
      queue: queue.map(trackToSyncItem),
      current_index: indexOverride ?? playingIndex,
      is_playing: state === State.Playing || state === State.Buffering || state === State.Loading,
      position_seconds: progress.position,
    };
  };

  /**
   * Bidirectional: pushes the local queue/transport-state to drift_sessions
   * so every other participant (host or member) mirrors it — any of them
   * can be the one who just changed something. Fired on track change,
   * play/pause, and a throttled tick off the existing progress-update
   * handler below — not on every seek individually (there's no reliable
   * per-seek RNTP event), so drift beyond ~2s is corrected opportunistically
   * by the next tick/apply. Skipped while applying someone else's update
   * (applyingRemoteRef) so devices don't just echo state back and forth.
   */
  const pushSyncState = async (indexOverride?: number) => {
    if (!syncSession || applyingRemoteRef.current) return;
    await updateSession(syncSession.id, await captureState(indexOverride));
  };

  /** Same as pushSyncState but over the local-WiFi TCP transport instead of Supabase. */
  const pushLocalSyncState = async (indexOverride?: number) => {
    if (!localSync || applyingRemoteRef.current) return;
    const frame = { ...(await captureState(indexOverride)), updated_at: new Date().toISOString() };
    if (localSync.isHost) {
      localHostRef.current?.broadcast(frame);
    } else {
      localConnectionRef.current?.send(frame);
    }
  };

  /**
   * Mirrors a remote queue/transport-state frame (from either transport —
   * Supabase row or local-WiFi frame, same shape) onto the local player.
   * Runs on host and members alike now that sync is bidirectional. Skips
   * the reset+add churn when the queue hasn't actually changed (track-level
   * id comparison), and only seeks when drift exceeds 2s to avoid fighting
   * normal playback ticks.
   */
  const applyRemoteState = async (row: IncomingSyncFrame) => {
    applyingRemoteRef.current = true;
    try {
      await applyRemoteStateInner(row);
    } finally {
      // applyRemoteStateInner's own TrackPlayer.play()/pause()/skip() calls
      // fire native PlaybackState/PlaybackProgressUpdated events whose JS
      // listeners land on a later bridge tick than the awaited promise here
      // resolves — clearing the guard synchronously left a window where
      // those listeners saw applyingRemoteRef already false and pushed the
      // just-applied frame right back out, which the other device then
      // re-applied and re-pushed: the "press next, it loops forever" bug.
      // Hold the guard a beat past the last await so those trailing events
      // land while it's still true.
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 500);
    }
  };

  const applyRemoteStateInner = async (row: IncomingSyncFrame) => {
    const localQueue = await TrackPlayer.getQueue();
    const localIds = localQueue.map((t) => String(t.id));
    const remoteIds = row.queue.map((t) => t.id);
    const queueChanged =
      localIds.length !== remoteIds.length || localIds.some((id, i) => id !== remoteIds[i]);
    const indexChanged = row.current_index !== playingIndex;

    if (queueChanged || indexChanged) {
      // row.queue carries raw (unresolved) urls (see trackToSyncItem) — a
      // resolved one would be a JioSaavn auth token that's either already
      // stale (host resolved it a while ago) or about to expire, which is
      // why members previously joined/synced into a track that never
      // actually played. Resolve a fresh token for THIS device right before
      // it becomes current, same as playurlOverrider does for local plays.
      const items = row.queue.map((item) => ({ ...item, songCover: item.songCover ?? "" }));
      const current = items[row.current_index];
      if (current && !current.playUrl.includes("https://")) {
        current.playUrl = await serviceProvider.playByMediaUrl(current.playUrl, await getStreamQuality());
      }
      await TrackPlayer.reset();
      await addTracks({ items });
      await TrackPlayer.skip(row.current_index);
      setPlayingIndex(row.current_index);
    }

    // row.position_seconds is a snapshot from whenever the sender captured
    // it, not "now" — by the time it crosses a realtime round-trip (or sits
    // behind the 5s host-tick throttle), the sender has kept playing past
    // it. Comparing a member's live position against that stale snapshot
    // made every single tick look like >2s drift, so the member seeked
    // backward on a sawtooth every ~5s ("moves 5 seconds every 5 seconds").
    // Project the snapshot forward by how long it's been in flight first.
    const elapsed = row.is_playing ? Math.max(0, (Date.now() - new Date(row.updated_at).getTime()) / 1000) : 0;
    const expectedPosition = row.position_seconds + elapsed;
    const progress = await TrackPlayer.getProgress();
    // Was a 2s threshold — visible drift complaints turned out to be this
    // tolerating up to 2 full seconds of mismatch before ever correcting.
    // 250ms is close to the smallest gap worth chasing: two independent
    // devices decoding/outputting their own audio always differ by some
    // irreducible amount (buffer + output-latency differences per device),
    // so literal zero drift isn't achievable over this network-push
    // transport — this just stops tolerating multi-second gaps.
    if (Math.abs(progress.position - expectedPosition) > 0.25) {
      await TrackPlayer.seekTo(expectedPosition);
    }

    if (row.is_playing) {
      await TrackPlayer.play();
    } else {
      await TrackPlayer.pause();
    }
  };

  const startSyncSession = async () => {
    const frame = await captureState();
    if (frame.queue.length === 0) throw new Error("Play something first");
    const session = await createSession(
      frame.queue,
      frame.current_index,
      frame.is_playing,
      frame.position_seconds,
    );
    setSyncSession({ id: session.id, isHost: true });
    setSessionMembers([]);
    return session.id;
  };

  const joinSyncSession = async (sessionId: string) => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const displayName = data.session?.user?.email?.split("@")[0] ?? null;
    const session = await joinSession(sessionId, displayName);
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
    setSessionMembers([]);
  };

  /**
   * Local-WiFi sync ("Sync nearby", phase 7b) — separate from the Supabase
   * sessions above, see src/lib/localSync.ts. Host runs a TCP server
   * advertised over mDNS; members browse/connect directly, no internet.
   */
  const startLocalSync = async () => {
    const frame = await captureState();
    if (frame.queue.length === 0) throw new Error("Play something first");
    // Guard against leaking a previous host's TCP server + mDNS publish —
    // without this, a double-tap/double-call race overwrites the ref before
    // the old host is ever stopped, and once overwritten there's no way to
    // reach it again to tear it down (orphaned service keeps answering).
    localHostRef.current?.stop();
    const host = new LocalSyncHost();
    // onMemberState: bidirectional — a member pushed a change, apply it to
    // the host's own player too (the host relaying bytes without applying
    // them locally would leave the host's own playback out of sync).
    await host.start({ ...frame, updated_at: new Date().toISOString() }, (state) =>
      latestApplyRemoteStateRef.current(state),
    );
    localHostRef.current = host;
    setLocalSync({ isHost: true });
  };

  const joinLocalSync = (peer: LocalPeer) => {
    localConnectionRef.current?.disconnect();
    localConnectionRef.current = connectToPeer(
      peer,
      (state) => latestApplyRemoteStateRef.current(state),
      () => setLocalSync(null),
    );
    setLocalSync({ isHost: false, peer });
  };

  const leaveLocalSync = () => {
    localHostRef.current?.stop();
    localHostRef.current = null;
    localConnectionRef.current?.disconnect();
    localConnectionRef.current = null;
    setLocalSync(null);
  };

  const startScanningNearby = () => {
    discoveryStopRef.current?.();
    setNearbyPeers([]);
    discoveryStopRef.current = discoverPeers(
      (peer) => setNearbyPeers((prev) => (prev.some((p) => p.name === peer.name) ? prev : [...prev, peer])),
      (name) => setNearbyPeers((prev) => prev.filter((p) => p.name !== name)),
    );
  };

  const stopScanningNearby = () => {
    discoveryStopRef.current?.();
    discoveryStopRef.current = null;
    setNearbyPeers([]);
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

  // Bidirectional: host also subscribes now, to pick up changes a member
  // pushed (applyingRemoteRef, set while this runs, stops it looping back).
  useEffect(() => {
    if (!syncSession) return;
    const unsubscribe = subscribeToSession(
      syncSession.id,
      (row) => latestApplyRemoteStateRef.current(row),
      () => setSyncSession(null),
    );
    return unsubscribe;
  }, [syncSession?.id, syncSession?.isHost]);

  // "Who's connected" (host-only — drift_session_members RLS only lets the
  // host read every member row for their session, see supabase/schema.sql).
  useEffect(() => {
    if (!syncSession?.isHost) return;
    const sessionId = syncSession.id;
    const refresh = () => {
      getSessionMembers(sessionId).then(setSessionMembers);
    };
    refresh();
    const unsubscribe = subscribeToSessionMembers(sessionId, refresh);
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
    // Was a 5s throttle — correction only ever landed once every 5 ticks,
    // so drift was free to grow for up to 5s between pushes. Progress ticks
    // already fire every 1s (see progressUpdateEventInterval in
    // setupPlayer.ts), so push on every one of them instead.
    if ((syncSession || localSync) && Date.now() - lastPushAtRef.current > 1000) {
      lastPushAtRef.current = Date.now();
      pushSyncState();
      pushLocalSyncState();
    }
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Paused) return;
    // duration is 0 until the track's metadata actually loads (right at the
    // start of buffering) — without the >0 guard, 0 - 0 < 5 reads as "about
    // to end" and auto-skips every track within moments of it starting,
    // cascading through the whole queue before anything ever plays.
    if (event.duration > 0 && event.duration - event.position < 5) {
      await nextActionOverrider();
    }
  });

  // Manual play/pause taps happen via TrackPlayer.play()/pause() called
  // directly from FloatingMusicIsland/PlayerSeekBar/album screens (not
  // through this context), so the progress-tick push above would lag by up
  // to 5s — push immediately on the actual state transition instead.
  useTrackPlayerEvents([Event.PlaybackState], () => {
    pushSyncState();
    pushLocalSyncState();
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
        isTrackLoading,
        formatTime,
        setOnShuffle,
        addTracks,
        playSingleTrack,
        playurlOverrider,
        nextActionOverrider,
        previousActionOverrider,
        syncSession,
        sessionMembers,
        startSyncSession,
        joinSyncSession,
        leaveSyncSession,
        localSync,
        nearbyPeers,
        startScanningNearby,
        stopScanningNearby,
        startLocalSync,
        joinLocalSync,
        leaveLocalSync,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
