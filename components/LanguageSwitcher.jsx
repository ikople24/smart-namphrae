"use client";

import { useLanguageStore } from "@/stores/useLanguageStore";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ variant = "default" }) {
  const { language, setLanguage } = useLanguageStore();

  const handleToggle = () => {
    setLanguage(language === "th" ? "en" : "th");
  };

  // Compact variant - just flags
  if (variant === "compact") {
    return (
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:scale-105"
        title={language === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      >
        <span className="text-lg">{language === "th" ? "🇹🇭" : "🇬🇧"}</span>
        <span className="text-xs font-medium text-gray-700">
          {language === "th" ? "TH" : "EN"}
        </span>
      </button>
    );
  }

  // Icon only variant
  if (variant === "icon") {
    return (
      <button
        onClick={handleToggle}
        className="p-2 rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:scale-105"
        title={language === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      >
        <Globe size={18} className="text-gray-600" />
      </button>
    );
  }

  // Default variant - with text
  return (
    <div className="flex items-center gap-1 bg-white/80 rounded-full p-1 border border-gray-200 shadow-sm">
      <button
        onClick={() => setLanguage("th")}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          language === "th"
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span>🇹🇭</span>
        <span>ไทย</span>
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          language === "en"
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
