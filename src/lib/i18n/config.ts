/**
 * i18n Configuration for PayrollAO
 * Supports: Portuguese (pt), English (en), Spanish (es), French (fr), Arabic (ar)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// Language configuration
export const LANGUAGES = {
  pt: { name: 'Português', flag: '🇦🇴', dir: 'ltr' as const },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr' as const },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr' as const },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' as const },
} as const;

export type Language = keyof typeof LANGUAGES;

export const isRTL = (lang: Language): boolean => LANGUAGES[lang].dir === 'rtl';

const STORAGE_KEY = 'payrollao-language';

// Get stored language or default
const getStoredLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && stored in LANGUAGES) {
      return stored;
    }
  }
  return 'pt'; // Default to Portuguese
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Store language preference when changed
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lng);
    
    // Update document direction for RTL languages
    const lang = lng as Language;
    document.documentElement.lang = lng;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }
});

export default i18n;
