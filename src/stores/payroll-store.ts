import { create } from 'zustand';
import type { PayrollPeriod, PayrollEntry, PayrollSummary } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import { calculatePayroll, calculateAbsenceDeduction, calculateOvertime, calculateHourlyRate } from '@/lib/angola-labor-law';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onDataChange } from '@/lib/db-live';


interface PayrollState {
  periods: PayrollPeriod[];
  entries: PayrollEntry[];
  isLoaded: boolean;

  loadPayroll: () => Promise<void>;

  createPeriod: (year: number, month: number) => Promise<PayrollPeriod>;
  getPeriod: (id: string) => PayrollPeriod | undefined;
  getCurrentPeriod: () => PayrollPeriod | undefined;
  updatePeriodStatus: (id: string, status: PayrollPeriod['status']) => Promise<void>;

  generateEntriesForPeriod: (periodId: string, employees: Employee[], holidayRecords?: { employeeId: string; year: number; holidayMonth?: number; subsidyPaidInMonth?: number }[]) => Promise<void>;
  toggle13thMonth: (entryId: string, monthsWorked: number) => Promise<void>;
  updateEntry: (id: string, data: Partial<PayrollEntry>) => Promise<void>;
  getEntriesForPeriod: (periodId: string) => PayrollEntry[];
  recalculateEntry: (id: string) => Promise<void>;
  removeEntriesForEmployee: (employeeId: string) => Promise<void>;

  updateAbsences: (entryId: string, daysAbsent: number) => Promise<void>;
  updateOvertime: (entryId: string, hoursNormal: number, hoursNight: number, hoursHoliday: number) => Promise<void>;

  getPayrollSummary: (periodId: string) => PayrollSummary | null;

  calculatePeriod: (periodId: string) => Promise<void>;
  approvePeriod: (periodId: string) => Promise<void>;
  markAsPaid: (periodId: string) => Promise<void>;
}

function getPeriodDates(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// Map DB row -> PayrollPeriod
function mapDbRowToPeriod(row: any): PayrollPeriod {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    status: row.status || 'draft',
    periodType: row.type || 'monthly',
    totalGross: row.total_gross || 0,
    totalNet: row.total_net || 0,
    totalDeductions: row.total_deductions || 0,
    totalEmployerCosts: row.total_employer_costs || 0,
    employeeCount: 0,
    createdAt: row.created_at || '',
    processedAt: row.processed_at,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
  };
}

function mapPeriodToDbRow(p: PayrollPeriod): Record<string, any> {
  return {
    id: p.id,
    year: p.year,
    month: p.month,
    type: p.periodType,
    start_date: p.startDate,
    end_date: p.endDate,
    status: p.status,
    total_gross: p.totalGross,
    total_net: p.totalNet,
    total_deductions: p.totalDeductions,
    total_employer_costs: p.totalEmployerCosts,
    processed_at: p.processedAt || null,
    approved_at: p.approvedAt || null,
    paid_at: p.paidAt || null,
    notes: null,
    created_at: p.createdAt,
    updated_at: new Date().toISOString(),
  };
}

