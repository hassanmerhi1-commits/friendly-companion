import type { PayrollEntry } from '@/types/payroll';
import type { DeductionType } from '@/types/deduction';

/** Per-type amounts deducted on one payroll entry (employee-side, excl. IRT/INSS). */
export interface PayrollDeductionBreakdown {
  warehouse_loss: number;
  salary_advance: number;
  loan: number;
  unjustified_absence: number;
  other: number;
}

export const PAYROLL_HISTORY_DEDUCTION_COLUMNS: {
  key: keyof PayrollDeductionBreakdown;
  type: DeductionType;
}[] = [
  { key: 'unjustified_absence', type: 'unjustified_absence' },
  { key: 'warehouse_loss', type: 'warehouse_loss' },
  { key: 'loan', type: 'loan' },
  { key: 'salary_advance', type: 'salary_advance' },
  { key: 'other', type: 'other' },
];

function emptyBreakdown(): PayrollDeductionBreakdown {
  return {
    warehouse_loss: 0,
    salary_advance: 0,
    loan: 0,
    unjustified_absence: 0,
    other: 0,
  };
}

function addToBreakdown(out: PayrollDeductionBreakdown, type: string, amount: number) {
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return;

  switch (type) {
    case 'warehouse_loss':
      out.warehouse_loss += amt;
      break;
    case 'salary_advance':
      out.salary_advance += amt;
      break;
    case 'loan':
      out.loan += amt;
      break;
    case 'unjustified_absence':
      out.unjustified_absence += amt;
      break;
    case 'disciplinary':
    case 'other':
    default:
      out.other += amt;
      break;
  }
}

/**
 * Build deduction-type totals for dossier salary history from payroll entry data.
 * Prefers deduction_details JSON; falls back to legacy scalar columns when a bucket is empty.
 */
export function parsePayrollEntryDeductionBreakdown(
  entry: Pick<
    PayrollEntry,
    'deductionDetails' | 'absenceDeduction' | 'loanDeduction' | 'advanceDeduction' | 'otherDeductions'
  >
): PayrollDeductionBreakdown {
  const out = emptyBreakdown();
  let parsedFromDetails = false;

  if (entry.deductionDetails) {
    try {
      const parsed = JSON.parse(entry.deductionDetails);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedFromDetails = true;
        for (const item of parsed) {
          addToBreakdown(out, String(item?.type ?? 'other').trim(), item?.amount);
        }
      }
    } catch {
      /* ignore malformed JSON */
    }
  }

  if (!parsedFromDetails || out.unjustified_absence <= 0) {
    out.unjustified_absence += entry.absenceDeduction || 0;
  }
  if (!parsedFromDetails || out.loan <= 0) {
    out.loan += entry.loanDeduction || 0;
  }
  if (!parsedFromDetails || out.salary_advance <= 0) {
    out.salary_advance += entry.advanceDeduction || 0;
  }
  if (!parsedFromDetails) {
    out.other += entry.otherDeductions || 0;
  }

  return out;
}

export function sumBreakdown(b: PayrollDeductionBreakdown): number {
  return (
    b.warehouse_loss +
    b.salary_advance +
    b.loan +
    b.unjustified_absence +
    b.other
  );
}
