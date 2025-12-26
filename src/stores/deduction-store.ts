import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Deduction, DeductionFormData, DeductionType } from '@/types/deduction';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

interface DeductionState {
  deductions: Deduction[];
  addDeduction: (data: DeductionFormData) => Deduction;
  updateDeduction: (id: string, data: Partial<Deduction>) => void;
  deleteDeduction: (id: string) => void;
  getDeductionsByEmployee: (employeeId: string) => Deduction[];
  getPendingDeductions: (employeeId: string) => Deduction[];
  applyDeductionToPayroll: (id: string, payrollPeriodId: string) => void;
  getTotalPendingByEmployee: (employeeId: string) => number;
}

export const useDeductionStore = create<DeductionState>()(
  persist(
    (set, get) => ({
      deductions: [],

      addDeduction: (data: DeductionFormData) => {
        const now = new Date().toISOString();
        
        const newDeduction: Deduction = {
          ...data,
          id: crypto.randomUUID(),
          isApplied: false,
          currentInstallment: 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          deductions: [...state.deductions, newDeduction],
        }));

        return newDeduction;
      },

      updateDeduction: (id: string, data: Partial<Deduction>) => {
        set((state) => ({
          deductions: state.deductions.map((ded) =>
            ded.id === id
              ? { ...ded, ...data, updatedAt: new Date().toISOString() }
              : ded
          ),
        }));
      },

      deleteDeduction: (id: string) => {
        set((state) => ({
          deductions: state.deductions.filter((ded) => ded.id !== id),
        }));
      },

      getDeductionsByEmployee: (employeeId: string) => {
        return get().deductions.filter((ded) => ded.employeeId === employeeId);
      },

      getPendingDeductions: (employeeId: string) => {
        return get().deductions.filter(
          (ded) => ded.employeeId === employeeId && !ded.isApplied
        );
      },

      applyDeductionToPayroll: (id: string, payrollPeriodId: string) => {
        set((state) => ({
          deductions: state.deductions.map((ded) =>
            ded.id === id
              ? {
                  ...ded,
                  isApplied: true,
                  payrollPeriodId,
                  updatedAt: new Date().toISOString(),
                }
              : ded
          ),
        }));
      },

      getTotalPendingByEmployee: (employeeId: string) => {
        return get()
          .deductions.filter((ded) => ded.employeeId === employeeId && !ded.isApplied)
          .reduce((sum, ded) => {
            // If installments, only count current installment amount
            if (ded.installments && ded.installments > 1) {
              return sum + ded.amount / ded.installments;
            }
            return sum + ded.amount;
          }, 0);
      },
    }),
    {
      name: 'payrollao-deductions',
      storage: createJSONStorage(() => createElectronStorage('deductions')),
    }
  )
);

// Helper to get deduction type label
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
