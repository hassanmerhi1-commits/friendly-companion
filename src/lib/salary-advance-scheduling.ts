import type { Deduction, DeductionSchedulingMode } from '@/types/deduction';
import type { PayrollPeriod } from '@/types/payroll';
import {
  formatPeriodLabelFromId,
  periodIdFromYearMonth,
  resolvePeriodYearMonth,
} from '@/lib/payroll-period-options';

const BALANCE_EPSILON = 0.01;

export function periodSortKey(p: Pick<PayrollPeriod, 'year' | 'month'>): number {
  return p.year * 100 + p.month;
}

export function comparePeriods(a: Pick<PayrollPeriod, 'year' | 'month'>, b: Pick<PayrollPeriod, 'year' | 'month'>): number {
  return periodSortKey(a) - periodSortKey(b);
}

export function findPeriodForDate(date: string, periods: PayrollPeriod[]): PayrollPeriod | undefined {
  const day = (date || '').split('T')[0];
  if (!day) return undefined;
  return periods.find((p) => p.startDate && p.endDate && day >= p.startDate && day <= p.endDate);
}

export function shiftPeriodByMonths(
  periods: PayrollPeriod[],
  fromPeriodId: string,
  monthsForward: number
): string | undefined {
  const fromYm = resolvePeriodYearMonth(fromPeriodId, periods);
  if (!fromYm || monthsForward <= 0) return fromPeriodId;

  let { year, month } = fromYm;
  for (let i = 0; i < monthsForward; i++) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const existing = periods.find((p) => p.year === year && p.month === month);
  return existing?.id ?? periodIdFromYearMonth(year, month);
}

export function formatPeriodLabel(
  periodId: string | undefined,
  periods: PayrollPeriod[],
  monthNames: string[]
): string {
  return formatPeriodLabelFromId(periodId, periods, monthNames);
}

export function remainingInstallmentMonths(deduction: Pick<Deduction, 'remainingAmount' | 'amount'>): number {
  if (deduction.remainingAmount <= BALANCE_EPSILON) return 0;
  const monthly = deduction.amount > BALANCE_EPSILON ? deduction.amount : deduction.remainingAmount;
  return Math.max(1, Math.ceil(deduction.remainingAmount / monthly));
}

export function getOpenSalaryAdvancesForEmployee(employeeId: string, deductions: Deduction[]): Deduction[] {
  return deductions.filter(
    (d) => d.employeeId === employeeId && d.type === 'salary_advance' && !d.isFullyPaid
  );
}

/** Resolve scheduling mode for legacy rows without stored value. */
export function resolveSchedulingMode(
  deduction: Pick<Deduction, 'schedulingMode' | 'type'>
): DeductionSchedulingMode {
  if (deduction.schedulingMode === 'parallel' || deduction.schedulingMode === 'sequential') {
    return deduction.schedulingMode;
  }
  if (deduction.type === 'salary_advance' || deduction.type === 'warehouse_loss') {
    return 'sequential';
  }
  return 'parallel';
}

export function isDeductionParallel(deduction: Pick<Deduction, 'schedulingMode' | 'type'>): boolean {
  return resolveSchedulingMode(deduction) === 'parallel';
}

function sortByCreatedAt<T extends { d: Deduction }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(a.d.createdAt).getTime() - new Date(b.d.createdAt).getTime()
  );
}

/** Keep only the oldest item in a sequential FIFO group. */
export function keepOldestSequentialOnly<T extends { d: Deduction }>(items: T[]): T[] {
  if (items.length <= 1) return items;
  return [sortByCreatedAt(items)[0]];
}

/**
 * When registering a new advance while others are open, suggest the first folha month
 * after all existing open sequential advances finish (FIFO queue length).
 */
