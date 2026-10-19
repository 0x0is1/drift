import { useState } from "react";
import { Share, TextInput, ToastAndroid } from "react-native";
import { Text, View, XStack, useTheme } from "tamagui";
import { Users, X, Share2, LogOut } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { usePlayer } from "@contexts/PlayerContext";
import { tokens } from "@theme/tokens";

/**
 * Phase 7 v1 UI (see CLAUDE.md "Sync-listen sessions") — queue + transport
 * state only, no sample-accurate audio sync. Session "code" is just the raw
 * drift_sessions.id (schema has no separate short-code column) — shared via
 * the native share sheet or manual copy (long-press the read-only field).
 */
export default function ListenTogetherScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { syncSession, startSyncSession, joinSyncSession, leaveSyncSession } = usePlayer();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      await startSyncSession();
    } catch {
      ToastAndroid.show("Couldn't start a session — play something first", ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) return;
    setBusy(true);
    try {
      await joinSyncSession(code);
    } catch {
      ToastAndroid.show("Couldn't join that session", ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await leaveSyncSession();
    } catch {
      ToastAndroid.show("Couldn't leave the session", ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View flex={1} backgroundColor="$background" paddingTop={16}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20} marginBottom={20}>
        <Text fontFamily="heading" fontSize="7" color="$color">
          Listen Together
        </Text>
        <View width={32} height={32} alignItems="center" justifyContent="center" onPress={() => router.back()}>
          <X color={theme.color?.val as string} size={20} />
        </View>
      </XStack>

      <View paddingHorizontal={20} gap={24}>
        {syncSession ? (
          <View gap={16}>
            <View alignItems="center" gap={10} backgroundColor="$backgroundHover" borderRadius={16} padding={24}>
              <Users color={tokens.color.tealAccent.val} size={28} />
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                {syncSession.isHost ? "You're hosting" : "Listening with the host"}
              </Text>
              {syncSession.isHost && (
                <>
                  <Text fontFamily="body" fontSize="3" color="$colorSecondary" textAlign="center">
                    Share this code so others can join
                  </Text>
                  <XStack
                    width="100%"
                    alignItems="center"
                    gap={10}
                    backgroundColor="$background"
                    borderRadius={12}
                    paddingHorizontal={14}
                    height={44}
                  >
                    <TextInput
                      value={syncSession.id}
                      editable={false}
                      style={{ flex: 1, color: theme.color?.val as string, fontFamily: "Rajdhani_500Medium", fontSize: 13 }}
                    />
                    <View
                      width={28}
                      height={28}
                      alignItems="center"
                      justifyContent="center"
                      onPress={() => Share.share({ message: syncSession.id })}
                    >
                      <Share2 color={theme.colorSecondary?.val as string} size={16} />
                    </View>
                  </XStack>
                </>
              )}
            </View>
            <XStack
              alignItems="center"
              justifyContent="center"
              gap={8}
              backgroundColor="$backgroundHover"
              borderRadius={14}
              paddingVertical={14}
              opacity={busy ? 0.6 : 1}
              onPress={busy ? undefined : handleLeave}
            >
              <LogOut color={tokens.color.dangerRed.val} size={18} />
              <Text fontFamily="body" fontWeight="600" fontSize="4" color={tokens.color.dangerRed.val}>
                {syncSession.isHost ? "End session" : "Leave session"}
              </Text>
            </XStack>
          </View>
        ) : (
          <>
            <View gap={10}>
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                Host a session
              </Text>
              <Text fontFamily="body" fontSize="3" color="$colorSecondary">
                Shares your current queue and play/pause/seek with anyone who joins.
              </Text>
              <XStack
                alignItems="center"
                justifyContent="center"
                backgroundColor="$accent"
                borderRadius={14}
                paddingVertical={14}
                opacity={busy ? 0.6 : 1}
                onPress={busy ? undefined : handleStart}
              >
                <Text fontFamily="body" fontWeight="600" fontSize="4" color={theme.background?.val as string}>
                  Start hosting
                </Text>
              </XStack>
            </View>

            <View gap={10}>
              <Text fontFamily="body" fontWeight="600" fontSize="5" color="$color">
                Join a session
              </Text>
              <XStack
                alignItems="center"
                backgroundColor="$backgroundHover"
                borderRadius={14}
                paddingHorizontal={14}
                height={48}
              >
                <TextInput
                  value={joinCode}
                  onChangeText={setJoinCode}
                  onSubmitEditing={handleJoin}
                  placeholder="Paste session code"
                  placeholderTextColor={theme.colorSecondary?.val as string}
                  style={{ flex: 1, color: theme.color?.val as string, fontFamily: "Rajdhani_500Medium", fontSize: 14 }}
                />
              </XStack>
              <XStack
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundHover"
                borderRadius={14}
                paddingVertical={14}
                opacity={joinCode.trim() && !busy ? 1 : 0.5}
                onPress={joinCode.trim() && !busy ? handleJoin : undefined}
              >
                <Text fontFamily="body" fontWeight="600" fontSize="4" color="$color">
                  Join
                </Text>
              </XStack>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
