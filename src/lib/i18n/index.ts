// i18n module - Multi-language support with RTL
import './config'; // Initialize i18next

export { LanguageProvider, useLanguage, useMonthName, LANGUAGES, isRTL } from './LanguageContext';
export type { Language } from './LanguageContext';

// Legacy exports for backward compatibility
// Components using the old translations object will need to migrate to useTranslation hook
export { translations, type TranslationKeys, type Translations } from './translations';