export function suggestDeductFromPeriodIdForNewAdvance(
  employeeId: string,
  deductions: Deduction[],
  periods: PayrollPeriod[],
  grantDate: string
): string | undefined {
  const open = getOpenSalaryAdvancesForEmployee(employeeId, deductions).filter(
    (d) => !isDeductionParallel(d)
  );
  if (open.length === 0) return undefined;

  let queueMonths = 0;
  const sorted = sortByCreatedAt(open.map((d) => ({ d })));
  for (const { d: adv } of sorted) {
    queueMonths += remainingInstallmentMonths(adv);
  }

  const base =
    findPeriodForDate(grantDate, periods) ||
    [...periods].sort((a, b) => comparePeriods(b, a))[0];
  if (!base) return undefined;

  if (queueMonths <= 0) return base.id;
  return shiftPeriodByMonths(periods, base.id, queueMonths);
}

/** Optional user-chosen first folha month — applies to any deduction type. */
export function isDeductionBlockedByStartPeriod(
  deduction: Pick<Deduction, 'deductFromPeriodId'>,
  periodId: string,
  periods: PayrollPeriod[]
): boolean {
  if (!deduction.deductFromPeriodId) return false;
  const startYm = resolvePeriodYearMonth(deduction.deductFromPeriodId, periods);
  const current = periods.find((p) => p.id === periodId);
  if (!startYm || !current) return false;
  return comparePeriods(current, startYm) < 0;
}

/** True when another open sequential advance must finish before this one deducts on folha. */
export function isSalaryAdvanceQueued(
  deduction: Deduction,
  allDeductions: Deduction[]
): boolean {
  if (deduction.type !== 'salary_advance' || deduction.isFullyPaid) return false;
  if (isDeductionParallel(deduction)) return false;

  const openSequential = getOpenSalaryAdvancesForEmployee(deduction.employeeId, allDeductions).filter(
    (d) => !isDeductionParallel(d)
  );
  if (openSequential.length <= 1) return false;

  const oldest = sortByCreatedAt(openSequential.map((d) => ({ d })))[0].d;
  return oldest.id !== deduction.id;
}

/** True when another open sequential capped warehouse loss is ahead in the queue. */
export function isWarehouseLossQueued(
  deduction: Deduction,
  allDeductions: Deduction[]
): boolean {
  if (deduction.type !== 'warehouse_loss' || deduction.isFullyPaid) return false;
  if (deduction.ignoreWarehouseCap) return false;
  if (isDeductionParallel(deduction)) return false;

  const openSequential = allDeductions.filter(
    (d) =>
      d.employeeId === deduction.employeeId &&
      d.type === 'warehouse_loss' &&
      !d.isFullyPaid &&
      !d.ignoreWarehouseCap &&
      !isDeductionParallel(d)
  );
  if (openSequential.length <= 1) return false;

  const oldest = sortByCreatedAt(openSequential.map((d) => ({ d })))[0].d;
  return oldest.id !== deduction.id;
}

export function isDeductionQueued(deduction: Deduction, allDeductions: Deduction[]): boolean {
  if (deduction.type === 'salary_advance') {
    return isSalaryAdvanceQueued(deduction, allDeductions);
  }
  if (deduction.type === 'warehouse_loss') {
    return isWarehouseLossQueued(deduction, allDeductions);
  }
  return false;
}

/**
 * Apply salary-advance scheduling for one folha period.
 * Parallel advances stack; sequential advances keep only the oldest eligible.
 */
export function applySalaryAdvanceFifoForPeriod<T extends { d: Deduction; amount: number }>(
  items: T[],
  periodId: string,
  periods: PayrollPeriod[]
): T[] {
  const advances = items.filter((x) => x.d.type === 'salary_advance');
  const rest = items.filter((x) => x.d.type !== 'salary_advance');
  if (advances.length === 0) return items;

  const eligible = advances.filter(
    (x) => !isDeductionBlockedByStartPeriod(x.d, periodId, periods)
  );
  if (eligible.length === 0) return rest;

  const parallel = eligible.filter((x) => isDeductionParallel(x.d));
  const sequential = eligible.filter((x) => !isDeductionParallel(x.d));
  const selectedSequential = keepOldestSequentialOnly(sequential);

  return [...rest, ...parallel, ...selectedSequential];
}
