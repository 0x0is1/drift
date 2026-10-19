import { useMemo } from "react";
import { FlatList, ScrollView, ToastAndroid } from "react-native";
import { Text, View, XStack, Image } from "tamagui";
import { useRouter } from "expo-router";
import { decode } from "html-entities";
import useSWR from "swr";
import { HomeHeader } from "@components/home/HomeHeader";
import { Skeleton } from "@components/ui/Skeleton";
import { routes } from "@constants/routes";
import { serviceProvider } from "@lib/jiosaavn";

type ModuleItem = {
  id: string;
  title?: string;
  name?: string;
  image: string;
  type: string;
  perma_url?: string;
  artistid?: string;
};

type Category = { id: string; title: string; data: ModuleItem[] };

const optimizeImage = (uri: string) => uri.replace("150x150", "500x500").replace("50x50", "500x500");

export default function HomeScreen() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR("home-launch-data", () => serviceProvider.getLaunchData());

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
        const token = item.perma_url?.split("/").filter(Boolean).pop();
        if (token) {
          router.push(`${routes.album(token)}?type=album` as any);
          return;
        }
        break;
      }
      case "playlist":
        router.push(`${routes.album(item.id)}?type=playlist` as any);
        return;
      case "radio_station":
        router.push(
          `${routes.album(encodeURIComponent(item.id))}?type=radio_station&name=${encodeURIComponent(name)}&image=${encodeURIComponent(item.image)}` as any,
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
        <View paddingTop={16} gap={24}>
          {Array.from({ length: 3 }).map((_, row) => (
            <View key={row} gap={12}>
              <Skeleton width={140} height={20} borderRadius={6} style={{ marginLeft: 24 }} />
              <XStack paddingHorizontal={24} gap={12}>
                {Array.from({ length: 3 }).map((__, i) => (
                  <View key={i} width={140} gap={8}>
                    <Skeleton width={140} height={140} borderRadius={12} />
                    <Skeleton width="80%" height={13} />
                  </View>
                ))}
              </XStack>
            </View>
          ))}
        </View>
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
              <Text fontFamily="heading" fontSize="7" color="$color" paddingHorizontal={24} marginBottom={12}>
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
