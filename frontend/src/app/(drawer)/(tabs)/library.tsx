import { useState } from "react";
import { ScrollView, TextInput, ToastAndroid } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { Heart, Download, ListMusic, Plus } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { usePlayer } from "@contexts/PlayerContext";
import { listPlaylists, createPlaylist } from "@lib/playlists";
import { getDownloadsIndex } from "@lib/downloads";
import { routes } from "@constants/routes";

function EmptySection({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <View
      backgroundColor="$backgroundHover"
      borderRadius={16}
      padding={20}
      alignItems="center"
      gap={8}
      onPress={() => ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT)}
    >
      {icon}
      <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
        {title}
      </Text>
      <Text fontFamily="body" fontSize="3" color="$colorSecondary" textAlign="center">
        {message}
      </Text>
    </View>
  );
}

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { likedList } = usePlayer();
  const likedCount = Object.values(likedList).filter(Boolean).length;
  const { data: playlists, mutate: mutatePlaylists } = useSWR("playlists", listPlaylists);
  const { data: downloads } = useSWR("downloads", getDownloadsIndex);
  const downloadsCount = downloads?.length ?? 0;
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      const playlist = await createPlaylist(name);
      await mutatePlaylists();
      setNewPlaylistName("");
      setCreatingPlaylist(false);
      router.push(routes.playlist(playlist.id) as any);
    } catch {
      ToastAndroid.show("Couldn't create playlist", ToastAndroid.SHORT);
    }
  };

  return (
    <View flex={1} backgroundColor="$background">
      <Text fontFamily="heading" fontSize="8" color="$accent" letterSpacing={1.2} paddingHorizontal={24} paddingTop={16}>
        LIBRARY
      </Text>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 24 }}>
        <XStack
          alignItems="center"
          gap={12}
          backgroundColor="$backgroundHover"
          borderRadius={16}
          padding={16}
          onPress={() => router.push(routes.likedSongs as any)}
        >
          <View width={44} height={44} borderRadius={22} alignItems="center" justifyContent="center" backgroundColor="$accent">
            <Heart color={theme.background?.val as string} size={20} fill={theme.background?.val as string} />
          </View>
          <View flex={1}>
            <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
              Liked Songs
            </Text>
            <Text fontFamily="body" fontSize="3" color="$colorSecondary">
              {likedCount} tracks
            </Text>
          </View>
        </XStack>

        <View gap={12}>
          <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
            Downloaded
          </Text>
          {downloadsCount === 0 ? (
            <EmptySection
              icon={<Download color={theme.colorSecondary?.val as string} size={28} />}
              title="No downloads yet"
              message="Download songs from an album to listen offline."
            />
          ) : (
            <XStack
              alignItems="center"
              gap={12}
              backgroundColor="$backgroundHover"
              borderRadius={16}
              padding={16}
              onPress={() => router.push(routes.downloads as any)}
            >
              <View width={44} height={44} borderRadius={22} alignItems="center" justifyContent="center" backgroundColor="$backgroundHover">
                <Download color={theme.color?.val as string} size={20} />
              </View>
              <View flex={1}>
                <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
                  Downloaded
                </Text>
                <Text fontFamily="body" fontSize="3" color="$colorSecondary">
                  {downloadsCount} tracks
                </Text>
              </View>
            </XStack>
          )}
        </View>

        <View gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
              Playlists
            </Text>
            <View
              width={28}
              height={28}
              borderRadius={14}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$backgroundHover"
              onPress={() => setCreatingPlaylist((v) => !v)}
            >
              <Plus color={theme.color?.val as string} size={16} />
            </View>
          </XStack>

          {creatingPlaylist && (
            <XStack
              alignItems="center"
              gap={10}
              backgroundColor="$backgroundHover"
              borderRadius={14}
              paddingHorizontal={14}
              height={48}
            >
              <TextInput
                autoFocus
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                onSubmitEditing={handleCreatePlaylist}
                placeholder="Playlist name"
                placeholderTextColor={theme.colorSecondary?.val as string}
                style={{ flex: 1, color: theme.color?.val as string, fontFamily: "Rajdhani_500Medium", fontSize: 15 }}
              />
            </XStack>
          )}

          {(playlists?.length ?? 0) === 0 ? (
            <EmptySection
              icon={<ListMusic color={theme.colorSecondary?.val as string} size={28} />}
              title="No playlists yet"
              message="Tap + above to create one."
            />
          ) : (
            (playlists ?? []).map((playlist) => (
              <XStack
                key={playlist.id}
                alignItems="center"
                gap={12}
                backgroundColor="$backgroundHover"
                borderRadius={16}
                padding={16}
                onPress={() => router.push(routes.playlist(playlist.id) as any)}
              >
                <View width={44} height={44} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor="$background">
                  <ListMusic color={theme.colorSecondary?.val as string} size={20} />
                </View>
                <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color" flex={1} numberOfLines={1}>
                  {playlist.name}
                </Text>
              </XStack>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
