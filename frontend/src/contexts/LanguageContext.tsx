import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  getStoredLanguages,
  persistLanguages,
  getIsOnboardingCompleted,
  setIsOnboardingCompleted,
  normalizeLanguages,
  SUPPORTED_LANGUAGES,
  type LanguageItem,
} from "@lib/languages";
import { serviceProvider } from "@lib/jiosaavn";
import { mutate } from "swr";

interface LanguageContextType {
  selectedLanguages: string[];
  isOnboarded: boolean;
  isLoading: boolean;
  allLanguages: LanguageItem[];
  updateLanguages: (languages: string[]) => Promise<void>;
  completeOnboarding: (languages: string[]) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selectedLanguages, setSelectedLanguagesState] = useState<string[]>(["hindi"]);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true); // default true while reading storage to avoid flash
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedLangs, completed] = await Promise.all([
          getStoredLanguages(),
          getIsOnboardingCompleted(),
        ]);
        if (!mounted) return;
        const effective = normalizeLanguages(savedLangs);
        setSelectedLanguagesState(effective);
        serviceProvider.setLanguages(effective);
        setIsOnboarded(completed);
      } catch (error) {
        console.warn("LanguageProvider initialization error:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateLanguages = useCallback(async (languages: string[]) => {
    const effective = normalizeLanguages(languages);
    setSelectedLanguagesState(effective);
    serviceProvider.setLanguages(effective);
    await persistLanguages(effective);
    await mutate("home-launch-data");
  }, []);

  const completeOnboarding = useCallback(async (languages: string[]) => {
    const effective = normalizeLanguages(languages);
    setSelectedLanguagesState(effective);
    serviceProvider.setLanguages(effective);
    await Promise.all([
      persistLanguages(effective),
      setIsOnboardingCompleted(true),
    ]);
    setIsOnboarded(true);
    await mutate("home-launch-data");
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        selectedLanguages,
        isOnboarded,
        isLoading,
        allLanguages: SUPPORTED_LANGUAGES,
        updateLanguages,
        completeOnboarding,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguages() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguages must be used within a LanguageProvider");
  }
  return context;
}
