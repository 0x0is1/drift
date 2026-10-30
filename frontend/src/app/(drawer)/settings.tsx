import { useEffect, useState } from "react";
import { ScrollView, Switch, ToastAndroid } from "react-native";
import { useRouter } from "expo-router";
import { View, Text, XStack, useTheme } from "tamagui";
import { ChevronLeft } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@contexts/ThemeContext";
import { useSession } from "@hooks/useSession";
import { supabase, ensureSession } from "@lib/supabase";
import { routes } from "@constants/routes";
import { tokens } from "@theme/tokens";
import {
  QUALITY_LABELS,
  nextQuality,
  getStreamQuality,
  setStreamQuality,
  getDownloadQuality,
  setDownloadQuality,
  getNotificationsEnabled,
  setNotificationsEnabled,
  type Quality,
} from "@lib/settings";

function SettingsRow({
  label,
  subtitle,
  trailing,
  destructive,
  onPress,
}: {
  label: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingVertical={14} onPress={onPress}>
      <View flex={1} paddingRight={12}>
        <Text fontFamily="body" fontWeight="600" fontSize="4" color={destructive ? tokens.color.white.val : "$color"} style={destructive ? { color: tokens.color.dangerRed.val } : undefined}>
          {label}
        </Text>
        {subtitle ? (
          <Text fontFamily="body" fontSize="3" color="$colorSecondary" marginTop={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </XStack>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View marginBottom={24}>
      <Text fontFamily="body" fontWeight="700" fontSize="3" color="$colorSecondary" textTransform="uppercase" letterSpacing={0.8} marginBottom={8}>
        {title}
      </Text>
      <View backgroundColor="$backgroundHover" borderRadius={16} paddingHorizontal={16}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { scheme, toggleScheme } = useAppTheme();
  const { isAnonymous } = useSession();
  const [streamQuality, setStreamQualityState] = useState<Quality | null>(null);
  const [downloadQuality, setDownloadQualityState] = useState<Quality | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean | null>(null);

  useEffect(() => {
    getStreamQuality().then(setStreamQualityState);
    getDownloadQuality().then(setDownloadQualityState);
    getNotificationsEnabled().then(setNotificationsEnabledState);
  }, []);

  const cycleStreamQuality = async () => {
    if (!streamQuality) return;
    const next = nextQuality(streamQuality);
    setStreamQualityState(next);
    await setStreamQuality(next);
  };

  const cycleDownloadQuality = async () => {
    if (!downloadQuality) return;
    const next = nextQuality(downloadQuality);
    setDownloadQualityState(next);
    await setDownloadQuality(next);
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabledState(value);
    await setNotificationsEnabled(value);
  };

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
          Settings
        </Text>
      </XStack>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}>
        <SettingsSection title="Appearance">
          <SettingsRow
            label="Dark theme"
            subtitle={scheme === "dark" ? "Enabled" : "Disabled"}
            trailing={
              <Switch
                value={scheme === "dark"}
                onValueChange={toggleScheme}
                trackColor={{ true: tokens.color.tealAccent.val, false: tokens.color.gray600.val }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Playback">
          <SettingsRow
            label="Audio quality"
            subtitle={streamQuality ? QUALITY_LABELS[streamQuality] : "..."}
            onPress={cycleStreamQuality}
          />
          <SettingsRow
            label="Download quality"
            subtitle={downloadQuality ? QUALITY_LABELS[downloadQuality] : "..."}
            onPress={cycleDownloadQuality}
          />
        </SettingsSection>

        <SettingsSection title="Notifications">
          <SettingsRow
            label="New releases & alerts"
            subtitle={notificationsEnabled === null ? "..." : notificationsEnabled ? "Enabled" : "Disabled"}
            trailing={
              notificationsEnabled === null ? undefined : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ true: tokens.color.tealAccent.val, false: tokens.color.gray600.val }}
                />
              )
            }
          />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow
            label={isAnonymous ? "Log in" : "Sign out"}
            {...(isAnonymous ? { subtitle: "Save your data and get recommendations" } : {})}
            destructive={!isAnonymous}
            onPress={handleAuthAction}
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}
