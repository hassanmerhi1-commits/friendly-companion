import { create } from 'zustand';
import type { Deduction, DeductionFormData, DeductionType } from '@/types/deduction';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';
import { logAudit } from '@/lib/audit-helper';
import { calculatePayroll } from '@/lib/angola-labor-law';

const WAREHOUSE_LOSS_MAX_RATE = 0.25;
const BALANCE_EPSILON = 0.01;

export interface DeductionBalanceSnapshot {
  remainingAmount: number;
  installments: number;
  isFullyPaid: boolean;
}

/**
 * Single source of truth for deduction balances.
 * "Paid" status follows remaining balance, not installmentsPaid >= installments alone.
 */
export function computeDeductionBalances(
  totalAmount: number,
  monthlyAmount: number,
  installmentsPaid: number,
  remainingOverride?: number
): DeductionBalanceSnapshot {
  const total = Math.max(0, totalAmount);
  const monthly = Math.max(0, monthlyAmount);
  const paidCount = Math.max(0, installmentsPaid);

  let remainingAmount =
    remainingOverride !== undefined && !Number.isNaN(remainingOverride)
      ? Math.max(0, remainingOverride)
      : Math.max(0, total - paidCount * monthly);

  if (remainingAmount > total + BALANCE_EPSILON) {
    remainingAmount = Math.max(0, total - paidCount * monthly);
  }

  const futureInstallments =
    remainingAmount <= BALANCE_EPSILON
      ? 0
      : monthly > BALANCE_EPSILON
        ? Math.max(1, Math.ceil(remainingAmount / monthly))
        : 1;

  const installments = Math.max(paidCount + futureInstallments, paidCount, 1);
  const isFullyPaid = remainingAmount <= BALANCE_EPSILON;

  return {
    remainingAmount: isFullyPaid ? 0 : remainingAmount,
    installments,
    isFullyPaid,
  };
}

/** Apply one payroll installment (monthly amount capped by remaining). */
export function creditOneInstallment(deduction: Deduction): Partial<Deduction> | null {
  if (deduction.isFullyPaid || deduction.remainingAmount <= BALANCE_EPSILON) {
    return {
      remainingAmount: 0,
      isFullyPaid: true,
      installments: Math.max(deduction.installments, deduction.installmentsPaid),
    };
  }

  const monthly = deduction.amount > 0 ? deduction.amount : deduction.remainingAmount;
  const payment = Math.min(monthly, deduction.remainingAmount);
  if (payment <= BALANCE_EPSILON) return null;

  const newInstallmentsPaid = (deduction.installmentsPaid || 0) + 1;
  const newRemaining = Math.max(0, deduction.remainingAmount - payment);
  const balances = computeDeductionBalances(
    deduction.totalAmount,
    deduction.amount,
    newInstallmentsPaid,
    newRemaining
  );

  return {
    installmentsPaid: newInstallmentsPaid,
    remainingAmount: balances.remainingAmount,
    installments: balances.installments,
    isFullyPaid: balances.isFullyPaid,
  };
}

/** After payroll approval: count installments and release deductions for the next period. */
export async function finalizeApprovedPeriodDeductions(periodId: string) {
  const store = useDeductionStore.getState();
  const linked = store.deductions.filter(
    (d) => d.payrollPeriodId === periodId && d.isApplied && !d.isFullyPaid
  );

  if (linked.length === 0) return;

  for (const deduction of linked) {
    const credit = creditOneInstallment(deduction);
    const patch: Partial<Deduction> = {
      ...(credit || {}),
      isApplied: false,
      payrollPeriodId: undefined,
    };
    await store.updateDeduction(deduction.id, patch);
  }

  console.log(
    `[Deductions] Finalized ${linked.length} deduction(s) for approved period ${periodId}`
  );
}

