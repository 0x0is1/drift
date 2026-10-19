import { XStack, Text, View, useTheme } from "tamagui";
import { Sun, Moon, Menu } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useAppTheme } from "@contexts/ThemeContext";

/** Top header for the Home tab — drawer trigger + wordmark/title left, theme toggle right. */
export function HomeHeader({ title }: { title: string }) {
  const { scheme, toggleScheme } = useAppTheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
        <Text fontFamily="heading" fontSize="11" color="$accent" letterSpacing={1.2}>
          {title}
        </Text>
      </XStack>
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
  );
}
