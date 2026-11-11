import { Pressable } from "react-native";
import { XStack, Text } from "tamagui";
import { CheckCheck, RefreshCw } from "@tamagui/lucide-icons";
import { tokens } from "@theme/tokens";

interface LanguageQuickActionsProps {
  onSelectAll: () => void;
  onResetToHindi: () => void;
}

export function LanguageQuickActions({ onSelectAll, onResetToHindi }: LanguageQuickActionsProps) {
  return (
    <XStack gap={10} marginTop={4}>
      <Pressable onPress={onSelectAll}>
        <XStack
          backgroundColor="$backgroundHover"
          paddingHorizontal={12}
          paddingVertical={6}
          borderRadius={20}
          alignItems="center"
          gap={6}
        >
          <CheckCheck size={14} color={tokens.color.tealAccent.val} />
          <Text fontFamily="body" fontSize={12} fontWeight="600" color="$color">
            Select All
          </Text>
        </XStack>
      </Pressable>
      <Pressable onPress={onResetToHindi}>
        <XStack
          backgroundColor="$backgroundHover"
          paddingHorizontal={12}
          paddingVertical={6}
          borderRadius={20}
          alignItems="center"
          gap={6}
        >
          <RefreshCw size={14} color={tokens.color.tealAccent.val} />
          <Text fontFamily="body" fontSize={12} fontWeight="600" color="$color">
            Reset (Hindi)
          </Text>
        </XStack>
      </Pressable>
    </XStack>
  );
}
