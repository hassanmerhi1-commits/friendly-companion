/**
 * Shared deduction entry math + payload build.
 * Solo dialog and lote sheet MUST both use this so records stay identical.
 */
import { calculatePayroll } from '@/lib/angola-labor-law';
import {
  defaultSchedulingModeForType,
  getOpenSalaryAdvancesForEmployee,
  suggestDeductFromPeriodIdForNewAdvance,
} from '@/lib/salary-advance-scheduling';
import type { Deduction, DeductionFormData, DeductionSchedulingMode, DeductionType } from '@/types/deduction';
import type { Employee } from '@/types/employee';
import type { PayrollPeriod } from '@/types/payroll';

export const WAREHOUSE_LOSS_MAX_RATE = 0.25;

export type DeductStartMode = 'auto' | 'pick';

/** UI + draft state shared by solo and lote rows */
export interface DeductionEntryState {
  employeeId: string;
  type: DeductionType;
  description: string;
  totalAmount: number;
  date: string;
  monthlyPrestacao: number;
  manualOverride: boolean;
  deductStartMode: DeductStartMode;
  deductFromPeriodId: string;
  schedulingMode: DeductionSchedulingMode;
}

export function todayDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function createEmptyDeductionEntry(
  overrides: Partial<DeductionEntryState> = {}
): DeductionEntryState {
  const type = overrides.type ?? 'salary_advance';
  return {
    employeeId: overrides.employeeId ?? '',
    type,
    description: overrides.description ?? '',
    totalAmount: overrides.totalAmount ?? 0,
    date: overrides.date ?? todayDateKey(),
    monthlyPrestacao: overrides.monthlyPrestacao ?? 0,
    manualOverride: overrides.manualOverride ?? false,
    deductStartMode: overrides.deductStartMode ?? 'auto',
    deductFromPeriodId: overrides.deductFromPeriodId ?? '',
    schedulingMode: overrides.schedulingMode ?? defaultSchedulingModeForType(type),
  };
}

export function employeeNetSalary(employee: Employee | undefined): number {
  if (!employee) return 0;
  return calculatePayroll({
    baseSalary: employee.baseSalary,
    mealAllowance: employee.mealAllowance,
    transportAllowance: employee.transportAllowance,
    otherAllowances: (employee.otherAllowances || 0) + (employee.monthlyBonus || 0),
    familyAllowanceValue: employee.familyAllowance || 0,
    isRetired: employee.isRetired,
    isColaborador: employee.contractType === 'colaborador',
  }).netSalary;
}

export function warehouseLossMaxMonthly(netSalary: number): number {
  return Math.round(netSalary * WAREHOUSE_LOSS_MAX_RATE);
}

export function isWarehouseLossType(type: DeductionType): boolean {
  return type === 'warehouse_loss';
}

export function calculateInstallments(args: {
  type: DeductionType;
  totalAmount: number;
  monthlyPrestacao: number;
  manualOverride: boolean;
  warehouseCap: number;
}): number {
  const { type, totalAmount, monthlyPrestacao, manualOverride, warehouseCap } = args;
  const isWh = isWarehouseLossType(type);
  if (isWh && !manualOverride && warehouseCap > 0 && totalAmount > 0) {
    return Math.max(1, Math.ceil(totalAmount / warehouseCap));
  }
  if (isWh && manualOverride && totalAmount > 0) {
    if (monthlyPrestacao <= 0 || monthlyPrestacao >= totalAmount - 0.01) return 1;
    return Math.max(1, Math.ceil(totalAmount / monthlyPrestacao));
  }
  if (monthlyPrestacao > 0 && totalAmount > 0) {
    return Math.max(1, Math.ceil(totalAmount / monthlyPrestacao));
  }
  return 1;
}

export function effectiveMonthlyAmount(args: {
  type: DeductionType;
  totalAmount: number;
  monthlyPrestacao: number;
  manualOverride: boolean;
  warehouseCap: number;
}): number {
  const { type, totalAmount, monthlyPrestacao, manualOverride, warehouseCap } = args;
  if (isWarehouseLossType(type) && !manualOverride && warehouseCap > 0) {
    return warehouseCap;
  }
  return monthlyPrestacao > 0 ? monthlyPrestacao : totalAmount;
}

export function exceedsWarehouseLimit(args: {
  type: DeductionType;
  manualOverride: boolean;
  monthlyPrestacao: number;
  warehouseCap: number;
}): boolean {
  const { type, manualOverride, monthlyPrestacao, warehouseCap } = args;
  return (
    isWarehouseLossType(type) &&
    manualOverride &&
    monthlyPrestacao > 0 &&
    warehouseCap > 0 &&
    monthlyPrestacao > warehouseCap
  );
}

/** Open salary advances from DB + optional synthetic drafts (other lote rows). */
export function openAdvancesForEntry(
  employeeId: string,
  type: DeductionType,
  deductions: Deduction[],
  syntheticAdvances: Deduction[] = []
): Deduction[] {
  if (!employeeId || type !== 'salary_advance') return [];
  const fromDb = getOpenSalaryAdvancesForEmployee(employeeId, deductions);
  return [...fromDb, ...syntheticAdvances];
}

