import { Pressable } from "react-native";
import { View, Text, XStack, YStack } from "tamagui";
import { Check } from "@tamagui/lucide-icons";
import { tokens } from "@theme/tokens";
import type { LanguageItem } from "@lib/languages";

interface LanguageCardProps {
  item: LanguageItem;
  isSelected: boolean;
  onPress: () => void;
}

/**
 * Big, solid colorful language card.
 * Displays the language's native script in prominent typography,
 * alongside its English name and a distinct selection badge.
 */
export function LanguageCard({ item, isSelected, onPress }: LanguageCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, minWidth: "46%" }}
      android_ripple={{ color: tokens.color.overlaySecondary.val }}
    >
      <View
        backgroundColor={item.color}
        borderRadius={18}
        height={108}
        padding={14}
        justifyContent="space-between"
        borderWidth={2.5}
        borderColor={isSelected ? tokens.color.tealAccent.val : "transparent"}
        overflow="hidden"
      >
        {/* Top row: English label & check badge */}
        <XStack alignItems="center" justifyContent="space-between">
          <Text
            fontFamily="body"
            fontSize={13}
            fontWeight="700"
            color={tokens.color.white.val}
            textTransform="uppercase"
            letterSpacing={0.8}
            opacity={0.92}
          >
            {item.name}
          </Text>

          <View
            width={24}
            height={24}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            backgroundColor={isSelected ? tokens.color.tealAccent.val : "transparent"}
            borderWidth={isSelected ? 0 : 1.5}
            borderColor={isSelected ? "transparent" : tokens.color.whiteTrackDim.val}
          >
            {isSelected ? (
              <Check size={14} color={tokens.color.black.val} strokeWidth={3} />
            ) : null}
          </View>
        </XStack>

        {/* Bottom row: Large native script */}
        <YStack>
          <Text
            fontFamily="heading"
            fontSize={26}
            fontWeight="700"
            color={tokens.color.white.val}
            letterSpacing={0.4}
            numberOfLines={1}
          >
            {item.nativeName}
          </Text>
        </YStack>
      </View>
    </Pressable>
  );
}
