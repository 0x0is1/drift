import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Text, View, XStack, YStack, Image } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import { decode } from "html-entities";
import useSWR from "swr";
import { useRouter } from "expo-router";
import { serviceProvider } from "@lib/jiosaavn";
import { fetchCollection } from "@lib/collectionParser";
import { flattenText } from "@lib/text";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

/** decode()s HTML entities then strips every line break entirely — the combo used on every API text field in this file. */
function clean(text?: string | null): string {
  return text ? flattenText(decode(text)) : "";
}

/**
 * Shared bottom-sheet-style shell — tapping the dimmed backdrop above the
 * sheet closes it. Header (image + title) is shown immediately, independent
 * of the body's own loading state, so the sheet never opens blank.
 */
function ModalShell({
  title,
  image,
  onClose,
  children,
}: {
  title?: string | undefined;
  image?: string | undefined;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <View position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="flex-end" zIndex="modal">
      <View position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.78)" onPress={onClose} />
      <YStack
        backgroundColor={tokens.color.surfaceDark1.val}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        maxHeight="78%"
        paddingTop={14}
        paddingBottom={32}
        paddingHorizontal={20}
      >
        <XStack alignItems="center" gap={12} marginBottom={16}>
          {image ? (
            <Image source={{ uri: image.replace("150x150", "500x500") }} width={48} height={48} borderRadius={10} />
          ) : (
            <View width={48} height={48} borderRadius={10} backgroundColor="rgba(255,255,255,0.08)" />
          )}
          <Text flex={1} fontFamily="heading" fontSize="7" color={tokens.color.white.val} numberOfLines={2}>
            {title ?? ""}
          </Text>
          <View
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
            backgroundColor="rgba(255,255,255,0.08)"
            onPress={onClose}
          >
            <X color={tokens.color.white.val} size={18} />
          </View>
        </XStack>
        {children}
      </YStack>
    </View>
  );
}

export function ArtistInfoModal({
  artistId,
  initialName,
  onClose,
}: {
  artistId: string;
  initialName?: string;
  onClose: () => void;
}) {
  const { data, error, isLoading } = useSWR(["artist-info", artistId], () => serviceProvider.getArtist(artistId, 10));
  const [bioExpanded, setBioExpanded] = useState(false);

  let bio: string | null = null;
  if (data?.bio) {
    try {
      const parsed = JSON.parse(data.bio);
      bio = Array.isArray(parsed)
        ? flattenText(decode(parsed.map((p: { text?: string }) => p.text).filter(Boolean).join(" ")))
        : null;
    } catch {
      bio = null;
    }
  }

  return (
    <ModalShell
      title={data?.name ? clean(data.name) : initialName}
      image={data?.image}
      onClose={onClose}
    >
      {isLoading ? (
        <View height={180} alignItems="center" justifyContent="center">
          <ActivityIndicator size="small" color={tokens.color.white.val} />
        </View>
      ) : error || !data ? (
        <Text fontFamily="body" fontSize="5" color="$colorSecondary">
          Couldn&apos;t load artist info.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {data.follower_count ? (
            <Text fontFamily="body" fontSize="4" color={tokens.color.gray600.val} marginBottom={12}>
              {Number(data.follower_count).toLocaleString()} followers
            </Text>
          ) : null}
          {bio && (
            <YStack marginBottom={20} onPress={() => setBioExpanded((e) => !e)}>
              <Text
                fontFamily="body"
                fontSize="4"
                color={tokens.color.gray100.val}
                {...(bioExpanded ? {} : { numberOfLines: 6 })}
              >
                {bio}
              </Text>
              <Text fontFamily="body" fontWeight="700" fontSize="4" color={tokens.color.tealAccent.val} marginTop={6}>
                {bioExpanded ? "Show less" : "Show more"}
              </Text>
            </YStack>
          )}
          {(data.topSongs ?? []).length > 0 && (
            <YStack gap={12}>
              <Text fontFamily="heading" fontSize="6" color={tokens.color.white.val}>
                Top Songs
              </Text>
              {data.topSongs.slice(0, 10).map((s: { id: string; song: string; image: string }) => (
                <XStack key={s.id} alignItems="center" gap={10}>
                  <Image source={{ uri: s.image }} width={40} height={40} borderRadius={6} />
                  <Text flex={1} fontFamily="body" fontSize="4" color={tokens.color.gray100.val} numberOfLines={1}>
                    {clean(s.song)}
                  </Text>
                </XStack>
              ))}
            </YStack>
          )}
        </ScrollView>
      )}
    </ModalShell>
  );
}