export function suggestedStartPeriodId(
  employeeId: string,
  type: DeductionType,
  date: string,
  deductions: Deduction[],
  periods: PayrollPeriod[],
  syntheticAdvances: Deduction[] = []
): string | undefined {
  if (!employeeId || type !== 'salary_advance') return undefined;
  return suggestDeductFromPeriodIdForNewAdvance(
    employeeId,
    [...deductions, ...syntheticAdvances],
    periods,
    date
  );
}

export type DeductionEntryBuildError =
  | 'employee'
  | 'description'
  | 'total'
  | 'date'
  | 'monthly'
  | 'start_month'
  | 'parallel_open_advances';

export interface DeductionEntryBuildResult {
  ok: true;
  data: DeductionFormData;
  installments: number;
  effectiveMonthly: number;
}

export interface DeductionEntryBuildFail {
  ok: false;
  error: DeductionEntryBuildError;
}

/**
 * Same rules as solo DeductionFormDialog submit.
 * Call this from solo and from each lote row before addDeduction.
 */
export function buildDeductionFormData(
  state: DeductionEntryState,
  ctx: {
    openAdvances: Deduction[];
    suggestedDeductFromPeriodId?: string;
    warehouseCap: number;
  }
): DeductionEntryBuildResult | DeductionEntryBuildFail {
  const isWh = isWarehouseLossType(state.type);

  if (!state.employeeId) return { ok: false, error: 'employee' };
  if (!state.description.trim()) return { ok: false, error: 'description' };
  if (!state.totalAmount || state.totalAmount <= 0) return { ok: false, error: 'total' };
  if (!state.date) return { ok: false, error: 'date' };

  if (!isWh || state.manualOverride) {
    if (state.monthlyPrestacao <= 0 && state.totalAmount > 0) {
      return { ok: false, error: 'monthly' };
    }
  }

  const installments = calculateInstallments({
    type: state.type,
    totalAmount: state.totalAmount,
    monthlyPrestacao: state.monthlyPrestacao,
    manualOverride: state.manualOverride,
    warehouseCap: ctx.warehouseCap,
  });
  const effectiveMonthly = effectiveMonthlyAmount({
    type: state.type,
    totalAmount: state.totalAmount,
    monthlyPrestacao: state.monthlyPrestacao,
    manualOverride: state.manualOverride,
    warehouseCap: ctx.warehouseCap,
  });

  let resolvedDeductFrom: string | undefined;
  if (state.deductStartMode === 'pick') {
    if (!state.deductFromPeriodId) return { ok: false, error: 'start_month' };
    resolvedDeductFrom = state.deductFromPeriodId;
  } else if (
    state.schedulingMode === 'sequential' &&
    state.type === 'salary_advance' &&
    ctx.openAdvances.length > 0 &&
    ctx.suggestedDeductFromPeriodId
  ) {
    resolvedDeductFrom = ctx.suggestedDeductFromPeriodId;
  }

  if (
    state.type === 'salary_advance' &&
    state.schedulingMode === 'parallel' &&
    ctx.openAdvances.length > 0 &&
    !resolvedDeductFrom
  ) {
    return { ok: false, error: 'parallel_open_advances' };
  }

  const data: DeductionFormData = {
    employeeId: state.employeeId,
    type: state.type,
    description: state.description.trim(),
    totalAmount: state.totalAmount,
    date: state.date,
    installments,
    monthlyAmount: effectiveMonthly,
    ignoreWarehouseCap: isWh && state.manualOverride,
    deductFromPeriodId: resolvedDeductFrom,
    schedulingMode: state.schedulingMode,
  };

  return { ok: true, data, installments, effectiveMonthly };
}

export function deductionEntryErrorMessage(
  error: DeductionEntryBuildError,
  language: string
): string {
  const pt = language === 'pt';
  switch (error) {
    case 'employee':
      return pt ? 'Seleccione o funcionário' : 'Select employee';
    case 'description':
      return pt ? 'Informe a descrição' : 'Enter description';
    case 'total':
      return pt ? 'Informe o valor total' : 'Enter total amount';
    case 'date':
      return pt ? 'Informe a data' : 'Enter date';
    case 'monthly':
      return pt ? 'Informe o valor da prestação mensal' : 'Enter the monthly installment amount';
    case 'start_month':
      return pt
        ? 'Seleccione o mês da folha para iniciar o desconto'
        : 'Select the payroll month to start deductions';
    case 'parallel_open_advances':
      return pt
        ? 'Já existem adiantamentos em aberto. Escolha o mês de início na folha ou use a fila.'
        : 'Open advances already exist. Pick the payroll start month or use queue mode.';
    default:
      return pt ? 'Dados inválidos' : 'Invalid data';
  }
}