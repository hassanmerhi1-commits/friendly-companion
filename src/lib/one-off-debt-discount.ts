import type { Deduction } from '@/types/deduction';
import type { PayrollPeriod } from '@/types/payroll';

const EPS = 0.01;

export type OneOffDebtAllocation = {
  type: string;
  description: string;
  amount: number;
  deductionId: string;
  source: 'one_off_debt';
};

export type DeductionBreakdownLine = {
  type?: string;
  description?: string;
  amount?: number;
  deductionId?: string;
  deduction_id?: string;
  id?: string;
  source?: string;
};

/** Open debts that can receive an Extra→dívida allocation this period. */
export function getDeductionsEligibleForOneOffDebt(
  deductions: Deduction[],
  periodId: string,
  periods: PayrollPeriod[]
): Deduction[] {
  return deductions
    .filter((d) => {
      if (d.isFullyPaid) return false;
      if ((d.remainingAmount || 0) <= EPS) return false;
      if (d.isApplied && d.payrollPeriodId && d.payrollPeriodId !== periodId) {
        const old = periods.find((p) => p.id === d.payrollPeriodId);
        if (old && (old.status === 'draft' || old.status === 'calculated')) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function totalOpenDebt(deductions: Deduction[]): number {
  return deductions.reduce((sum, d) => {
    if (d.isFullyPaid) return sum;
    return sum + Math.max(0, d.remainingAmount || 0);
  }, 0);
}

/**
 * Allocate a user-defined amount across open debts (FIFO by createdAt).
 * `alreadyAppliedById` = amounts already on this folha for the same deduction (monthly installment).
 */
export function allocateOneOffDebtDiscount(
  eligible: Deduction[],
  requestedAmount: number,
  alreadyAppliedById: Map<string, number> = new Map()
): { allocations: OneOffDebtAllocation[]; applied: number } {
  const want = Math.max(0, Number(requestedAmount) || 0);
  if (want <= EPS || eligible.length === 0) {
    return { allocations: [], applied: 0 };
  }

  const allocations: OneOffDebtAllocation[] = [];
  let left = want;

  for (const d of eligible) {
    if (left <= EPS) break;
    const already = alreadyAppliedById.get(d.id) || 0;
    const available = Math.max(0, (d.remainingAmount || 0) - already);
    if (available <= EPS) continue;

    const take = Math.min(left, available);
    if (take <= EPS) continue;

    allocations.push({
      type: d.type,
      description: `Extra→dívida: ${d.description || d.type}`,
      amount: take,
      deductionId: d.id,
      source: 'one_off_debt',
    });
    left -= take;
  }

  const applied = want - left;
  return { allocations, applied: applied > EPS ? applied : 0 };
}

export function isOneOffDebtLine(line: DeductionBreakdownLine): boolean {
  return line?.source === 'one_off_debt';
}

export function stripOneOffDebtLines(
  details: DeductionBreakdownLine[]
): { kept: DeductionBreakdownLine[]; removedAmount: number; removed: DeductionBreakdownLine[] } {
  const kept: DeductionBreakdownLine[] = [];
  const removed: DeductionBreakdownLine[] = [];
  let removedAmount = 0;
  for (const line of details) {
    if (isOneOffDebtLine(line)) {
      removed.push(line);
      removedAmount += Number(line.amount || 0);
    } else {
      kept.push(line);
    }
  }
  return { kept, removedAmount, removed };
}

export function buildAlreadyAppliedMap(details: DeductionBreakdownLine[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of details) {
    if (isOneOffDebtLine(line)) continue;
    const id = line.deductionId || line.deduction_id || line.id;
    if (!id) continue;
    const amt = Number(line.amount || 0);
    if (amt <= EPS) continue;
    map.set(id, (map.get(id) || 0) + amt);
  }
  return map;
}
