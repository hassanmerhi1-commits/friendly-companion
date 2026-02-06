import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGES, isRTL, type Language } from './config';
import { translations } from './translations';

// Re-export types
export type { Language };
export { LANGUAGES, isRTL };

// Legacy translation type for backward compatibility
type LegacyTranslations = typeof translations.pt | typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** New i18next translate function - use t('key.path') */
  translate: ReturnType<typeof useTranslation>['t'];
  /** Legacy translation object for backward compatibility - use t.key.path */
  t: LegacyTranslations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t: translate, i18n: i18nInstance } = useTranslation();
  const language = (i18nInstance.language || 'pt') as Language;

  // Get legacy translations - fallback to 'pt' or 'en' for other languages
  const legacyLang = language === 'pt' || language === 'en' ? language : 'en';
  const legacyT = translations[legacyLang];

  const setLanguage = (lang: Language) => {
    i18nInstance.changeLanguage(lang);
  };

  // Apply RTL direction on mount and language change
  useEffect(() => {
    const currentLang = (i18nInstance.language || 'pt') as Language;
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRTL(currentLang) ? 'rtl' : 'ltr';
    
    // Add/remove RTL class for CSS targeting
    if (isRTL(currentLang)) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [i18nInstance.language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      translate,
      t: legacyT,
      isRTL: isRTL(language)
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper function to get month name in current language
export function useMonthName(monthIndex: number): string {
  const { translate } = useLanguage();
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ] as const;
  return translate(`months.${monthKeys[monthIndex]}`);
}
