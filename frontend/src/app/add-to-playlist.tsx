import { useState } from "react";
import { FlatList, TextInput, ToastAndroid } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { Plus, ListMusic, X } from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import useSWR from "swr";
import { listPlaylists, createPlaylist, addTrackToPlaylist } from "@lib/playlists";

export default function AddToPlaylistScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { data: playlists, isLoading: loading, mutate } = useSWR("playlists", listPlaylists);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleAdd = async (playlistId: string) => {
    try {
      await addTrackToPlaylist(playlistId, trackId);
      ToastAndroid.show("Added to playlist", ToastAndroid.SHORT);
      router.back();
    } catch {
      ToastAndroid.show("Couldn't add to playlist", ToastAndroid.SHORT);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const playlist = await createPlaylist(name);
      await mutate();
      setNewName("");
      await handleAdd(playlist.id);
    } catch {
      ToastAndroid.show("Couldn't create playlist", ToastAndroid.SHORT);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View flex={1} backgroundColor="$background" paddingTop={16}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20} marginBottom={12}>
        <Text fontFamily="heading" fontSize="7" color="$color">
          Add to playlist
        </Text>
        <View width={32} height={32} alignItems="center" justifyContent="center" onPress={() => router.back()}>
          <X color={theme.color?.val as string} size={20} />
        </View>
      </XStack>

      <XStack
        paddingHorizontal={14}
        marginHorizontal={20}
        gap={10}
        marginBottom={16}
        alignItems="center"
        backgroundColor="$backgroundHover"
        borderRadius={14}
        height={48}
      >
        <TextInput
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleCreate}
          placeholder="New playlist name"
          placeholderTextColor={theme.colorSecondary?.val as string}
          style={{ flex: 1, color: theme.color?.val as string, fontFamily: "Rajdhani_500Medium", fontSize: 15 }}
        />
        <View
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$accent"
          opacity={newName.trim() && !creating ? 1 : 0.5}
          onPress={handleCreate}
        >
          <Plus color={theme.background?.val as string} size={20} />
        </View>
      </XStack>

      {!loading && (playlists?.length ?? 0) === 0 ? (
        <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={24} gap={8}>
          <ListMusic color={theme.colorSecondary?.val as string} size={28} />
          <Text fontFamily="body" fontSize="4" color="$colorSecondary" textAlign="center">
            No playlists yet — create one above.
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <XStack
              alignItems="center"
              gap={12}
              paddingVertical={12}
              paddingHorizontal={20}
              onPress={() => handleAdd(item.id)}
            >
              <View width={36} height={36} borderRadius={10} alignItems="center" justifyContent="center" backgroundColor="$backgroundHover">
                <ListMusic color={theme.colorSecondary?.val as string} size={18} />
              </View>
              <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color" flex={1} numberOfLines={1}>
                {item.name}
              </Text>
            </XStack>
          )}
        />
      )}
    </View>
  );
}
