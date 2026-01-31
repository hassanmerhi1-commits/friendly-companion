import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

/**
 * Bulk Attendance Entry Store
 * 
 * Stores absence days and delay hours per employee per month.
 * These values are used to calculate deductions in payroll.
 * 
 * Deduction Formula (using FULL salary including bonuses):
 * - Daily Rate = (Base Salary + All Bonuses) / 30
 * - Hourly Rate = Daily Rate / 8
 * - Absence Deduction = Daily Rate × Absence Days
 * - Delay Deduction = Hourly Rate × Delay Hours
 */

export interface BulkAttendanceEntry {
  id: string;
  employeeId: string;
  month: number;  // 1-12
  year: number;
  absenceDays: number;
  delayHours: number;
  // Computed values (stored for reference/audit)
  dailyRate: number;
  hourlyRate: number;
  absenceDeduction: number;
  delayDeduction: number;
  totalDeduction: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface BulkAttendanceState {
  entries: BulkAttendanceEntry[];
  isLoaded: boolean;
  
  loadEntries: () => Promise<void>;
  saveEntry: (data: Omit<BulkAttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BulkAttendanceEntry>;
  updateEntry: (id: string, data: Partial<BulkAttendanceEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  
  getEntryForEmployee: (employeeId: string, month: number, year: number) => BulkAttendanceEntry | undefined;
  getEntriesForPeriod: (month: number, year: number) => BulkAttendanceEntry[];
  getTotalDeductionForEmployee: (employeeId: string, month: number, year: number) => number;
  
  // Bulk operations
  saveBulkEntries: (entries: Array<Omit<BulkAttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
}

function mapDbRowToEntry(row: any): BulkAttendanceEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    year: row.year,
    absenceDays: row.absence_days || 0,
    delayHours: row.delay_hours || 0,
    dailyRate: row.daily_rate || 0,
    hourlyRate: row.hourly_rate || 0,
    absenceDeduction: row.absence_deduction || 0,
    delayDeduction: row.delay_deduction || 0,
    totalDeduction: row.total_deduction || 0,
    notes: row.notes || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapEntryToDbRow(entry: BulkAttendanceEntry): Record<string, any> {
  return {
    id: entry.id,
    employee_id: entry.employeeId,
    month: entry.month,
    year: entry.year,
    absence_days: entry.absenceDays,
    delay_hours: entry.delayHours,
    daily_rate: entry.dailyRate,
    hourly_rate: entry.hourlyRate,
    absence_deduction: entry.absenceDeduction,
    delay_deduction: entry.delayDeduction,
    total_deduction: entry.totalDeduction,
    notes: entry.notes || null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

export const useBulkAttendanceStore = create<BulkAttendanceState>()((set, get) => ({
  entries: [],
  isLoaded: false,
  
  loadEntries: async () => {
    try {
      const rows = await liveGetAll<any>('bulk_attendance');
      const entries = rows.map(mapDbRowToEntry);
      set({ entries, isLoaded: true });
      console.log('[BulkAttendance] Loaded', entries.length, 'entries from DB');
    } catch (error) {
      console.error('[BulkAttendance] Error loading:', error);
      set({ isLoaded: true });
    }
  },
  
  saveEntry: async (data) => {
    const now = new Date().toISOString();
    const existingEntry = get().getEntryForEmployee(data.employeeId, data.month, data.year);
    
    if (existingEntry) {
      // Update existing entry
      const updated: BulkAttendanceEntry = {
        ...existingEntry,
        ...data,
        updatedAt: now,
      };
      const { id, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('bulk_attendance', existingEntry.id, row);
      await get().loadEntries();
      return updated;
    } else {
      // Create new entry
      const newEntry: BulkAttendanceEntry = {
        ...data,
        id: `bulk_att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      await liveInsert('bulk_attendance', mapEntryToDbRow(newEntry));
      await get().loadEntries();
      return newEntry;
    }
  },
  
  updateEntry: async (id, data) => {
    const now = new Date().toISOString();
    const current = get().entries.find(e => e.id === id);
    if (!current) return;
    
    const updated: BulkAttendanceEntry = { ...current, ...data, updatedAt: now };
    const { id: _, ...row } = mapEntryToDbRow(updated);
    await liveUpdate('bulk_attendance', id, row);
    await get().loadEntries();
  },
  
  deleteEntry: async (id) => {
    await liveDelete('bulk_attendance', id);
    await get().loadEntries();
  },
  
  getEntryForEmployee: (employeeId, month, year) => {
    return get().entries.find(
      e => e.employeeId === employeeId && e.month === month && e.year === year
    );
  },
  
  getEntriesForPeriod: (month, year) => {
    return get().entries.filter(e => e.month === month && e.year === year);
  },
  
  getTotalDeductionForEmployee: (employeeId, month, year) => {
    const entry = get().getEntryForEmployee(employeeId, month, year);
    return entry?.totalDeduction || 0;
  },
  
  saveBulkEntries: async (entriesToSave) => {
    const now = new Date().toISOString();
    
    for (const data of entriesToSave) {
      const existingEntry = get().getEntryForEmployee(data.employeeId, data.month, data.year);
      
      if (existingEntry) {
        // Update
        const updated: BulkAttendanceEntry = {
          ...existingEntry,
          ...data,
          updatedAt: now,
        };
        const { id, ...row } = mapEntryToDbRow(updated);
        await liveUpdate('bulk_attendance', existingEntry.id, row);
      } else {
        // Insert
        const newEntry: BulkAttendanceEntry = {
          ...data,
          id: `bulk_att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        await liveInsert('bulk_attendance', mapEntryToDbRow(newEntry));
      }
    }
    
    await get().loadEntries();
    console.log('[BulkAttendance] Saved', entriesToSave.length, 'entries');
  },
}));

// Subscribe to PUSH data from server
let unsubscribe: (() => void) | null = null;

export function initBulkAttendanceStoreSync() {
  if (unsubscribe) return;
  
  const unsubSync = onTableSync('bulk_attendance', (table, rows) => {
    console.log('[BulkAttendance] ← PUSH received:', rows.length, 'entries');
    const entries = rows.map(mapDbRowToEntry);
    useBulkAttendanceStore.setState({ entries, isLoaded: true });
  });
  
  const unsubLegacy = onDataChange((table) => {
    if (table === 'bulk_attendance') {
      console.log('[BulkAttendance] Legacy notification, refreshing...');
      useBulkAttendanceStore.getState().loadEntries();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupBulkAttendanceStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Calculate deduction using FULL salary (base + all bonuses)
 * Formula:
 * - Daily Rate = Full Monthly Salary / 30
 * - Hourly Rate = Daily Rate / 8
 * - Absence Deduction = Daily Rate × Absence Days
 * - Delay Deduction = Hourly Rate × Delay Hours
 */
export function calculateBulkAttendanceDeduction(
  fullMonthlySalary: number,
  absenceDays: number,
  delayHours: number
): {
  dailyRate: number;
  hourlyRate: number;
  absenceDeduction: number;
  delayDeduction: number;
  totalDeduction: number;
} {
  const dailyRate = fullMonthlySalary / 30;
  const hourlyRate = dailyRate / 8;
  const absenceDeduction = dailyRate * absenceDays;
  const delayDeduction = hourlyRate * delayHours;
  
  return {
    dailyRate,
    hourlyRate,
    absenceDeduction,
    delayDeduction,
    totalDeduction: absenceDeduction + delayDeduction,
  };
}

/**
 * Calculate full monthly salary including all bonuses
 */
export function calculateFullMonthlySalary(employee: {
  baseSalary: number;
  mealAllowance?: number;
  transportAllowance?: number;
  familyAllowance?: number;
  monthlyBonus?: number;
  holidaySubsidy?: number;
  otherAllowances?: number;
}): number {
  return (
    employee.baseSalary +
    (employee.mealAllowance || 0) +
    (employee.transportAllowance || 0) +
    (employee.familyAllowance || 0) +
    (employee.monthlyBonus || 0) +
    (employee.holidaySubsidy || 0) +
    (employee.otherAllowances || 0)
  );
}
