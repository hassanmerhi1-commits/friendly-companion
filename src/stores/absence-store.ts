import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Absence, AbsenceType, AbsenceStatus } from '@/types/absence';
import { calculateAbsenceDeduction } from '@/lib/angola-labor-law';

interface AbsenceStore {
  absences: Absence[];
  
  // CRUD operations
  addAbsence: (absence: Omit<Absence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAbsence: (id: string, updates: Partial<Absence>) => void;
  deleteAbsence: (id: string) => void;
  
  // Status management
  justifyAbsence: (id: string, document: string, notes?: string) => void;
  rejectJustification: (id: string, reason: string) => void;
  approveAbsence: (id: string, approvedBy: string) => void;
  markAsUnjustified: (id: string) => void;
  
  // Queries
  getAbsencesByEmployee: (employeeId: string) => Absence[];
  getAbsencesByPeriod: (startDate: string, endDate: string) => Absence[];
  getPendingAbsences: () => Absence[];
  getUnjustifiedAbsences: (employeeId: string, month: number, year: number) => Absence[];
  
  // Calculations
  calculateDeductionForEmployee: (employeeId: string, baseSalary: number, month: number, year: number) => number;
  getAbsenceDaysForEmployee: (employeeId: string, month: number, year: number) => {
    total: number;
    justified: number;
    unjustified: number;
    pending: number;
    maternity: number;
    paternity: number;
    sick: number;
    other: number;
  };
}

function generateId(): string {
  return `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count Monday to Saturday (1-6), exclude only Sunday (0)
    // 6-day work week
    if (dayOfWeek !== 0) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

function isDateInMonth(dateStr: string, month: number, year: number): boolean {
  const date = new Date(dateStr);
  return date.getMonth() === month && date.getFullYear() === year;
}

function getAbsenceDaysInMonth(absence: Absence, month: number, year: number): number {
  const startDate = new Date(absence.startDate);
  const endDate = new Date(absence.endDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  // Clamp dates to the month
  const effectiveStart = startDate < monthStart ? monthStart : startDate;
  const effectiveEnd = endDate > monthEnd ? monthEnd : endDate;
  
  if (effectiveStart > effectiveEnd) return 0;
  
  return calculateWorkingDays(effectiveStart.toISOString(), effectiveEnd.toISOString());
}

export const useAbsenceStore = create<AbsenceStore>()(
  persist(
    (set, get) => ({
      absences: [],
      
      addAbsence: (absence) => {
        const now = new Date().toISOString();
        const days = calculateWorkingDays(absence.startDate, absence.endDate);
        
        const newAbsence: Absence = {
          ...absence,
          id: generateId(),
          days,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          absences: [...state.absences, newAbsence]
        }));
      },
      
      updateAbsence: (id, updates) => {
        set((state) => ({
          absences: state.absences.map((a) =>
            a.id === id
              ? { 
                  ...a, 
                  ...updates, 
                  days: updates.startDate || updates.endDate 
                    ? calculateWorkingDays(
                        updates.startDate || a.startDate, 
                        updates.endDate || a.endDate
                      )
                    : a.days,
                  updatedAt: new Date().toISOString() 
                }
              : a
          )
        }));
      },
      
      deleteAbsence: (id) => {
        set((state) => ({
          absences: state.absences.filter((a) => a.id !== id)
        }));
      },
      
      justifyAbsence: (id, document, notes) => {
        set((state) => ({
          absences: state.absences.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'justified' as AbsenceStatus,
                  justificationDocument: document,
                  justificationDate: new Date().toISOString(),
                  notes: notes || a.notes,
                  deductFromSalary: false,
                  updatedAt: new Date().toISOString()
                }
              : a
          )
        }));
      },
      
      rejectJustification: (id, reason) => {
        set((state) => ({
          absences: state.absences.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'rejected' as AbsenceStatus,
                  notes: reason,
                  deductFromSalary: true,
                  updatedAt: new Date().toISOString()
                }
              : a
          )
        }));
      },
      
      approveAbsence: (id, approvedBy) => {
        set((state) => ({
          absences: state.absences.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'approved' as AbsenceStatus,
                  approvedBy,
                  approvedDate: new Date().toISOString(),
                  deductFromSalary: false,
                  updatedAt: new Date().toISOString()
                }
              : a
          )
        }));
      },
      
      markAsUnjustified: (id) => {
        set((state) => ({
          absences: state.absences.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'unjustified' as AbsenceStatus,
                  deductFromSalary: true,
                  updatedAt: new Date().toISOString()
                }
              : a
          )
        }));
      },
      
      getAbsencesByEmployee: (employeeId) => {
        return get().absences.filter((a) => a.employeeId === employeeId);
      },
      
      getAbsencesByPeriod: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return get().absences.filter((a) => {
          const absStart = new Date(a.startDate);
          const absEnd = new Date(a.endDate);
          return absStart <= end && absEnd >= start;
        });
      },
      
      getPendingAbsences: () => {
        return get().absences.filter((a) => a.status === 'pending');
      },
      
      getUnjustifiedAbsences: (employeeId, month, year) => {
        return get().absences.filter((a) => {
          if (a.employeeId !== employeeId) return false;
          if (a.status !== 'unjustified' && a.status !== 'rejected') return false;
          
          const startDate = new Date(a.startDate);
          const endDate = new Date(a.endDate);
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          
          return startDate <= monthEnd && endDate >= monthStart;
        });
      },
      
      calculateDeductionForEmployee: (employeeId, baseSalary, month, year) => {
        const unjustifiedAbsences = get().getUnjustifiedAbsences(employeeId, month, year);
        
        let totalDays = 0;
        for (const absence of unjustifiedAbsences) {
          totalDays += getAbsenceDaysInMonth(absence, month, year);
        }
        
        if (totalDays === 0) return 0;
        
        return calculateAbsenceDeduction(baseSalary, totalDays);
      },
      
      getAbsenceDaysForEmployee: (employeeId, month, year) => {
        const absences = get().absences.filter((a) => {
          if (a.employeeId !== employeeId) return false;
          
          const startDate = new Date(a.startDate);
          const endDate = new Date(a.endDate);
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          
          return startDate <= monthEnd && endDate >= monthStart;
        });
        
        const result = {
          total: 0,
          justified: 0,
          unjustified: 0,
          pending: 0,
          maternity: 0,
          paternity: 0,
          sick: 0,
          other: 0
        };
        
        for (const absence of absences) {
          const days = getAbsenceDaysInMonth(absence, month, year);
          result.total += days;
          
          switch (absence.status) {
            case 'justified':
            case 'approved':
              result.justified += days;
              break;
            case 'unjustified':
            case 'rejected':
              result.unjustified += days;
              break;
            case 'pending':
              result.pending += days;
              break;
          }
          
          switch (absence.type) {
            case 'maternity':
              result.maternity += days;
              break;
            case 'paternity':
              result.paternity += days;
              break;
            case 'sick_leave':
              result.sick += days;
              break;
            default:
              if (absence.type !== 'unjustified') {
                result.other += days;
              }
              break;
          }
        }
        
        return result;
      }
    }),
    {
      name: 'payroll-absences',
    }
  )
);