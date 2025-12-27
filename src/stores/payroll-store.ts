import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PayrollPeriod, PayrollEntry, PayrollSummary } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import { calculatePayroll, calculateAbsenceDeduction, calculateOvertime, calculateHourlyRate } from '@/lib/angola-labor-law';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

interface PayrollState {
  periods: PayrollPeriod[];
  entries: PayrollEntry[];
  
  // Period management
  createPeriod: (year: number, month: number) => PayrollPeriod;
  getPeriod: (id: string) => PayrollPeriod | undefined;
  getCurrentPeriod: () => PayrollPeriod | undefined;
  updatePeriodStatus: (id: string, status: PayrollPeriod['status']) => void;
  
  generateEntriesForPeriod: (periodId: string, employees: Employee[], holidayRecords?: { employeeId: string; year: number; holidayMonth?: number; subsidyPaidInMonth?: number }[]) => void;
  toggle13thMonth: (entryId: string, monthsWorked: number) => void;
  updateEntry: (id: string, data: Partial<PayrollEntry>) => void;
  getEntriesForPeriod: (periodId: string) => PayrollEntry[];
  recalculateEntry: (id: string) => void;
  removeEntriesForEmployee: (employeeId: string) => void;
  
  // Absence and overtime updates
  updateAbsences: (entryId: string, daysAbsent: number) => void;
  updateOvertime: (entryId: string, hoursNormal: number, hoursNight: number, hoursHoliday: number) => void;
  
  // Summary
  getPayrollSummary: (periodId: string) => PayrollSummary | null;
  
  // Process payroll
  calculatePeriod: (periodId: string) => void;
  approvePeriod: (periodId: string) => void;
  markAsPaid: (periodId: string) => void;
}

