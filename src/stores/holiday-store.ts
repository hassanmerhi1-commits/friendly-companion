import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, onTableSync, onDataChange } from '@/lib/db-live';

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
  addOrUpdateRecord: (record: HolidayRecord) => Promise<{ success: boolean; error?: string }>;
  getRecordsForYear: (year: number) => HolidayRecord[];
  getRecordForEmployee: (employeeId: string, year: number) => HolidayRecord | undefined;
  saveRecords: (records: HolidayRecord[]) => Promise<{ success: boolean; errors: string[] }>;
  getEmployeesForSubsidyPayment: (year: number, month: number) => string[];
  markSubsidyPaid: (employeeId: string, year: number, paidInMonth: number, paidInYear: number) => Promise<void>;
  isSubsidyPaid: (employeeId: string, year: number) => boolean;
  hasHolidayRegisteredForYear: (employeeId: string, year: number) => boolean;
  canRegisterHoliday: (employeeId: string, year: number) => { allowed: boolean; reason?: string };
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

export const useHolidayStore = create<HolidayState>()((set, get) => ({
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
      const existingRecord = get().records.find(
        r => r.employeeId === record.employeeId && r.year === record.year
      );
      
      // If subsidy already paid, don't allow changes
      if (existingRecord?.subsidyPaidInMonth) {
        return { 
          success: false, 
          error: 'Férias já pagas para este ano / Holiday already paid for this year' 
        };
      }
      
      // If holiday dates already registered for this year, block duplicate registration
      if (existingRecord?.startDate && record.startDate && existingRecord.startDate !== record.startDate) {
        return {
          success: false,
          error: `Férias já registadas para ${record.year} (${new Date(existingRecord.startDate).toLocaleDateString('pt-AO')} - ${new Date(existingRecord.endDate!).toLocaleDateString('pt-AO')}). Não é possível registar novamente. / Holiday already registered for ${record.year}. Cannot register again.`
        };
      }
      
      let holidayMonth = record.holidayMonth;
      if (record.startDate && !holidayMonth) {
        holidayMonth = new Date(record.startDate).getMonth() + 1;
      }
      const updatedRecord = { ...record, holidayMonth };
      await liveInsert('holidays', mapHolidayToDbRow(updatedRecord));
      return { success: true };
    },

    getRecordsForYear: (year) => get().records.filter((r) => r.year === year),

    getRecordForEmployee: (employeeId, year) => get().records.find((r) => r.employeeId === employeeId && r.year === year),

    saveRecords: async (records) => {
      const errors: string[] = [];
      
      for (const newRecord of records) {
        // Check if this is a new holiday registration (has dates) for someone who already has paid holiday
        const existingRecord = get().records.find(
          r => r.employeeId === newRecord.employeeId && r.year === newRecord.year
        );
        
        // If subsidy already paid, skip this record
        if (existingRecord?.subsidyPaidInMonth && newRecord.startDate) {
          errors.push(`Funcionário já tem férias pagas em ${newRecord.year}`);
          continue;
        }
        
        // If holiday dates already exist, block duplicate
        if (existingRecord?.startDate && newRecord.startDate && existingRecord.startDate !== newRecord.startDate) {
          errors.push(`Funcionário já tem férias registadas em ${newRecord.year} (${new Date(existingRecord.startDate).toLocaleDateString('pt-AO')})`);
          continue;
        }
        
        let holidayMonth = newRecord.holidayMonth;
        if (newRecord.startDate && !holidayMonth) {
          holidayMonth = new Date(newRecord.startDate).getMonth() + 1;
        }
        const recordWithMonth = { ...newRecord, holidayMonth };
        await liveInsert('holidays', mapHolidayToDbRow(recordWithMonth));
      }
      
      return { success: errors.length === 0, errors };
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
    
    // Check if employee has a holiday registered for this year (with dates)
    hasHolidayRegisteredForYear: (employeeId, year) => {
      const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
      return !!(record?.startDate || record?.subsidyPaidInMonth);
    },
    
    // Check if employee can register a new holiday for this year
    canRegisterHoliday: (employeeId, year) => {
      const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
      
      // If subsidy already paid, cannot register again
      if (record?.subsidyPaidInMonth) {
        return { 
          allowed: false, 
          reason: `Férias já pagas (${record.subsidyPaidInMonth}/${record.subsidyPaidInYear})` 
        };
      }
      
      // If dates already set, warn but allow editing
      if (record?.startDate) {
        return { 
          allowed: true, 
          reason: `Férias já registadas: ${new Date(record.startDate).toLocaleDateString('pt-AO')}` 
        };
      }
      
      return { allowed: true };
    },
  }));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initHolidayStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubSync = onTableSync('holidays', (table, rows) => {
    console.log('[Holidays] ← PUSH received:', rows.length, 'holidays');
    const records = rows.map(mapDbRowToHoliday);
    useHolidayStore.setState({ records, isLoaded: true });
  });
  
  // FALLBACK: Legacy notification
  const unsubLegacy = onDataChange((table) => {
    if (table === 'holidays') {
      console.log('[Holidays] Legacy notification, refreshing...');
      useHolidayStore.getState().loadHolidays();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupHolidayStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
