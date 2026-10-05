import { format } from 'date-fns';
import type { PayrollPeriod } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import {
  calculateBulkAttendanceDeduction,
  calculateFullMonthlySalary,
  type BulkAttendanceEntry,
} from '@/stores/bulk-attendance-store';
import { useDailyAttendanceStore } from '@/stores/daily-attendance-store';

export function getTargetMonthForDate(
  date: Date,
  periods: PayrollPeriod[]
): { month: number; year: number } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dateStr = format(date, 'yyyy-MM-dd');

  const period = periods.find((p) => p.month === month && p.year === year && p.cutoffDate);

  if (period?.cutoffDate && dateStr > period.cutoffDate) {
    return {
      month: month === 12 ? 1 : month + 1,
      year: month === 12 ? year + 1 : year,
    };
  }

  return { month, year };
}

function getRecordDateParts(date: string): { month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

/**
 * Aggregates every daily mark that belongs to a payroll month.
 *
 * A calendar-month mark belongs to the following payroll month when it is
 * later than that calendar month's attendance cutoff. Recomputing from the
 * daily records makes the operation idempotent and prevents a normal mark in
 * the new month from overwriting absences carried from the previous month.
 */
export function getEffectiveMonthlyAggregation(
  employeeId: string,
  month: number,
  year: number,
  periods: PayrollPeriod[]
): {
  absenceDays: number;
  justifiedAbsenceDays: number;
  delayHours: number;
  carriedFromPreviousMonth: boolean;
} {
  const records = useDailyAttendanceStore.getState().records;
  let absenceDays = 0;
  let justifiedAbsenceDays = 0;
  let delayHours = 0;
  let carriedFromPreviousMonth = false;

  for (const record of records) {
    if (record.employeeId !== employeeId) continue;

    const parts = getRecordDateParts(record.date);
    if (!parts) continue;

    const sourcePeriod = periods.find(
      (period) => period.month === parts.month && period.year === parts.year
    );
    const isPostCutoff =
      !!sourcePeriod?.cutoffDate && record.date > sourcePeriod.cutoffDate;
    const targetMonth = isPostCutoff
      ? (parts.month === 12 ? 1 : parts.month + 1)
      : parts.month;
    const targetYear = isPostCutoff && parts.month === 12
      ? parts.year + 1
      : parts.year;

    if (targetMonth !== month || targetYear !== year) continue;

    carriedFromPreviousMonth ||= isPostCutoff;
    if (record.status === 'absent') absenceDays++;
    else if (record.status === 'justified') justifiedAbsenceDays++;
    else if (record.status === 'late') delayHours += record.delayHours;
  }

  return {
    absenceDays,
    justifiedAbsenceDays,
    delayHours,
    carriedFromPreviousMonth,
  };
}

export function buildBulkEntriesForPayrollMonth(
  employeeIds: string[],
  month: number,
  year: number,
  employees: Employee[],
  periods: PayrollPeriod[],
  notesPrefix = 'Auto-aggregated from daily marking'
): Array<Omit<BulkAttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  return employeeIds.map((empId) => {
    const aggregation = getEffectiveMonthlyAggregation(empId, month, year, periods);
    const employee = employees.find((candidate) => candidate.id === empId);
    const fullSalary = employee
      ? calculateFullMonthlySalary({
          baseSalary: employee.baseSalary,
          mealAllowance: employee.mealAllowance,
          transportAllowance: employee.transportAllowance,
          familyAllowance: employee.familyAllowance,
          monthlyBonus: employee.monthlyBonus,
          holidaySubsidy: employee.holidaySubsidy,
          otherAllowances: employee.otherAllowances,
        })
      : 0;
    const deduction = calculateBulkAttendanceDeduction(
      fullSalary,
      aggregation.absenceDays,
      aggregation.delayHours
    );

    return {
      employeeId: empId,
      month,
      year,
      absenceDays: aggregation.absenceDays,
      justifiedAbsenceDays: aggregation.justifiedAbsenceDays,
      delayHours: aggregation.delayHours,
      ...deduction,
      notes: aggregation.carriedFromPreviousMonth
        ? `${notesPrefix} (includes post-cutoff carry-forward)`
        : notesPrefix,
    };
  });
}

export function buildBulkEntriesFromDailyMarks(
  employeeIds: string[],
  referenceDate: Date,
  employees: Employee[],
  periods: PayrollPeriod[],
  notesPrefix = 'Auto-aggregated from daily marking'
): Array<Omit<BulkAttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  const target = getTargetMonthForDate(referenceDate, periods);
  return buildBulkEntriesForPayrollMonth(
    employeeIds,
    target.month,
    target.year,
    employees,
    periods,
    notesPrefix
  );
}
