import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HolidayRecord {
  employeeId: string;
  year: number;
  daysUsed: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

interface HolidayState {
  records: HolidayRecord[];
  addOrUpdateRecord: (record: HolidayRecord) => void;
  getRecordsForYear: (year: number) => HolidayRecord[];
  getRecordForEmployee: (employeeId: string, year: number) => HolidayRecord | undefined;
  saveRecords: (records: HolidayRecord[]) => void;
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
          
          if (existingIndex >= 0) {
            const updated = [...state.records];
            updated[existingIndex] = record;
            return { records: updated };
          }
          
          return { records: [...state.records, record] };
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
            const existingIndex = merged.findIndex(
              r => r.employeeId === newRecord.employeeId && r.year === newRecord.year
            );
            
            if (existingIndex >= 0) {
              merged[existingIndex] = newRecord;
            } else {
              merged.push(newRecord);
            }
          });
          
          return { records: merged };
        });
      },
    }),
    {
      name: 'payrollao-holidays',
    }
  )
);
