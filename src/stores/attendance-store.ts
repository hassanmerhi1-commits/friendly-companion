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

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function filterTodayRecords(records: AttendanceRecord[], employeeId: string): AttendanceRecord[] {
  const today = getLocalToday();
  return records.filter((r) => r.employeeId === employeeId && r.date === today);
}

function resolveTodayAttendance(records: AttendanceRecord[], employeeId: string): AttendanceRecord | undefined {
  const dayRecords = filterTodayRecords(records, employeeId);
  if (dayRecords.length === 0) return undefined;
  const open = dayRecords.find((r) => r.clockIn && !r.clockOut);
  if (open) return open;
  const punched = dayRecords
    .filter((r) => r.clockIn)
    .sort((a, b) => (b.clockIn || '').localeCompare(a.clockIn || ''));
  if (punched.length > 0) return punched[0];
  return dayRecords[0];
}

function recalculateFromClock(record: AttendanceRecord): AttendanceRecord {
  const scheduledStart = record.scheduledStart || '08:00';
  const graceMinutes = 10;
  let lateMinutes = 0;
  let workedMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let status: AttendanceStatus = record.clockIn ? 'clocked_in' : 'absent';

  if (record.clockIn) {
    const clockInTimeStr = extractTimeFromISO(record.clockIn);
    const scheduledMinutes = timeToMinutes(scheduledStart);
    const actualMinutes = timeToMinutes(clockInTimeStr);
    lateMinutes = Math.max(0, actualMinutes - scheduledMinutes - graceMinutes);
    if (!record.clockOut) {
      status = lateMinutes > 0 ? 'late' : 'clocked_in';
    }
  }

  if (record.clockIn && record.clockOut) {
    const clockInTimeStr = extractTimeFromISO(record.clockIn);
    const clockOutTimeStr = extractTimeFromISO(record.clockOut);
    const totalMinutes = calculateMinutesDiff(clockInTimeStr, clockOutTimeStr);
    workedMinutes = Math.max(0, totalMinutes - record.breakDurationMinutes);
    const scheduledEndMinutes = timeToMinutes(record.scheduledEnd);
    const actualEndMinutes = timeToMinutes(clockOutTimeStr);
    earlyLeaveMinutes = Math.max(0, scheduledEndMinutes - actualEndMinutes);
    overtimeMinutes = Math.max(0, workedMinutes - 8 * 60);
    status = 'clocked_out';
    if (earlyLeaveMinutes > 10) status = 'early_leave';
    else if (lateMinutes > 0) status = 'late';
  }

  return { ...record, lateMinutes, workedMinutes, earlyLeaveMinutes, overtimeMinutes, status };
}

