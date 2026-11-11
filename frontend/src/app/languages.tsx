import { useState, useCallback } from "react";
import { FlatList, Pressable, ToastAndroid, Platform } from "react-native";
import { View, Text, XStack, YStack } from "tamagui";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "@tamagui/lucide-icons";
import { useLanguages } from "@contexts/LanguageContext";
import { LanguageCard } from "@components/language/LanguageCard";
import { LanguageQuickActions } from "@components/language/LanguageQuickActions";
import { LanguageBottomBar } from "@components/language/LanguageBottomBar";
import { tokens } from "@theme/tokens";
import type { LanguageItem } from "@lib/languages";

/**
 * Language switcher modal accessed via the top navbar button.
 * Lets users toggle preferred languages and immediately refreshes
 * the API catalog and home recommendations.
 */
export default function LanguagesModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allLanguages, selectedLanguages, updateLanguages } = useLanguages();
  const [selected, setSelected] = useState<string[]>(selectedLanguages);
  const [saving, setSaving] = useState(false);

  const toggleLang = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const finalSelection = selected.length > 0 ? selected : ["hindi"];
      await updateLanguages(finalSelection);
      if (Platform.OS === "android") {
        ToastAndroid.show("Languages updated", ToastAndroid.SHORT);
      }
      router.back();
    } finally {
      setSaving(false);
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
    <View flex={1} backgroundColor="$background" paddingTop={insets.top + 8}>
      <XStack
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
        justifyContent="space-between"
      >
        <Text fontFamily="heading" fontSize={26} color="$accent" letterSpacing={0.8}>
          MUSIC LANGUAGES
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <X size={22} color={tokens.color.white.val} />
        </Pressable>
      </XStack>

      <YStack paddingHorizontal={20} marginBottom={14} gap={8}>
        <Text fontFamily="body" fontSize={13} color="$colorSecondary">
          Multi-select your music languages. Catalog and trending feeds will update immediately.
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
            ? `APPLY (${selected.length} LANGUAGES)`
            : "APPLY (HINDI DEFAULT)"
        }
        onPress={handleSave}
        disabled={saving}
        bottomInset={insets.bottom}
        icon="check"
      />
    </View>
  );
}
