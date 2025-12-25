import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Deduction, DeductionFormData, DeductionType } from '@/types/deduction';

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

// Sample deductions
const sampleDeductions: Deduction[] = [
  {
    id: 'ded-1',
    employeeId: '1',
    type: 'salary_advance',
    description: 'Adiantamento salarial - Dezembro',
    amount: 50000,
    date: '2025-12-10',
    isApplied: false,
    installments: 1,
    currentInstallment: 1,
    createdAt: '2025-12-10T08:00:00Z',
    updatedAt: '2025-12-10T08:00:00Z',
  },
  {
    id: 'ded-2',
    employeeId: '3',
    type: 'warehouse_loss',
    description: 'Perda de mercadoria - Lote #4521',
    amount: 25000,
    date: '2025-12-15',
    isApplied: false,
    createdAt: '2025-12-15T08:00:00Z',
    updatedAt: '2025-12-15T08:00:00Z',
  },
  {
    id: 'ded-3',
    employeeId: '2',
    type: 'salary_advance',
    description: 'Adiantamento para despesas médicas',
    amount: 100000,
    date: '2025-12-05',
    isApplied: false,
    installments: 2,
    currentInstallment: 1,
    createdAt: '2025-12-05T08:00:00Z',
    updatedAt: '2025-12-05T08:00:00Z',
  },
];

export const useDeductionStore = create<DeductionState>()(
  persist(
    (set, get) => ({
      deductions: sampleDeductions,

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
    }
  )
);

// Helper to get deduction type label
export function getDeductionTypeLabel(type: DeductionType, lang: 'pt' | 'en' = 'pt'): string {
  const labels: Record<DeductionType, { pt: string; en: string }> = {
    salary_advance: { pt: 'Adiantamento Salarial', en: 'Salary Advance' },
    warehouse_loss: { pt: 'Perda no Armazém', en: 'Warehouse Loss' },
    loan: { pt: 'Empréstimo', en: 'Loan' },
    disciplinary: { pt: 'Desconto Disciplinar', en: 'Disciplinary Deduction' },
    other: { pt: 'Outros', en: 'Other' },
  };
  return labels[type][lang];
}