function mergeRecordInState(records: AttendanceRecord[], updated: AttendanceRecord): AttendanceRecord[] {
  const idx = records.findIndex((r) => r.id === updated.id);
  if (idx >= 0) {
    const next = [...records];
    next[idx] = updated;
    return next;
  }
  return [...records, updated];
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
  setManualClockTime: (
    employeeId: string,
    field: 'clockIn' | 'clockOut',
    timeHHmm: string
  ) => Promise<boolean>;
  clearTodayPunch: (employeeId: string) => Promise<boolean>;
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
    const today = getLocalToday();
    const clockInTime = now.toISOString();
    const dayRecords = filterTodayRecords(get().records, employeeId);

    if (dayRecords.some((r) => r.clockIn && !r.clockOut)) {
      return null;
    }
    if (dayRecords.some((r) => r.clockIn && r.clockOut)) {
      return null;
    }

    const placeholder = dayRecords.find((r) => !r.clockIn);
    const base = {
      scheduledStart: '08:00',
      scheduledEnd: '17:00',
      breakDurationMinutes: 60,
    };

    if (placeholder) {
      const updated = recalculateFromClock({
        ...placeholder,
        ...base,
        clockIn: clockInTime,
        clockOut: undefined,
        notes: notes || placeholder.notes,
        updatedAt: now.toISOString(),
      });
      const { id, ...row } = mapAttendanceToDbRow(updated);
      const ok = await liveUpdate('attendance', id, row);
      if (!ok) return null;
      set({ records: mergeRecordInState(get().records, updated) });
      return updated;
    }

    const newRecord = recalculateFromClock({
      id: generateId(),
      employeeId,
      date: today,
      clockIn: clockInTime,
      clockOut: undefined,
      status: 'clocked_in',
      ...base,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const ok = await liveInsert('attendance', mapAttendanceToDbRow(newRecord));
    if (!ok) return null;
    set({ records: [...get().records, newRecord] });
    return newRecord;
  },

  clockOut: async (employeeId, notes) => {
    const now = new Date();
    const clockOutTime = now.toISOString();
    const existing = filterTodayRecords(get().records, employeeId).find(
      (r) => r.clockIn && !r.clockOut
    );

    if (!existing) {
      return null;
    }

    const updatedNotes = notes
      ? existing.notes
        ? `${existing.notes}; ${notes}`
        : notes
      : existing.notes;

    const updated = recalculateFromClock({
      ...existing,
      clockOut: clockOutTime,
      notes: updatedNotes,
      updatedAt: now.toISOString(),
    });

    const { id, ...updateData } = mapAttendanceToDbRow(updated);
    const ok = await liveUpdate('attendance', existing.id, updateData);
    if (!ok) return null;
    set({ records: mergeRecordInState(get().records, updated) });
    return updated;
  },

  updateAttendance: async (id, updates) => {
    const now = new Date().toISOString();
    const current = get().records.find((r) => r.id === id);
    if (!current) return;

    const updated = recalculateFromClock({ ...current, ...updates, updatedAt: now });
    const { id: _, ...row } = mapAttendanceToDbRow(updated);
    const ok = await liveUpdate('attendance', id, row);
    if (ok) {
      set({ records: mergeRecordInState(get().records, updated) });
    }
  },

  setManualClockTime: async (employeeId, field, timeHHmm) => {
    const [h, m] = timeHHmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;

    const now = new Date();
    const today = getLocalToday();
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const iso = d.toISOString();

    let record = resolveTodayAttendance(get().records, employeeId);
    const base = {
      scheduledStart: '08:00',
      scheduledEnd: '17:00',
      breakDurationMinutes: 60,
    };

    if (!record) {
      const created = recalculateFromClock({
        id: generateId(),
        employeeId,
        date: today,
        clockIn: field === 'clockIn' ? iso : undefined,
        clockOut: field === 'clockOut' ? iso : undefined,
        status: 'clocked_in',
        ...base,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const ok = await liveInsert('attendance', mapAttendanceToDbRow(created));
      if (!ok) return false;
      set({ records: [...get().records, created] });
      return true;
    }

    const patched = recalculateFromClock({
      ...record,
      [field]: iso,
      updatedAt: now.toISOString(),
    });
    const { id, ...row } = mapAttendanceToDbRow(patched);
    const ok = await liveUpdate('attendance', id, row);
    if (!ok) return false;
    set({ records: mergeRecordInState(get().records, patched) });
    return true;
  },

  deleteAttendance: async (id) => {
    const ok = await liveDelete('attendance', id);
    if (ok) {
      set({ records: get().records.filter((r) => r.id !== id) });
    }
  },

  clearTodayPunch: async (employeeId) => {
    const dayRecords = filterTodayRecords(get().records, employeeId);
    if (dayRecords.length === 0) return false;

    const ids = new Set(dayRecords.map((r) => r.id));
    for (const id of ids) {
      const ok = await liveDelete('attendance', id);
      if (!ok) return false;
    }
    set({ records: get().records.filter((r) => !ids.has(r.id)) });
    return true;
  },

  getAttendanceByEmployee: (employeeId) => 
    get().records.filter(r => r.employeeId === employeeId),

  getAttendanceByDate: (date) => 
    get().records.filter(r => r.date === date),

  getAttendanceByEmployeeAndDate: (employeeId, date) =>
    get().records.find(r => r.employeeId === employeeId && r.date === date),

  getTodayAttendance: (employeeId) => resolveTodayAttendance(get().records, employeeId),

  isEmployeeClockedIn: (employeeId) =>
    filterTodayRecords(get().records, employeeId).some((r) => r.clockIn && !r.clockOut),

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
