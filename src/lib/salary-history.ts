/**
 * Salary History Analysis - Enterprise HR Decision Support
 * 
 * Provides comprehensive salary analysis across years for:
 * - Employee salary history
 * - Year-over-year comparisons
 * - HR decision support (termination, promotion, etc.)
 */

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { 
  EmployeeSalaryHistory, 
  SalaryRecord, 
  SalaryComparison,
  PayrollHistorySummary 
} from '@/types/audit';

/**
 * Build complete salary history for an employee
 */
export function buildEmployeeSalaryHistory(
  employee: Employee,
  entries: PayrollEntry[],
  periods: PayrollPeriod[]
): EmployeeSalaryHistory {
  const employeeEntries = entries
    .filter(e => e.employeeId === employee.id)
    .map(entry => {
      const period = periods.find(p => p.id === entry.payrollPeriodId);
      return { entry, period };
    })
    .filter(({ period }) => period !== undefined)
    .sort((a, b) => {
      // Sort by year and month
      if (a.period!.year !== b.period!.year) return a.period!.year - b.period!.year;
      return a.period!.month - b.period!.month;
    });
  
  const records: SalaryRecord[] = employeeEntries.map(({ entry, period }) => ({
    periodId: period!.id,
    year: period!.year,
    month: period!.month,
    periodStatus: period!.status,
    baseSalary: entry.baseSalary,
    grossSalary: entry.grossSalary,
    netSalary: entry.netSalary,
    totalDeductions: entry.totalDeductions,
    overtime: (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0),
    subsidies: (entry.thirteenthMonth || 0) + (entry.holidaySubsidy || 0),
    absenceDeduction: entry.absenceDeduction || 0,
    irt: entry.irt,
    inss: entry.inssEmployee,
    calculatedAt: period!.processedAt,
    approvedAt: period!.approvedAt,
    paidAt: period!.paidAt,
  }));
  
  // Calculate aggregated stats
  const totalEarnings = records.reduce((sum, r) => sum + r.grossSalary, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
  const totalNetPaid = records.reduce((sum, r) => sum + r.netSalary, 0);
  const monthsWorked = records.length;
  const averageMonthlySalary = monthsWorked > 0 ? totalNetPaid / monthsWorked : 0;
  
  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    hireDate: employee.hireDate,
    currentSalary: employee.baseSalary,
    records,
    totalEarnings,
    totalDeductions,
    totalNetPaid,
    averageMonthlySalary,
    monthsWorked,
  };
}

/**
 * Build year-over-year salary comparison for an employee
 */
export function buildSalaryComparisonForEmployee(
  employee: Employee,
  entries: PayrollEntry[],
  periods: PayrollPeriod[]
): SalaryComparison {
  const history = buildEmployeeSalaryHistory(employee, entries, periods);
  
  // Group by year
  const yearMap = new Map<number, SalaryRecord[]>();
  history.records.forEach(record => {
    const existing = yearMap.get(record.year) || [];
    existing.push(record);
    yearMap.set(record.year, existing);
  });
  
  const years = Array.from(yearMap.entries())
    .map(([year, records]) => ({
      year,
      totalGross: records.reduce((sum, r) => sum + r.grossSalary, 0),
      totalNet: records.reduce((sum, r) => sum + r.netSalary, 0),
      averageMonthly: records.reduce((sum, r) => sum + r.netSalary, 0) / records.length,
      monthsWorked: records.length,
    }))
    .sort((a, b) => a.year - b.year);
  
  // Calculate growth
  let salaryGrowthPercent: number | undefined;
  let netGrowthPercent: number | undefined;
  
  if (years.length >= 2) {
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    
    if (firstYear.averageMonthly > 0) {
      salaryGrowthPercent = ((lastYear.averageMonthly - firstYear.averageMonthly) / firstYear.averageMonthly) * 100;
    }
    if (firstYear.totalNet > 0) {
      netGrowthPercent = ((lastYear.totalNet - firstYear.totalNet) / firstYear.totalNet) * 100;
    }
  }
  
  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    years,
    salaryGrowthPercent,
    netGrowthPercent,
  };
}

/**
 * Build year-over-year salary comparison for ALL employees
 */
export function buildSalaryComparison(
  employees: Employee[],
  entries: PayrollEntry[],
  periods: PayrollPeriod[],
  focusYear?: number
): SalaryComparison[] {
  return employees.map(emp => buildSalaryComparisonForEmployee(emp, entries, periods));
}

/**
 * Build overall payroll history summary
 */
