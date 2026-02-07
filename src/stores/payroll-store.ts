import { create } from 'zustand';
import type { PayrollPeriod, PayrollEntry, PayrollSummary } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import { calculatePayroll, calculateAbsenceDeduction, calculateOvertime, calculateHourlyRate } from '@/lib/angola-labor-law';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';


interface PayrollState {
  periods: PayrollPeriod[];
  entries: PayrollEntry[];
  isLoaded: boolean;

  loadPayroll: () => Promise<void>;

  createPeriod: (year: number, month: number) => Promise<PayrollPeriod>;
  getPeriod: (id: string) => PayrollPeriod | undefined;
  getCurrentPeriod: () => PayrollPeriod | undefined;
  updatePeriodStatus: (id: string, status: PayrollPeriod['status']) => Promise<void>;

  generateEntriesForPeriod: (periodId: string, employees: Employee[], holidayRecords?: { employeeId: string; year: number; holidayMonth?: number; subsidyPaidInMonth?: number }[], absenceStore?: any, deductionStore?: any, bulkAttendanceStore?: any) => Promise<void>;
  toggle13thMonth: (entryId: string, monthsWorked: number) => Promise<void>;
  toggleHolidaySubsidy: (entryId: string) => Promise<void>;
  updateEntry: (id: string, data: Partial<PayrollEntry>) => Promise<void>;
  getEntriesForPeriod: (periodId: string) => PayrollEntry[];
  recalculateEntry: (id: string) => Promise<void>;
  recalculateAllEntries: () => Promise<number>;
  removeEntriesForEmployee: (employeeId: string) => Promise<void>;

  updateAbsences: (entryId: string, daysAbsent: number) => Promise<void>;
  updateOvertime: (entryId: string, hoursNormal: number, hoursNight: number, hoursHoliday: number) => Promise<void>;

  getPayrollSummary: (periodId: string) => PayrollSummary | null;

  calculatePeriod: (periodId: string) => Promise<void>;
  approvePeriod: (periodId: string) => Promise<void>;
  reopenPeriod: (periodId: string) => Promise<void>;
  markAsPaid: (periodId: string) => Promise<void>;
  
  // Archive system - closes month and clears active data
  archivePeriod: (periodId: string, deductionStore: any, absenceStore: any) => Promise<{ archivedDeductions: number; archivedAbsences: number; installmentsCarried: number }>;
  
