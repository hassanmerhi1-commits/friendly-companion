import { create } from 'zustand';
import { liveGetAll, liveInsert, onTableSync, onDataChange } from '@/lib/db-live';
import { logAudit } from '@/lib/audit-helper';
import {
  dedupeCategories,
  parseCategoriesSetting,
  serializeCategoriesSetting,
} from '@/lib/employee-categories';

export interface CompanySettings {
  companyName: string;
  companyLogo: string;
  nif: string;
  address: string;
  city: string;
  province: string;
  municipality: string;
  phone: string;
  phone2: string;
  email: string;
  website: string;
  bank: string;
  iban: string;
  payday: number;
  currency: string;
  emailPaymentProcessed: boolean;
  monthEndReminder: boolean;
  holidayAlerts: boolean;
  newEmployees: boolean;
  /** Company-defined job categories for employee dropdown */
  employeeCategories: string[];
}

interface SettingsStore {
  settings: CompanySettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
  addEmployeeCategory: (label: string) => Promise<string | null>;
  removeEmployeeCategory: (label: string) => Promise<void>;
  seedEmployeeCategoriesFromEmployees: () => Promise<void>;
}

const defaultSettings: CompanySettings = {
  companyName: '',
  companyLogo: '',
  nif: '',
  address: '',
  city: '',
  province: '',
  municipality: '',
  phone: '',
  phone2: '',
  email: '',
  website: '',
  bank: '',
  iban: '',
  payday: 27,
  currency: 'AOA (Kwanza)',
  emailPaymentProcessed: true,
  monthEndReminder: true,
  holidayAlerts: false,
  newEmployees: true,
  employeeCategories: [],
};

function mapSettingsFromRows(settingsMap: Record<string, string>): CompanySettings {
  return {
    companyName: settingsMap.companyName || defaultSettings.companyName,
    companyLogo: settingsMap.companyLogo || '',
    nif: settingsMap.nif || defaultSettings.nif,
    address: settingsMap.address || defaultSettings.address,
    city: settingsMap.city || defaultSettings.city,
    province: settingsMap.province || defaultSettings.province,
    municipality: settingsMap.municipality || defaultSettings.municipality,
    phone: settingsMap.phone || '',
    phone2: settingsMap.phone2 || '',
    email: settingsMap.email || '',
    website: settingsMap.website || '',
    bank: settingsMap.bank || defaultSettings.bank,
    iban: settingsMap.iban || defaultSettings.iban,
    payday: parseInt(settingsMap.payday, 10) || defaultSettings.payday,
    currency: settingsMap.currency || defaultSettings.currency,
    emailPaymentProcessed: settingsMap.emailPaymentProcessed === 'true',
    monthEndReminder: settingsMap.monthEndReminder === 'true',
    holidayAlerts: settingsMap.holidayAlerts === 'true',
    newEmployees: settingsMap.newEmployees === 'true',
    employeeCategories: parseCategoriesSetting(settingsMap.employeeCategories),
  };
}

function serializeSettingValue(key: string, val: unknown): string {
  if (key === 'employeeCategories') {
    return serializeCategoriesSetting(Array.isArray(val) ? (val as string[]) : parseCategoriesSetting(String(val ?? '')));
  }
  return String(val);
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const rows = await liveGetAll<any>('settings');
      if (rows.length === 0) {
        set({ isLoaded: true });
        return;
      }
      const settingsMap: Record<string, string> = {};
      for (const row of rows) {
        settingsMap[row.key] = row.value;
      }
      const loaded = mapSettingsFromRows(settingsMap);
      set({ settings: loaded, isLoaded: true });
      console.log('[Settings] Loaded from DB');
    } catch (error) {
      console.error('[Settings] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const previous = { ...get().settings };
    const merged: CompanySettings = {
      ...previous,
      ...newSettings,
      employeeCategories: dedupeCategories(
        newSettings.employeeCategories !== undefined
          ? newSettings.employeeCategories
          : previous.employeeCategories
      ),
    };
    set({ settings: merged });
    const now = new Date().toISOString();
    for (const [key, val] of Object.entries(merged)) {
      await liveInsert('settings', {
        key,
        value: serializeSettingValue(key, val),
        updated_at: now,
      });
    }

    const changedKeys = Object.keys(newSettings).filter(
      (k) => JSON.stringify((previous as any)[k]) !== JSON.stringify((newSettings as any)[k])
    );
    if (changedKeys.length > 0) {
      const prevChanged: Record<string, any> = {};
      const newChanged: Record<string, any> = {};
      changedKeys.forEach((k) => {
        prevChanged[k] = (previous as any)[k];
        newChanged[k] = (newSettings as any)[k];
      });
      logAudit({
        action: 'settings_updated',
        entityType: 'settings',
        entityId: 'company',
        description: `Configurações alteradas: ${changedKeys.join(', ')}`,
        previousValue: prevChanged,
        newValue: newChanged,
      });
    }
  },

  addEmployeeCategory: async (label: string) => {
    const { formatCategoryLabel, normalizeCategoryKey } = await import('@/lib/employee-categories');
    const formatted = formatCategoryLabel(label);
    if (!formatted) return null;
    const current = get().settings.employeeCategories || [];
    const key = normalizeCategoryKey(formatted);
    const existing = current.find((c) => normalizeCategoryKey(c) === key);
    if (existing) return existing;
    const next = dedupeCategories([...current, formatted]);
    await get().updateSettings({ employeeCategories: next });
    return formatted;
  },

  removeEmployeeCategory: async (label: string) => {
    const { normalizeCategoryKey } = await import('@/lib/employee-categories');
    const key = normalizeCategoryKey(label);
    const next = (get().settings.employeeCategories || []).filter(
      (c) => normalizeCategoryKey(c) !== key
    );
    await get().updateSettings({ employeeCategories: next });
  },

  seedEmployeeCategoriesFromEmployees: async () => {
    if ((get().settings.employeeCategories || []).length > 0) return;
    try {
      const { useEmployeeStore } = await import('./employee-store');
      const fromEmployees = useEmployeeStore
        .getState()
        .employees.map((e) => e.category || e.position || '')
        .filter(Boolean);
      const seeded = dedupeCategories(fromEmployees);
      if (seeded.length === 0) return;
      await get().updateSettings({ employeeCategories: seeded });
      console.log(`[Settings] Seeded ${seeded.length} employee categories from existing staff`);
    } catch (error) {
      console.error('[Settings] Category seed failed:', error);
    }
  },
}));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initSettingsStoreSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('settings', (table, rows) => {
    console.log('[Settings] ← PUSH received:', rows.length, 'settings');
    if (rows.length === 0) return;
    const settingsMap: Record<string, string> = {};
    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }
    useSettingsStore.setState({ settings: mapSettingsFromRows(settingsMap), isLoaded: true });
  });

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