export function buildPayrollHistorySummary(
  periods: PayrollPeriod[],
  entries: PayrollEntry[]
): PayrollHistorySummary {
  // Only count approved or paid periods for history
  const historicalPeriods = periods.filter(p => p.status === 'approved' || p.status === 'paid');
  
  const totalPeriodsProcessed = historicalPeriods.length;
  const totalEmployeesPaid = new Set(entries.filter(e => {
    const period = periods.find(p => p.id === e.payrollPeriodId);
    return period && (period.status === 'approved' || period.status === 'paid');
  }).map(e => e.employeeId)).size;
  
  const historicalEntries = entries.filter(e => {
    const period = periods.find(p => p.id === e.payrollPeriodId);
    return period && (period.status === 'approved' || period.status === 'paid');
  });
  
  const totalGrossPaid = historicalEntries.reduce((sum, e) => sum + e.grossSalary, 0);
  const totalNetPaid = historicalEntries.reduce((sum, e) => sum + e.netSalary, 0);
  const totalDeductionsCollected = historicalEntries.reduce((sum, e) => sum + e.totalDeductions, 0);
  
  // Group by year
  const yearMap = new Map<number, {
    periods: Set<string>;
    employees: Set<string>;
    gross: number;
    net: number;
    deductions: number;
  }>();
  
  historicalEntries.forEach(entry => {
    const period = periods.find(p => p.id === entry.payrollPeriodId);
    if (!period) return;
    
    const yearData = yearMap.get(period.year) || {
      periods: new Set(),
      employees: new Set(),
      gross: 0,
      net: 0,
      deductions: 0,
    };
    
    yearData.periods.add(period.id);
    yearData.employees.add(entry.employeeId);
    yearData.gross += entry.grossSalary;
    yearData.net += entry.netSalary;
    yearData.deductions += entry.totalDeductions;
    
    yearMap.set(period.year, yearData);
  });
  
  const byYear = Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      periodsCount: data.periods.size,
      employeesCount: data.employees.size,
      totalGross: data.gross,
      totalNet: data.net,
      totalDeductions: data.deductions,
    }))
    .sort((a, b) => b.year - a.year); // Newest first
  
  // Recent periods
  const recentPeriods = [...historicalPeriods]
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, 12)
    .map(p => ({
      id: p.id,
      year: p.year,
      month: p.month,
      status: p.status,
      totalGross: p.totalGross,
      totalNet: p.totalNet,
      employeeCount: entries.filter(e => e.payrollPeriodId === p.id).length,
      approvedAt: p.approvedAt,
    }));
  
  return {
    totalPeriodsProcessed,
    totalEmployeesPaid,
    totalGrossPaid,
    totalNetPaid,
    totalDeductionsCollected,
    byYear,
    recentPeriods,
  };
}

/**
 * Get all employees with their salary comparisons for HR dashboard
 * @deprecated Use buildSalaryComparison instead
 */
export function getAllEmployeeSalaryComparisons(
  employees: Employee[],
  entries: PayrollEntry[],
  periods: PayrollPeriod[]
): SalaryComparison[] {
  return employees.map(emp => buildSalaryComparisonForEmployee(emp, entries, periods));
}

/**
 * Calculate termination package for employee
 * Based on Angolan labor law
 */
export function calculateTerminationPackage(
  employee: Employee,
  entries: PayrollEntry[],
  periods: PayrollPeriod[],
  terminationDateStr: string = new Date().toISOString().split('T')[0],
  terminationReason: 'voluntary' | 'dismissal' | 'contract_end' | 'retirement' = 'voluntary',
  unusedLeaveDays: number = 0
): {
  yearsOfService: number;
  monthsWorked: number;
  averageSalary: number;
  severancePay: number;
  proportionalLeave: number;
  proportional13th: number;
  proportionalHolidaySubsidy: number;
  noticePeriodDays: number;
  noticeCompensation: number;
  unusedLeaveCompensation: number;
  totalPackage: number;
} {
  const history = buildEmployeeSalaryHistory(employee, entries, periods);
  
  const hireDate = new Date(employee.hireDate);
  const terminationDate = new Date(terminationDateStr);
  const msWorked = terminationDate.getTime() - hireDate.getTime();
  const daysWorked = msWorked / (1000 * 60 * 60 * 24);
  const monthsWorked = Math.floor(daysWorked / 30);
  const yearsOfService = daysWorked / 365.25;
  
  const averageSalary = history.averageMonthlySalary || employee.baseSalary;
  const dailyRate = employee.baseSalary / 22; // 22 working days
  
  // Calculate months in current year for proportional benefits
  const currentMonth = terminationDate.getMonth() + 1;
  
  // Proportional annual leave (based on months worked this year)
  const proportionalLeave = (averageSalary * currentMonth) / 12;
  
  // Proportional 13th month (50% of base salary, proportional to months worked)
  const proportional13th = (employee.baseSalary * 0.5 * currentMonth) / 12;
  
  // Proportional holiday subsidy (50% of base salary, proportional)
  const proportionalHolidaySubsidy = (employee.baseSalary * 0.5 * currentMonth) / 12;
  
  // Notice period (based on years of service)
  // Less than 3 months: 15 days
  // 3 months to 1 year: 30 days
  // 1-5 years: 30 days
  // 5+ years: 60 days
  let noticePeriodDays = 15;
  if (yearsOfService >= 5) {
    noticePeriodDays = 60;
  } else if (yearsOfService >= 0.25) {
    noticePeriodDays = 30;
  }
  
  // Notice compensation (only if employer dismisses without notice)
  const noticeCompensation = terminationReason === 'dismissal' ? dailyRate * noticePeriodDays : 0;
  
  // Severance pay (depends on reason)
  // Dismissal without just cause: 1 month per year
  // Voluntary resignation: typically no severance
  // Contract end: may include proportional severance
  let severancePay = 0;
  if (terminationReason === 'dismissal') {
    severancePay = Math.floor(yearsOfService) * averageSalary;
  } else if (terminationReason === 'contract_end') {
    severancePay = Math.floor(yearsOfService) * averageSalary * 0.5;
  } else if (terminationReason === 'retirement') {
    severancePay = Math.floor(yearsOfService) * averageSalary;
  }
  
  // Unused leave compensation
  const unusedLeaveCompensation = unusedLeaveDays * dailyRate;
  
  const totalPackage = 
    severancePay + 
    proportionalLeave + 
    proportional13th + 
    proportionalHolidaySubsidy + 
    noticeCompensation + 
    unusedLeaveCompensation;
  
  return {
    yearsOfService,
    monthsWorked,
    averageSalary,
    severancePay,
    proportionalLeave,
    proportional13th,
    proportionalHolidaySubsidy,
    noticePeriodDays,
    noticeCompensation,
    unusedLeaveCompensation,
    totalPackage,
  };
}
