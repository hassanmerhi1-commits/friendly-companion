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

/** Never persist empty values over existing branding (name / logo / NIF). */
const PROTECTED_BRANDING_KEYS: (keyof CompanySettings)[] = ['companyName', 'companyLogo', 'nif'];

const BRANDING_CACHE_KEY = 'payrollao-branding-cache-v1';

type BrandingCache = Partial<Pick<CompanySettings, 'companyName' | 'companyLogo' | 'nif' | 'address' | 'city' | 'province' | 'municipality' | 'phone' | 'phone2' | 'email' | 'website' | 'bank' | 'iban'>>;

function readBrandingCache(): BrandingCache | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!String(parsed.companyName || '').trim()) return null;
    return parsed as BrandingCache;
  } catch {
    return null;
  }
}

function writeBrandingCache(settings: CompanySettings) {
  if (!String(settings.companyName || '').trim()) return;
  try {
    const payload: BrandingCache = {
      companyName: settings.companyName,
      companyLogo: settings.companyLogo || '',
      nif: settings.nif || '',
      address: settings.address || '',
      city: settings.city || '',
      province: settings.province || '',
      municipality: settings.municipality || '',
      phone: settings.phone || '',
      phone2: settings.phone2 || '',
      email: settings.email || '',
      website: settings.website || '',
      bank: settings.bank || '',
      iban: settings.iban || '',
    };
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Settings] Could not cache branding:', err);
  }
}

async function healBrandingFromCache(loaded: CompanySettings): Promise<CompanySettings> {
  if (String(loaded.companyName || '').trim()) {
    writeBrandingCache(loaded);
    return loaded;
  }
  const cache = readBrandingCache();
  if (!cache?.companyName) return loaded;

  console.warn('[Settings] DB branding empty — healing from local cache');
  const healed: CompanySettings = {
    ...loaded,
    companyName: cache.companyName || '',
    companyLogo: cache.companyLogo || loaded.companyLogo || '',
    nif: cache.nif || loaded.nif || '',
    address: cache.address || loaded.address || '',
    city: cache.city || loaded.city || '',
    province: cache.province || loaded.province || '',
    municipality: cache.municipality || loaded.municipality || '',
    phone: cache.phone || loaded.phone || '',
    phone2: cache.phone2 || loaded.phone2 || '',
    email: cache.email || loaded.email || '',
    website: cache.website || loaded.website || '',
    bank: cache.bank || loaded.bank || '',
    iban: cache.iban || loaded.iban || '',
  };
  const now = new Date().toISOString();
  const keys: (keyof BrandingCache)[] = [
    'companyName', 'companyLogo', 'nif', 'address', 'city', 'province',
    'municipality', 'phone', 'phone2', 'email', 'website', 'bank', 'iban',
  ];
  for (const key of keys) {
    const val = healed[key];
    if (val === undefined || val === null) continue;
    if (!String(val).trim() && key !== 'phone2' && key !== 'email' && key !== 'website') continue;
    try {
      await liveInsert('settings', {
        key,
        value: String(val),
        updated_at: now,
      });
    } catch (err) {
      console.error(`[Settings] Heal write failed for ${key}:`, err);
    }
  }
  writeBrandingCache(healed);
  return healed;
}

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
        const cache = readBrandingCache();
        if (cache?.companyName) {
          const healed = await healBrandingFromCache(defaultSettings);
          set({ settings: healed, isLoaded: true });
          console.log('[Settings] Empty DB — restored branding from cache');
          return;
        }
        set({ isLoaded: true });
        return;
      }
      const settingsMap: Record<string, string> = {};
      for (const row of rows) {
        settingsMap[row.key] = row.value;
      }
      let loaded = mapSettingsFromRows(settingsMap);
      loaded = await healBrandingFromCache(loaded);
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

    // Never let empty branding overwrite good values in memory or DB
    for (const key of PROTECTED_BRANDING_KEYS) {
      if (
        Object.prototype.hasOwnProperty.call(newSettings, key) &&
        !String((newSettings as any)[key] ?? '').trim() &&
        String((previous as any)[key] ?? '').trim()
      ) {
        (merged as any)[key] = (previous as any)[key];
        console.warn(`[Settings] Refused empty overwrite of ${key}`);
      }
    }

    set({ settings: merged });
    writeBrandingCache(merged);
    const now = new Date().toISOString();

    // CRITICAL: only persist keys explicitly passed in newSettings.
    // Writing the full merged object on every partial update (e.g. category seed)
    // was wiping companyName/companyLogo in SQLite with empty defaults.
    const keysToWrite = Object.keys(newSettings) as (keyof CompanySettings)[];
    for (const key of keysToWrite) {
      const val = key === 'employeeCategories' ? merged.employeeCategories : merged[key];
      const serialized = serializeSettingValue(key, val);
      if (
        PROTECTED_BRANDING_KEYS.includes(key) &&
        !String(serialized).trim() &&
        String((previous as any)[key] ?? '').trim()
      ) {
        continue;
      }
      await liveInsert('settings', {
        key,
        value: serialized,
        updated_at: now,
      });
    }

    const changedKeys = keysToWrite.filter(
      (k) => JSON.stringify((previous as any)[k]) !== JSON.stringify((merged as any)[k])
    );
    if (changedKeys.length > 0) {
      const prevChanged: Record<string, any> = {};
      const newChanged: Record<string, any> = {};
      changedKeys.forEach((k) => {
        prevChanged[k] = (previous as any)[k];
        newChanged[k] = (merged as any)[k];
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
    // Never seed until settings finished loading — avoids racing empty defaults into DB
    if (!get().isLoaded) return;
    try {
      const { useEmployeeStore } = await import('./employee-store');
      const fromEmployees = useEmployeeStore
        .getState()
        .employees.map((e) => e.category || e.position || '')
        .filter(Boolean);
      const seeded = dedupeCategories(fromEmployees);
      if (seeded.length === 0) return;
      // Partial update only — must not touch companyName/companyLogo
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
    let incoming = mapSettingsFromRows(settingsMap);
    const current = useSettingsStore.getState().settings;
    // If a push arrives with empty branding but we already have good values, keep ours
    for (const key of PROTECTED_BRANDING_KEYS) {
      if (!String((incoming as any)[key] ?? '').trim() && String((current as any)[key] ?? '').trim()) {
        (incoming as any)[key] = (current as any)[key];
      }
    }
    if (String(incoming.companyName || '').trim()) {
      writeBrandingCache(incoming);
    }
    useSettingsStore.setState({ settings: incoming, isLoaded: true });
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
