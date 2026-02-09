import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/src/locales/en/translation.json";
import fr from "@/src/locales/fr/translation.json";
import es from "@/src/locales/es/translation.json";
import de from "@/src/locales/de/translation.json";
import ja from "@/src/locales/ja/translation.json";
import ar from "@/src/locales/ar/translation.json";
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  ja: { translation: ja },
  ar: { translation: ar },
};

export const initI18n = async () => {
  // Initialize i18n with default language
  // Language will be synced from Redux in _layout.tsx after rehydration
  i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

  return i18n;
};
