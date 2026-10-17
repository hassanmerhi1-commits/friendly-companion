import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

/**
 * Daily overtime register (folha-bound).
 * Record OT day-by-day in Attendance; payroll Calcular sums hours for the period
 * and adds amounts to gross (like bulk attendance → absences).
 * Separate from overtime_payments (daily cash receipts).
 */

export interface OvertimeRegisterEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  hoursNormal: number;
  hoursNight: number;
  hoursHoliday: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeHoursSummary {
  hoursNormal: number;
  hoursNight: number;
  hoursHoliday: number;
  totalHours: number;
  dayCount: number;
}

interface OvertimeRegisterState {
  entries: OvertimeRegisterEntry[];
  isLoaded: boolean;

  loadEntries: () => Promise<void>;
  saveEntry: (
    data: Omit<OvertimeRegisterEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<OvertimeRegisterEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
  clearEmployeeDate: (employeeId: string, date: string) => Promise<void>;

  getEntryForEmployeeDate: (employeeId: string, date: string) => OvertimeRegisterEntry | undefined;
  getEntriesForDate: (date: string) => OvertimeRegisterEntry[];
  getHoursForEmployeePeriod: (employeeId: string, month: number, year: number) => OvertimeHoursSummary;
  getEntriesForPeriod: (month: number, year: number) => OvertimeRegisterEntry[];
}

function mapDbRow(row: any): OvertimeRegisterEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    hoursNormal: Number(row.hours_normal) || 0,
    hoursNight: Number(row.hours_night) || 0,
    hoursHoliday: Number(row.hours_holiday) || 0,
    notes: row.notes || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapToDbRow(entry: OvertimeRegisterEntry): Record<string, any> {
  return {
    id: entry.id,
    employee_id: entry.employeeId,
    date: entry.date,
    hours_normal: entry.hoursNormal,
    hours_night: entry.hoursNight,
    hours_holiday: entry.hoursHoliday,
    notes: entry.notes || null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

function periodPrefix(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export const useOvertimeRegisterStore = create<OvertimeRegisterState>()((set, get) => ({
  entries: [],
  isLoaded: false,

  loadEntries: async () => {
    try {
      const rows = await liveGetAll<any>('overtime_registers');
      const entries = rows.map(mapDbRow);
      set({ entries, isLoaded: true });
      console.log('[OvertimeRegister] Loaded', entries.length, 'entries');
    } catch (error) {
      console.error('[OvertimeRegister] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  saveEntry: async (data) => {
    const hoursNormal = Math.max(0, Number(data.hoursNormal) || 0);
    const hoursNight = Math.max(0, Number(data.hoursNight) || 0);
    const hoursHoliday = Math.max(0, Number(data.hoursHoliday) || 0);
    const total = hoursNormal + hoursNight + hoursHoliday;
    const now = new Date().toISOString();
    const existing = get().getEntryForEmployeeDate(data.employeeId, data.date);

    // Empty row → delete if existed
    if (total === 0 && !data.notes) {
      if (existing) {
        await get().deleteEntry(existing.id);
      }
      return null;
    }

    if (existing) {
      const updated: OvertimeRegisterEntry = {
        ...existing,
        hoursNormal,
        hoursNight,
        hoursHoliday,
        notes: data.notes,
        updatedAt: now,
      };
      const { id: _id, ...row } = mapToDbRow(updated);
      await liveUpdate('overtime_registers', existing.id, row);
      set({
        entries: get().entries.map((e) => (e.id === existing.id ? updated : e)),
      });
      return updated;
    }

    const created: OvertimeRegisterEntry = {
      employeeId: data.employeeId,
      date: data.date,
      hoursNormal,
      hoursNight,
      hoursHoliday,
      notes: data.notes,
      id: `otr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    await liveInsert('overtime_registers', mapToDbRow(created));
    set({ entries: [...get().entries, created] });
    return created;
  },

  deleteEntry: async (id) => {
    const ok = await liveDelete('overtime_registers', id);
    if (ok) {
      set({ entries: get().entries.filter((e) => e.id !== id) });
    }
  },

  clearEmployeeDate: async (employeeId, date) => {
    const existing = get().getEntryForEmployeeDate(employeeId, date);
    if (existing) await get().deleteEntry(existing.id);
  },

  getEntryForEmployeeDate: (employeeId, date) =>
    get().entries.find((e) => e.employeeId === employeeId && e.date === date),

  getEntriesForDate: (date) => get().entries.filter((e) => e.date === date),

  getHoursForEmployeePeriod: (employeeId, month, year) => {
    const prefix = periodPrefix(month, year);
    const rows = get().entries.filter(
      (e) => e.employeeId === employeeId && e.date.startsWith(prefix)
    );
    const hoursNormal = rows.reduce((s, e) => s + e.hoursNormal, 0);
    const hoursNight = rows.reduce((s, e) => s + e.hoursNight, 0);
    const hoursHoliday = rows.reduce((s, e) => s + e.hoursHoliday, 0);
    return {
      hoursNormal,
      hoursNight,
      hoursHoliday,
      totalHours: hoursNormal + hoursNight + hoursHoliday,
      dayCount: rows.filter((e) => e.hoursNormal + e.hoursNight + e.hoursHoliday > 0).length,
    };
  },

  getEntriesForPeriod: (month, year) => {
    const prefix = periodPrefix(month, year);
    return get().entries.filter((e) => e.date.startsWith(prefix));
  },
}));

let unsubscribe: (() => void) | null = null;

export function initOvertimeRegisterSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('overtime_registers', (_, rows) => {
    const entries = (rows || []).map(mapDbRow);
    useOvertimeRegisterStore.setState({ entries, isLoaded: true });
  });

  const unsubChange = onDataChange((table) => {
    if (table === 'overtime_registers') {
      useOvertimeRegisterStore.getState().loadEntries();
    }
  });

  unsubscribe = () => {
    unsubSync();
    unsubChange();
  };
}

export function cleanupOvertimeRegisterSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