// Get start and end dates for a month
function getPeriodDates(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      periods: [],
      entries: [],
      
      createPeriod: (year: number, month: number) => {
        const { startDate, endDate } = getPeriodDates(year, month);
        const newPeriod: PayrollPeriod = {
          id: `period-${year}-${month}`,
          year,
          month,
          startDate,
          endDate,
          status: 'draft',
          periodType: 'monthly',
          totalGross: 0,
          totalNet: 0,
          totalDeductions: 0,
          totalEmployerCosts: 0,
          employeeCount: 0,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          periods: [...state.periods.filter(p => p.id !== newPeriod.id), newPeriod],
        }));
        
        return newPeriod;
      },
      
      getPeriod: (id: string) => {
        return get().periods.find((p) => p.id === id);
      },
      
      getCurrentPeriod: () => {
        const now = new Date();
        return get().periods.find(
          (p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1
        );
      },
      
      updatePeriodStatus: (id: string, status: PayrollPeriod['status']) => {
        set((state) => ({
          periods: state.periods.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
        }));
      },
      
      generateEntriesForPeriod: (periodId: string, employees: Employee[], holidayRecords?: { employeeId: string; year: number; holidayMonth?: number; subsidyPaidInMonth?: number }[]) => {
        const period = get().getPeriod(periodId);
        if (!period) return;
        
        // Get employees who should receive holiday subsidy this month
        // (those going on holiday in the NEXT month)
        const nextMonth = period.month === 12 ? 1 : period.month + 1;
        const nextMonthYear = period.month === 12 ? period.year + 1 : period.year;
        
        const employeesForSubsidy = new Set<string>();
        if (holidayRecords) {
          holidayRecords.forEach(r => {
            // If employee has holiday scheduled for next month and subsidy not yet paid
            if (r.holidayMonth === nextMonth && r.year === nextMonthYear && !r.subsidyPaidInMonth) {
              employeesForSubsidy.add(r.employeeId);
            }
          });
        }
        
        const newEntries: PayrollEntry[] = employees
          .filter((emp) => emp.status === 'active')
          .map((emp) => {
            // Only include holiday subsidy if employee goes on holiday next month
            const shouldPayHolidaySubsidy = employeesForSubsidy.has(emp.id);
            const holidaySubsidyAmount = shouldPayHolidaySubsidy ? (emp.holidaySubsidy || 0) : 0;
            
            const payrollResult = calculatePayroll({
              baseSalary: emp.baseSalary,
              mealAllowance: emp.mealAllowance,
              transportAllowance: emp.transportAllowance,
              otherAllowances: emp.otherAllowances,
              familyAllowanceValue: emp.familyAllowance || 0,
              isRetired: emp.isRetired,
              include13thMonth: false,
              includeHolidaySubsidy: false,
            });
            
            const now = new Date().toISOString();
            
            return {
              id: `entry-${periodId}-${emp.id}`,
              payrollPeriodId: periodId,
              employeeId: emp.id,
              employee: emp,
              ...payrollResult,
              holidaySubsidy: holidaySubsidyAmount,
              grossSalary: payrollResult.grossSalary + holidaySubsidyAmount,
              netSalary: payrollResult.netSalary + holidaySubsidyAmount,
              totalEmployerCost: payrollResult.totalEmployerCost + holidaySubsidyAmount,
              monthlyBonus: emp.monthlyBonus || 0,
              absenceDeduction: 0,
              daysAbsent: 0,
              otherDeductions: 0,
              overtimeHoursNormal: 0,
              overtimeHoursNight: 0,
              overtimeHoursHoliday: 0,
              status: 'draft' as const,
              createdAt: now,
              updatedAt: now,
            };
          });
        
        set((state) => ({
          entries: [
            ...state.entries.filter((e) => e.payrollPeriodId !== periodId),
            ...newEntries,
          ],
        }));
        
        get().calculatePeriod(periodId);
      },
      
      toggle13thMonth: (entryId: string, monthsWorked: number) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry) return;
        
        const hasSubsidy = entry.thirteenthMonth > 0;
        const baseSalary = entry.baseSalary;
        
        const subsidyValue = hasSubsidy ? 0 : (baseSalary * 0.5 * monthsWorked / 12);
        const difference = hasSubsidy ? -entry.thirteenthMonth : subsidyValue;
        
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  thirteenthMonth: subsidyValue,
                  grossSalary: e.grossSalary + difference,
                  netSalary: e.netSalary + difference,
                  totalEmployerCost: e.totalEmployerCost + difference,
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        }));
        
        if (entry.payrollPeriodId) {
          get().calculatePeriod(entry.payrollPeriodId);
        }
      },
      
      updateEntry: (id: string, data: Partial<PayrollEntry>) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
          ),
        }));
      },
      
      // Update absence days and recalculate deduction
      updateAbsences: (entryId: string, daysAbsent: number) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry) return;
        
        const absenceDeduction = calculateAbsenceDeduction(entry.baseSalary, daysAbsent);
        const oldAbsenceDeduction = entry.absenceDeduction || 0;
        const difference = absenceDeduction - oldAbsenceDeduction;
        
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  daysAbsent,
                  absenceDeduction,
                  totalDeductions: e.totalDeductions + difference,
                  netSalary: e.netSalary - difference,
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        }));
        
        if (entry.payrollPeriodId) {
          get().calculatePeriod(entry.payrollPeriodId);
        }
      },
      
      // Update overtime hours and recalculate values
      updateOvertime: (entryId: string, hoursNormal: number, hoursNight: number, hoursHoliday: number) => {
        const entry = get().entries.find((e) => e.id === entryId);
        if (!entry) return;
        
        const hourlyRate = calculateHourlyRate(entry.baseSalary);
        
        // Calculate overtime with progressive rates for normal hours
        const overtimeNormal = calculateOvertime(hourlyRate, hoursNormal, 'normal', 0);
        const overtimeNight = calculateOvertime(hourlyRate, hoursNight, 'night', 0);
        const overtimeHoliday = calculateOvertime(hourlyRate, hoursHoliday, 'holiday', 0);
        
        const oldOvertimeTotal = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
        const newOvertimeTotal = overtimeNormal + overtimeNight + overtimeHoliday;
        const difference = newOvertimeTotal - oldOvertimeTotal;
        
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  overtimeHoursNormal: hoursNormal,
                  overtimeHoursNight: hoursNight,
                  overtimeHoursHoliday: hoursHoliday,
                  overtimeNormal,
                  overtimeNight,
                  overtimeHoliday,
                  grossSalary: e.grossSalary + difference,
                  netSalary: e.netSalary + difference,
                  totalEmployerCost: e.totalEmployerCost + difference,
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        }));
        
        if (entry.payrollPeriodId) {
          get().calculatePeriod(entry.payrollPeriodId);
        }
      },
      
      getEntriesForPeriod: (periodId: string) => {
        return get().entries.filter((e) => e.payrollPeriodId === periodId);
      },
      
      removeEntriesForEmployee: (employeeId: string) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.employeeId !== employeeId),
        }));
      },
      
      recalculateEntry: (id: string) => {
        const entry = get().entries.find((e) => e.id === id);
        if (!entry) return;
        
        const period = get().getPeriod(entry.payrollPeriodId);
        const include13thMonth = period?.month === 12;
        
        const payrollResult = calculatePayroll({
          baseSalary: entry.baseSalary,
          mealAllowance: entry.mealAllowance,
          transportAllowance: entry.transportAllowance,
          otherAllowances: entry.otherAllowances,
          overtimeHoursNormal: entry.overtimeHoursNormal,
          overtimeHoursNight: entry.overtimeHoursNight,
          overtimeHoursHoliday: entry.overtimeHoursHoliday,
          isRetired: entry.employee?.isRetired ?? false,
          include13thMonth,
        });
        
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...payrollResult,
                  totalDeductions: payrollResult.totalDeductions + (entry.otherDeductions || 0),
                  netSalary: payrollResult.netSalary - (entry.otherDeductions || 0),
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        }));
      },
      
      getPayrollSummary: (periodId: string) => {
        const period = get().getPeriod(periodId);
        if (!period) return null;
        
        const entries = get().getEntriesForPeriod(periodId);
        
        const totals = entries.reduce(
          (acc, entry) => ({
            baseSalary: acc.baseSalary + entry.baseSalary,
            allowances: acc.allowances + entry.mealAllowance + entry.transportAllowance + entry.otherAllowances,
            overtime: acc.overtime + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
            subsidies: acc.subsidies + entry.thirteenthMonth + entry.holidaySubsidy,
            grossSalary: acc.grossSalary + entry.grossSalary,
            irt: acc.irt + entry.irt,
            inssEmployee: acc.inssEmployee + entry.inssEmployee,
            totalDeductions: acc.totalDeductions + entry.totalDeductions,
            netSalary: acc.netSalary + entry.netSalary,
            inssEmployer: acc.inssEmployer + entry.inssEmployer,
            totalEmployerCost: acc.totalEmployerCost + entry.totalEmployerCost,
          }),
          {
            baseSalary: 0,
            allowances: 0,
            overtime: 0,
            subsidies: 0,
            grossSalary: 0,
            irt: 0,
            inssEmployee: 0,
            totalDeductions: 0,
            netSalary: 0,
            inssEmployer: 0,
            totalEmployerCost: 0,
          }
        );
        
        const departmentMap = new Map<string, { count: number; gross: number; net: number }>();
        entries.forEach((entry) => {
          const dept = entry.employee?.department || 'Sem Departamento';
          const current = departmentMap.get(dept) || { count: 0, gross: 0, net: 0 };
          departmentMap.set(dept, {
            count: current.count + 1,
            gross: current.gross + entry.grossSalary,
            net: current.net + entry.netSalary,
          });
        });
        
        const byDepartment = Array.from(departmentMap.entries()).map(([dept, data]) => ({
          department: dept,
          employeeCount: data.count,
          totalGross: data.gross,
          totalNet: data.net,
        }));
        
        return {
          period,
          entries,
          totals,
          byDepartment,
        };
      },
      
      calculatePeriod: (periodId: string) => {
        const entries = get().getEntriesForPeriod(periodId);
        
        const totals = entries.reduce(
          (acc, entry) => ({
            totalGross: acc.totalGross + entry.grossSalary,
            totalNet: acc.totalNet + entry.netSalary,
            totalDeductions: acc.totalDeductions + entry.totalDeductions,
            totalEmployerCosts: acc.totalEmployerCosts + entry.totalEmployerCost,
          }),
          { totalGross: 0, totalNet: 0, totalDeductions: 0, totalEmployerCosts: 0 }
        );
        
        set((state) => ({
          periods: state.periods.map((p) =>
            p.id === periodId
              ? {
                  ...p,
                  ...totals,
                  employeeCount: entries.length,
                  status: 'calculated' as const,
                  processedAt: new Date().toISOString(),
                }
              : p
          ),
          entries: state.entries.map((e) =>
            e.payrollPeriodId === periodId ? { ...e, status: 'calculated' as const } : e
          ),
        }));
      },
      
      approvePeriod: (periodId: string) => {
        set((state) => ({
          periods: state.periods.map((p) =>
            p.id === periodId
              ? { ...p, status: 'approved' as const, approvedAt: new Date().toISOString() }
              : p
          ),
          entries: state.entries.map((e) =>
            e.payrollPeriodId === periodId ? { ...e, status: 'approved' as const } : e
          ),
        }));
      },
      
      markAsPaid: (periodId: string) => {
        set((state) => ({
          periods: state.periods.map((p) =>
            p.id === periodId
              ? { ...p, status: 'paid' as const, paidAt: new Date().toISOString() }
              : p
          ),
          entries: state.entries.map((e) =>
            e.payrollPeriodId === periodId ? { ...e, status: 'paid' as const } : e
          ),
        }));
      },
    }),
    {
      name: 'payrollao-payroll',
      storage: createJSONStorage(() => createElectronStorage('payroll_records')),
    }
  )
);