  // Unarchive system - reverts archived/paid period back to approved status
  unarchivePeriod: (periodId: string) => Promise<void>;
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

// Map DB row -> PayrollEntry (includes minimal employee data from DB for filtering)
function mapDbRowToEntry(row: any): PayrollEntry {
  // Create a minimal employee object from stored data for filtering purposes
  const storedEmployeeData = (row.employee_name || row.branch_id) ? {
    id: row.employee_id,
    firstName: row.employee_name?.split(' ')[0] || '',
    lastName: row.employee_name?.split(' ').slice(1).join(' ') || '',
    position: row.employee_position || '',
    department: row.employee_department || '',
    branchId: row.branch_id || '',
  } as any : undefined;

  return {
    id: row.id,
    payrollPeriodId: row.period_id,
    employeeId: row.employee_id,
    employee: storedEmployeeData,
    baseSalary: row.base_salary || 0,
    mealAllowance: row.subsidy_alimentacao || 0,
    transportAllowance: row.subsidy_transporte || 0,
    otherAllowances: 0,
    familyAllowance: row.family_allowance || 0,
    monthlyBonus: row.monthly_bonus || 0,
    overtimeNormal: row.overtime_normal || row.overtime_amount || 0,
    overtimeNight: row.overtime_night || 0,
    overtimeHoliday: row.overtime_holiday || 0,
    thirteenthMonth: row.subsidy_natal || 0,
    holidaySubsidy: row.subsidy_ferias || 0,
    grossSalary: row.gross_salary || 0,
    irt: row.irt || 0,
    inssEmployee: row.inss_employee || 0,
    absenceDeduction: row.absence_deduction || 0,
    loanDeduction: row.loan_deduction || 0,
    advanceDeduction: row.advance_deduction || 0,
    otherDeductions: row.other_deductions_amount || 0,
    deductionDetails: row.deduction_details || undefined,
    totalDeductions: row.total_deductions || 0,
    inssEmployer: row.inss_employer || 0,
    netSalary: row.net_salary || 0,
    totalEmployerCost: row.total_employer_cost || 0,
    status: (row.status as PayrollEntry['status']) || 'draft',
    overtimeHoursNormal: row.overtime_hours_normal || row.overtime_hours || 0,
    overtimeHoursNight: row.overtime_hours_night || 0,
    overtimeHoursHoliday: row.overtime_hours_holiday || 0,
    daysAbsent: row.absence_days || 0,
    notes: row.notes || undefined,
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
    family_allowance: e.familyAllowance,
    monthly_bonus: e.monthlyBonus,
    overtime_hours_normal: e.overtimeHoursNormal,
    overtime_hours_night: e.overtimeHoursNight,
    overtime_hours_holiday: e.overtimeHoursHoliday,
    overtime_normal: e.overtimeNormal,
    overtime_night: e.overtimeNight,
    overtime_holiday: e.overtimeHoliday,
    overtime_hours: e.overtimeHoursNormal + e.overtimeHoursNight + e.overtimeHoursHoliday,
    overtime_amount: e.overtimeNormal + e.overtimeNight + e.overtimeHoliday,
    absence_days: e.daysAbsent,
    absence_deduction: e.absenceDeduction,
    loan_deduction: e.loanDeduction,
    advance_deduction: e.advanceDeduction,
    other_deductions_amount: e.otherDeductions,
    deduction_details: e.deductionDetails || null,
    total_employer_cost: e.totalEmployerCost,
    notes: e.notes || null,
    status: e.status,
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

    generateEntriesForPeriod: async (periodId, employees, holidayRecords, absenceStore?, deductionStore?, bulkAttendanceStore?) => {
      const period = get().getPeriod(periodId);
      if (!period) return;

      // PROTECTION: Do not regenerate entries for approved or paid periods
      // This preserves historical data and prevents deductions from reappearing
      if (period.status === 'approved' || period.status === 'paid') {
        console.log('[Payroll] Skipping generation - period is already', period.status);
        return;
      }

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

      // Get existing entries directly from DB to avoid stale state issues
      const existingDbEntries = await liveGetAll<any>('payroll_entries');
      const existingForPeriod = existingDbEntries.filter((e: any) => e.period_id === periodId);

      console.log(
        '[Payroll] Generating entries for period',
        periodId,
        'employees:',
        employees.length,
        'existing entries for period:',
        existingForPeriod.length
      );

      // Extended type to track deduction IDs temporarily
      type EntryWithDeductionIds = PayrollEntry & { _deductionIds?: string[] };
      
      const newEntries: EntryWithDeductionIds[] = employees
        .filter((emp) => emp.status === 'active')
        .map((emp) => {
          const shouldPayHolidaySubsidy = employeesForSubsidy.has(emp.id);
          const holidaySubsidyAmount = shouldPayHolidaySubsidy ? (emp.holidaySubsidy || 0) : 0;

          // Calculate absence deduction from BULK ATTENDANCE (NEW - uses FULL salary including bonuses)
          let absenceDeduction = 0;
          let absenceDays = 0;
          let delayDeduction = 0;
          
          if (bulkAttendanceStore) {
            const bulkEntry = bulkAttendanceStore.getEntryForEmployee(emp.id, period.month, period.year);
            if (bulkEntry) {
              absenceDays = bulkEntry.absenceDays || 0;
              absenceDeduction = bulkEntry.absenceDeduction || 0;
              delayDeduction = bulkEntry.delayDeduction || 0;
              console.log(`[Payroll] Bulk attendance for ${emp.firstName}: ${absenceDays} days, ${bulkEntry.delayHours || 0}h delay = ${absenceDeduction + delayDeduction} Kz deduction`);
            }
          }
          // Fallback to legacy absence store if bulk attendance not provided
          else if (absenceStore) {
            // Month is 0-indexed for absence store
            const absenceInfo = absenceStore.getAbsenceDaysForEmployee(emp.id, period.month - 1, period.year);
            absenceDays = absenceInfo.unjustified;
            absenceDeduction = absenceStore.calculateDeductionForEmployee(emp.id, emp.baseSalary, period.month - 1, period.year);
          }
          
          // Combine absence + delay deductions
          const totalAbsenceDeduction = absenceDeduction + delayDeduction;

          // Calculate deductions if deduction store is provided
          // Include:
          // - pending deductions that are NOT fully paid (!isFullyPaid)
          // - deductions already applied to THIS period (so reopening/recalculating keeps them)
          let loanDeduction = 0;
          let advanceDeduction = 0;
          let otherDeductions = 0;
          const deductionBreakdown: { type: string; description: string; amount: number; deductionId: string }[] = [];

          if (deductionStore) {
            const all = deductionStore.getDeductionsByEmployee(emp.id) || [];
            for (const d of all) {
              // Skip fully paid deductions
              if (d.isFullyPaid) continue;
              
              const isForThisPeriod = d.payrollPeriodId === periodId;
              const isPending = !d.isApplied;
              if (!isForThisPeriod && !isPending) continue;

              // Basic time filter for pending deductions (don't pull future-dated items)
              if (isPending && period.endDate && d.date && d.date > period.endDate) continue;

              // FIX: d.amount is ALREADY the monthly installment amount (totalAmount / installments)
              // No need to divide again!
              const amount = d.amount;

              if (d.type === 'loan') {
                loanDeduction += amount;
              } else if (d.type === 'salary_advance') {
                advanceDeduction += amount;
              } else {
                otherDeductions += amount;
              }

              deductionBreakdown.push({
                type: d.type,
                description: d.description,
                amount,
                deductionId: d.id, // Track which deduction this came from
              });
            }
          }

          const payrollResult = calculatePayroll({
            baseSalary: emp.baseSalary,
            mealAllowance: emp.mealAllowance,
            transportAllowance: emp.transportAllowance,
            otherAllowances: emp.otherAllowances,
            familyAllowanceValue: emp.familyAllowance || 0,
            isRetired: emp.isRetired,
            include13thMonth: false,
            includeHolidaySubsidy: shouldPayHolidaySubsidy,
            holidaySubsidyValue: shouldPayHolidaySubsidy ? holidaySubsidyAmount : 0,
          });

          const totalExtraDeductions = loanDeduction + advanceDeduction + otherDeductions + totalAbsenceDeduction;

          const now = new Date().toISOString();

            return {
              id: `entry-${periodId}-${emp.id}`,
              payrollPeriodId: periodId,
              employeeId: emp.id,
              employee: emp,
              ...payrollResult,
              netSalary: payrollResult.netSalary - totalExtraDeductions,
              totalDeductions: payrollResult.totalDeductions + totalExtraDeductions,
              monthlyBonus: emp.monthlyBonus || 0,
              absenceDeduction: totalAbsenceDeduction, // Includes absence days + delay hours deduction
              loanDeduction,
              advanceDeduction,
              daysAbsent: absenceDays,
              otherDeductions,
              deductionDetails: deductionBreakdown.length > 0 ? JSON.stringify(deductionBreakdown) : undefined,
              overtimeHoursNormal: 0,
              overtimeHoursNight: 0,
              overtimeHoursHoliday: 0,
              status: 'draft' as const,
              createdAt: now,
              updatedAt: now,
              // Store deduction IDs for linking after save
              _deductionIds: deductionBreakdown.map(db => db.deductionId),
            };
        });

      console.log('[Payroll] New entries to create:', newEntries.length);

      // Collect all deduction IDs that need to be marked as applied
      const deductionIdsToApply: string[] = [];
      for (const e of newEntries) {
        if (e._deductionIds && e._deductionIds.length > 0) {
          deductionIdsToApply.push(...e._deductionIds);
        }
      }

      // SAFETY: Upsert first; only delete old entries if all writes succeed.
      // This prevents data loss if the server DB schema is outdated.
      const newIds = new Set(newEntries.map((e) => e.id));
      let allWritesOk = true;

      for (const e of newEntries) {
        // Remove internal tracking field before saving
        const { _deductionIds, ...entryData } = e;
        const row = mapEntryToDbRow(entryData as PayrollEntry);

        const inserted = await liveInsert('payroll_entries', row);
        if (inserted) continue;

        const { id: _id, ...updateRow } = row;
        const updated = await liveUpdate('payroll_entries', e.id, updateRow);
        if (!updated) {
          allWritesOk = false;
          console.error('[Payroll] Failed to save entry (insert/update):', e.id);
        }
      }

      if (allWritesOk) {
        for (const oldEntry of existingForPeriod) {
          if (!newIds.has(oldEntry.id)) {
            await liveDelete('payroll_entries', oldEntry.id);
          }
        }

        // CRITICAL: Mark all deductions as applied to this payroll period
        if (deductionStore && deductionIdsToApply.length > 0) {
          console.log('[Payroll] Marking', deductionIdsToApply.length, 'deductions as applied to period', periodId);
          for (const deductionId of deductionIdsToApply) {
            await deductionStore.applyDeductionToPayroll(deductionId, periodId);
          }
        }
      } else {
        console.error('[Payroll] Some entries failed to save; no deletions performed to avoid data loss.');
      }

      // Reload data from DB to ensure fresh state
      await get().loadPayroll();
      if (allWritesOk) {
        await get().calculatePeriod(periodId);
      }
    },

    toggle13thMonth: async (entryId, monthsWorked) => {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return;

      const hasSubsidy = entry.thirteenthMonth > 0;
      const baseSalary = entry.baseSalary;

      const subsidyValue = hasSubsidy ? 0 : (baseSalary * 0.5 * monthsWorked) / 12;

      const payrollResult = calculatePayroll({
        baseSalary: entry.baseSalary,
        mealAllowance: entry.mealAllowance,
        transportAllowance: entry.transportAllowance,
        otherAllowances: entry.otherAllowances,
        familyAllowanceValue: entry.familyAllowance,
        overtimeHoursNormal: entry.overtimeHoursNormal,
        overtimeHoursNight: entry.overtimeHoursNight,
        overtimeHoursHoliday: entry.overtimeHoursHoliday,
        isRetired: entry.employee?.isRetired ?? false,
        thirteenthMonthValue: subsidyValue,
        holidaySubsidyValue: entry.holidaySubsidy || 0,
      });

      const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

      const updated: PayrollEntry = {
        ...entry,
        ...payrollResult,
        totalDeductions: payrollResult.totalDeductions + extraDeductions,
        netSalary: payrollResult.netSalary - extraDeductions,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...data } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', entryId, data);

      if (entry.payrollPeriodId) {
        await get().calculatePeriod(entry.payrollPeriodId);
      }
    },

    toggleHolidaySubsidy: async (entryId) => {
      const entry = get().entries.find((e) => e.id === entryId);
      if (!entry) return;

      const hasSubsidy = entry.holidaySubsidy > 0;
      const baseSalary = entry.baseSalary;

      // Prefer employee-specific configured value when available; fallback to 50% of base salary
      const defaultValue = (entry.employee as any)?.holidaySubsidy ?? baseSalary * 0.5;
      const subsidyValue = hasSubsidy ? 0 : defaultValue;

      const payrollResult = calculatePayroll({
        baseSalary: entry.baseSalary,
        mealAllowance: entry.mealAllowance,
        transportAllowance: entry.transportAllowance,
        otherAllowances: entry.otherAllowances,
        familyAllowanceValue: entry.familyAllowance,
        overtimeHoursNormal: entry.overtimeHoursNormal,
        overtimeHoursNight: entry.overtimeHoursNight,
        overtimeHoursHoliday: entry.overtimeHoursHoliday,
        isRetired: entry.employee?.isRetired ?? false,
        thirteenthMonthValue: entry.thirteenthMonth || 0,
        holidaySubsidyValue: subsidyValue,
      });

      const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

      const updated: PayrollEntry = {
        ...entry,
        ...payrollResult,
        totalDeductions: payrollResult.totalDeductions + extraDeductions,
        netSalary: payrollResult.netSalary - extraDeductions,
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

      // Use NEW formula: Full Salary (base + all bonuses) / 30 days
      // This matches the bulk attendance calculation
      const fullMonthlySalary = 
        entry.baseSalary + 
        (entry.mealAllowance || 0) + 
        (entry.transportAllowance || 0) + 
        (entry.familyAllowance || 0) + 
        (entry.monthlyBonus || 0) + 
        (entry.holidaySubsidy || 0);
      
      const dailyRate = fullMonthlySalary / 30;
      const absenceDeduction = dailyRate * daysAbsent;
      
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

      const payrollResult = calculatePayroll({
        baseSalary: entry.baseSalary,
        mealAllowance: entry.mealAllowance,
        transportAllowance: entry.transportAllowance,
        otherAllowances: entry.otherAllowances,
        familyAllowanceValue: entry.familyAllowance,
        overtimeHoursNormal: hoursNormal,
        overtimeHoursNight: hoursNight,
        overtimeHoursHoliday: hoursHoliday,
        isRetired: entry.employee?.isRetired ?? false,
        thirteenthMonthValue: entry.thirteenthMonth || 0,
        holidaySubsidyValue: entry.holidaySubsidy || 0,
      });

      const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

      const updated: PayrollEntry = {
        ...entry,
        ...payrollResult,
        overtimeHoursNormal: hoursNormal,
        overtimeHoursNight: hoursNight,
        overtimeHoursHoliday: hoursHoliday,
        totalDeductions: payrollResult.totalDeductions + extraDeductions,
        netSalary: payrollResult.netSalary - extraDeductions,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', entryId, row);

      if (entry.payrollPeriodId) {
        await get().calculatePeriod(entry.payrollPeriodId);
      }
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

      const payrollResult = calculatePayroll({
        baseSalary: entry.baseSalary,
        mealAllowance: entry.mealAllowance,
        transportAllowance: entry.transportAllowance,
        otherAllowances: entry.otherAllowances,
        familyAllowanceValue: entry.familyAllowance,
        overtimeHoursNormal: entry.overtimeHoursNormal,
        overtimeHoursNight: entry.overtimeHoursNight,
        overtimeHoursHoliday: entry.overtimeHoursHoliday,
        isRetired: entry.employee?.isRetired ?? false,
        thirteenthMonthValue: entry.thirteenthMonth || 0,
        holidaySubsidyValue: entry.holidaySubsidy || 0,
      });

      const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

      const updated: PayrollEntry = {
        ...entry,
        ...payrollResult,
        totalDeductions: payrollResult.totalDeductions + extraDeductions,
        netSalary: payrollResult.netSalary - extraDeductions,
        updatedAt: new Date().toISOString(),
      };

      const { id: _, ...row } = mapEntryToDbRow(updated);
      await liveUpdate('payroll_entries', id, row);
    },

    recalculateAllEntries: async () => {
      const entries = get().entries;
      let recalculatedCount = 0;

      for (const entry of entries) {
        const period = get().getPeriod(entry.payrollPeriodId);
        // Only recalculate draft periods (not approved or paid)
        if (period && period.status === 'draft') {
          const payrollResult = calculatePayroll({
            baseSalary: entry.baseSalary,
            mealAllowance: entry.mealAllowance,
            transportAllowance: entry.transportAllowance,
            otherAllowances: entry.otherAllowances,
            familyAllowanceValue: entry.familyAllowance,
            overtimeHoursNormal: entry.overtimeHoursNormal,
            overtimeHoursNight: entry.overtimeHoursNight,
            overtimeHoursHoliday: entry.overtimeHoursHoliday,
            isRetired: entry.employee?.isRetired ?? false,
            thirteenthMonthValue: entry.thirteenthMonth || 0,
            holidaySubsidyValue: entry.holidaySubsidy || 0,
          });

          const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

          const updated: PayrollEntry = {
            ...entry,
            ...payrollResult,
            totalDeductions: payrollResult.totalDeductions + extraDeductions,
            netSalary: payrollResult.netSalary - extraDeductions,
            updatedAt: new Date().toISOString(),
          };

          const { id: _, ...row } = mapEntryToDbRow(updated);
          await liveUpdate('payroll_entries', entry.id, row);
          recalculatedCount++;
        }
      }

      // Recalculate all draft periods totals
      const draftPeriods = get().periods.filter(p => p.status === 'draft');
      for (const period of draftPeriods) {
        await get().calculatePeriod(period.id);
      }

      return recalculatedCount;
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

    reopenPeriod: async (periodId) => {
      const now = new Date().toISOString();
      // Reopen for edits; user must approve again afterwards.
      await liveUpdate('payroll_periods', periodId, {
        status: 'calculated',
        approved_at: null,
        paid_at: null,
        updated_at: now,
      });

      // IMPORTANT: Refresh store state so UI becomes editable immediately
      await get().loadPayroll();
    },

    markAsPaid: async (periodId) => {
      const now = new Date().toISOString();
      await liveUpdate('payroll_periods', periodId, { status: 'paid', paid_at: now, updated_at: now });
    },

    // ARCHIVE SYSTEM: Closes the month, moves data to history, clears active items
    archivePeriod: async (periodId, deductionStore, absenceStore) => {
      const period = get().getPeriod(periodId);
      if (!period) {
        throw new Error('Period not found');
      }

      // Period must be approved first
      if (period.status !== 'approved' && period.status !== 'paid') {
        throw new Error('Period must be approved before archiving');
      }

      const now = new Date().toISOString();
      let archivedDeductions = 0;
      let archivedAbsences = 0;
      let installmentsCarried = 0;

      // 1. Get all deductions applied to this period and update their installment tracking
      const appliedDeductions = deductionStore.getDeductionsForPeriod(periodId);
      
      for (const deduction of appliedDeductions) {
        const newInstallmentsPaid = (deduction.installmentsPaid || 0) + 1;
        const newRemainingAmount = deduction.totalAmount - (newInstallmentsPaid * deduction.amount);
        const isNowFullyPaid = newInstallmentsPaid >= deduction.installments || newRemainingAmount <= 0;

        // Update the deduction with the new installment count
        await deductionStore.updateDeduction(deduction.id, {
          installmentsPaid: newInstallmentsPaid,
          remainingAmount: Math.max(0, newRemainingAmount),
          isFullyPaid: isNowFullyPaid,
          isApplied: false, // Reset applied status so it can be picked up in next period (if not fully paid)
          payrollPeriodId: undefined, // Clear the period link
        });

        if (isNowFullyPaid) {
          archivedDeductions++;
          console.log(`[Payroll] Deduction ${deduction.id} fully paid after ${newInstallmentsPaid} installments`);
        } else {
          installmentsCarried++;
          console.log(`[Payroll] Deduction ${deduction.id}: ${newInstallmentsPaid}/${deduction.installments} paid, ${newRemainingAmount} remaining`);
        }
      }

      // 2. Delete absences that were applied in this period's date range
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      const allAbsences = absenceStore.getAbsencesByPeriod(period.startDate, period.endDate);
      
      for (const absence of allAbsences) {
        // Only delete unjustified/rejected absences (the ones that affect salary)
        if (absence.status === 'unjustified' || absence.status === 'rejected') {
          await absenceStore.deleteAbsence(absence.id);
          archivedAbsences++;
        }
      }

      // 3. Mark period as paid/archived
      await liveUpdate('payroll_periods', periodId, { 
        status: 'paid', 
        paid_at: now, 
        updated_at: now 
      });

      // Reload data
      await get().loadPayroll();

      console.log(`[Payroll] Archived period ${periodId}: ${archivedDeductions} deductions, ${archivedAbsences} absences, ${installmentsCarried} installments carried`);

      return { archivedDeductions, archivedAbsences, installmentsCarried };
    },

    // UNARCHIVE SYSTEM: Reverts archived/paid period back to approved status
    // This allows recovery from accidental archiving
    unarchivePeriod: async (periodId) => {
      const period = get().getPeriod(periodId);
      if (!period) {
        throw new Error('Period not found');
      }

      // Only paid/archived periods can be unarchived
      if (period.status !== 'paid') {
        throw new Error('Only archived (paid) periods can be unarchived');
      }

      const now = new Date().toISOString();

      // Revert to approved status
      await liveUpdate('payroll_periods', periodId, { 
        status: 'approved', 
        paid_at: null, 
        updated_at: now 
      });

      // Reload data
      await get().loadPayroll();

      console.log(`[Payroll] Unarchived period ${periodId} - reverted to approved status`);
    },
  }));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initPayrollStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubPeriods = onTableSync('payroll_periods', (table, rows) => {
    console.log('[Payroll] ← PUSH periods:', rows.length);
    const periods = rows.map(mapDbRowToPeriod);
    usePayrollStore.setState((state) => ({ ...state, periods, isLoaded: true }));
  });
  
  const unsubEntries = onTableSync('payroll_entries', (table, rows) => {
    console.log('[Payroll] ← PUSH entries:', rows.length);
    const entries = rows.map(mapDbRowToEntry);
    usePayrollStore.setState((state) => ({ ...state, entries, isLoaded: true }));
  });
  
  // FALLBACK: Legacy notification
  const unsubLegacy = onDataChange((table) => {
    if (table === 'payroll_periods' || table === 'payroll_entries') {
      console.log('[Payroll] Legacy notification, refreshing...');
      usePayrollStore.getState().loadPayroll();
    }
  });
  
  unsubscribe = () => {
    unsubPeriods();
    unsubEntries();
    unsubLegacy();
  };
}

export function cleanupPayrollStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
