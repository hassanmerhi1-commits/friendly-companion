import { useSettingsStore } from '@/stores/settings-store';

/**
 * React hook - returns the company logo base64 string or null
 */
export function useCompanyLogo(): string | null {
  const logo = useSettingsStore(state => state.settings.companyLogo);
  return logo || null;
}

/**
 * Non-reactive getter - for use outside React components
 */
export function getCompanyLogo(): string | null {
  return useSettingsStore.getState().settings.companyLogo || null;
}
