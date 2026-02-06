import { createContext, useContext, useEffect, ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, isRTL, type Language } from './config';

// Re-export types
export type { Language };
export { LANGUAGES, isRTL };

// Backward-compatible translation tree (most of the app still uses `t.nav.dashboard` style)
type TranslationTree = Record<string, any>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** New i18next translate function - use translate('key.path') */
  translate: ReturnType<typeof useTranslation>['t'];
  /** Backward compatible translation object - use t.key.path */
  t: TranslationTree;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function deepMerge(base: any, override: any): any {
  if (override === undefined || override === null) return base;
  if (base === undefined || base === null) return override;

  // If any side is an array, prefer override
  if (Array.isArray(base) || Array.isArray(override)) return override;

  if (typeof base === 'object' && typeof override === 'object') {
    const out: any = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge(base[key], override[key]);
    }
    return out;
  }

  return override;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t: translate, i18n: i18nInstance } = useTranslation();
  const language = (i18nInstance.language || 'pt') as Language;

  // IMPORTANT: Most components still use the object-based `t.*` API.
  // Previously we only supported pt/en and forced es/fr/ar to fallback to English.
  // This keeps the old API but sources it from the active i18next JSON resources.
  const tObj = useMemo(() => {
    const safeBundle = (lng: Language) => {
      try {
        return i18nInstance.getResourceBundle(lng, 'translation') as any;
      } catch {
        return {};
      }
    };

    const base = safeBundle('pt');
    const current = safeBundle(language);
    return deepMerge(base, current);
  }, [i18nInstance, language]);

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
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        translate,
        t: tObj,
        isRTL: isRTL(language),
      }}
    >
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
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ] as const;
  return translate(`months.${monthKeys[monthIndex]}`);
}

