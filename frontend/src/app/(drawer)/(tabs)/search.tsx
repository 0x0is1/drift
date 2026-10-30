import { useEffect, useRef, useState } from "react";
import { FlatList, TextInput, ToastAndroid } from "react-native";
import { Text, View, XStack, Image, useTheme } from "tamagui";
import { Search as SearchIcon, ChevronLeft } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { decode } from "html-entities";
import useSWR from "swr";
import TrackPlayer from "react-native-track-player";
import { usePlayer } from "@contexts/PlayerContext";
import { serviceProvider } from "@lib/jiosaavn";
import { routes } from "@constants/routes";
import { Skeleton } from "@components/ui/Skeleton";

const SEARCH_DEBOUNCE_MS = 400;

type SearchResult = {
  id: string;
  title: string;
  image: string;
  more_info: {
    encrypted_media_url: string;
    duration: string;
    album?: string;
    artistMap?: { primary_artists?: { name: string }[] };
  };
};

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addTracks, playurlOverrider } = usePlayer();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Debounced auto-search as the user types, instead of waiting on the
  // keyboard's search button — a fresh timer per keystroke so only the
  // settled query actually commits and fires a request. SWR then caches by
  // that committed term, so re-typing something already searched this
  // session resolves instantly instead of re-hitting the API.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  const { data, isLoading: loading } = useSWR(
    debouncedQuery ? ["search", debouncedQuery] : null,
    ([, term]) => serviceProvider.getSearch(term, 1, 1),
  );
  const results: SearchResult[] = data?.results ?? [];

  const runSearch = () => setDebouncedQuery(query.trim());

  const playResult = async (song: SearchResult) => {
    setPlayingId(song.id);
    try {
      await TrackPlayer.reset();
      await addTracks({
        items: [
          {
            id: song.id,
            playUrl: song.more_info.encrypted_media_url,
            songName: decode(song.title),
            songCover: song.image.replace("150x150", "500x500"),
            artistName: song.more_info.artistMap?.primary_artists?.[0]?.name ?? "",
            duration: Number(song.more_info.duration),
          },
        ],
        albumName: decode(song.more_info.album ?? ""),
      });
      await playurlOverrider(0);
    } catch {
      ToastAndroid.show("Couldn't play that track", ToastAndroid.SHORT);
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <View flex={1} backgroundColor="$background">
      <XStack
        alignItems="center"
        gap={12}
        paddingHorizontal={24}
        paddingTop={insets.top + 16}
        paddingBottom={12}
      >
        <View
          width={40}
          height={40}
          marginLeft={-8}
          alignItems="center"
          justifyContent="center"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.home as any))}
        >
          <ChevronLeft color={theme.color?.val as string} size={22} />
        </View>
        <XStack
          flex={1}
          alignItems="center"
          gap={10}
          backgroundColor="$backgroundHover"
          borderRadius={14}
          paddingHorizontal={14}
          height={48}
        >
          <SearchIcon size={18} color={theme.colorSecondary?.val as string} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            placeholder="Search songs, artists, albums"
            placeholderTextColor={theme.colorSecondary?.val as string}
            style={{ flex: 1, color: theme.color?.val as string, fontFamily: "Rajdhani_500Medium", fontSize: 15 }}
          />
        </XStack>
      </XStack>
      {loading ? (
        <View paddingHorizontal={24} gap={16}>
          {Array.from({ length: 8 }).map((_, i) => (
            <XStack key={i} alignItems="center" gap={12}>
              <Skeleton width={48} height={48} borderRadius={10} />
              <View flex={1} gap={6}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={11} />
              </View>
            </XStack>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140, gap: 4 }}
          ListEmptyComponent={
            <View alignItems="center" justifyContent="center" paddingTop={80}>
              <Text fontFamily="body" fontSize="4" color="$colorSecondary">
                {query ? "No results" : "Search for something to play"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <XStack
              alignItems="center"
              gap={12}
              paddingVertical={10}
              onPress={() => playResult(item)}
              opacity={playingId === item.id ? 0.6 : 1}
            >
              <Image source={{ uri: item.image.replace("150x150", "500x500") }} width={48} height={48} borderRadius={10} backgroundColor="$backgroundHover" />
              <View flex={1}>
                <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color" numberOfLines={1}>
                  {decode(item.title)}
                </Text>
                <Text fontFamily="body" fontSize="3" color="$colorSecondary" numberOfLines={1}>
                  {item.more_info.artistMap?.primary_artists?.map((a) => a.name).join(", ") || "Unknown Artist"}
                </Text>
              </View>
            </XStack>
          )}
        />
      )}
    </View>
  );
}
