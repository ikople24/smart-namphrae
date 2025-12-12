import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "th" | "en";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "th", // ภาษาเริ่มต้นเป็นไทย
      setLanguage: (lang: Language) => set({ language: lang }),
      toggleLanguage: () => {
        const current = get().language;
        set({ language: current === "th" ? "en" : "th" });
      },
    }),
    {
      name: "language-storage", // key สำหรับ localStorage
    }
  )
);
