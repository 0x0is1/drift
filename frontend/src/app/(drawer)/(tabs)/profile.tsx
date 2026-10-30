import { ScrollView, ToastAndroid } from "react-native";
import { useRouter } from "expo-router";
import { Text, View, XStack, useTheme } from "tamagui";
import { User, Moon, Sun, Bell, Shield, Info, LogIn, LogOut, ChevronRight } from "@tamagui/lucide-icons";
import { useAppTheme } from "@contexts/ThemeContext";
import { useSession } from "@hooks/useSession";
import { supabase, ensureSession } from "@lib/supabase";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";

function ProfileRow({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <XStack
      alignItems="center"
      gap={12}
      backgroundColor="$backgroundHover"
      borderRadius={16}
      padding={16}
      onPress={onPress}
    >
      {icon}
      <Text flex={1} fontFamily="body" fontWeight="600" fontSize="4" color="$color">
        {title}
      </Text>
      <ChevronRight color={theme.colorSecondary?.val as string} size={18} />
    </XStack>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { scheme, toggleScheme } = useAppTheme();
  const { isAnonymous, email } = useSession();
  const notImplemented = () => ToastAndroid.show("Not implemented yet", ToastAndroid.SHORT);

  const handleAuthAction = async () => {
    if (isAnonymous) {
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
    <View flex={1} backgroundColor="$background">
      <Text fontFamily="heading" fontSize="8" color="$accent" letterSpacing={1.2} paddingHorizontal={24} paddingTop={16}>
        PROFILE
      </Text>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 24 }}>
        <XStack alignItems="center" gap={16}>
          <View width={64} height={64} borderRadius={32} alignItems="center" justifyContent="center" backgroundColor="$accent">
            <User color={theme.background?.val as string} size={30} />
          </View>
          <View>
            <Text fontFamily="body" fontWeight="700" fontSize="6" color="$color">
              {email ?? "Guest"}
            </Text>
            <Text fontFamily="body" fontSize="3" color="$colorSecondary">
              {email ? "Signed in" : "Signed in anonymously"}
            </Text>
          </View>
        </XStack>

        {isAnonymous && (
          <Text fontFamily="body" fontSize="3" color="$colorSecondary">
            Log in to unlock saved playlists, cross-device sync, and personalized recommendations.
          </Text>
        )}

        <View gap={12}>
          <ProfileRow
            icon={
              scheme === "dark" ? (
                <Moon color={theme.color?.val as string} size={20} />
              ) : (
                <Sun color={theme.color?.val as string} size={20} />
              )
            }
            title={scheme === "dark" ? "Dark Theme" : "Light Theme"}
            onPress={toggleScheme}
          />
          <ProfileRow
            icon={<Bell color={theme.color?.val as string} size={20} />}
            title="Notifications"
            onPress={notImplemented}
          />
          <ProfileRow
            icon={<Shield color={theme.color?.val as string} size={20} />}
            title="Privacy"
            onPress={notImplemented}
          />
          <ProfileRow
            icon={<Info color={theme.color?.val as string} size={20} />}
            title="About Drift"
            onPress={notImplemented}
          />
          <ProfileRow
            icon={
              isAnonymous ? (
                <LogIn color={theme.color?.val as string} size={20} />
              ) : (
                <LogOut color={tokens.color.dangerRed.val} size={20} />
              )
            }
            title={isAnonymous ? "Log in" : "Log out"}
            onPress={handleAuthAction}
          />
        </View>
      </ScrollView>
    </View>
  );
}