export function AlbumInfoModal({
  albumId,
  initialName,
  onClose,
}: {
  albumId: string;
  initialName?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(["album-info", albumId], () => fetchCollection("album", albumId));

  return (
    <ModalShell
      title={data?.title ? clean(data.title) : initialName}
      image={data?.image}
      onClose={onClose}
    >
      {isLoading ? (
        <View height={180} alignItems="center" justifyContent="center">
          <ActivityIndicator size="small" color={tokens.color.white.val} />
        </View>
      ) : error || !data ? (
        <Text fontFamily="body" fontSize="5" color="$colorSecondary">
          Couldn&apos;t load album info.
        </Text>
      ) : (
        <>
          <Text fontFamily="body" fontSize="4" color={tokens.color.gray600.val} numberOfLines={1} marginBottom={16}>
            {clean(data.subtitle)} · {data.list.length} songs
          </Text>
          <View
            alignSelf="flex-start"
            backgroundColor={tokens.color.tealAccent.val}
            borderRadius={20}
            paddingHorizontal={20}
            paddingVertical={10}
            marginBottom={16}
            onPress={() => {
              onClose();
              router.push(routes.album(albumId) as any);
            }}
          >
            <Text fontFamily="body" fontWeight="700" fontSize="4" color={tokens.color.black.val}>
              Open Album
            </Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap={12}>
              {data.list.map((s, i) => (
                <XStack key={s.id} alignItems="center" gap={10}>
                  <Text fontFamily="numeric" fontSize="4" color={tokens.color.gray600.val} width={20}>
                    {i + 1}
                  </Text>
                  <Text flex={1} fontFamily="body" fontSize="4" color={tokens.color.gray100.val} numberOfLines={1}>
                    {clean(s.title)}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </ScrollView>
        </>
      )}
    </ModalShell>
  );
}

export type SongInfo = {
  id: string;
  song: string;
  image: string;
  album?: string | undefined;
  primary_artists?: string | undefined;
  year?: string | undefined;
  label?: string | undefined;
  language?: string | undefined;
  release_date?: string | undefined;
  play_count?: string | undefined;
};

export function SongInfoModal({ song, onClose }: { song: SongInfo; onClose: () => void }) {
  const rows: [string, string | undefined][] = [
    ["Album", song.album ? clean(song.album) : undefined],
    ["Artist(s)", song.primary_artists ? clean(song.primary_artists) : undefined],
    ["Year", song.year],
    ["Label", song.label ? clean(song.label) : undefined],
    ["Language", song.language ? song.language.charAt(0).toUpperCase() + song.language.slice(1) : undefined],
    ["Released", song.release_date],
    ["Plays", song.play_count ? Number(song.play_count).toLocaleString() : undefined],
  ];

  return (
    <ModalShell title={clean(song.song)} image={song.image} onClose={onClose}>
      <YStack gap={10}>
        {rows
          .filter(([, v]) => !!v)
          .map(([label, value]) => (
            <XStack key={label} justifyContent="space-between" gap={12}>
              <Text fontFamily="body" fontSize="4" color={tokens.color.gray600.val}>
                {label}
              </Text>
              <Text fontFamily="body" fontSize="4" color={tokens.color.gray100.val} flex={1} textAlign="right" numberOfLines={2}>
                {value}
              </Text>
            </XStack>
          ))}
      </YStack>
    </ModalShell>
  );
}
