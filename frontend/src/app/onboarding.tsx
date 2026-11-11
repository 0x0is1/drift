import { useState, useEffect, useCallback } from "react";
import { FlatList, BackHandler } from "react-native";
import { View, Text, XStack, YStack, Image } from "tamagui";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguages } from "@contexts/LanguageContext";
import { LanguageCard } from "@components/language/LanguageCard";
import { LanguageQuickActions } from "@components/language/LanguageQuickActions";
import { LanguageBottomBar } from "@components/language/LanguageBottomBar";
import { routes } from "@constants/routes";
import type { LanguageItem } from "@lib/languages";

/**
 * Onboarding screen shown on first launch.
 * Enables users to multi-select their preferred music languages
 * with big colorful solid cards before proceeding to the home feed.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allLanguages, completeOnboarding } = useLanguages();
  const [selected, setSelected] = useState<string[]>(["hindi"]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const toggleLang = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finalSelection = selected.length > 0 ? selected : ["hindi"];
      await completeOnboarding(finalSelection);
      router.replace(routes.home as any);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: LanguageItem }) => (
      <LanguageCard
        item={item}
        isSelected={selected.includes(item.id)}
        onPress={() => toggleLang(item.id)}
      />
    ),
    [selected, toggleLang],
  );

  return (
    <View flex={1} backgroundColor="$background" paddingTop={insets.top + 12}>
      <YStack paddingHorizontal={20} marginBottom={14} gap={6}>
        <XStack alignItems="center" gap={8} marginBottom={4}>
          <Image
            source={require("../../assets/images/logo-mark.png")}
            width={24}
            height={22}
            resizeMode="contain"
          />
          <Text fontFamily="heading" fontSize={16} color="$accent" letterSpacing={1.5}>
            DRIFT
          </Text>
        </XStack>

        <Text fontFamily="heading" fontSize={30} color="$color" letterSpacing={0.5}>
          CHOOSE YOUR LANGUAGES
        </Text>
        <Text fontFamily="body" fontSize={14} color="$colorSecondary">
          Pick one or more languages for music, charts, and recommendations.
        </Text>

        <LanguageQuickActions
          onSelectAll={() => setSelected(allLanguages.map((l) => l.id))}
          onResetToHindi={() => setSelected(["hindi"])}
        />
      </YStack>

      <FlatList
        data={allLanguages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 90,
          gap: 12,
        }}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
      />

      <LanguageBottomBar
        label={
          selected.length > 0
            ? `CONTINUE (${selected.length} SELECTED)`
            : "CONTINUE WITH HINDI"
        }
        onPress={handleContinue}
        disabled={submitting}
        bottomInset={insets.bottom}
        icon="arrow"
      />
    </View>
  );
}
