import { useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { Play, Pause, SkipBack, SkipForward, Repeat } from "@tamagui/lucide-icons";
import { decode } from "html-entities";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from "react-native-reanimated";
import { PlayerSeekBar } from "@components/player/PlayerSeekBar";
import { trimExcessLines } from "@lib/text";
import { tokens } from "@theme/tokens";

/** decode()s HTML entities then collapses stray blank-line runs. */
function clean(text: string): string {
  return trimExcessLines(decode(text));
}

const LYRICS_LINE_HEIGHT = 34;
const LYRICS_PANEL_HEIGHT_RATIO = 0.46;

/**
 * Manual-scroll lyrics, no timestamp sync — whichever line sits nearest the
 * panel's vertical center is the "active" one, picker-wheel style. Top/bottom
 * padding of half the panel height lets the first/last lines reach center too.
 */
function LyricsScroller({ text, panelHeight }: { text: string; panelHeight: number }) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const padding = panelHeight / 2 - LYRICS_LINE_HEIGHT / 2;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / LYRICS_LINE_HEIGHT);
    const clamped = Math.max(0, Math.min(lines.length - 1, index));
    if (clamped !== activeIndex) setActiveIndex(clamped);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      contentContainerStyle={{ paddingVertical: Math.max(padding, 0) }}
    >
      {lines.map((line, i) => (
        <Text
          key={i}
          fontFamily="body"
          textAlign="center"
          paddingHorizontal={20}
          height={LYRICS_LINE_HEIGHT}
          lineHeight={LYRICS_LINE_HEIGHT}
          fontSize={i === activeIndex ? "7" : "4"}
          fontWeight={i === activeIndex ? "700" : "500"}
          color={i === activeIndex ? tokens.color.white.val : tokens.color.gray600.val}
        >
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

type FeedSong = {
  id: string;
  song: string;
  image: string;
  duration: string;
  primary_artists?: string;
  primary_artists_id?: string;
  featured_artists?: string;
  featured_artists_id?: string;
  artistMap?: Record<string, string>;
  album?: string;
  albumid?: string;
};

/** Splits a comma-separated artist-name string into trimmed, non-empty names. */
function splitArtistNames(names?: string): string[] {
  return (names ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

type Props = {
  item: FeedSong;
  source: ImageSourcePropType;
  cardHeight: number;
  isActive: boolean;
  playlistArtist: string;
  isPlaying: boolean;
  isLoading: boolean;
  progress: { position: number; duration: number };
  formatTime: (seconds: number) => string;
  onTogglePlayback: () => void;
  onSkip: (delta: 1 | -1) => void;
  onRepeat: boolean;
  onToggleRepeat: () => void;
  lyricsVisible: boolean;
  onToggleLyrics: () => void;
  lyricsLoading: boolean;
  lyricsText: string | null;
  onArtistPress: (artistId: string, name: string) => void;
  onAlbumPress: (albumId: string, name: string) => void;
  onSongInfoPress: (song: FeedSong) => void;
};

/**
 * One full-bleed feed card. Image fades in on load instead of popping in —
 * the surrounding dark background (not a flash of white/blank) is the
 * placeholder, so a slow network just shows dark-then-art, never a jarring
 * blank frame.
 */
export function FeedCard({
  item,
  source,
  cardHeight,
  isActive,
  playlistArtist,
  isPlaying,
  isLoading,
  progress,
  formatTime,
  onTogglePlayback,
  onSkip,
  onRepeat,
  onToggleRepeat,
  lyricsVisible,
  lyricsLoading,
  lyricsText,
  onArtistPress,
  onAlbumPress,
  onSongInfoPress,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // Lyrics panel's bottom edge sits just above the pill (which itself is
  // bottom-aligned near the card's edge) instead of at a fixed fraction of
  // card height — the pill's own height varies (expanded state, long
  // titles), so a fixed offset used to overlap it. Measured via onLayout on
  // the bottom content block and the pill itself, both relative to the same
  // ImageBackground the lyrics panel is absolutely positioned against.
  const [contentTop, setContentTop] = useState(0);
  const [pillTop, setPillTop] = useState(0);

  // Multiple credited artists (primary + featured) each link to their own
  // artist page — artistMap (name -> id, present on real feed song payloads)
  // covers most cases; the primary/featured _id fields are a fallback for
  // the single-name-each common case when artistMap is missing for some reason.
  const artistNames = [...splitArtistNames(item.primary_artists), ...splitArtistNames(item.featured_artists)];
  const artistParts =
    artistNames.length > 0
      ? artistNames.map((name) => ({
          name,
          id:
            item.artistMap?.[name] ||
            (item.primary_artists === name ? item.primary_artists_id : undefined) ||
            (item.featured_artists === name ? item.featured_artists_id : undefined),
        }))
      : [{ name: playlistArtist || "Unknown Artist", id: undefined as string | undefined }];

  return (
    <View height={cardHeight} width="100%" backgroundColor={tokens.color.surfaceDark2.val}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <ImageBackground
          source={source}
          resizeMode="cover"
          onLoadEnd={() => {
            setLoaded(true);
            // eslint-disable-next-line react-hooks/immutability -- reanimated shared-value mutation is the correct API here, not a React state write (same pattern as PlayerSeekBar/FloatingMusicIsland)
            opacity.value = withTiming(1, { duration: 220 });
          }}
          style={{ height: cardHeight, width: "100%", justifyContent: "flex-end" }}
        >
          <YStack padding={24} paddingBottom={60} gap={12} onLayout={(e) => setContentTop(e.nativeEvent.layout.y)}>
            {/* Pill stretches full-width regardless of content — tapping its
                own background toggles `expanded` (full names, extra line);
                tapping the title/artist text opens the matching info modal
                instead, since nested onPress wins the touch over the parent.
                Re-fades in on every card change via `key`. */}
            <Animated.View
              key={item.id}
              entering={FadeIn.duration(280)}
              style={{ alignSelf: "stretch" }}
              onLayout={(e) => setPillTop(e.nativeEvent.layout.y)}
            >
              <YStack
                onPress={() => setExpanded((e) => !e)}
                backgroundColor="rgba(0,0,0,0.72)"
                borderRadius={14}
                paddingHorizontal={14}
                paddingVertical={10}
                gap={4}
              >
                <Text
                  fontFamily="heading"
                  fontSize="9"
                  color={tokens.color.white.val}
                  flexShrink={1}
                  onPress={() => onSongInfoPress(item)}
                  {...(expanded ? {} : { numberOfLines: 2 })}
                >
                  {clean(item.song)}
                </Text>
                <XStack alignItems="center" gap={8} maxWidth="100%">
                  <Text
                    fontFamily="body"
                    fontSize="4"
                    color={tokens.color.white.val}
                    flexShrink={1}
                    {...(expanded ? {} : { numberOfLines: 1 })}
                  >
                    {artistParts.map((part, i) => (
                      <Text
                        key={`${part.name}-${i}`}
                        color={tokens.color.white.val}
                        onPress={part.id ? () => onArtistPress(part.id!, part.name) : undefined}
                      >
                        {part.name}
                        {i < artistParts.length - 1 ? ", " : ""}
                      </Text>
                    ))}
                  </Text>
                  {Number(item.duration) > 0 && (
                    <>
                      <Text fontFamily="body" fontSize="3" color={tokens.color.white.val} flexShrink={0}>
                        ·
                      </Text>
                      <Text fontFamily="numeric" fontSize="3" color={tokens.color.white.val} flexShrink={0}>
                        {formatTime(Number(item.duration))}
                      </Text>
                    </>
                  )}
                </XStack>
                {expanded && item.album && (
                  <Text
                    fontFamily="body"
                    fontSize="3"
                    color={tokens.color.white.val}
                    numberOfLines={2}
                    onPress={item.albumid ? () => onAlbumPress(item.albumid!, item.album ?? "") : undefined}
                  >
                    {clean(item.album)}
                  </Text>
                )}
              </YStack>
            </Animated.View>
            {isActive && (
              <YStack
                gap={14}
                marginTop={8}
                backgroundColor="rgba(0,0,0,0.6)"
                borderRadius={20}
                paddingHorizontal={16}
                paddingVertical={14}
              >
                <PlayerSeekBar
                  position={progress.position}
                  duration={progress.duration}
                  formatTime={formatTime}
                  fillColor={tokens.color.white.val}
                  trackColor={tokens.color.whiteTrackDim.val}
                  textColor={tokens.color.gray100.val}
                />
                <XStack alignItems="center" justifyContent="space-between">
                  <View onPress={onToggleRepeat}>
                    <Repeat color={onRepeat ? tokens.color.tealAccent.val : tokens.color.gray100.val} size={20} />
                  </View>
                  <XStack alignItems="center" gap={28}>
                    <View onPress={() => onSkip(-1)}>
                      <SkipBack color={tokens.color.white.val} size={26} />
                    </View>
                    <View
                      width={56}
                      height={56}
                      borderRadius={28}
                      alignItems="center"
                      justifyContent="center"
                      backgroundColor={tokens.color.white.val}
                      onPress={isLoading ? undefined : onTogglePlayback}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={tokens.color.black.val} />
                      ) : isPlaying ? (
                        <Pause color={tokens.color.black.val} size={24} fill={tokens.color.black.val} />
                      ) : (
                        <Play color={tokens.color.black.val} size={24} fill={tokens.color.black.val} />
                      )}
                    </View>
                    <View onPress={() => onSkip(1)}>
                      <SkipForward color={tokens.color.white.val} size={26} />
                    </View>
                  </XStack>
                  <View width={20} height={20} />
                </XStack>
              </YStack>
            )}
          </YStack>
          {isActive && lyricsVisible && (() => {
            const panelBottom = contentTop + pillTop - 12;
            const maxHeight = Math.max(panelBottom - 20, 120);
            const panelHeight = Math.min(cardHeight * LYRICS_PANEL_HEIGHT_RATIO, maxHeight);
            return (
            <YStack
              position="absolute"
              top={panelBottom - panelHeight}
              left={20}
              right={20}
              height={panelHeight}
              zIndex={5}
              backgroundColor="rgba(0,0,0,0.45)"
              borderRadius={20}
              overflow="hidden"
              style={{ elevation: 5 }}
            >
              {lyricsLoading ? (
                <View flex={1} alignItems="center" justifyContent="center">
                  <ActivityIndicator size="small" color={tokens.color.white.val} />
                </View>
              ) : lyricsText ? (
                <LyricsScroller text={lyricsText} panelHeight={panelHeight} />
              ) : (
                <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24}>
                  <Text fontFamily="body" fontSize="4" color={tokens.color.gray600.val} textAlign="center">
                    No lyrics available for this track.
                  </Text>
                </View>
              )}
            </YStack>
            );
          })()}
        </ImageBackground>
      </Animated.View>
      {!loaded && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <Text fontFamily="heading" fontSize="9" color={tokens.color.white.val} numberOfLines={2} textAlign="center" paddingHorizontal={40}>
            {clean(item.song)}
          </Text>
        </View>
      )}
    </View>
  );
}
