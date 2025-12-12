import { useLanguageStore } from "@/stores/useLanguageStore";
import th from "@/locales/th.json";
import en from "@/locales/en.json";

const translations = { th, en };

type TranslationKeys = typeof th;

export function useTranslation() {
  const { language, setLanguage, toggleLanguage } = useLanguageStore();
  
  const t = translations[language] as TranslationKeys;

  // Helper function to get nested translation
  const translate = (key: string): string => {
    const keys = key.split(".");
    let result: unknown = t;
    
    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof result === "string" ? result : key;
  };

  return {
    t,
    translate,
    language,
    setLanguage,
    toggleLanguage,
    isThaiLanguage: language === "th",
    isEnglishLanguage: language === "en",
  };
}
