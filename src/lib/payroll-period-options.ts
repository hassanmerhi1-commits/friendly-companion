import type { PayrollPeriod } from '@/types/payroll';

function periodSortKey(p: { year: number; month: number }): number {
  return p.year * 100 + p.month;
}

function comparePeriods(a: { year: number; month: number }, b: { year: number; month: number }): number {
  return periodSortKey(a) - periodSortKey(b);
}

/** Same id format as payroll-store createPeriod. */
export function periodIdFromYearMonth(year: number, month: number): string {
  return `period-${year}-${month}`;
}

export function parsePeriodId(periodId: string): { year: number; month: number } | null {
  const match = /^period-(\d{4})-(\d{1,2})$/.exec(periodId.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function resolvePeriodYearMonth(
  periodId: string,
  periods: PayrollPeriod[]
): { year: number; month: number } | null {
  const found = periods.find((p) => p.id === periodId);
  if (found) return { year: found.year, month: found.month };
  return parsePeriodId(periodId);
}

export function formatPeriodLabelFromId(
  periodId: string | undefined,
  periods: PayrollPeriod[],
  monthNames: string[]
): string {
  if (!periodId) return '';
  const ym = resolvePeriodYearMonth(periodId, periods);
  if (!ym) return periodId;
  const name = monthNames[ym.month - 1] ?? String(ym.month);
  return `${name} ${ym.year}`;
}

export interface PayrollMonthOption {
  id: string;
  year: number;
  month: number;
  label: string;
  existsInDb: boolean;
  status?: PayrollPeriod['status'];
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let y = year;
  let m = month + delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

/**
 * Full calendar month list for "iniciar desconto na folha" — not limited to existing/calculated periods.
 */
export function buildSelectablePayrollMonths(
  periods: PayrollPeriod[],
  monthNames: string[],
  opts?: {
    monthsBack?: number;
    monthsForward?: number;
    anchorDate?: Date;
  }
): PayrollMonthOption[] {
  const anchor = opts?.anchorDate ?? new Date();
  const monthsBack = opts?.monthsBack ?? 12;
  const monthsForward = opts?.monthsForward ?? 48;

  const start = addMonths(anchor.getFullYear(), anchor.getMonth() + 1, -monthsBack);
  const end = addMonths(anchor.getFullYear(), anchor.getMonth() + 1, monthsForward);

  const periodByYearMonth = new Map<string, PayrollPeriod>();
  for (const p of periods) {
    periodByYearMonth.set(`${p.year}-${p.month}`, p);
  }

  const options: PayrollMonthOption[] = [];
  let y = start.year;
  let m = start.month;

  while (periodSortKey({ year: y, month: m }) <= periodSortKey(end)) {
    const existing = periodByYearMonth.get(`${y}-${m}`);
    const id = existing?.id ?? periodIdFromYearMonth(y, m);
    options.push({
      id,
      year: y,
      month: m,
      label: `${monthNames[m - 1] ?? m} ${y}`,
      existsInDb: Boolean(existing),
      status: existing?.status,
    });
    const next = addMonths(y, m, 1);
    y = next.year;
    m = next.month;
  }

  return options.sort((a, b) => comparePeriods(a, b));
}
