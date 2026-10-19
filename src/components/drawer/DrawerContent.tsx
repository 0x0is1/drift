import { ToastAndroid } from "react-native";
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { View, Text, XStack, useTheme } from "tamagui";
import { User, Moon, Sun, LogIn, LogOut } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@contexts/ThemeContext";
import { useSession } from "@hooks/useSession";
import { supabase, ensureSession } from "@lib/supabase";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

/**
 * Custom drawer content: profile identity card (shown whether signed in or
 * not — "Guest" vs email, see CLAUDE.md "Auth") up top with the theme
 * toggle living on its background, the usual drawer item list in the
 * middle, and a login/logout action pinned to the bottom edge.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme, toggleScheme } = useAppTheme();
  const { isAnonymous, email } = useSession();

  const handleAuthAction = async () => {
    if (isAnonymous) {
      props.navigation.closeDrawer();
      router.push(routes.login as any);
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    try {
      await ensureSession();
    } catch {
      ToastAndroid.show("Couldn't start a new session", ToastAndroid.SHORT);
    }
  };

  return (
    <View flex={1} backgroundColor="$drawerBackground">
      <View
        backgroundColor="$backgroundHover"
        paddingTop={insets.top + 24}
        paddingBottom={20}
        paddingHorizontal={20}
        onPress={() => {
          props.navigation.closeDrawer();
          router.push(routes.profile as any);
        }}
      >
        <View
          position="absolute"
          top={insets.top + 12}
          right={12}
          width={36}
          height={36}
          borderRadius={18}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$background"
          onPress={(e: any) => {
            e.stopPropagation?.();
            toggleScheme();
          }}
        >
          {scheme === "dark" ? (
            <Moon color={theme.color?.val as string} size={18} />
          ) : (
            <Sun color={theme.color?.val as string} size={18} />
          )}
        </View>
        <XStack alignItems="center" gap={14}>
          <View width={56} height={56} borderRadius={28} alignItems="center" justifyContent="center" backgroundColor="$accent">
            <User color={theme.background?.val as string} size={26} />
          </View>
          <View flex={1}>
            <Text fontFamily="body" fontWeight="700" fontSize="6" color="$color" numberOfLines={1}>
              {email ?? "Guest"}
            </Text>
            <Text fontFamily="body" fontSize="3" color="$colorSecondary">
              {email ? "Signed in" : "Signed in anonymously"}
            </Text>
          </View>
        </XStack>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 8 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <XStack
        alignItems="center"
        gap={10}
        paddingHorizontal={20}
        paddingVertical={16}
        paddingBottom={Math.max(insets.bottom, 16) + 8}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        onPress={handleAuthAction}
      >
        {isAnonymous ? (
          <LogIn color={tokens.color.tealAccent.val} size={20} />
        ) : (
          <LogOut color={tokens.color.dangerRed.val} size={20} />
        )}
        <Text fontFamily="body" fontWeight="600" fontSize="4" style={{ color: isAnonymous ? (tokens.color.tealAccent.val as string) : tokens.color.dangerRed.val }}>
          {isAnonymous ? "Log in" : "Log out"}
        </Text>
      </XStack>
    </View>
  );
}
