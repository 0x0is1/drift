import { Pressable } from "react-native";
import { View, Text } from "tamagui";
import { ArrowRight, Check } from "@tamagui/lucide-icons";
import { tokens } from "@theme/tokens";

interface LanguageBottomBarProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bottomInset: number;
  icon?: "arrow" | "check";
}

export function LanguageBottomBar({
  label,
  onPress,
  disabled = false,
  bottomInset,
  icon = "arrow",
}: LanguageBottomBarProps) {
  return (
    <View
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      paddingHorizontal={20}
      paddingTop={12}
      paddingBottom={Math.max(bottomInset, 16) + 6}
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          backgroundColor: tokens.color.tealAccent.val,
          height: 52,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
      >
        {icon === "check" ? (
          <Check size={20} color={tokens.color.black.val} strokeWidth={2.5} />
        ) : null}
        <Text
          fontFamily="heading"
          fontSize={18}
          fontWeight="700"
          color={tokens.color.black.val}
          letterSpacing={0.8}
        >
          {label}
        </Text>
        {icon === "arrow" ? (
          <ArrowRight size={20} color={tokens.color.black.val} strokeWidth={2.5} />
        ) : null}
      </Pressable>
    </View>
  );
}
