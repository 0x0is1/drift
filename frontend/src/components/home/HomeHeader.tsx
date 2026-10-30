import { XStack, Text, View, useTheme } from "tamagui";
import { Sun, Moon, Menu, Wifi } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { useAppTheme } from "@contexts/ThemeContext";
import { usePlayer } from "@contexts/PlayerContext";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

/** Top header for the Home tab — drawer trigger + wordmark/title left, theme toggle right. */
export function HomeHeader({ title }: { title: string }) {
  const { scheme, toggleScheme } = useAppTheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { localSync } = usePlayer();

  return (
    <XStack
      width="100%"
      paddingHorizontal={24}
      paddingTop={insets.top + 8}
      paddingBottom={16}
      alignItems="center"
      justifyContent="space-between"
      gap={16}
    >
      <XStack alignItems="center" gap={16}>
        <View
          width={40}
          height={40}
          marginLeft={-8}
          alignItems="center"
          justifyContent="center"
          onPress={() => (navigation as any).openDrawer()}
        >
          <Menu color={theme.colorSecondary?.val as string} size={24} />
        </View>
        <Text fontFamily="heading" fontSize="8" color="$accent" letterSpacing={1.2}>
          {title}
        </Text>
      </XStack>
      <XStack alignItems="center" gap={4}>
        <View
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          onPress={() => router.push(routes.syncNearby as any)}
        >
          <Wifi
            color={localSync ? tokens.color.tealAccent.val : (theme.colorSecondary?.val as string)}
            size={22}
          />
        </View>
        <View
          width={40}
          height={40}
          marginRight={-8}
          alignItems="center"
          justifyContent="center"
          onPress={toggleScheme}
        >
          {scheme === "dark" ? (
            <Sun color={theme.colorSecondary?.val as string} size={24} />
          ) : (
            <Moon color={theme.colorSecondary?.val as string} size={24} />
          )}
        </View>
      </XStack>
    </XStack>
  );
}
