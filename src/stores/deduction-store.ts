import { create } from 'zustand';
import type { Deduction, DeductionFormData, DeductionType } from '@/types/deduction';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';


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
  unapplyDeductionsFromPayroll: (payrollPeriodId: string) => Promise<void>;
  getDeductionsForPeriod: (payrollPeriodId: string) => Deduction[];
  getTotalPendingByEmployee: (employeeId: string) => number;
}

function mapDbRowToDeduction(row: any): Deduction {
  const totalAmount = row.total_amount || row.amount || 0;
  const installments = row.installments || 1;
  // Legacy compatibility: older DBs stored installment progress in `current_installment`
  const installmentsPaid = row.installments_paid ?? row.current_installment ?? 0;
  const monthlyAmount = installments > 0 ? totalAmount / installments : totalAmount;
  const remainingAmount = row.remaining_amount ?? (totalAmount - (installmentsPaid * monthlyAmount));
  
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type as DeductionType,
    description: row.description || '',
    totalAmount: totalAmount,
    amount: monthlyAmount,
    date: row.date || '',
    payrollPeriodId: row.payroll_period_id || undefined,
    isApplied: row.is_applied === 1,
    isFullyPaid: row.is_fully_paid === 1 || installmentsPaid >= installments,
    installments: installments,
    installmentsPaid: installmentsPaid,
    remainingAmount: remainingAmount,
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
    total_amount: d.totalAmount,
    amount: d.amount,
    date: d.date,
    payroll_period_id: d.payrollPeriodId || null,
    is_applied: d.isApplied ? 1 : 0,
    is_fully_paid: d.isFullyPaid ? 1 : 0,
    installments: d.installments,
    installments_paid: d.installmentsPaid,
    // Legacy compatibility
    current_installment: d.installmentsPaid,
    remaining_amount: d.remainingAmount,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

export const useDeductionStore = create<DeductionState>()((set, get) => ({
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
      const installments = data.installments || 1;
      const monthlyAmount = data.totalAmount / installments;

      const newDeduction: Deduction = {
        id: crypto.randomUUID(),
        employeeId: data.employeeId,
        type: data.type,
        description: data.description,
        totalAmount: data.totalAmount,
        amount: monthlyAmount,
        date: data.date,
        isApplied: false,
        isFullyPaid: false,
        installments: installments,
        installmentsPaid: 0,
        remainingAmount: data.totalAmount,
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
      await get().loadDeductions();
    },

    deleteDeduction: async (id: string) => {
      await liveDelete('deductions', id);
      await get().loadDeductions();
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
      await get().loadDeductions();
    },

    // Unapply all deductions linked to a specific payroll period (used when reopening)
    unapplyDeductionsFromPayroll: async (payrollPeriodId: string) => {
      const now = new Date().toISOString();
      const linkedDeductions = get().deductions.filter(d => d.payrollPeriodId === payrollPeriodId);
      for (const d of linkedDeductions) {
        await liveUpdate('deductions', d.id, { is_applied: 0, payroll_period_id: null, updated_at: now });
      }
      await get().loadDeductions();
      console.log('[Deductions] Unapplied', linkedDeductions.length, 'deductions from period', payrollPeriodId);
    },

    // Get deductions applied to a specific period
    getDeductionsForPeriod: (payrollPeriodId: string) => {
      return get().deductions.filter(d => d.payrollPeriodId === payrollPeriodId);
    },

    getTotalPendingByEmployee: (employeeId: string) => {
      // Returns the total MONTHLY deduction amount for pending (not fully paid) deductions
      return get()
        .deductions.filter((ded) => ded.employeeId === employeeId && !ded.isFullyPaid)
        .reduce((sum, ded) => sum + ded.amount, 0);
    },
  }));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initDeductionStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubSync = onTableSync('deductions', (table, rows) => {
    console.log('[Deductions] ← PUSH received:', rows.length, 'deductions');
    const deductions = rows.map(mapDbRowToDeduction);
    useDeductionStore.setState({ deductions, isLoaded: true });
  });
  
  // FALLBACK: Legacy notification
  const unsubLegacy = onDataChange((table) => {
    if (table === 'deductions') {
      console.log('[Deductions] Legacy notification, refreshing...');
      useDeductionStore.getState().loadDeductions();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupDeductionStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function getDeductionTypeLabel(type: DeductionType, lang: string = 'pt'): string {
  const labels: Record<DeductionType, { pt: string; en: string; es: string; fr: string; ar: string }> = {
    salary_advance: { pt: 'Adiantamento Salarial', en: 'Salary Advance', es: 'Anticipo Salarial', fr: 'Avance sur Salaire', ar: 'سلفة راتب' },
    warehouse_loss: { pt: 'Perda no Armazém', en: 'Warehouse Loss', es: 'Pérdida en Almacén', fr: "Perte d'Entrepôt", ar: 'خسارة مستودع' },
    unjustified_absence: { pt: 'Falta Injustificada', en: 'Unjustified Absence', es: 'Falta Injustificada', fr: 'Absence Injustifiée', ar: 'غياب غير مبرر' },
    loan: { pt: 'Empréstimo', en: 'Loan', es: 'Préstamo', fr: 'Prêt', ar: 'قرض' },
    disciplinary: { pt: 'Desconto Disciplinar', en: 'Disciplinary Deduction', es: 'Deducción Disciplinaria', fr: 'Déduction Disciplinaire', ar: 'خصم تأديبي' },
    other: { pt: 'Outros', en: 'Other', es: 'Otros', fr: 'Autres', ar: 'أخرى' },
  };
  const validLang = (lang in labels.salary_advance) ? lang as keyof typeof labels.salary_advance : 'en';
  return labels[type][validLang];
}
