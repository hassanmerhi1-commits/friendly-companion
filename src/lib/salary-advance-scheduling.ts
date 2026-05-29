import type { Deduction } from '@/types/deduction';
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

/**
 * When registering a new advance while others are open, suggest the first folha month
 * after all existing open advances finish (FIFO queue length).
 */
export function suggestDeductFromPeriodIdForNewAdvance(
  employeeId: string,
  deductions: Deduction[],
  periods: PayrollPeriod[],
  grantDate: string
): string | undefined {
  const open = getOpenSalaryAdvancesForEmployee(employeeId, deductions);
  if (open.length === 0) return undefined;

  let queueMonths = 0;
  const sorted = [...open].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const adv of sorted) {
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

/**
 * At most one salary advance per employee per folha — oldest open advance in the queue.
 */
/** True when another open advance must finish before this one deducts on folha. */
export function isSalaryAdvanceQueued(
  deduction: Deduction,
  allDeductions: Deduction[]
): boolean {
  if (deduction.type !== 'salary_advance' || deduction.isFullyPaid) return false;
  const open = getOpenSalaryAdvancesForEmployee(deduction.employeeId, allDeductions);
  if (open.length <= 1) return false;
  const oldest = [...open].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0];
  return oldest.id !== deduction.id;
}

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

  eligible.sort(
    (a, b) => new Date(a.d.createdAt).getTime() - new Date(b.d.createdAt).getTime()
  );
  return [...rest, eligible[0]];
}
