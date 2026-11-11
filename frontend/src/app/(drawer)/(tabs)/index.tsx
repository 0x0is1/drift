import { useMemo, useEffect } from "react";
import { FlatList, ScrollView, ToastAndroid } from "react-native";
import { Text, View, Image } from "tamagui";
import { useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR from "swr";
import { HomeHeader } from "@components/home/HomeHeader";
import { HomeSkeleton } from "@components/home/HomeSkeleton";
import { routes } from "@constants/routes";
import { serviceProvider } from "@lib/jiosaavn";
import { useLanguages } from "@contexts/LanguageContext";

type ModuleItem = {
  id: string;
  title?: string;
  name?: string;
  image: string;
  type: string;
  perma_url?: string;
  artistid?: string;
  more_info?: any;
};

type Category = { id: string; title: string; data: ModuleItem[] };

const optimizeImage = (uri?: string) => {
  if (!uri) return "";
  return uri
    .replace(/^http:\/\//i, "https://")
    .replace("150x150", "500x500")
    .replace("50x50", "500x500");
};

export default function HomeScreen() {
  const router = useRouter();
  const { selectedLanguages, isOnboarded, isLoading: langLoading } = useLanguages();

  useEffect(() => {
    if (!langLoading && !isOnboarded) {
      router.replace(routes.onboarding as any);
    }
  }, [langLoading, isOnboarded, router]);

  const activeLangs = selectedLanguages.length > 0 ? selectedLanguages : ["hindi"];
  const swrKey = !langLoading && isOnboarded ? ["home-launch-data", ...activeLangs] : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    () => serviceProvider.getLaunchData(activeLangs),
  );

  const categories: Category[] = useMemo(() => {
    if (!data) return [];
    const next: Category[] = Object.keys(data.modules).map((key) => ({
      id: key,
      title: data.modules[key].title,
      data: ((data[data.modules[key].source] ?? []) as ModuleItem[]).filter((item) => item.image),
    }));
    return next.filter((category) => category.data.length > 0);
  }, [data]);
  const loading = isLoading;

  const openItem = (item: ModuleItem) => {
    const name = decode(item.title || item.name || "");
    switch (item.type) {
      case "album": {
        const token = item.perma_url?.split("/").filter(Boolean).pop() || item.id;
        if (token) {
          router.push(`${routes.album(token)}?type=album` as any);
          return;
        }
        break;
      }
      case "playlist":
        router.push(`${routes.album(item.id)}?type=playlist` as any);
        return;
      case "radio_station": {
        const isArtist = item.more_info?.featured_station_type === "artist";
        const stationLang = item.more_info?.language || "";
        router.push(
          `${routes.album(encodeURIComponent(item.id))}?type=radio_station&name=${encodeURIComponent(name)}&image=${encodeURIComponent(item.image)}&lang=${encodeURIComponent(stationLang)}&isArtist=${isArtist ? "1" : "0"}` as any,
        );
        return;
      }
      case "show":
        router.push(
          `${routes.album(encodeURIComponent(item.id))}?type=show&name=${encodeURIComponent(name)}&image=${encodeURIComponent(item.image)}` as any,
        );
        return;
      case "artist":
        router.push(`${routes.album(item.artistid || item.id)}?type=artist` as any);
        return;
      case "song":
        router.push(`${routes.album(item.id)}?type=song` as any);
        return;
      default:
        break;
    }
    ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT);
  };

  return (
    <View flex={1} backgroundColor="$background">
      <HomeHeader title="HOME" />
      {loading ? (
        <HomeSkeleton />
      ) : error ? (
        <View flex={1} alignItems="center" justifyContent="center" gap={8} paddingHorizontal={24}>
          <Text fontFamily="body" fontSize="5" color="$colorSecondary" textAlign="center">
            Couldn&apos;t load your feed.{"\n"}
            {error.message ?? String(error)}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
          {categories.map((category) => (
            <View key={category.id} marginBottom={24}>
              <Text fontFamily="body" fontWeight="700" fontSize="7" color="$color" paddingHorizontal={24} marginBottom={12}>
                {decode(category.title)}
              </Text>
              <FlatList
                data={category.data}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
                renderItem={({ item }) => (
                  <View width={140} onPress={() => openItem(item)}>
                    <Image source={{ uri: optimizeImage(item.image) }} width={140} height={140} borderRadius={12} backgroundColor="$backgroundHover" />
                    <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color" marginTop={8} numberOfLines={1}>
                      {decode(item.title || item.name || "")}
                    </Text>
                    <Text fontFamily="body" fontSize="3" color="$colorSecondary" numberOfLines={1} textTransform="capitalize">
                      {item.type}
                    </Text>
                  </View>
                )}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
