import { create } from 'zustand';
import type { AttendanceRecord, AttendanceStatus, AttendanceStats, OvertimeSummary, DEFAULT_SCHEDULE, LATE_GRACE_PERIOD } from '@/types/attendance';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';
import { LABOR_LAW } from '@/lib/angola-labor-law';

function generateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function calculateMinutesDiff(start: string, end: string): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return endMinutes - startMinutes;
}

function extractTimeFromISO(isoString: string): string {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function mapDbRowToAttendance(row: any): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    clockIn: row.clock_in || undefined,
    clockOut: row.clock_out || undefined,
    status: (row.status || 'absent') as AttendanceStatus,
    scheduledStart: row.scheduled_start || '08:00',
    scheduledEnd: row.scheduled_end || '17:00',
    breakDurationMinutes: row.break_duration_minutes || 60,
    lateMinutes: row.late_minutes || 0,
    earlyLeaveMinutes: row.early_leave_minutes || 0,
    workedMinutes: row.worked_minutes || 0,
    overtimeMinutes: row.overtime_minutes || 0,
    notes: row.notes || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapAttendanceToDbRow(a: AttendanceRecord): Record<string, any> {
  return {
    id: a.id,
    employee_id: a.employeeId,
    date: a.date,
    clock_in: a.clockIn || null,
    clock_out: a.clockOut || null,
    status: a.status,
    scheduled_start: a.scheduledStart,
    scheduled_end: a.scheduledEnd,
    break_duration_minutes: a.breakDurationMinutes,
    late_minutes: a.lateMinutes,
    early_leave_minutes: a.earlyLeaveMinutes,
    worked_minutes: a.workedMinutes,
    overtime_minutes: a.overtimeMinutes,
    notes: a.notes || null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

interface AttendanceStore {
  records: AttendanceRecord[];
  isLoaded: boolean;
  loadAttendance: () => Promise<void>;
  clockIn: (employeeId: string, notes?: string) => Promise<AttendanceRecord | null>;
  clockOut: (employeeId: string, notes?: string) => Promise<AttendanceRecord | null>;
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  getAttendanceByEmployee: (employeeId: string) => AttendanceRecord[];
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  getAttendanceByEmployeeAndDate: (employeeId: string, date: string) => AttendanceRecord | undefined;
  getTodayAttendance: (employeeId: string) => AttendanceRecord | undefined;
  getMonthlyStats: (employeeId: string, month: number, year: number) => AttendanceStats;
  getOvertimeSummary: (employeeId: string, month: number, year: number) => OvertimeSummary;
  isEmployeeClockedIn: (employeeId: string) => boolean;
  getAttendanceByPeriod: (employeeId: string, startDate: string, endDate: string) => AttendanceRecord[];
}

export const useAttendanceStore = create<AttendanceStore>()((set, get) => ({
  records: [],
  isLoaded: false,

  loadAttendance: async () => {
    try {
      const rows = await liveGetAll<any>('attendance');
      const records = rows.map(mapDbRowToAttendance);
      set({ records, isLoaded: true });
      console.log('[Attendance] Loaded', records.length, 'records from DB');
    } catch (error) {
      console.error('[Attendance] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  clockIn: async (employeeId, notes) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const clockInTime = now.toISOString();
    const clockInTimeStr = extractTimeFromISO(clockInTime);
    
    // Check if already clocked in today
    const existing = get().records.find(r => r.employeeId === employeeId && r.date === today);
    if (existing && existing.clockIn && !existing.clockOut) {
      console.log('[Attendance] Already clocked in');
      return null;
    }

    const scheduledStart = '08:00';
    const scheduledEnd = '17:00';
    const breakMinutes = 60;
    const graceMinutes = 10;
    
    // Calculate late minutes
    const scheduledMinutes = timeToMinutes(scheduledStart);
    const actualMinutes = timeToMinutes(clockInTimeStr);
    const lateMinutes = Math.max(0, actualMinutes - scheduledMinutes - graceMinutes);
    
    const status: AttendanceStatus = lateMinutes > 0 ? 'late' : 'clocked_in';
    
    const newRecord: AttendanceRecord = {
      id: generateId(),
      employeeId,
      date: today,
      clockIn: clockInTime,
      clockOut: undefined,
      status,
      scheduledStart,
      scheduledEnd,
      breakDurationMinutes: breakMinutes,
      lateMinutes,
      earlyLeaveMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await liveInsert('attendance', mapAttendanceToDbRow(newRecord));
    return newRecord;
  },

  clockOut: async (employeeId, notes) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const clockOutTime = now.toISOString();
    const clockOutTimeStr = extractTimeFromISO(clockOutTime);
    
    const existing = get().records.find(r => 
      r.employeeId === employeeId && r.date === today && r.clockIn && !r.clockOut
    );
    
    if (!existing) {
      console.log('[Attendance] Not clocked in');
      return null;
    }

    const clockInTimeStr = extractTimeFromISO(existing.clockIn!);
    
    // Calculate worked minutes (minus break)
    const totalMinutes = calculateMinutesDiff(clockInTimeStr, clockOutTimeStr);
    const workedMinutes = Math.max(0, totalMinutes - existing.breakDurationMinutes);
    
    // Calculate early leave
    const scheduledEndMinutes = timeToMinutes(existing.scheduledEnd);
    const actualEndMinutes = timeToMinutes(clockOutTimeStr);
    const earlyLeaveMinutes = Math.max(0, scheduledEndMinutes - actualEndMinutes);
    
    // Calculate overtime (above 8 hours = 480 minutes)
    const standardWorkMinutes = 8 * 60; // 8 hours
    const overtimeMinutes = Math.max(0, workedMinutes - standardWorkMinutes);
    
    // Determine status
    let status: AttendanceStatus = 'clocked_out';
    if (earlyLeaveMinutes > 10) {
      status = 'early_leave';
    } else if (existing.lateMinutes > 0) {
      status = 'late';
    }
    
    const updatedNotes = notes 
      ? existing.notes 
        ? `${existing.notes}; ${notes}` 
        : notes 
      : existing.notes;

    const { id, ...updateData } = mapAttendanceToDbRow({
      ...existing,
      clockOut: clockOutTime,
      workedMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      status,
      notes: updatedNotes,
      updatedAt: now.toISOString(),
    });

    await liveUpdate('attendance', existing.id, updateData);
    return { ...existing, clockOut: clockOutTime, workedMinutes, earlyLeaveMinutes, overtimeMinutes, status };
  },

  updateAttendance: async (id, updates) => {
    const now = new Date().toISOString();
    const current = get().records.find(r => r.id === id);
    if (!current) return;
    
    const updated = { ...current, ...updates, updatedAt: now };
    const { id: _, ...row } = mapAttendanceToDbRow(updated);
    await liveUpdate('attendance', id, row);
  },

  deleteAttendance: async (id) => {
    await liveDelete('attendance', id);
  },

  getAttendanceByEmployee: (employeeId) => 
    get().records.filter(r => r.employeeId === employeeId),

  getAttendanceByDate: (date) => 
    get().records.filter(r => r.date === date),

  getAttendanceByEmployeeAndDate: (employeeId, date) =>
    get().records.find(r => r.employeeId === employeeId && r.date === date),

  getTodayAttendance: (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    return get().records.find(r => r.employeeId === employeeId && r.date === today);
  },

  isEmployeeClockedIn: (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const record = get().records.find(r => r.employeeId === employeeId && r.date === today);
    return !!(record && record.clockIn && !record.clockOut);
  },

  getAttendanceByPeriod: (employeeId, startDate, endDate) => {
    return get().records.filter(r => {
      if (r.employeeId !== employeeId) return false;
      return r.date >= startDate && r.date <= endDate;
    });
  },

  getMonthlyStats: (employeeId, month, year) => {
    const records = get().records.filter(r => {
      if (r.employeeId !== employeeId) return false;
      const date = new Date(r.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const presentDays = records.filter(r => r.status !== 'absent').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.lateMinutes > 0).length;
    const earlyLeaveDays = records.filter(r => r.earlyLeaveMinutes > 0).length;
    const totalWorkedMinutes = records.reduce((sum, r) => sum + r.workedMinutes, 0);
    const totalOvertimeMinutes = records.reduce((sum, r) => sum + r.overtimeMinutes, 0);

    return {
      totalDays: records.length,
      presentDays,
      absentDays,
      lateDays,
      earlyLeaveDays,
      averageWorkedHours: presentDays > 0 ? (totalWorkedMinutes / presentDays) / 60 : 0,
      totalOvertimeHours: totalOvertimeMinutes / 60,
    };
  },

  getOvertimeSummary: (employeeId, month, year) => {
    const records = get().records.filter(r => {
      if (r.employeeId !== employeeId) return false;
      const date = new Date(r.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    // For now, all overtime is categorized as normal
    // Night and holiday overtime would need time-based logic
    const totalMinutes = records.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    const totalHours = totalMinutes / 60;

    return {
      employeeId,
      month,
      year,
      normalHours: totalHours,
      nightHours: 0, // Would need clock times to determine
      holidayHours: 0, // Would need holiday calendar
      totalHours,
      cumulativeNormalHoursThisMonth: totalHours,
    };
  },
}));

// Subscribe to PUSH data from server
let unsubscribe: (() => void) | null = null;

export function initAttendanceStoreSync() {
  if (unsubscribe) return;
  
  const unsubSync = onTableSync('attendance', (table, rows) => {
    console.log('[Attendance] ← PUSH received:', rows.length, 'records');
    const records = rows.map(mapDbRowToAttendance);
    useAttendanceStore.setState({ records, isLoaded: true });
  });
  
  const unsubLegacy = onDataChange((table) => {
    if (table === 'attendance') {
      console.log('[Attendance] Legacy notification, refreshing...');
      useAttendanceStore.getState().loadAttendance();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupAttendanceStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
