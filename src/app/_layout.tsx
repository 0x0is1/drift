import { useEffect, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { TamaguiProvider, Theme } from "tamagui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { config } from "@theme/tamagui.config";
import { googleFontsToLoad } from "@theme/typography";
import { PlayerProvider } from "@contexts/PlayerContext";
import { ThemeProvider, useAppTheme } from "@contexts/ThemeContext";
import { IntroSplash } from "@components/IntroSplash";
import { FloatingMusicIsland } from "@components/FloatingMusicIsland";
import { setupPlayer } from "@lib/setupPlayer";
import { ensureSession } from "@lib/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(googleFontsToLoad);
  const [playerReady, setPlayerReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await setupPlayer();
      } catch (error) {
        console.error("Error setting up player", error);
      } finally {
        setPlayerReady(true);
      }
      ensureSession().catch((error) =>
        console.warn("Supabase anonymous session failed", error),
      );
    })();
  }, []);

  const onIntroFinish = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    if (fontsLoaded && playerReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, playerReady]);

  if (!fontsLoaded || !playerReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp introDone={introDone} onIntroFinish={onIntroFinish} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp({ introDone, onIntroFinish }: { introDone: boolean; onIntroFinish: () => void }) {
  const { scheme } = useAppTheme();

  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <Theme name={scheme}>
        <StatusBar hidden />
        <PlayerProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(drawer)" />
            <Stack.Screen
              name="player"
              options={{ presentation: "transparentModal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="album/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="liked-songs" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="playlist/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen
              name="add-to-playlist"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="listen-together"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="login"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
          </Stack>
          {/*
            Mounted once at the root (not inside the tabs layout) so it
            persists over every screen — including /album/[id], a sibling
            stack screen outside the tabs tree where the tabs layout's own
            copy would never render at all. Self-hides via
            islandHiddenOnRoutes (player/feed) based on the current pathname.
          */}
          <FloatingMusicIsland />
          {!introDone && <IntroSplash onFinish={onIntroFinish} />}
        </PlayerProvider>
      </Theme>
    </TamaguiProvider>
  );
}
