import { ScrollView, ToastAndroid } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { View, Text, XStack, useTheme } from "tamagui";
import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { routes } from "@constants/routes";

const LINKS = ["Terms of Service", "Privacy Policy", "Open Source Licenses", "Contact & Support"];

export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? "0.0.0";

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
          About
        </Text>
      </XStack>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140, alignItems: "center" }}>
        <View
          width={88}
          height={88}
          borderRadius={44}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$accent"
          marginTop={16}
          marginBottom={16}
        >
          <Text fontFamily="heading" fontSize="11" color="$background" letterSpacing={1}>
            D
          </Text>
        </View>
        <Text fontFamily="heading" fontSize="12" color="$color" letterSpacing={2}>
          DRIFT
        </Text>
        <Text fontFamily="body" fontSize="4" color="$colorSecondary" marginTop={4} marginBottom={32} textAlign="center">
          Version {version}
        </Text>

        <View width="100%" backgroundColor="$backgroundHover" borderRadius={16} paddingHorizontal={16}>
          {LINKS.map((label, index) => (
            <XStack
              key={label}
              alignItems="center"
              justifyContent="space-between"
              paddingVertical={14}
              borderTopWidth={index === 0 ? 0 : 1}
              borderTopColor="$borderColor"
              onPress={() =>
                label === "Open Source Licenses"
                  ? router.push(routes.licenses as any)
                  : ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT)
              }
            >
              <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
                {label}
              </Text>
              <ChevronRight color={theme.colorSecondary?.val as string} size={18} />
            </XStack>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
