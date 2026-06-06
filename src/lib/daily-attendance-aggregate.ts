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

export function buildBulkEntriesFromDailyMarks(
  employeeIds: string[],
  referenceDate: Date,
  employees: Employee[],
  periods: PayrollPeriod[],
  notesPrefix = 'Auto-aggregated from daily marking'
): Array<Omit<BulkAttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  const dailyStore = useDailyAttendanceStore.getState();
  const target = getTargetMonthForDate(referenceDate, periods);
  const originalMonth = referenceDate.getMonth() + 1;
  const originalYear = referenceDate.getFullYear();
  const isCarriedForward = target.month !== originalMonth || target.year !== originalYear;

  const period = periods.find(
    (p) => p.month === originalMonth && p.year === originalYear && p.cutoffDate
  );

  return employeeIds.map((empId) => {
    let absenceDays = 0;
    let justifiedAbsenceDays = 0;
    let delayHours = 0;

    if (isCarriedForward && period?.cutoffDate) {
      const allRecords = dailyStore.getRecordsForEmployee(empId, originalMonth, originalYear);
      for (const r of allRecords) {
        if (r.date > period.cutoffDate) {
          if (r.status === 'absent') absenceDays++;
          else if (r.status === 'justified') justifiedAbsenceDays++;
          else if (r.status === 'late') delayHours += r.delayHours;
        }
      }
      const existingTargetAgg = dailyStore.getMonthlyAggregation(empId, target.month, target.year);
      absenceDays += existingTargetAgg.absenceDays;
      justifiedAbsenceDays += existingTargetAgg.justifiedAbsenceDays;
      delayHours += existingTargetAgg.delayHours;
    } else {
      const agg = dailyStore.getMonthlyAggregation(empId, target.month, target.year);
      absenceDays = agg.absenceDays;
      justifiedAbsenceDays = agg.justifiedAbsenceDays;
      delayHours = agg.delayHours;
    }

    const employee = employees.find((e) => e.id === empId);
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

    const deduction = calculateBulkAttendanceDeduction(fullSalary, absenceDays, delayHours);

    return {
      employeeId: empId,
      month: target.month,
      year: target.year,
      absenceDays,
      justifiedAbsenceDays,
      delayHours,
      ...deduction,
      notes: isCarriedForward
        ? `${notesPrefix} (carried from ${originalMonth}/${originalYear} post-cutoff)`
        : notesPrefix,
    };
  });
}
