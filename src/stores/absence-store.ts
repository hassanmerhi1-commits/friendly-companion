import { create } from 'zustand';
import type { Absence, AbsenceType, AbsenceStatus } from '@/types/absence';
import { calculateAbsenceDeduction } from '@/lib/angola-labor-law';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

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
    if (dayOfWeek !== 0) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getAbsenceDaysInMonth(absence: Absence, month: number, year: number): number {
  const startDate = new Date(absence.startDate);
  const endDate = new Date(absence.endDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const effectiveStart = startDate < monthStart ? monthStart : startDate;
  const effectiveEnd = endDate > monthEnd ? monthEnd : endDate;

  if (effectiveStart > effectiveEnd) return 0;

  return calculateWorkingDays(effectiveStart.toISOString(), effectiveEnd.toISOString());
}

function mapDbRowToAbsence(row: any): Absence {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type as AbsenceType,
    status: (row.status || 'pending') as AbsenceStatus,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    days: row.days || 1,
    reason: row.reason || '',
    justificationDocument: row.justification_document || undefined,
    justificationDate: row.justified_at || undefined,
    approvedBy: row.approved_by || undefined,
    approvedDate: row.approved_at || undefined,
    notes: row.justification_notes || undefined,
    deductFromSalary: row.status === 'unjustified' || row.status === 'rejected',
    salaryDeductionAmount: undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapAbsenceToDbRow(a: Absence): Record<string, any> {
  return {
    id: a.id,
    employee_id: a.employeeId,
    type: a.type,
    status: a.status,
    start_date: a.startDate,
    end_date: a.endDate,
    days: a.days,
    reason: a.reason,
    document_path: null,
    justified_at: a.justificationDate || null,
    justification_document: a.justificationDocument || null,
    justification_notes: a.notes || null,
    approved_by: a.approvedBy || null,
    approved_at: a.approvedDate || null,
    rejection_reason: null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

interface AbsenceStore {
  absences: Absence[];
  isLoaded: boolean;
  loadAbsences: () => Promise<void>;
  addAbsence: (absence: Omit<Absence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAbsence: (id: string, updates: Partial<Absence>) => Promise<void>;
  deleteAbsence: (id: string) => Promise<void>;
  justifyAbsence: (id: string, document: string, notes?: string) => Promise<void>;
  rejectJustification: (id: string, reason: string) => Promise<void>;
  approveAbsence: (id: string, approvedBy: string) => Promise<void>;
  markAsUnjustified: (id: string) => Promise<void>;
  getAbsencesByEmployee: (employeeId: string) => Absence[];
  getAbsencesByPeriod: (startDate: string, endDate: string) => Absence[];
  getPendingAbsences: () => Absence[];
  getUnjustifiedAbsences: (employeeId: string, month: number, year: number) => Absence[];
  calculateDeductionForEmployee: (employeeId: string, baseSalary: number, month: number, year: number) => number;
  getAbsenceDaysForEmployee: (employeeId: string, month: number, year: number) => { total: number; justified: number; unjustified: number; pending: number; maternity: number; paternity: number; sick: number; other: number };
}

export const useAbsenceStore = create<AbsenceStore>()((set, get) => ({
    absences: [],
    isLoaded: false,

    loadAbsences: async () => {
      try {
        const rows = await liveGetAll<any>('absences');
        const absences = rows.map(mapDbRowToAbsence);
        set({ absences, isLoaded: true });
        console.log('[Absences] Loaded', absences.length, 'absences from DB');
      } catch (error) {
        console.error('[Absences] Error loading:', error);
        set({ isLoaded: true });
      }
    },

    addAbsence: async (absence) => {
      const now = new Date().toISOString();
      const days = calculateWorkingDays(absence.startDate, absence.endDate);
      const newAbsence: Absence = { ...absence, id: generateId(), days, createdAt: now, updatedAt: now };
      await liveInsert('absences', mapAbsenceToDbRow(newAbsence));
    },

    updateAbsence: async (id, updates) => {
      const now = new Date().toISOString();
      const current = get().absences.find((a) => a.id === id);
      if (!current) return;
      const days = updates.startDate || updates.endDate ? calculateWorkingDays(updates.startDate || current.startDate, updates.endDate || current.endDate) : current.days;
      const updated: Absence = { ...current, ...updates, days, updatedAt: now };
      const { id: _, ...row } = mapAbsenceToDbRow(updated);
      await liveUpdate('absences', id, row);
    },

    deleteAbsence: async (id) => {
      const success = await liveDelete('absences', id);
      // If not in Electron or delete failed silently, update local state directly
      if (!success) {
        set(state => ({
          absences: state.absences.filter(a => a.id !== id)
        }));
      }
    },

    justifyAbsence: async (id, document, notes) => {
      const now = new Date().toISOString();
      await liveUpdate('absences', id, { 
        status: 'justified', 
        justification_document: document, 
        justified_at: now, 
        justification_notes: notes || null, 
        updated_at: now 
      });
    },

    rejectJustification: async (id, reason) => {
      const now = new Date().toISOString();
      await liveUpdate('absences', id, { status: 'rejected', justification_notes: reason, updated_at: now });
    },

    approveAbsence: async (id, approvedBy) => {
      const now = new Date().toISOString();
      await liveUpdate('absences', id, { status: 'approved', approved_by: approvedBy, approved_at: now, updated_at: now });
    },

    markAsUnjustified: async (id) => {
      const now = new Date().toISOString();
      await liveUpdate('absences', id, { status: 'unjustified', updated_at: now });
    },

    getAbsencesByEmployee: (employeeId) => get().absences.filter((a) => a.employeeId === employeeId),

    getAbsencesByPeriod: (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return get().absences.filter((a) => {
        const absStart = new Date(a.startDate);
        const absEnd = new Date(a.endDate);
        return absStart <= end && absEnd >= start;
      });
    },

    getPendingAbsences: () => get().absences.filter((a) => a.status === 'pending'),

    getUnjustifiedAbsences: (employeeId, month, year) => get().absences.filter((a) => {
      if (a.employeeId !== employeeId) return false;
      if (a.status !== 'unjustified' && a.status !== 'rejected') return false;
      const startDate = new Date(a.startDate);
      const endDate = new Date(a.endDate);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return startDate <= monthEnd && endDate >= monthStart;
    }),

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

      const result = { total: 0, justified: 0, unjustified: 0, pending: 0, maternity: 0, paternity: 0, sick: 0, other: 0 };
      for (const absence of absences) {
        const days = getAbsenceDaysInMonth(absence, month, year);
        result.total += days;
        if (absence.status === 'justified' || absence.status === 'approved') result.justified += days;
        else if (absence.status === 'unjustified' || absence.status === 'rejected') result.unjustified += days;
        else if (absence.status === 'pending') result.pending += days;
        if (absence.type === 'maternity') result.maternity += days;
        else if (absence.type === 'paternity') result.paternity += days;
        else if (absence.type === 'sick_leave') result.sick += days;
        else if (absence.type !== 'unjustified') result.other += days;
      }
      return result;
    },
  }));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initAbsenceStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubSync = onTableSync('absences', (table, rows) => {
    console.log('[Absences] ← PUSH received:', rows.length, 'absences');
    const absences = rows.map(mapDbRowToAbsence);
    useAbsenceStore.setState({ absences, isLoaded: true });
  });
  
  // FALLBACK: Legacy notification
  const unsubLegacy = onDataChange((table) => {
    if (table === 'absences') {
      console.log('[Absences] Legacy notification, refreshing...');
      useAbsenceStore.getState().loadAbsences();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupAbsenceStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