/** Calculate net salary for an employee to determine 25% warehouse loss limit */
function getEmployeeNetSalary(emp: any): number {
  if (!emp) return 0;
  const result = calculatePayroll({
    baseSalary: emp.baseSalary || 0,
    mealAllowance: emp.mealAllowance || 0,
    transportAllowance: emp.transportAllowance || 0,
    otherAllowances: (emp.otherAllowances || 0) + (emp.monthlyBonus || 0),
    familyAllowanceValue: emp.familyAllowance || 0,
    isRetired: emp.isRetired || false,
    isColaborador: emp.contractType === 'colaborador',
  });
  return result.netSalary;
}

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
  // Use the stored monthly amount if available; only fall back to division if not stored
  const storedAmount = row.amount;
  const monthlyAmount = (storedAmount && storedAmount > 0 && storedAmount !== totalAmount)
    ? storedAmount
    : (installments > 0 ? totalAmount / installments : totalAmount);
  const storedRemaining =
    row.remaining_amount !== null && row.remaining_amount !== undefined
      ? Number(row.remaining_amount)
      : undefined;
  const balances = computeDeductionBalances(
    totalAmount,
    monthlyAmount,
    installmentsPaid,
    storedRemaining
  );

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
    isFullyPaid: balances.isFullyPaid,
    installments: balances.installments,
    installmentsPaid: installmentsPaid,
    remainingAmount: balances.remainingAmount,
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
      // Monthly amount is the primary input now (user sets prestação)
      const monthlyAmount = data.monthlyAmount && data.monthlyAmount > 0
        ? data.monthlyAmount
        : data.totalAmount;
      // Installments derived from totalAmount / monthlyAmount
      const installments = data.installments && data.installments > 0
        ? data.installments
        : (monthlyAmount > 0 ? Math.max(1, Math.ceil(data.totalAmount / monthlyAmount)) : 1);

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
      
      logAudit({
        action: 'deduction_created',
        entityType: 'deduction',
        entityId: newDeduction.id,
        employeeId: newDeduction.employeeId,
        description: `Dedução criada: ${data.description} - ${data.totalAmount} AOA`,
        newValue: { type: data.type, description: data.description, totalAmount: data.totalAmount, installments: data.installments },
      });
      
      return newDeduction;
    },

    updateDeduction: async (id: string, data: Partial<Deduction>) => {
      const now = new Date().toISOString();
      const current = get().deductions.find((d) => d.id === id);
      if (!current) return;

      const merged = { ...current, ...data };
      const balances = computeDeductionBalances(
        merged.totalAmount,
        merged.amount,
        merged.installmentsPaid,
        merged.remainingAmount
      );
      const updated: Deduction = {
        ...merged,
        remainingAmount: balances.remainingAmount,
        installments: balances.installments,
        isFullyPaid: balances.isFullyPaid,
        updatedAt: now,
      };
      const { id: _, ...row } = mapDeductionToDbRow(updated);
      await liveUpdate('deductions', id, row);
      await get().loadDeductions();
      
      logAudit({
        action: 'deduction_updated',
        entityType: 'deduction',
        entityId: id,
        employeeId: current.employeeId,
        description: `Dedução editada: ${current.description}`,
        previousValue: current as any,
        newValue: updated as any,
      });
    },

    deleteDeduction: async (id: string) => {
      const current = get().deductions.find(d => d.id === id);
      await liveDelete('deductions', id);
      await get().loadDeductions();
      
      if (current) {
        logAudit({
          action: 'deduction_deleted',
          entityType: 'deduction',
          entityId: id,
          employeeId: current.employeeId,
          description: `Dedução eliminada: ${current.description} - ${current.totalAmount} AOA`,
          previousValue: { type: current.type, description: current.description, totalAmount: current.totalAmount },
        });
      }
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

/** Effective total monthly deduction preview (warehouse lines share one 25% cap per employee, FIFO). */
export function getPendingDeductionsEffectiveMonthlyTotal(
  employeeId: string,
  deductions: Deduction[],
  employees: { id: string; baseSalary: number; mealAllowance?: number; transportAllowance?: number; otherAllowances?: number; monthlyBonus?: number; familyAllowance?: number; isRetired?: boolean; contractType?: string }[]
): number {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return 0;

  const netSalary = getEmployeeNetSalary(emp);
  const maxWarehouseMonthly = Math.round(netSalary * WAREHOUSE_LOSS_MAX_RATE);
  let warehousePool = maxWarehouseMonthly;

  const pending = deductions.filter((d) => d.employeeId === employeeId && !d.isFullyPaid);
  let total = 0;

  const nonWarehouse = pending.filter((d) => String(d.type || '').trim() !== 'warehouse_loss');
  const warehouse = pending
    .filter((d) => String(d.type || '').trim() === 'warehouse_loss')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const d of nonWarehouse) {
    total += Math.min(d.amount, d.remainingAmount > 0 ? d.remainingAmount : d.amount);
  }
  for (const d of warehouse) {
    const inst = Math.min(d.amount, d.remainingAmount > 0 ? d.remainingAmount : d.amount);
    const applied = Math.min(inst, warehousePool);
    total += applied;
    warehousePool -= applied;
  }
  return total;
}

/**
 * Retroactive fix: Align stored warehouse monthly amounts with shared 25% cap per employee (FIFO).
 * Multiple perdas no mesmo funcionário: só a primeira linha recebe prestação até ao tecto; as outras ficam 0 até a anterior reduzir.
 */