// Map DB row -> PayrollEntry (minimal: we store summary; employee object not stored)
function mapDbRowToEntry(row: any): PayrollEntry {
  return {
    id: row.id,
    payrollPeriodId: row.period_id,
    employeeId: row.employee_id,
    employee: undefined,
    baseSalary: row.base_salary || 0,
    mealAllowance: row.subsidy_alimentacao || 0,
    transportAllowance: row.subsidy_transporte || 0,
    otherAllowances: 0,
    familyAllowance: 0,
    monthlyBonus: 0,
    overtimeNormal: row.overtime_amount || 0,
    overtimeNight: 0,
    overtimeHoliday: 0,
    thirteenthMonth: row.subsidy_natal || 0,
    holidaySubsidy: row.subsidy_ferias || 0,
    grossSalary: row.gross_salary || 0,
    irt: row.irt || 0,
    inssEmployee: row.inss_employee || 0,
    absenceDeduction: row.absence_deduction || 0,
    otherDeductions: 0,
    totalDeductions: row.total_deductions || 0,
    inssEmployer: row.inss_employer || 0,
    netSalary: row.net_salary || 0,
    totalEmployerCost: 0,
    status: (row.status as PayrollEntry['status']) || 'draft',
    overtimeHoursNormal: row.overtime_hours || 0,
    overtimeHoursNight: 0,
    overtimeHoursHoliday: 0,
    daysAbsent: row.absence_days || 0,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapEntryToDbRow(e: PayrollEntry): Record<string, any> {
  return {
    id: e.id,
    period_id: e.payrollPeriodId,
    employee_id: e.employeeId,
    employee_name: e.employee?.firstName ? `${e.employee.firstName} ${e.employee.lastName}` : null,
    employee_position: e.employee?.position || null,
    employee_department: e.employee?.department || null,
    branch_id: e.employee?.branchId || null,
    base_salary: e.baseSalary,
    gross_salary: e.grossSalary,
    net_salary: e.netSalary,
    irt: e.irt,
    inss_employee: e.inssEmployee,
    inss_employer: e.inssEmployer,
    total_deductions: e.totalDeductions,
    total_bonuses: 0,
    subsidy_alimentacao: e.mealAllowance,
    subsidy_transporte: e.transportAllowance,
    subsidy_ferias: e.holidaySubsidy,
    subsidy_natal: e.thirteenthMonth,
    overtime_hours: e.overtimeHoursNormal + e.overtimeHoursNight + e.overtimeHoursHoliday,
    overtime_amount: e.overtimeNormal + e.overtimeNight + e.overtimeHoliday,
    absence_days: e.daysAbsent,
    absence_deduction: e.absenceDeduction,
    other_deductions: null,
    other_bonuses: null,
    notes: e.notes || null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export const usePayrollStore = create<PayrollState>()((set, get) => ({
    periods: [],
    entries: [],
    isLoaded: false,

    loadPayroll: async () => {
      try {
        const periodRows = await liveGetAll<any>('payroll_periods');
        const entryRows = await liveGetAll<any>('payroll_entries');
        const periods = periodRows.map(mapDbRowToPeriod);
        const entries = entryRows.map(mapDbRowToEntry);
        set({ periods, entries, isLoaded: true });
        console.log('[Payroll] Loaded', periods.length, 'periods and', entries.length, 'entries from DB');
      } catch (error) {
        console.error('[Payroll] Error loading:', error);
        set({ isLoaded: true });
      }
    },

    createPeriod: async (year: number, month: number) => {
      const { startDate, endDate } = getPeriodDates(year, month);
      const now = new Date().toISOString();
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
        createdAt: now,
      };

      await liveInsert('payroll_periods', mapPeriodToDbRow(newPeriod));
      await get().loadPayroll();
      return newPeriod;
    },

    getPeriod: (id: string) => get().periods.find((p) => p.id === id),

    getCurrentPeriod: () => {
      const now = new Date();
      return get().periods.find((p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1);
    },

    updatePeriodStatus: async (id: string, status: PayrollPeriod['status']) => {
      const now = new Date().toISOString();
      await liveUpdate('payroll_periods', id, { status, updated_at: now });
    },

    generateEntriesForPeriod: async (periodId, employees, holidayRecords) => {
      const period = get().getPeriod(periodId);
      if (!period) return;

      const nextMonth = period.month === 12 ? 1 : period.month + 1;
      const nextMonthYear = period.month === 12 ? period.year + 1 : period.year;

      const employeesForSubsidy = new Set<string>();
      if (holidayRecords) {
        holidayRecords.forEach((r) => {
          if (r.holidayMonth === nextMonth && r.year === nextMonthYear && !r.subsidyPaidInMonth) {
            employeesForSubsidy.add(r.employeeId);
          }
        });
      }

      const newEntries: PayrollEntry[] = employees
        .filter((emp) => emp.status === 'active')
        .map((emp) => {
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

      // Remove old entries for this period and insert new ones
      const existingEntries = get().entries.filter((e) => e.payrollPeriodId === periodId);
      for (const e of existingEntries) {
        await liveDelete('payroll_entries', e.id);
      }
      for (const e of newEntries) {
        await liveInsert('payroll_entries', mapEntryToDbRow(e));
      }

      await get().loadPayroll();
      await get().calculatePeriod(periodId);
    },

    toggle13thMonth: async (entryId, monthsWorked) => {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return;

      const hasSubsidy = entry.thirteenthMonth > 0;
      const baseSalary = entry.baseSalary;

      const subsidyValue = hasSubsidy ? 0 : (baseSalary * 0.5 * monthsWorked) / 12;
      const difference = hasSubsidy ? -entry.thirteenthMonth : subsidyValue;

      const updated: PayrollEntry = {
        ...entry,
        thirteenthMonth: subsidyValue,
        grossSalary: entry.grossSalary + difference,
        netSalary: entry.netSalary + difference,
        totalEmployerCost: entry.totalEmployerCost + difference,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...data } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', entryId, data);

      if (entry.payrollPeriodId) {
        await get().calculatePeriod(entry.payrollPeriodId);
      }
    },

    updateEntry: async (id, data) => {
      const now = new Date().toISOString();
      const entry = get().entries.find((e) => e.id === id);
      if (!entry) return;

      const updated = { ...entry, ...data, updatedAt: now };
      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', id, row);
    },

    updateAbsences: async (entryId, daysAbsent) => {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return;

      const absenceDeduction = calculateAbsenceDeduction(entry.baseSalary, daysAbsent);
      const oldAbsenceDeduction = entry.absenceDeduction || 0;
      const difference = absenceDeduction - oldAbsenceDeduction;

      const updated: PayrollEntry = {
        ...entry,
        daysAbsent,
        absenceDeduction,
        totalDeductions: entry.totalDeductions + difference,
        netSalary: entry.netSalary - difference,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', entryId, row);

      if (entry.payrollPeriodId) {
        await get().calculatePeriod(entry.payrollPeriodId);
      }
    },

    updateOvertime: async (entryId, hoursNormal, hoursNight, hoursHoliday) => {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return;

      const hourlyRate = calculateHourlyRate(entry.baseSalary);

      const overtimeNormal = calculateOvertime(hourlyRate, hoursNormal, 'normal', 0);
      const overtimeNight = calculateOvertime(hourlyRate, hoursNight, 'night', 0);
      const overtimeHoliday = calculateOvertime(hourlyRate, hoursHoliday, 'holiday', 0);

      const oldOvertimeTotal = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
      const newOvertimeTotal = overtimeNormal + overtimeNight + overtimeHoliday;
      const difference = newOvertimeTotal - oldOvertimeTotal;

      const updated: PayrollEntry = {
        ...entry,
        overtimeHoursNormal: hoursNormal,
        overtimeHoursNight: hoursNight,
        overtimeHoursHoliday: hoursHoliday,
        overtimeNormal,
        overtimeNight,
        overtimeHoliday,
        grossSalary: entry.grossSalary + difference,
        netSalary: entry.netSalary + difference,
        totalEmployerCost: entry.totalEmployerCost + difference,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', entryId, row);
    },

    getEntriesForPeriod: (periodId) => get().entries.filter((e) => e.payrollPeriodId === periodId),

    removeEntriesForEmployee: async (employeeId) => {
      const toRemove = get().entries.filter((e) => e.employeeId === employeeId);
      for (const e of toRemove) {
        await liveDelete('payroll_entries', e.id);
      }
    },

    recalculateEntry: async (id) => {
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

      const updated: PayrollEntry = {
        ...entry,
        ...payrollResult,
        totalDeductions: payrollResult.totalDeductions + (entry.otherDeductions || 0),
        netSalary: payrollResult.netSalary - (entry.otherDeductions || 0),
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', id, row);
    },

    getPayrollSummary: (periodId) => {
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

      return { period, entries, totals, byDepartment };
    },

    calculatePeriod: async (periodId) => {
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

      const now = new Date().toISOString();
      await liveUpdate('payroll_periods', periodId, {
        total_gross: totals.totalGross,
        total_net: totals.totalNet,
        total_deductions: totals.totalDeductions,
        total_employer_costs: totals.totalEmployerCosts,
        status: 'calculated',
        processed_at: now,
        updated_at: now,
      });
    },

    approvePeriod: async (periodId) => {
      const now = new Date().toISOString();
      await liveUpdate('payroll_periods', periodId, { status: 'approved', approved_at: now, updated_at: now });
    },

    markAsPaid: async (periodId) => {
      const now = new Date().toISOString();
      await liveUpdate('payroll_periods', periodId, { status: 'paid', paid_at: now, updated_at: now });
    },
  }));

// Subscribe to data changes for auto-refresh
let unsubscribe: (() => void) | null = null;

export function initPayrollStoreSync() {
  if (unsubscribe) return;
  
  unsubscribe = onDataChange((table) => {
    if (table === 'payroll_periods' || table === 'payroll_entries') {
      console.log('[Payroll] Data change detected, refreshing from database...');
      usePayrollStore.getState().loadPayroll();
    }
  });
}

export function cleanupPayrollStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
