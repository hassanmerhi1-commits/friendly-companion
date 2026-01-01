import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, onDataChange } from '@/lib/db-live';

export interface HolidayRecord {
  employeeId: string;
  year: number;
  daysUsed: number;
  startDate?: string;
  endDate?: string;
  holidayMonth?: number;
  subsidyPaidInMonth?: number;
  subsidyPaidInYear?: number;
  notes?: string;
}

interface HolidayState {
  records: HolidayRecord[];
  isLoaded: boolean;
  loadHolidays: () => Promise<void>;
  addOrUpdateRecord: (record: HolidayRecord) => Promise<void>;
  getRecordsForYear: (year: number) => HolidayRecord[];
  getRecordForEmployee: (employeeId: string, year: number) => HolidayRecord | undefined;
  saveRecords: (records: HolidayRecord[]) => Promise<void>;
  getEmployeesForSubsidyPayment: (year: number, month: number) => string[];
  markSubsidyPaid: (employeeId: string, year: number, paidInMonth: number, paidInYear: number) => Promise<void>;
  isSubsidyPaid: (employeeId: string, year: number) => boolean;
}

function mapDbRowToHoliday(row: any): HolidayRecord {
  return {
    employeeId: row.employee_id,
    year: row.year,
    daysUsed: row.days_used || 0,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    holidayMonth: row.start_date ? new Date(row.start_date).getMonth() + 1 : undefined,
    subsidyPaidInMonth: row.subsidy_paid_month || undefined,
    subsidyPaidInYear: row.subsidy_paid_year || undefined,
    notes: undefined,
  };
}

function mapHolidayToDbRow(h: HolidayRecord): Record<string, any> {
  return {
    id: `${h.employeeId}-${h.year}`,
    employee_id: h.employeeId,
    year: h.year,
    days_used: h.daysUsed,
    start_date: h.startDate || null,
    end_date: h.endDate || null,
    subsidy_paid: h.subsidyPaidInMonth ? 1 : 0,
    subsidy_paid_month: h.subsidyPaidInMonth || null,
    subsidy_paid_year: h.subsidyPaidInYear || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const useHolidayStore = create<HolidayState>()((set, get) => {
  // Subscribe to data changes for auto-refresh
  onDataChange((table) => {
    if (table === 'holidays') {
      console.log('[Holidays] Data changed, refreshing...');
      get().loadHolidays();
    }
  });

  return {
    records: [],
    isLoaded: false,

    loadHolidays: async () => {
      try {
        const rows = await liveGetAll<any>('holidays');
        const records = rows.map(mapDbRowToHoliday);
        set({ records, isLoaded: true });
        console.log('[Holidays] Loaded', records.length, 'holiday records from DB');
      } catch (error) {
        console.error('[Holidays] Error loading:', error);
        set({ isLoaded: true });
      }
    },

    addOrUpdateRecord: async (record) => {
      let holidayMonth = record.holidayMonth;
      if (record.startDate && !holidayMonth) {
        holidayMonth = new Date(record.startDate).getMonth() + 1;
      }
      const updatedRecord = { ...record, holidayMonth };
      await liveInsert('holidays', mapHolidayToDbRow(updatedRecord));
    },

    getRecordsForYear: (year) => get().records.filter((r) => r.year === year),

    getRecordForEmployee: (employeeId, year) => get().records.find((r) => r.employeeId === employeeId && r.year === year),

    saveRecords: async (records) => {
      for (const newRecord of records) {
        let holidayMonth = newRecord.holidayMonth;
        if (newRecord.startDate && !holidayMonth) {
          holidayMonth = new Date(newRecord.startDate).getMonth() + 1;
        }
        const recordWithMonth = { ...newRecord, holidayMonth };
        await liveInsert('holidays', mapHolidayToDbRow(recordWithMonth));
      }
    },

    getEmployeesForSubsidyPayment: (year, month) => {
      const records = get().records;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextMonthYear = month === 12 ? year + 1 : year;
      return records.filter((r) => r.holidayMonth === nextMonth && r.year === nextMonthYear && !r.subsidyPaidInMonth).map((r) => r.employeeId);
    },

    markSubsidyPaid: async (employeeId, year, paidInMonth, paidInYear) => {
      const recordId = `${employeeId}-${year}`;
      await liveUpdate('holidays', recordId, { subsidy_paid: 1, subsidy_paid_month: paidInMonth, subsidy_paid_year: paidInYear, updated_at: new Date().toISOString() });
    },

    isSubsidyPaid: (employeeId, year) => {
      const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
      return !!record?.subsidyPaidInMonth;
    },
  };
});
