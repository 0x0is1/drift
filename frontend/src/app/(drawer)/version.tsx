import { ScrollView, ToastAndroid } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { View, Text, XStack, useTheme } from "tamagui";
import { ChevronLeft } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VersionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? "0.0.0";
  const runtimeVersion =
    typeof Constants.expoConfig?.runtimeVersion === "string" ? Constants.expoConfig.runtimeVersion : null;

  return (
    <View flex={1} backgroundColor="$background">
      <XStack paddingTop={insets.top + 8} paddingHorizontal={16} alignItems="center" gap={12} marginBottom={16}>
        <View
          width={32}
          height={32}
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$backgroundHover"
          onPress={() => router.back()}
        >
          <ChevronLeft color={theme.color?.val as string} size={20} />
        </View>
        <Text fontFamily="heading" fontSize="9" color="$color">
          Version
        </Text>
      </XStack>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140, alignItems: "center" }}>
        <View
          width={64}
          height={64}
          borderRadius={32}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$accent"
          marginTop={16}
          marginBottom={16}
        >
          <Text fontFamily="heading" fontSize="8" color="$background">
            D
          </Text>
        </View>
        <Text fontFamily="heading" fontSize="10" color="$color" letterSpacing={1}>
          DRIFT
        </Text>
        <Text fontFamily="body" fontSize="4" color="$colorSecondary" marginTop={4}>
          Version {version}
          {runtimeVersion ? ` · Build ${runtimeVersion}` : ""}
        </Text>
        <XStack
          alignItems="center"
          gap={8}
          backgroundColor="$accent"
          borderRadius={24}
          paddingVertical={10}
          paddingHorizontal={24}
          marginTop={24}
          onPress={() => ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT)}
        >
          <Text fontFamily="body" fontWeight="700" fontSize="4" color="$background">
            Check for Updates
          </Text>
        </XStack>
      </ScrollView>
    </View>
  );
}
