import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

export interface HolidayRecord {
  employeeId: string;
  year: number;
  daysUsed: number;
  startDate?: string; // When holiday starts
  endDate?: string;   // When holiday ends
  holidayMonth?: number; // The month (1-12) when employee goes on holiday
  subsidyPaidInMonth?: number; // The month (1-12) when subsidy was paid (should be holidayMonth - 1)
  subsidyPaidInYear?: number;
  notes?: string;
}

interface HolidayState {
  records: HolidayRecord[];
  addOrUpdateRecord: (record: HolidayRecord) => void;
  getRecordsForYear: (year: number) => HolidayRecord[];
  getRecordForEmployee: (employeeId: string, year: number) => HolidayRecord | undefined;
  saveRecords: (records: HolidayRecord[]) => void;
  
  // Get employees whose holiday subsidy should be paid in a specific month
  // Returns employees going on holiday in the NEXT month
  getEmployeesForSubsidyPayment: (year: number, month: number) => string[];
  
  // Mark that subsidy was paid for an employee
  markSubsidyPaid: (employeeId: string, year: number, paidInMonth: number, paidInYear: number) => void;
  
  // Check if subsidy was already paid for an employee this year
  isSubsidyPaid: (employeeId: string, year: number) => boolean;
}

export const useHolidayStore = create<HolidayState>()(
  persist(
    (set, get) => ({
      records: [],
      
      addOrUpdateRecord: (record: HolidayRecord) => {
        set((state) => {
          const existingIndex = state.records.findIndex(
            r => r.employeeId === record.employeeId && r.year === record.year
          );
          
          // Calculate holiday month from start date if provided
          let holidayMonth = record.holidayMonth;
          if (record.startDate && !holidayMonth) {
            const startDate = new Date(record.startDate);
            holidayMonth = startDate.getMonth() + 1; // 1-12
          }
          
          const updatedRecord = { ...record, holidayMonth };
          
          if (existingIndex >= 0) {
            const updated = [...state.records];
            updated[existingIndex] = updatedRecord;
            return { records: updated };
          }
          
          return { records: [...state.records, updatedRecord] };
        });
      },
      
      getRecordsForYear: (year: number) => {
        return get().records.filter(r => r.year === year);
      },
      
      getRecordForEmployee: (employeeId: string, year: number) => {
        return get().records.find(r => r.employeeId === employeeId && r.year === year);
      },
      
      saveRecords: (records: HolidayRecord[]) => {
        set((state) => {
          // Merge new records with existing ones
          const merged = [...state.records];
          
          records.forEach(newRecord => {
            // Calculate holiday month from start date
            let holidayMonth = newRecord.holidayMonth;
            if (newRecord.startDate && !holidayMonth) {
              const startDate = new Date(newRecord.startDate);
              holidayMonth = startDate.getMonth() + 1;
            }
            
            const recordWithMonth = { ...newRecord, holidayMonth };
            
            const existingIndex = merged.findIndex(
              r => r.employeeId === newRecord.employeeId && r.year === newRecord.year
            );
            
            if (existingIndex >= 0) {
              merged[existingIndex] = recordWithMonth;
            } else {
              merged.push(recordWithMonth);
            }
          });
          
          return { records: merged };
        });
      },
      
      // Get employees who should receive subsidy payment in this month
      // (employees going on holiday in the NEXT month)
      getEmployeesForSubsidyPayment: (year: number, month: number) => {
        const records = get().records;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextMonthYear = month === 12 ? year + 1 : year;
        
        return records
          .filter(r => {
            // Check if holiday is in next month
            if (r.holidayMonth === nextMonth && r.year === nextMonthYear) {
              // Check if subsidy wasn't already paid
              return !r.subsidyPaidInMonth;
            }
            return false;
          })
          .map(r => r.employeeId);
      },
      
      markSubsidyPaid: (employeeId: string, year: number, paidInMonth: number, paidInYear: number) => {
        set((state) => {
          const updated = state.records.map(r => {
            if (r.employeeId === employeeId && r.year === year) {
              return { ...r, subsidyPaidInMonth: paidInMonth, subsidyPaidInYear: paidInYear };
            }
            return r;
          });
          return { records: updated };
        });
      },
      
      isSubsidyPaid: (employeeId: string, year: number) => {
        const record = get().records.find(r => r.employeeId === employeeId && r.year === year);
        return !!record?.subsidyPaidInMonth;
      },
    }),
    {
      name: 'payrollao-holidays',
      storage: createJSONStorage(() => createElectronStorage('holidays')),
    }
  )
);