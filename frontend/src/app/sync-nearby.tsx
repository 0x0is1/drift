import { useEffect, useState } from "react";
import { ToastAndroid } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { Wifi, X, LogOut, Loader } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { usePlayer } from "@contexts/PlayerContext";
import { tokens } from "@theme/tokens";
import type { LocalPeer } from "@lib/localSync";

/**
 * Phase 7b: "Sync nearby" — phones on the same WiFi, no internet/Supabase
 * round-trip (see src/lib/localSync.ts). Separate feature from the
 * Supabase-based Listen Together (listen-together.tsx) by design, not a
 * replacement — kept side by side.
 */
export default function SyncNearbyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    localSync,
    nearbyPeers,
    startScanningNearby,
    stopScanningNearby,
    startLocalSync,
    joinLocalSync,
    leaveLocalSync,
  } = usePlayer();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localSync) startScanningNearby();
    return () => stopScanningNearby();
  }, [localSync]);

  const handleHost = async () => {
    setBusy(true);
    try {
      stopScanningNearby();
      await startLocalSync();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't start hosting";
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = (peer: LocalPeer) => {
    joinLocalSync(peer);
  };

  const handleLeave = () => {
    leaveLocalSync();
  };

  return (
    <View flex={1} backgroundColor="$background" paddingTop={16}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20} marginBottom={20}>
        <Text fontFamily="heading" fontSize="7" color="$color">
          Sync Nearby
        </Text>
        <View width={32} height={32} alignItems="center" justifyContent="center" onPress={() => router.back()}>
          <X color={theme.color?.val as string} size={20} />
        </View>
      </XStack>

      <View paddingHorizontal={20} gap={24}>
        {localSync ? (
          <View gap={16}>
            <View alignItems="center" gap={10} backgroundColor="$backgroundHover" borderRadius={16} padding={24}>
              <Wifi color={tokens.color.tealAccent.val} size={28} />
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                {localSync.isHost ? "Hosting on this WiFi" : `Synced with ${localSync.peer.name}`}
              </Text>
              <Text fontFamily="body" fontSize="3" color="$colorSecondary" textAlign="center">
                No internet used — stays on this network.
              </Text>
            </View>
            <XStack
              alignItems="center"
              justifyContent="center"
              gap={8}
              backgroundColor="$backgroundHover"
              borderRadius={14}
              paddingVertical={14}
              onPress={handleLeave}
            >
              <LogOut color={tokens.color.dangerRed.val} size={18} />
              <Text fontFamily="body" fontWeight="600" fontSize="4" color={tokens.color.dangerRed.val}>
                {localSync.isHost ? "Stop hosting" : "Leave"}
              </Text>
            </XStack>
          </View>
        ) : (
          <>
            <View gap={10}>
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                Host for nearby phones
              </Text>
              <Text fontFamily="body" fontSize="3" color="$colorSecondary">
                Anyone on this WiFi can find and join, no code needed.
              </Text>
              <XStack
                alignItems="center"
                justifyContent="center"
                backgroundColor="$accent"
                borderRadius={14}
                paddingVertical={14}
                opacity={busy ? 0.6 : 1}
                onPress={busy ? undefined : handleHost}
              >
                <Text fontFamily="body" fontWeight="600" fontSize="4" color={theme.background?.val as string}>
                  Start hosting
                </Text>
              </XStack>
            </View>

            <View gap={10}>
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                Nearby
              </Text>
              {nearbyPeers.length === 0 ? (
                <XStack alignItems="center" gap={10} paddingVertical={10}>
                  <Loader color={theme.colorSecondary?.val as string} size={16} />
                  <Text fontFamily="body" fontSize="3" color="$colorSecondary">
                    Looking for hosts on this WiFi…
                  </Text>
                </XStack>
              ) : (
                nearbyPeers.map((peer) => (
                  <XStack
                    key={peer.name}
                    alignItems="center"
                    justifyContent="space-between"
                    backgroundColor="$backgroundHover"
                    borderRadius={14}
                    paddingVertical={14}
                    paddingHorizontal={16}
                    onPress={() => handleJoin(peer)}
                  >
                    <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
                      {peer.name}
                    </Text>
                    <Text fontFamily="body" fontSize="3" color={tokens.color.tealAccent.val}>
                      Join
                    </Text>
                  </XStack>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
