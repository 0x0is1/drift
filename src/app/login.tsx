import { useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, ToastAndroid } from "react-native";
import { useRouter } from "expo-router";
import { View, Text, XStack, useTheme } from "tamagui";
import { ChevronLeft } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@lib/supabase";

/**
 * Minimal optional-auth v1: upgrades the existing anonymous session to a
 * real email/password account via updateUser, so every drift_* row already
 * written under the anon id stays attached to the same user — never a new
 * id (see CLAUDE.md "Auth"). Signing into a *different*, pre-existing
 * account and Google/Apple OAuth are both phase-8 scope, not this.
 */
export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!supabase) {
      ToastAndroid.show("Backend not configured yet", ToastAndroid.SHORT);
      return;
    }
    if (!email.trim() || password.length < 6) {
      ToastAndroid.show("Enter an email and a 6+ character password", ToastAndroid.SHORT);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (error) throw error;
      ToastAndroid.show("Account created — check your email to confirm", ToastAndroid.LONG);
      router.back();
    } catch (err: any) {
      ToastAndroid.show(err?.message ?? "Couldn't create account", ToastAndroid.LONG);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
            Log in
          </Text>
        </XStack>

        <View paddingHorizontal={24} gap={16}>
          <Text fontFamily="body" fontSize="4" color="$colorSecondary">
            Create an account to save your profile, liked songs, and get personalized recommendations. You can keep using Drift without one.
          </Text>

          <View gap={8}>
            <Text fontFamily="body" fontWeight="600" fontSize="3" color="$colorSecondary">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.colorSecondary?.val as string}
              style={{
                backgroundColor: theme.backgroundHover?.val as string,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 48,
                color: theme.color?.val as string,
                fontFamily: "Rajdhani_500Medium",
                fontSize: 15,
              }}
            />
          </View>

          <View gap={8}>
            <Text fontFamily="body" fontWeight="600" fontSize="3" color="$colorSecondary">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={theme.colorSecondary?.val as string}
              style={{
                backgroundColor: theme.backgroundHover?.val as string,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 48,
                color: theme.color?.val as string,
                fontFamily: "Rajdhani_500Medium",
                fontSize: 15,
              }}
            />
          </View>

          <XStack
            alignItems="center"
            justifyContent="center"
            backgroundColor="$accent"
            borderRadius={24}
            paddingVertical={14}
            marginTop={8}
            opacity={submitting ? 0.6 : 1}
            onPress={submitting ? undefined : submit}
          >
            <Text fontFamily="body" fontWeight="700" fontSize="4" color="$background">
              {submitting ? "Creating account..." : "Create account"}
            </Text>
          </XStack>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
