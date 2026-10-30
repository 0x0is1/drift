import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { View, Text, XStack, useTheme } from "tamagui";
import { ChevronLeft } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import licenses from "../../data/licenses.json";

type LicenseEntry = { name: string; version: string; license: string };

export default function LicensesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
          Open Source Licenses
        </Text>
      </XStack>
      <FlatList
        data={licenses as LicenseEntry[]}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        renderItem={({ item }) => (
          <XStack alignItems="center" justifyContent="space-between" paddingVertical={12} borderBottomWidth={1} borderBottomColor="$borderColor">
            <View flex={1} paddingRight={12}>
              <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
                {item.name}
              </Text>
              <Text fontFamily="body" fontSize="3" color="$colorSecondary" marginTop={2}>
                v{item.version}
              </Text>
            </View>
            <Text fontFamily="body" fontSize="3" color="$colorSecondary">
              {item.license}
            </Text>
          </XStack>
        )}
      />
    </View>
  );
}
