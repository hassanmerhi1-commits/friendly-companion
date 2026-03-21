import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

/**
 * Daily Attendance Store
 * 
 * Used by shop/branch users to mark daily attendance (Present/Absent/Late).
 * Daily records are auto-aggregated into monthly totals for the bulk_attendance table.
 */

export type DailyStatus = 'present' | 'absent' | 'late' | 'justified';

export interface DailyAttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: DailyStatus;
  delayHours: number; // Only for 'late' status
  notes?: string;
  markedBy: string; // userId who marked
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyAttendanceState {
  records: DailyAttendanceRecord[];
  isLoaded: boolean;

  loadRecords: () => Promise<void>;
  markAttendance: (data: Omit<DailyAttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecord: (id: string, data: Partial<DailyAttendanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  getRecordsForDate: (date: string) => DailyAttendanceRecord[];
  getRecordsForEmployee: (employeeId: string, month: number, year: number) => DailyAttendanceRecord[];
  getRecordForEmployeeDate: (employeeId: string, date: string) => DailyAttendanceRecord | undefined;

  // Aggregation: compute monthly totals from daily records
  getMonthlyAggregation: (employeeId: string, month: number, year: number) => {
    absenceDays: number;
    justifiedAbsenceDays: number;
    delayHours: number;
    presentDays: number;
    totalMarked: number;
  };
}

function mapDbRow(row: any): DailyAttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    status: row.status || 'present',
    delayHours: row.delay_hours || 0,
    notes: row.notes || undefined,
    markedBy: row.marked_by || '',
    branchId: row.branch_id || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapToDbRow(record: DailyAttendanceRecord): Record<string, any> {
  return {
    id: record.id,
    employee_id: record.employeeId,
    date: record.date,
    status: record.status,
    delay_hours: record.delayHours,
    notes: record.notes || null,
    marked_by: record.markedBy,
    branch_id: record.branchId || null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export const useDailyAttendanceStore = create<DailyAttendanceState>()((set, get) => ({
  records: [],
  isLoaded: false,

  loadRecords: async () => {
    try {
      const rows = await liveGetAll<any>('daily_attendance');
      const records = rows.map(mapDbRow);
      set({ records, isLoaded: true });
      console.log('[DailyAttendance] Loaded', records.length, 'records');
    } catch (error) {
      console.error('[DailyAttendance] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  markAttendance: async (data) => {
    const now = new Date().toISOString();
    const existing = get().getRecordForEmployeeDate(data.employeeId, data.date);

    if (existing) {
      const updated: DailyAttendanceRecord = {
        ...existing,
        ...data,
        updatedAt: now,
      };
      const { id, ...row } = mapToDbRow(updated);
      await liveUpdate('daily_attendance', existing.id, row);
    } else {
      const newRecord: DailyAttendanceRecord = {
        ...data,
        id: `daily_att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      await liveInsert('daily_attendance', mapToDbRow(newRecord));
    }
    await get().loadRecords();
  },

  updateRecord: async (id, data) => {
    const now = new Date().toISOString();
    const current = get().records.find(r => r.id === id);
    if (!current) return;
    const updated = { ...current, ...data, updatedAt: now };
    const { id: _, ...row } = mapToDbRow(updated);
    await liveUpdate('daily_attendance', id, row);
    await get().loadRecords();
  },

  deleteRecord: async (id) => {
    await liveDelete('daily_attendance', id);
    await get().loadRecords();
  },

  getRecordsForDate: (date) => {
    return get().records.filter(r => r.date === date);
  },

  getRecordsForEmployee: (employeeId, month, year) => {
    return get().records.filter(r => {
      const d = new Date(r.date);
      return r.employeeId === employeeId && (d.getMonth() + 1) === month && d.getFullYear() === year;
    });
  },

  getRecordForEmployeeDate: (employeeId, date) => {
    return get().records.find(r => r.employeeId === employeeId && r.date === date);
  },

  getMonthlyAggregation: (employeeId, month, year) => {
    const monthRecords = get().getRecordsForEmployee(employeeId, month, year);
    let absenceDays = 0;
    let justifiedAbsenceDays = 0;
    let delayHours = 0;
    let presentDays = 0;

    for (const r of monthRecords) {
      switch (r.status) {
        case 'present':
          presentDays++;
          break;
        case 'absent':
          absenceDays++;
          break;
        case 'justified':
          justifiedAbsenceDays++;
          break;
        case 'late':
          presentDays++;
          delayHours += r.delayHours;
          break;
      }
    }

    return { absenceDays, justifiedAbsenceDays, delayHours, presentDays, totalMarked: monthRecords.length };
  },
}));

// Sync listeners
let unsubscribe: (() => void) | null = null;

export function initDailyAttendanceSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('daily_attendance', (table, rows) => {
    console.log('[DailyAttendance] ← PUSH received:', rows.length);
    const records = rows.map(mapDbRow);
    useDailyAttendanceStore.setState({ records, isLoaded: true });
  });

  const unsubLegacy = onDataChange((table) => {
    if (table === 'daily_attendance') {
      useDailyAttendanceStore.getState().loadRecords();
    }
  });

  unsubscribe = () => { unsubSync(); unsubLegacy(); };
}

export function cleanupDailyAttendanceSync() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