export async function normalizeWarehouseLossDeductions() {
  try {
    const { useEmployeeStore } = await import('./employee-store');
    const employees = useEmployeeStore.getState().employees;
    const { deductions } = useDeductionStore.getState();

    const warehouseLosses = deductions.filter(
      (d) => String(d.type || '').trim() === 'warehouse_loss' && !d.isFullyPaid && d.remainingAmount > 0
    );

    const byEmployee = new Map<string, Deduction[]>();
    for (const d of warehouseLosses) {
      const list = byEmployee.get(d.employeeId) || [];
      list.push(d);
      byEmployee.set(d.employeeId, list);
    }

    const now = new Date().toISOString();
    const updates: Array<{
      id: string;
      payload: Record<string, any>;
      beforeAmount: number;
      afterAmount: number;
      employeeName: string;
    }> = [];

    for (const [employeeId, list] of byEmployee) {
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) continue;

      const netSalary = getEmployeeNetSalary(emp);
      const maxMonthly = Math.round(netSalary * WAREHOUSE_LOSS_MAX_RATE);
      if (maxMonthly <= 0) continue;

      const sorted = [...list].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let pool = maxMonthly;

      for (const ded of sorted) {
        const rem = ded.remainingAmount;
        const installmentCap = Math.min(ded.amount, rem > 0 ? rem : ded.amount);
        const newAmount = Math.min(installmentCap, pool);
        pool -= newAmount;

        const balances = computeDeductionBalances(
          ded.totalAmount,
          newAmount,
          ded.installmentsPaid,
          rem
        );

        const needsAmountFix = Math.abs(ded.amount - newAmount) > BALANCE_EPSILON;
        const needsInstFix = balances.installments !== ded.installments;
        const needsRemainingFix = Math.abs(ded.remainingAmount - balances.remainingAmount) > BALANCE_EPSILON;
        const needsPaidFix = ded.isFullyPaid !== balances.isFullyPaid;

        if (needsAmountFix || needsInstFix || needsRemainingFix || needsPaidFix) {
          updates.push({
            id: ded.id,
            payload: {
              amount: newAmount,
              installments: balances.installments,
              remaining_amount: balances.remainingAmount,
              is_fully_paid: balances.isFullyPaid ? 1 : 0,
              installments_paid: ded.installmentsPaid,
              current_installment: ded.installmentsPaid,
              updated_at: now,
            },
            beforeAmount: ded.amount,
            afterAmount: newAmount,
            employeeName: `${emp.firstName} ${emp.lastName}`,
          });
        }
      }
    }

    if (updates.length === 0) {
      console.log(
        `[Deductions] Warehouse FIFO normalization: no changes (${warehouseLosses.length} active warehouse records)`
      );
      return;
    }

    await Promise.all(updates.map((u) => liveUpdate('deductions', u.id, u.payload)));
    await useDeductionStore.getState().loadDeductions();

    updates.forEach((u) => {
      console.log(
        `[Deductions] Warehouse FIFO: ${u.employeeName} id=${u.id} monthly ${u.beforeAmount} → ${u.afterAmount}`
      );
    });

    console.log(`[Deductions] Warehouse FIFO normalization applied to ${updates.length} deduction row(s)`);
  } catch (error) {
    console.error('[Deductions] Error normalizing warehouse losses:', error);
  }
}

/**
 * Safe one-time reconciliation for legacy rows (e.g. 3/2 + Paid while balance remains).
 * Only writes when stored values are materially inconsistent.
 */
export async function reconcileDeductionBalances() {
  try {
    const { deductions } = useDeductionStore.getState();
    const now = new Date().toISOString();
    let fixed = 0;

    for (const ded of deductions) {
      const balances = computeDeductionBalances(
        ded.totalAmount,
        ded.amount,
        ded.installmentsPaid,
        ded.remainingAmount
      );

      const wrongPaidFlag = ded.isFullyPaid !== balances.isFullyPaid;
      const wrongRemaining = Math.abs(ded.remainingAmount - balances.remainingAmount) > BALANCE_EPSILON;
      const wrongInstallments = ded.installments !== balances.installments;
      const impossibleProgress = ded.installmentsPaid > ded.installments && balances.remainingAmount > BALANCE_EPSILON;

      if (!wrongPaidFlag && !wrongRemaining && !wrongInstallments && !impossibleProgress) {
        continue;
      }

      await liveUpdate('deductions', ded.id, {
        remaining_amount: balances.remainingAmount,
        installments: balances.installments,
        is_fully_paid: balances.isFullyPaid ? 1 : 0,
        installments_paid: ded.installmentsPaid,
        current_installment: ded.installmentsPaid,
        updated_at: now,
      });
      fixed++;
    }

    if (fixed > 0) {
      await useDeductionStore.getState().loadDeductions();
      console.log(`[Deductions] Reconciled balances for ${fixed} deduction row(s)`);
    } else {
      console.log('[Deductions] Balance reconciliation: no inconsistent rows found');
    }
  } catch (error) {
    console.error('[Deductions] Error reconciling balances:', error);
  }
}

/** Display order for dossier / reports (matches Deduções page filters). */
export const DEDUCTION_TYPE_ORDER: DeductionType[] = [
  'salary_advance',
  'warehouse_loss',
  'unjustified_absence',
  'loan',
  'disciplinary',
  'other',
];

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
