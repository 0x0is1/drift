import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokens } from "@theme/tokens";

export interface LanguageItem {
  id: string;
  name: string;
  nativeName: string;
  color: string;
}

/**
 * Supported JioSaavn catalog languages.
 * Colors are solid theme tokens for vibrant, high-contrast cards.
 */
export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  { id: "hindi", name: "Hindi", nativeName: "हिन्दी", color: tokens.color.langHindi.val },
  { id: "english", name: "English", nativeName: "English", color: tokens.color.langEnglish.val },
  { id: "punjabi", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", color: tokens.color.langPunjabi.val },
  { id: "telugu", name: "Telugu", nativeName: "తెలుగు", color: tokens.color.langTelugu.val },
  { id: "tamil", name: "Tamil", nativeName: "தமிழ்", color: tokens.color.langTamil.val },
  { id: "bhojpuri", name: "Bhojpuri", nativeName: "भोजपुरी", color: tokens.color.langBhojpuri.val },
  { id: "bengali", name: "Bengali", nativeName: "বাংলা", color: tokens.color.langBengali.val },
  { id: "gujarati", name: "Gujarati", nativeName: "ગુજરાતી", color: tokens.color.langGujarati.val },
  { id: "marathi", name: "Marathi", nativeName: "मराठी", color: tokens.color.langMarathi.val },
  { id: "kannada", name: "Kannada", nativeName: "ಕನ್ನಡ", color: tokens.color.langKannada.val },
  { id: "malayalam", name: "Malayalam", nativeName: "മലയാളം", color: tokens.color.langMalayalam.val },
  { id: "haryanvi", name: "Haryanvi", nativeName: "हरियाणवी", color: tokens.color.langHaryanvi.val },
  { id: "rajasthani", name: "Rajasthani", nativeName: "राजस्थानी", color: tokens.color.langRajasthani.val },
  { id: "odia", name: "Odia", nativeName: "ଓଡ଼ିଆ", color: tokens.color.langOdia.val },
  { id: "assamese", name: "Assamese", nativeName: "অসমীয়া", color: tokens.color.langAssamese.val },
  { id: "sanskrit", name: "Sanskrit", nativeName: "संस्कृतम्", color: tokens.color.langSanskrit.val },
];

export const LANGUAGES_STORAGE_KEY = "@drift:selected_languages";
export const ONBOARDING_COMPLETED_KEY = "@drift:language_onboarding_completed";

export const DEFAULT_LANGUAGES = ["hindi"];

/**
 * Validates and normalizes selected languages.
 * Fallback to 'hindi' if nothing provided or invalid.
 */
export function normalizeLanguages(languages?: string[] | null): string[] {
  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    return DEFAULT_LANGUAGES;
  }
  const validIds = new Set(SUPPORTED_LANGUAGES.map((l) => l.id));
  const filtered = languages
    .map((l) => (typeof l === "string" ? l.trim().toLowerCase() : ""))
    .filter((id) => validIds.has(id));
  return filtered.length > 0 ? filtered : DEFAULT_LANGUAGES;
}

/**
 * Builds the required cookie string with the user's selected languages encoded.
 */
export function buildCookieHeader(languages: string[]): string {
  const normalized = normalizeLanguages(languages);
  const encodedLanguages = encodeURIComponent(normalized.join(","));
  return `_pl=web6dot0-; DL=english; B=23a9ad0f2eb7e2c904f14a7ac703b789; CT=MjA3ODc4OTkxNQ%3D%3D; geo=122.179.10.18%2CIN%2CKarnataka%2CBengaluru%2C562130; mm_latlong=12.9753%2C77.591; CH=G03%2CA07%2CO00%2CL03; L=${encodedLanguages}`;
}

export async function getStoredLanguages(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeLanguages(parsed);
  } catch (error) {
    console.warn("Failed to load stored languages from AsyncStorage", error);
    return [];
  }
}

export async function persistLanguages(languages: string[]): Promise<void> {
  try {
    const normalized = normalizeLanguages(languages);
    await AsyncStorage.setItem(LANGUAGES_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn("Failed to persist languages to AsyncStorage", error);
  }
}

export async function getIsOnboardingCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return val === "true";
  } catch (error) {
    console.warn("Failed to get onboarding state", error);
    return false;
  }
}

export async function setIsOnboardingCompleted(completed = true): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? "true" : "false");
  } catch (error) {
    console.warn("Failed to persist onboarding state", error);
  }
}
