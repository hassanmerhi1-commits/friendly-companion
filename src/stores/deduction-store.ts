import { create } from 'zustand';
import type { Deduction, DeductionFormData, DeductionType } from '@/types/deduction';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onDataChange } from '@/lib/db-live';


interface DeductionState {
  deductions: Deduction[];
  isLoaded: boolean;

  loadDeductions: () => Promise<void>;
  addDeduction: (data: DeductionFormData) => Promise<Deduction>;
  updateDeduction: (id: string, data: Partial<Deduction>) => Promise<void>;
  deleteDeduction: (id: string) => Promise<void>;
  getDeductionsByEmployee: (employeeId: string) => Deduction[];
  getPendingDeductions: (employeeId: string) => Deduction[];
  applyDeductionToPayroll: (id: string, payrollPeriodId: string) => Promise<void>;
  getTotalPendingByEmployee: (employeeId: string) => number;
}

function mapDbRowToDeduction(row: any): Deduction {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type as DeductionType,
    description: row.description || '',
    amount: row.amount || 0,
    date: row.date || '',
    payrollPeriodId: row.payroll_period_id || undefined,
    isApplied: row.is_applied === 1,
    installments: row.installments || undefined,
    currentInstallment: row.current_installment || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapDeductionToDbRow(d: Deduction): Record<string, any> {
  return {
    id: d.id,
    employee_id: d.employeeId,
    type: d.type,
    description: d.description,
    amount: d.amount,
    date: d.date,
    payroll_period_id: d.payrollPeriodId || null,
    is_applied: d.isApplied ? 1 : 0,
    installments: d.installments || null,
    current_installment: d.currentInstallment || null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

export const useDeductionStore = create<DeductionState>()((set, get) => {
  // Subscribe to data changes for auto-refresh
  onDataChange((table) => {
    if (table === 'deductions') {
      console.log('[Deductions] Data changed, refreshing...');
      get().loadDeductions();
    }
  });

  return {
    deductions: [],
    isLoaded: false,

    loadDeductions: async () => {
      try {
        const rows = await liveGetAll<any>('deductions');
        const deductions = rows.map(mapDbRowToDeduction);
        set({ deductions, isLoaded: true });
        console.log('[Deductions] Loaded', deductions.length, 'deductions from DB');
      } catch (error) {
        console.error('[Deductions] Error loading:', error);
        set({ isLoaded: true });
      }
    },

    addDeduction: async (data: DeductionFormData) => {
      const now = new Date().toISOString();

      const newDeduction: Deduction = {
        ...data,
        id: crypto.randomUUID(),
        isApplied: false,
        currentInstallment: 1,
        createdAt: now,
        updatedAt: now,
      };

      await liveInsert('deductions', mapDeductionToDbRow(newDeduction));
      await get().loadDeductions();
      return newDeduction;
    },

    updateDeduction: async (id: string, data: Partial<Deduction>) => {
      const now = new Date().toISOString();
      const current = get().deductions.find((d) => d.id === id);
      if (!current) return;

      const updated: Deduction = { ...current, ...data, updatedAt: now };
      const { id: _, ...row } = mapDeductionToDbRow(updated);
      await liveUpdate('deductions', id, row);
    },

    deleteDeduction: async (id: string) => {
      await liveDelete('deductions', id);
    },

    getDeductionsByEmployee: (employeeId: string) => {
      return get().deductions.filter((ded) => ded.employeeId === employeeId);
    },

    getPendingDeductions: (employeeId: string) => {
      return get().deductions.filter((ded) => ded.employeeId === employeeId && !ded.isApplied);
    },

    applyDeductionToPayroll: async (id: string, payrollPeriodId: string) => {
      const now = new Date().toISOString();
      await liveUpdate('deductions', id, { is_applied: 1, payroll_period_id: payrollPeriodId, updated_at: now });
    },

    getTotalPendingByEmployee: (employeeId: string) => {
      return get()
        .deductions.filter((ded) => ded.employeeId === employeeId && !ded.isApplied)
        .reduce((sum, ded) => {
          if (ded.installments && ded.installments > 1) {
            return sum + ded.amount / ded.installments;
          }
          return sum + ded.amount;
        }, 0);
    },
  };
});

export function getDeductionTypeLabel(type: DeductionType, lang: 'pt' | 'en' = 'pt'): string {
  const labels: Record<DeductionType, { pt: string; en: string }> = {
    salary_advance: { pt: 'Adiantamento Salarial', en: 'Salary Advance' },
    warehouse_loss: { pt: 'Perda no Armazém', en: 'Warehouse Loss' },
    unjustified_absence: { pt: 'Falta Injustificada', en: 'Unjustified Absence' },
    loan: { pt: 'Empréstimo', en: 'Loan' },
    disciplinary: { pt: 'Desconto Disciplinar', en: 'Disciplinary Deduction' },
    other: { pt: 'Outros', en: 'Other' },
  };
  return labels[type][lang];
}
