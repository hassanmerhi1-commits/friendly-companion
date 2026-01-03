import { create } from 'zustand';
import { liveGetAll, liveInsert, onTableSync, onDataChange } from '@/lib/db-live';

export interface CompanySettings {
  companyName: string;
  nif: string;
  address: string;
  city: string;
  province: string;
  municipality: string;
  bank: string;
  iban: string;
  payday: number;
  currency: string;
  emailPaymentProcessed: boolean;
  monthEndReminder: boolean;
  holidayAlerts: boolean;
  newEmployees: boolean;
}

interface SettingsStore {
  settings: CompanySettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
}

const defaultSettings: CompanySettings = {
  companyName: 'DISTRI-GOOD, LDA',
  nif: '5402155682',
  address: 'Estrada de Catete, Bairro Villa Nova n 320 B Viana',
  city: 'Viana',
  province: 'Luanda',
  municipality: 'Viana',
  bank: 'Banco Angolano de Investimentos',
  iban: 'AO06 0000 0000 0000 0000 0000 0',
  payday: 27,
  currency: 'AOA (Kwanza)',
  emailPaymentProcessed: true,
  monthEndReminder: true,
  holidayAlerts: false,
  newEmployees: true,
};

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
    settings: defaultSettings,
    isLoaded: false,

    loadSettings: async () => {
      try {
        const rows = await liveGetAll<any>('settings');
        if (rows.length === 0) { set({ isLoaded: true }); return; }
        const settingsMap: Record<string, string> = {};
        for (const row of rows) { settingsMap[row.key] = row.value; }
        const loaded: CompanySettings = {
          companyName: settingsMap.companyName || defaultSettings.companyName,
          nif: settingsMap.nif || defaultSettings.nif,
          address: settingsMap.address || defaultSettings.address,
          city: settingsMap.city || defaultSettings.city,
          province: settingsMap.province || defaultSettings.province,
          municipality: settingsMap.municipality || defaultSettings.municipality,
          bank: settingsMap.bank || defaultSettings.bank,
          iban: settingsMap.iban || defaultSettings.iban,
          payday: parseInt(settingsMap.payday, 10) || defaultSettings.payday,
          currency: settingsMap.currency || defaultSettings.currency,
          emailPaymentProcessed: settingsMap.emailPaymentProcessed === 'true',
          monthEndReminder: settingsMap.monthEndReminder === 'true',
          holidayAlerts: settingsMap.holidayAlerts === 'true',
          newEmployees: settingsMap.newEmployees === 'true',
        };
        set({ settings: loaded, isLoaded: true });
        console.log('[Settings] Loaded from DB');
      } catch (error) {
        console.error('[Settings] Error loading:', error);
        set({ isLoaded: true });
      }
    },

    updateSettings: async (newSettings) => {
      const merged = { ...get().settings, ...newSettings };
      set({ settings: merged });
      const now = new Date().toISOString();
      for (const [key, val] of Object.entries(merged)) {
        await liveInsert('settings', { key, value: String(val), updated_at: now });
      }
    },
  }));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initSettingsStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubSync = onTableSync('settings', (table, rows) => {
    console.log('[Settings] ← PUSH received:', rows.length, 'settings');
    // Settings uses key-value pairs, so we need to map them
    if (rows.length === 0) return;
    const settingsMap: Record<string, string> = {};
    for (const row of rows) { settingsMap[row.key] = row.value; }
    const loaded = {
      companyName: settingsMap.companyName || 'DISTRI-GOOD, LDA',
      nif: settingsMap.nif || '',
      address: settingsMap.address || '',
      city: settingsMap.city || '',
      province: settingsMap.province || '',
      municipality: settingsMap.municipality || '',
      bank: settingsMap.bank || '',
      iban: settingsMap.iban || '',
      payday: parseInt(settingsMap.payday, 10) || 27,
      currency: settingsMap.currency || 'AOA (Kwanza)',
      emailPaymentProcessed: settingsMap.emailPaymentProcessed === 'true',
      monthEndReminder: settingsMap.monthEndReminder === 'true',
      holidayAlerts: settingsMap.holidayAlerts === 'true',
      newEmployees: settingsMap.newEmployees === 'true',
    };
    useSettingsStore.setState({ settings: loaded, isLoaded: true });
  });
  
  // FALLBACK: Legacy notification
  const unsubLegacy = onDataChange((table) => {
    if (table === 'settings') {
      console.log('[Settings] Legacy notification, refreshing...');
      useSettingsStore.getState().loadSettings();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupSettingsStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
