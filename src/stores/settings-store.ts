import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

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
  updateSettings: (settings: Partial<CompanySettings>) => void;
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

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'payroll-settings',
      storage: createJSONStorage(() => createElectronStorage('settings')),
    }
  )
);