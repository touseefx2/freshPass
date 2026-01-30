import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/src/locales/en/translation.json";
import fr from "@/src/locales/fr/translation.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
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
