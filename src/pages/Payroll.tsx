import { useState, useEffect, useRef, useMemo } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calculator, FileDown, Send, Clock, Receipt, Printer, Gift, UserX, RotateCcw, Archive, Building2, Unlock, Users, HandCoins, Lock, LockOpen, Search, Coins, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useDeductionStore, finalizeApprovedPeriodDeductions } from "@/stores/deduction-store";
import { useBranchStore } from "@/stores/branch-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useAbsenceStore } from "@/stores/absence-store";
import { useBulkAttendanceStore } from "@/stores/bulk-attendance-store";
import { SalaryReceipt } from "@/components/payroll/SalaryReceipt";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import { PrintableBonusSheet } from "@/components/payroll/PrintableBonusSheet";
import { OvertimeAbsenceDialog } from "@/components/payroll/OvertimeAbsenceDialog";
import { AbsenceDialog } from "@/components/payroll/AbsenceDialog";
import { BatchReceiptPrinter } from "@/components/payroll/BatchReceiptPrinter";
import { BankPaymentExport } from "@/components/payroll/BankPaymentExport";
import { PrintableColaboradorSheet } from "@/components/payroll/PrintableColaboradorSheet";
import { AdminPasswordDialog } from "@/components/payroll/AdminPasswordDialog";
import { EarlyPaymentDialog } from "@/components/payroll/EarlyPaymentDialog";
import { PayrollOneOffExtraDialog } from "@/components/payroll/PayrollOneOffExtraDialog";
import { formatAOA } from "@/lib/angola-labor-law";
import {
  getEarlyPaymentRecordAmount,
  getHolidayBuyoutPayout,
  getOneOffExtraPayout,
  getTotalPaidToEmployee,
} from "@/lib/payroll-payout";
import { ATTENDANCE_PAGE } from "@/lib/page-layout";
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from "@/components/attendance/AttendanceTablePanel";
import { exportPayrollToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import type { PayrollEntry } from "@/types/payroll";

const Payroll = () => {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuthStore();
  const { periods, entries, generateEntriesForPeriod, approvePeriod, reopenPeriod, archivePeriod, unarchivePeriod, updateEntry, createPeriod, toggle13thMonth, toggleHolidaySubsidy, updateAbsences, updateOvertime, isAttendanceClosed, getAttendanceCutoff } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const deductionStore = useDeductionStore();
  const { applyDeductionToPayroll, unapplyDeductionsFromPayroll, getTotalPendingByEmployee } = deductionStore;
  const { branches: allBranches } = useBranchStore();
  // Derive active branches and employees from subscribed state - ensures re-render on changes
  const branches = allBranches.filter(b => b.isActive);
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const pendingApprovalEmployees = employees.filter(emp => emp.status === 'pending_approval');
  const { settings } = useSettingsStore();
  const { records: holidayRecords, markSubsidyPaid, isSubsidyPaid, autoDetectPaidSubsidies } = useHolidayStore();
  const absenceStore = useAbsenceStore();
  const bulkAttendanceStore = useBulkAttendanceStore();
  const { calculateDeductionForEmployee, getPendingAbsences } = absenceStore;
  
  // Auto-detect paid subsidies from payroll history (runs once)
  const autoDetectRan = useRef(false);
  useEffect(() => {
    if (autoDetectRan.current || entries.length === 0 || periods.length === 0) return;
    autoDetectRan.current = true;
    autoDetectPaidSubsidies(
      entries.map(e => ({ employeeId: e.employeeId, holidaySubsidy: e.holidaySubsidy, payrollPeriodId: e.payrollPeriodId })),
      periods.map(p => ({ id: p.id, year: p.year, month: p.month, status: p.status }))
    ).then(count => {
      if (count > 0) {
        toast.info(language === 'pt' 
          ? `${count} subsídio(s) de férias detectado(s) automaticamente` 
          : `${count} holiday subsid(ies) auto-detected`);
      }
    });
  }, [entries, periods]);
  
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [printSheetOpen, setPrintSheetOpen] = useState(false);
  const [printBonusSheetOpen, setPrintBonusSheetOpen] = useState(false);
  const [bonusBranchId, setBonusBranchId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
  const [overtimeEntry, setOvertimeEntry] = useState<PayrollEntry | null>(null);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [batchReceiptOpen, setBatchReceiptOpen] = useState(false);
  const [bankExportOpen, setBankExportOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  
  // Colaborador sheet state
  const [colaboradorBranchId, setColaboradorBranchId] = useState<string>('');
  const [printColaboradorSheetOpen, setPrintColaboradorSheetOpen] = useState(false);
  
  // Password-protected action dialogs
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  
  // Early payment dialog
  const [earlyPaymentDialogOpen, setEarlyPaymentDialogOpen] = useState(false);
  const [earlyPaymentEntry, setEarlyPaymentEntry] = useState<PayrollEntry | null>(null);
  const [oneOffExtraDialogOpen, setOneOffExtraDialogOpen] = useState(false);
  const [oneOffExtraEntry, setOneOffExtraEntry] = useState<PayrollEntry | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const pendingAbsences = getPendingAbsences();
  const headquarters = branches.find(b => b.isHeadquarters) || branches[0];
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || headquarters;
  const bonusBranch = branches.find(b => b.id === bonusBranchId);

  // Sort periods by date (newest first) and filter out future months beyond next month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  
  // Calculate the maximum allowed month (current month, or next month if current is archived)
  const currentMonthPeriod = periods.find(p => p.year === currentYear && p.month === currentMonth);
  const isCurrentMonthArchived = currentMonthPeriod && (currentMonthPeriod.status === 'approved' || currentMonthPeriod.status === 'paid');
  
  // Max allowed: current month + 1 if current is archived, otherwise current month
  const maxAllowedMonth = isCurrentMonthArchived ? currentMonth + 1 : currentMonth;
  const maxAllowedYear = maxAllowedMonth > 12 ? currentYear + 1 : currentYear;
  const normalizedMaxMonth = maxAllowedMonth > 12 ? 1 : maxAllowedMonth;
  
  // Filter periods to exclude future months beyond allowed limit
  const filteredPeriods = periods.filter(p => {
    // Convert to comparable number (YYYYMM)
    const periodNum = p.year * 100 + p.month;
    const maxNum = maxAllowedYear * 100 + normalizedMaxMonth;
    return periodNum <= maxNum;
  });
  
  const sortedPeriods = [...filteredPeriods].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Active/current period is the newest draft/calculated one.
  // IMPORTANT: If there is NO active period (e.g., after archiving), currentPeriod must be undefined
  // so the UI can show the "Calcular Folha" button and create the next month.
  const activePeriod = sortedPeriods.find(p => p.status === 'calculated' || p.status === 'draft');
  const selectedPeriod = selectedPeriodId ? periods.find(p => p.id === selectedPeriodId) : undefined;
  const currentPeriod = selectedPeriod || activePeriod;
  const isViewingSelectedPeriod = Boolean(selectedPeriodId);
  
  // Check if viewing historical (approved/paid) period
  const isHistoricalView = currentPeriod?.status === 'approved' || currentPeriod?.status === 'paid';
  
  // Attendance close status for the current period
  const periodMonth = currentPeriod?.month || (now.getMonth() + 1);
  const periodYear = currentPeriod?.year || now.getFullYear();
  const isAttendanceClosedForPeriod = isAttendanceClosed(periodMonth, periodYear);
  const attendanceCutoffForPeriod = getAttendanceCutoff(periodMonth, periodYear);

  // Get all entries for the current period - don't filter by employee existence
  // This ensures payroll data shows even if employee data sync is delayed
  const currentEntries = currentPeriod 
    ? entries
        .filter(e => e.payrollPeriodId === currentPeriod.id)
        .map(e => {
          const employeeData = employees.find(emp => emp.id === e.employeeId);
          return {
            ...e,
            employee: employeeData || e.employee // Use stored employee data as fallback
          };
        })
    : [];
  
  // Helper to get or create the NEXT available period
  // Logic: Only allow current month OR next month if current month is archived
  // NEVER allow 2+ months ahead
  const getOrCreateCurrentPeriod = async () => {
    // If user is currently viewing a period, keep working on that same period.
    // This avoids silent month jumps after approval/recalculation.
    if (currentPeriod && currentPeriod.status !== 'paid') {
      return currentPeriod;
    }

    // If we already have an active editable period, use it
    if (activePeriod) {
      return activePeriod;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Check if current month exists and is archived (approved/paid)
    const currentMonthPeriod = periods.find(p => p.year === currentYear && p.month === currentMonth);
    const isCurrentMonthArchived = currentMonthPeriod && (currentMonthPeriod.status === 'approved' || currentMonthPeriod.status === 'paid');

    let targetYear: number;
    let targetMonth: number;

    if (isCurrentMonthArchived) {
      // Current month is archived - allow NEXT month only
      if (currentMonth === 12) {
        targetMonth = 1;
        targetYear = currentYear + 1;
      } else {
        targetMonth = currentMonth + 1;
        targetYear = currentYear;
      }
    } else {
      // Current month not archived - use current month
      targetMonth = currentMonth;
      targetYear = currentYear;
    }

    // Check if target period already exists
    const existing = periods.find(p => p.year === targetYear && p.month === targetMonth);
    if (existing) {
      return existing;
    }

    // Create new period
    return await createPeriod(targetYear, targetMonth);
  };

  // Helper: check if an entry is for a colaborador
  const isColaboradorEntry = (e: PayrollEntry) => {
    const emp = e.employee || employees.find(emp => emp.id === e.employeeId);
    return emp?.contractType === 'colaborador';
  };

  // Split entries: regular employees vs colaboradores
  const regularEntries = currentEntries; // Include all employees (regular + colaboradores) in main table
  const colaboradorEntries = currentEntries.filter(e => isColaboradorEntry(e));

  // Filter entries by branch for payroll sheet (ALL employees)
  const payrollSheetEntries = selectedBranchId 
    ? regularEntries
        .filter(e => {
          if (e.employee?.branchId === selectedBranchId) return true;
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee?.branchId === selectedBranchId;
        })
        .map(e => {
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee 
            ? { ...e, employee: { ...e.employee, ...currentEmployee } }
            : e;
        })
    : regularEntries;

  const normalizeText = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filterEntriesBySearch = (list: typeof regularEntries) => {
    const query = normalizeText(employeeSearch);
    if (!query) return list;
    const words = query.split(/\s+/).filter(Boolean);
    return list.filter((entry) => {
      const emp = entry.employee || employees.find((e) => e.id === entry.employeeId);
      if (!emp) return false;
      const haystack = normalizeText(
        `${emp.firstName} ${emp.lastName} ${emp.employeeNumber || ''} ${emp.department || ''} ${emp.category || ''} ${emp.position || ''}`
      );
      return words.every((word) => haystack.includes(word));
    });
  };

  const tableSourceEntries = selectedBranchId ? payrollSheetEntries : regularEntries;
  const tableEntries = useMemo(
    () => filterEntriesBySearch(tableSourceEntries),
    [tableSourceEntries, employeeSearch, employees]
  );

  // Filter colaborador entries by branch
  const colaboradorBranch = branches.find(b => b.id === colaboradorBranchId);
  const colaboradorSheetEntries = colaboradorBranchId
    ? colaboradorEntries
        .filter(e => {
          if (e.employee?.branchId === colaboradorBranchId) return true;
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee?.branchId === colaboradorBranchId;
        })
        .map(e => {
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee 
            ? { ...e, employee: { ...e.employee, ...currentEmployee } }
            : e;
        })
    : [];

  // Filter entries by branch for bonus sheet - check both entry.employee.branchId and current employee branchId
  const bonusSheetEntries = bonusBranchId 
    ? regularEntries
        .filter(e => {
          // First check entry's employee branchId
          if (e.employee?.branchId === bonusBranchId) return true;
          // Also check current employee record in case it was updated after payroll generation
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee?.branchId === bonusBranchId;
        })
        .map(e => {
          // Merge in latest employee data to ensure branchId is current
          const currentEmployee = employees.find(emp => emp.id === e.employeeId);
          return currentEmployee 
            ? { ...e, employee: { ...e.employee, ...currentEmployee } }
            : e;
        })
    : [];
  
  const totals = regularEntries.reduce((acc, e) => ({
    gross: acc.gross + e.grossSalary,
    deductions: acc.deductions + e.totalDeductions,
    net: acc.net + (e.paidEarly ? 0 : e.netSalary),
    bonus: acc.bonus + (e.monthlyBonus || 0),
    oneOffExtra: acc.oneOffExtra + getOneOffExtraPayout(e),
  }), { gross: 0, deductions: 0, net: 0, bonus: 0, oneOffExtra: 0 });

  // Calculate months worked for an employee
  const getMonthsWorked = (hireDate: string): number => {
    const hire = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    return Math.min(Math.max(months, 0), 12); // Cap at 12 months
  };

  const handleCalculate = async () => {
    if (!hasPermission('payroll.calculate')) {
      toast.error(language === 'pt' ? 'Sem permissão para calcular folha' : 'No permission to calculate payroll');
      return;
    }
    if (activeEmployees.length === 0) {
      if (pendingApprovalEmployees.length > 0) {
        toast.error(
          language === 'pt'
            ? `Tem ${pendingApprovalEmployees.length} funcionário(s) pendente(s). Aprove primeiro para aparecerem na folha.`
            : `You have ${pendingApprovalEmployees.length} pending employee(s). Approve them first to appear in payroll.`
        );
      } else {
        toast.error(language === 'pt' ? 'Adicione funcionários primeiro' : 'Add employees first');
      }
      return;
    }

    // PROTECTION: Block recalculation only for paid periods.
    // Approved periods are allowed and preserve approved holiday subsidy values.
    if (currentPeriod && currentPeriod.status === 'paid') {
      toast.error(
        language === 'pt' 
          ? 'Não é possível recalcular um período pago.'
          : 'Cannot recalculate a paid period.'
      );
      return;
    }
    
    // Get or create period for current month
    const period = await getOrCreateCurrentPeriod();
    
    // Warn if attendance is not closed yet (but don't block)
    if (!isAttendanceClosed(period.month, period.year)) {
      toast.warning(
        language === 'pt'
          ? 'Atenção: Presenças ainda não foram fechadas. Ausências após hoje serão incluídas no próximo mês.'
          : 'Warning: Attendance has not been closed. Absences after today will be included in next month.'
      );
    }
    
    // Pass absence store, deduction store and bulk attendance store to integrate calculations
    // Bulk attendance takes priority for absence/delay deductions (uses FULL salary including bonuses)
    await generateEntriesForPeriod(period.id, activeEmployees, holidayRecords, absenceStore, deductionStore, bulkAttendanceStore);
    setSelectedPeriodId(period.id);
    
    // IMPORTANT: Get fresh entries from the store AFTER generation completes
    // The store.entries is now updated via loadPayroll() inside generateEntriesForPeriod
    const freshStore = usePayrollStore.getState();
    const freshEntries = freshStore.entries.filter(e => e.payrollPeriodId === period.id);
    
    // Show info about holiday subsidies
    const subsidyCount = freshEntries.filter(e => e.holidaySubsidy > 0).length;
    if (subsidyCount > 0) {
      toast.success(
        language === 'pt' 
          ? `Folha calculada! ${subsidyCount} funcionário(s) receberão subsídio de férias (férias no próximo mês).`
          : `Payroll calculated! ${subsidyCount} employee(s) will receive holiday subsidy (holiday next month).`
      );
    } else {
      toast.success(language === 'pt' ? 'Folha calculada com sucesso!' : 'Payroll calculated successfully!');
    }

    if (period.status === 'approved') {
      toast.info(
        language === 'pt'
          ? 'Período aprovado recalculado com preservação do subsídio de férias já aprovado neste mês.'
          : 'Approved period recalculated while preserving already approved holiday subsidy for this month.'
      );
    }
  };

  const handleToggle13thMonth = (entry: PayrollEntry) => {
    const monthsWorked = entry.employee?.hireDate ? getMonthsWorked(entry.employee.hireDate) : 12;
    toggle13thMonth(entry.id, monthsWorked);
  };

  const handleUpdate13thMonth = (entry: PayrollEntry, value: number) => {
    toggle13thMonth(entry.id, value);
  };

  const handleUpdateHolidaySubsidy = async (entry: PayrollEntry, value: number) => {
    // Recalculate the entire entry with the new holiday subsidy value
    const { calculatePayroll } = await import('@/lib/angola-labor-law');
    
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
      isColaborador: entry.employee?.contractType === 'colaborador',
      thirteenthMonthValue: entry.thirteenthMonth || 0,
      holidaySubsidyValue: value,
    });

    const extraDeductions = (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0);

    await updateEntry(entry.id, {
      ...payrollResult,
      totalDeductions: payrollResult.totalDeductions + extraDeductions,
      netSalary: payrollResult.netSalary - extraDeductions,
    });
    
    // Reload to refresh UI
    await usePayrollStore.getState().loadPayroll();
    if (entry.payrollPeriodId) {
      await usePayrollStore.getState().calculatePeriod(entry.payrollPeriodId);
    }
  };

  const handleToggleHolidaySubsidy = (entry: PayrollEntry) => {
    toggleHolidaySubsidy(entry.id);
  };

  const handleExport = () => {
    if (!hasPermission('payroll.export')) {
      toast.error(language === 'pt' ? 'Sem permissão para exportar' : 'No permission to export');
      return;
    }
    const monthName = language === 'pt' 
      ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][new Date().getMonth()]
      : ['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()];
    exportPayrollToCSV(currentEntries, `${monthName}-${new Date().getFullYear()}`, language);
    toast.success(t.export.success);
  };

  const handleViewReceipt = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setReceiptOpen(true);
  };

  const handleEditOvertime = (entry: PayrollEntry) => {
    setOvertimeEntry(entry);
    setOvertimeDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!hasPermission('payroll.approve')) {
      toast.error(language === 'pt' ? 'Sem permissão para aprovar folha' : 'No permission to approve payroll');
      return;
    }
    if (!currentPeriod) return;

    // First approve period (history)
    await approvePeriod(currentPeriod.id);
    // Keep UI focused on the approved period; do not auto-switch to next month.
    setSelectedPeriodId(currentPeriod.id);

    // Link only deductions that actually appear on this folha (deduction_details).
    const { parseDeductionDetails } = await import('@/stores/deduction-store');
    for (const entry of currentEntries) {
      for (const detail of parseDeductionDetails(entry.deductionDetails)) {
        const deductionId =
          detail.deductionId || (detail as { deduction_id?: string; id?: string }).deduction_id || (detail as { id?: string }).id;
        const amount = Number(detail.amount || 0);
        if (deductionId && amount > 0) {
          await applyDeductionToPayroll(deductionId, currentPeriod.id);
        }
      }
    }

    // Credit installments when payroll is approved (one approved month = one installment).
    await finalizeApprovedPeriodDeductions(currentPeriod.id);

    // Mark holiday subsidy as paid only after payroll is approved.
    for (const entry of currentEntries) {
      if (entry.holidaySubsidy > 0) {
        const nextMonth = currentPeriod.month === 12 ? 1 : currentPeriod.month + 1;
        const nextMonthYear = currentPeriod.month === 12 ? currentPeriod.year + 1 : currentPeriod.year;
        await markSubsidyPaid(entry.employeeId, nextMonthYear, currentPeriod.month, currentPeriod.year);
      }
    }

    toast.success(t.common.approved);
  };

  const monthNames = language === 'pt'
    ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Dynamic period label based on selected period
  const periodLabel = currentPeriod 
    ? `${monthNames[currentPeriod.month - 1]} ${currentPeriod.year}`
    : `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

  const pt = language === 'pt';

  const displayTotals = useMemo(() => {
    const displayEntries = employeeSearch.trim() ? tableEntries : tableSourceEntries;
    return displayEntries.reduce(
      (acc, e) => ({
        gross: acc.gross + e.grossSalary,
        deductions: acc.deductions + e.totalDeductions,
        net: acc.net + (e.paidEarly ? 0 : e.netSalary),
        bonus: acc.bonus + (e.monthlyBonus || 0),
        oneOffExtra: acc.oneOffExtra + getOneOffExtraPayout(e),
      }),
      { gross: 0, deductions: 0, net: 0, bonus: 0, oneOffExtra: 0 }
    );
  }, [employeeSearch, tableEntries, tableSourceEntries]);

  const displayEntryCount = useMemo(() => {
    return employeeSearch.trim() ? tableEntries.length : tableSourceEntries.length;
  }, [employeeSearch, tableEntries, tableSourceEntries]);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      calculated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    const statusLabels: Record<string, { pt: string; en: string }> = {
      draft: { pt: 'Rascunho', en: 'Draft' },
      calculated: { pt: 'Calculado', en: 'Calculated' },
      approved: { pt: 'Aprovado', en: 'Approved' },
      paid: { pt: 'Pago', en: 'Paid' },
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
        {statusLabels[status]?.[language] || status}
      </span>
    );
  };

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar — row 1: período & filtros; row 2: exportar & imprimir */}
        <div className="shrink-0 rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/40">
            <Receipt className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold shrink-0">{t.payroll.title}</span>

            {sortedPeriods.length > 0 && (
              <Select
                value={selectedPeriodId || currentPeriod?.id || ''}
                onValueChange={(v) => {
                  if (activePeriod && v === activePeriod.id) {
                    setSelectedPeriodId('');
                    return;
                  }
                  setSelectedPeriodId(v);
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs shrink-0">
                  <SelectValue placeholder={pt ? 'Período actual' : 'Current period'} />
                </SelectTrigger>
                <SelectContent>
                  {sortedPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      <div className="flex items-center gap-2">
                        <span>{monthNames[period.month - 1]} {period.year}</span>
                        {getStatusBadge(period.status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isViewingSelectedPeriod && (
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setSelectedPeriodId('')}>
                {pt ? 'Actual' : 'Current'}
              </Button>
            )}

            {isHistoricalView && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                {pt ? 'histórico' : 'history'}
              </span>
            )}

            {!isHistoricalView && currentPeriod && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                  isAttendanceClosedForPeriod
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                )}
                title={
                  isAttendanceClosedForPeriod
                    ? (pt ? `Presenças fechadas (${attendanceCutoffForPeriod})` : `Attendance closed (${attendanceCutoffForPeriod})`)
                    : (pt ? 'Presenças ainda não fechadas' : 'Attendance not closed yet')
                }
              >
                {isAttendanceClosedForPeriod ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                {isAttendanceClosedForPeriod ? (pt ? 'Pres. fechadas' : 'Att. closed') : (pt ? 'Pres. abertas' : 'Att. open')}
              </span>
            )}

            <div className="w-px h-5 bg-border/60 hidden sm:block shrink-0" />

            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={selectedBranchId || 'all'} onValueChange={(v) => setSelectedBranchId(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
                <SelectValue placeholder={pt ? 'Filial' : 'Branch'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{pt ? 'Todas as filiais' : 'All branches'}</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={pt ? 'Pesquisar funcionário...' : 'Search employee...'}
                className="pl-8 h-8 text-xs"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>

            {!isHistoricalView && (
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <Button variant="accent" size="sm" className="h-8 text-xs" onClick={handleCalculate}>
                  <Calculator className="h-3.5 w-3.5 mr-1" />
                  {t.payroll.calculatePayroll}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAbsenceDialogOpen(true)}>
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  {pt ? 'Ausências' : 'Absences'}
                  {pendingAbsences.length > 0 && (
                    <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                      {pendingAbsences.length}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 hidden md:inline">
              {pt ? 'Exportar' : 'Export'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder={pt ? 'Armazém' : 'Warehouse'}
                className="h-8 w-[100px] text-xs shrink-0"
                title={pt ? 'Nome do armazém para impressão' : 'Warehouse name for printing'}
              />
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={handleExport} disabled={currentEntries.length === 0}>
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => {
                  if (!selectedBranchId) {
                    toast.error(pt ? 'Selecione uma filial primeiro' : 'Select a branch first');
                    return;
                  }
                  setPrintSheetOpen(true);
                }}
                disabled={currentEntries.length === 0}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                {pt ? 'Folha' : 'Sheet'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setBatchReceiptOpen(true)} disabled={currentEntries.length === 0}>
                <Receipt className="h-3.5 w-3.5 mr-1" />
                {pt ? 'Recibos' : 'Receipts'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setBankExportOpen(true)} disabled={currentEntries.length === 0}>
                <Building2 className="h-3.5 w-3.5 mr-1" />
                {pt ? 'Banco' : 'Bank'}
              </Button>
            </div>

            <div className="hidden sm:block w-px h-6 bg-border/60 shrink-0" />

            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 hidden md:inline">
              {pt ? 'Imprimir' : 'Print'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/20 pl-2 pr-1 py-0.5 shrink-0">
                <Gift className="h-3.5 w-3.5 text-accent shrink-0" />
                <Select value={bonusBranchId} onValueChange={setBonusBranchId}>
                  <SelectTrigger
                    className="h-7 w-[120px] text-xs border-0 bg-transparent shadow-none focus:ring-0"
                    title={pt ? 'Filial para folha de bónus' : 'Branch for bonus sheet'}
                  >
                    <SelectValue placeholder={pt ? 'Bónus' : 'Bonus'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setPrintBonusSheetOpen(true)}
                  disabled={!bonusBranchId || bonusSheetEntries.length === 0}
                  title={pt ? 'Imprimir folha de bónus' : 'Print bonus sheet'}
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>

              {colaboradorEntries.length > 0 && (
                <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/20 pl-2 pr-1 py-0.5 shrink-0">
                  <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <Select value={colaboradorBranchId} onValueChange={setColaboradorBranchId}>
                    <SelectTrigger
                      className="h-7 w-[120px] text-xs border-0 bg-transparent shadow-none focus:ring-0"
                      title={pt ? 'Filial para folha colaboradores' : 'Branch for collaborators sheet'}
                    >
                      <SelectValue placeholder={pt ? 'Colab.' : 'Collab.'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setPrintColaboradorSheetOpen(true)}
                    disabled={!colaboradorBranchId || colaboradorSheetEntries.length === 0}
                    title={pt ? 'Imprimir folha colaboradores' : 'Print collaborators sheet'}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs + table + footer — table keeps all remaining height */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: t.payroll.grossSalaries, value: formatAOA(displayTotals.gross) },
            { label: pt ? 'Total Bónus' : 'Total Bonus', value: formatAOA(displayTotals.bonus) },
            { label: pt ? 'Extras Pontuais' : 'One-off Extras', value: formatAOA(displayTotals.oneOffExtra) },
            { label: t.payroll.totalDeductions, value: formatAOA(displayTotals.deductions) },
            { label: t.payroll.netSalaries, value: formatAOA(displayTotals.net), success: true },
            { label: t.employees.title, value: String(displayEntryCount) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={cn('text-sm font-semibold truncate', kpi.success && 'text-success')}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {regularEntries.length > 0 ? (
            <AttendanceTablePanel
              toolbar={
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{t.payroll.employeeDetails}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {tableEntries.length} / {tableSourceEntries.length}
                  </span>
                </div>
              }
            >
              <table className="w-full min-w-[1200px]">
                <thead className={ATTENDANCE_THEAD}>
                  <tr>
                    <th className={ATTENDANCE_TH}>{t.employees.employee}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.employees.baseSalary}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'H. Extra' : 'Overtime'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Faltas' : 'Absences'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Sub. Férias' : 'Holiday'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Sub. Natal' : '13th'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Bónus' : 'Bonus'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Extra' : 'Extra'}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.payroll.gross}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.payroll.irt}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.payroll.inss}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.payroll.net}</th>
                    <th className={ATTENDANCE_TH_RIGHT}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className={ATTENDANCE_TBODY}>
                {/* Show only entries for selected branch, or all if no branch selected */}
                {tableEntries.map(entry => {
                  const totalOvertimeHours = (entry.overtimeHoursNormal || 0) + (entry.overtimeHoursNight || 0) + (entry.overtimeHoursHoliday || 0);
                  const totalOvertimeValue = (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0);
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className={`${ATTENDANCE_TD} font-medium text-sm`}>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs`}>{formatAOA(entry.baseSalary)}</td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        {!isHistoricalView ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditOvertime(entry)}
                            className={`h-7 px-2 text-xs font-mono ${totalOvertimeValue > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                            title={language === 'pt' ? 'Editar horas extra e faltas' : 'Edit overtime and absences'}
                          >
                            {totalOvertimeHours > 0 ? `+${totalOvertimeHours}h` : '0h'}
                            {totalOvertimeValue > 0 && <span className="ml-1 text-primary">+{formatAOA(totalOvertimeValue)}</span>}
                            <Clock className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <span className={`text-xs font-mono ${totalOvertimeValue > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {totalOvertimeHours > 0 ? `+${totalOvertimeHours}h` : '0h'}
                            {totalOvertimeValue > 0 && <span className="ml-1">+{formatAOA(totalOvertimeValue)}</span>}
                          </span>
                        )}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        {!isHistoricalView ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditOvertime(entry)}
                            className={`h-7 px-2 text-xs font-mono ${(entry.daysAbsent || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                            title={language === 'pt' ? 'Editar faltas' : 'Edit absences'}
                          >
                            {(entry.daysAbsent || 0) > 0 ? `-${entry.daysAbsent}d` : '0d'}
                            {(entry.absenceDeduction || 0) > 0 && <span className="ml-1 text-destructive">-{formatAOA(entry.absenceDeduction)}</span>}
                          </Button>
                        ) : (
                          <span className={`text-xs font-mono ${(entry.daysAbsent || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {(entry.daysAbsent || 0) > 0 ? `-${entry.daysAbsent}d` : '0d'}
                            {(entry.absenceDeduction || 0) > 0 && <span className="ml-1">-{formatAOA(entry.absenceDeduction)}</span>}
                          </span>
                        )}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        {(() => {
                          const subsidyAlreadyPaid = isSubsidyPaid(entry.employeeId, selectedPeriod?.year || new Date().getFullYear());
                          const isBlocked = subsidyAlreadyPaid && entry.holidaySubsidy === 0;
                          
                          if (isBlocked) {
                            return (
                              <span className="text-xs text-muted-foreground" title={language === 'pt' ? 'Subsídio de férias já pago este ano' : 'Holiday subsidy already paid this year'}>
                                🔒 {language === 'pt' ? 'Pago' : 'Paid'}
                              </span>
                            );
                          }
                          
                          return !isHistoricalView ? (
                            <Input
                              type="number"
                              min={0}
                              defaultValue={entry.holidaySubsidy || ''}
                              key={`holiday-${entry.id}-${entry.holidaySubsidy}`}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const minValue = Math.round(entry.baseSalary * 0.5);
                                if (value > 0 && value < minValue) {
                                  toast.error(
                                    language === 'pt'
                                      ? `Mínimo legal: ${formatAOA(minValue)} (50% do salário base)`
                                      : `Legal minimum: ${formatAOA(minValue)} (50% of base salary)`
                                  );
                                  return;
                                }
                                // Block if subsidy already paid and trying to add value
                                if (value > 0 && subsidyAlreadyPaid) {
                                  toast.error(
                                    language === 'pt'
                                      ? 'Subsídio de férias já foi pago para este funcionário neste ano'
                                      : 'Holiday subsidy already paid for this employee this year'
                                  );
                                  return;
                                }
                                if (value !== entry.holidaySubsidy) {
                                  handleUpdateHolidaySubsidy(entry, value);
                                }
                              }}
                              className="w-24 text-right font-mono text-sm h-7"
                              placeholder={formatAOA(Math.round(entry.baseSalary * 0.5))}
                              title={subsidyAlreadyPaid 
                                ? (language === 'pt' ? 'Subsídio já pago este ano' : 'Subsidy already paid this year')
                                : (language === 'pt' 
                                  ? `Mínimo: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% do salário base)` 
                                  : `Minimum: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% of base salary)`)}
                            />
                          ) : (
                            <span className="font-mono text-sm">{formatAOA(entry.holidaySubsidy)}</span>
                          );
                        })()}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        {!isHistoricalView ? (
                          <Input
                            type="number"
                            min={0}
                            defaultValue={entry.thirteenthMonth || ''}
                            key={`natal-${entry.id}-${entry.thirteenthMonth}`}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const minValue = Math.round(entry.baseSalary * 0.5);
                              if (value > 0 && value < minValue) {
                                toast.error(
                                  language === 'pt'
                                    ? `Mínimo legal: ${formatAOA(minValue)} (50% do salário base)`
                                    : `Legal minimum: ${formatAOA(minValue)} (50% of base salary)`
                                );
                                return;
                              }
                              if (value !== entry.thirteenthMonth) {
                                handleUpdate13thMonth(entry, value);
                              }
                            }}
                            className="w-24 text-right font-mono text-sm h-7"
                            placeholder={formatAOA(Math.round(entry.baseSalary * 0.5))}
                            title={language === 'pt' 
                              ? `Mínimo: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% do salário base)` 
                              : `Minimum: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% of base salary)`}
                          />
                        ) : (
                          <span className="font-mono text-sm">{formatAOA(entry.thirteenthMonth)}</span>
                        )}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs`}>
                        {(entry.monthlyBonus || 0) > 0 ? (
                          <span className="text-accent">{formatAOA(entry.monthlyBonus)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs`}>
                        {(() => {
                          const oneOff = getOneOffExtraPayout(entry);
                          const buyout = getHolidayBuyoutPayout(entry);
                          const extraTotal = oneOff + buyout;
                          const tip = [
                            buyout > 0 ? `${language === 'pt' ? 'Compra férias' : 'Holiday buyout'}: ${formatAOA(buyout)}` : '',
                            oneOff > 0 ? `${language === 'pt' ? 'Extra pontual' : 'One-off'}: ${formatAOA(oneOff)}` : '',
                            entry.holidayBuyoutNote,
                            entry.oneOffExtraNote,
                          ].filter(Boolean).join(' | ');
                          if (extraTotal > 0 || !isHistoricalView) {
                            return (
                              <div className="flex items-center justify-end gap-1">
                                {extraTotal > 0 ? (
                                  <span className="text-violet-600" title={tip}>
                                    {formatAOA(extraTotal)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                {!isHistoricalView && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setOneOffExtraEntry(entry);
                                      setOneOffExtraDialogOpen(true);
                                    }}
                                    title={
                                      oneOff > 0
                                        ? language === 'pt'
                                          ? 'Editar extra pontual'
                                          : 'Edit one-off extra'
                                        : language === 'pt'
                                          ? 'Adicionar extra pontual'
                                          : 'Add one-off extra'
                                    }
                                  >
                                    {oneOff > 0 ? (
                                      <Pencil className="h-3.5 w-3.5" />
                                    ) : (
                                      <Coins className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          }
                          return <span className="text-muted-foreground">-</span>;
                        })()}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs`}>{formatAOA(entry.grossSalary)}</td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs text-destructive`}>{formatAOA(entry.irt)}</td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs text-destructive`}>{formatAOA(entry.inssEmployee)}</td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs font-bold text-primary`}>
                        {entry.paidEarly ? (
                          <span className="flex items-center justify-end gap-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              {language === 'pt' ? 'Pago Antecip.' : 'Paid Early'}
                            </span>
                            <span className="line-through text-muted-foreground">{formatAOA(getEarlyPaymentRecordAmount(entry))}</span>
                            <span>{formatAOA(0)}</span>
                          </span>
                        ) : (
                          formatAOA(getTotalPaidToEmployee(entry))
                        )}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                        {!isHistoricalView && (
                          <Button 
                            variant={entry.paidEarly ? "destructive" : "outline"} 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                            onClick={async () => {
                              if (entry.paidEarly) {
                                await updateEntry(entry.id, {
                                  paidEarly: false,
                                  paidEarlyAt: undefined,
                                  paidEarlyAmount: undefined,
                                  paidEarlyReason: undefined,
                                  paidEarlyAuthorizedBy: undefined,
                                  paidEarlyPaymentMethod: undefined,
                                });
                                await usePayrollStore.getState().loadPayroll();
                                toast.success(language === 'pt' ? 'Pagamento antecipado removido' : 'Early payment removed');
                              } else {
                                // Open early payment dialog with receipt
                                setEarlyPaymentEntry(entry);
                                setEarlyPaymentDialogOpen(true);
                              }
                            }}
                            title={entry.paidEarly 
                              ? (language === 'pt' ? 'Remover pagamento antecipado' : 'Remove early payment')
                              : (language === 'pt' ? 'Marcar como pago antecipadamente' : 'Mark as paid early')
                            }
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {entry.paidEarly && isHistoricalView && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            {language === 'pt' ? 'PA' : 'EP'}
                          </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(entry)}>
                          <Receipt className="h-4 w-4" />
                        </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </AttendanceTablePanel>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/50 bg-card text-sm text-muted-foreground">
              {pt ? 'Calcule a folha para ver os funcionários' : 'Calculate payroll to see employees'}
            </div>
          )}
        </div>

        <div className="shrink-0 rounded-xl border border-border/50 bg-card px-3 py-2 space-y-2">
      {/* Approve section - only show when not viewing historical data */}
      {!isHistoricalView && currentEntries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-semibold text-foreground">{t.payroll.readyToProcess}</h3>
            <p className="text-sm text-muted-foreground">
              {language === 'pt'
                ? 'Após aprovação, os dados ficam guardados no histórico.'
                : 'After approval, data is saved in history.'}
            </p>
          </div>
          <Button variant="accent" size="sm" className="h-8" onClick={handleApprove}>
            <Send className="h-3.5 w-3.5 mr-1" />
            {t.payroll.approveAndProcess}
          </Button>
        </div>
      )}

       {/* Historical view info */}
       {isHistoricalView && currentEntries.length > 0 && (
         <div className="rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
           <div className="flex flex-wrap items-center justify-between gap-3">
             <div>
               <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                 {currentPeriod?.status === 'paid' 
                   ? (language === 'pt' ? 'Período Arquivado' : 'Archived Period')
                   : (language === 'pt' ? 'Período Aprovado' : 'Approved Period')
                 }
               </h3>
               <p className="text-sm text-amber-600 dark:text-amber-500">
                 {currentPeriod?.status === 'paid'
                   ? (language === 'pt'
                       ? 'Este período foi arquivado. Os dados estão no histórico e não podem ser alterados.'
                       : 'This period has been archived. Data is in history and cannot be modified.')
                   : (language === 'pt'
                       ? 'Este período está aprovado. Pode arquivar para fechar o mês ou reabrir para editar.'
                       : 'This period is approved. You can archive to close the month or reopen to edit.')
                 }
               </p>
             </div>
             <div className="flex items-center gap-2">
               {currentPeriod?.status && getStatusBadge(currentPeriod.status)}
               
               {/* Archive button - only show for approved (not yet paid/archived) - REQUIRES ADMIN PASSWORD */}
               {currentPeriod?.status === 'approved' && (
                 <Button
                   variant="accent"
                   size="sm"
                   onClick={() => setArchiveDialogOpen(true)}
                 >
                   <Archive className="h-4 w-4 mr-2" />
                   {language === 'pt' ? 'Arquivar Mês' : 'Archive Month'}
                 </Button>
               )}

               {/* Reopen button - only show for approved (not paid/archived) - REQUIRES ADMIN PASSWORD */}
               {currentPeriod?.status === 'approved' && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setReopenDialogOpen(true)}
                 >
                   <RotateCcw className="h-4 w-4 mr-2" />
                   {language === 'pt' ? 'Reabrir para editar' : 'Reopen to edit'}
                 </Button>
               )}

               {/* Unarchive button - only show for paid/archived periods - REQUIRES ADMIN PASSWORD */}
               {currentPeriod?.status === 'paid' && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setUnarchiveDialogOpen(true)}
                 >
                   <Unlock className="h-4 w-4 mr-2" />
                   {language === 'pt' ? 'Desarquivar' : 'Unarchive'}
                 </Button>
               )}
             </div>
           </div>
         </div>
       )}

        </div>
        </div>
      </div>

      {/* Individual Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.receipt.title}</DialogTitle>
          </DialogHeader>
          {selectedEntry && selectedEntry.employee && (
            <SalaryReceipt
              entry={selectedEntry}
              employee={selectedEntry.employee}
              companyName={settings.companyName}
              companyNif={settings.nif}
              periodLabel={periodLabel}
              onClose={() => setReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Payroll Sheet Dialog */}
      <Dialog open={printSheetOpen} onOpenChange={setPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Folha Salarial Completa' : 'Complete Payroll Sheet'}</DialogTitle>
          </DialogHeader>
          <PrintablePayrollSheet
            entries={payrollSheetEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            warehouseName={warehouseName}
          />
        </DialogContent>
      </Dialog>

      {/* Printable Colaborador Sheet Dialog */}
      <Dialog open={printColaboradorSheetOpen} onOpenChange={setPrintColaboradorSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Folha de Colaboradores' : 'Collaborators Sheet'} - {colaboradorBranch?.name || ''}
            </DialogTitle>
          </DialogHeader>
          {colaboradorBranch && (
            <PrintableColaboradorSheet
              entries={colaboradorSheetEntries}
              periodLabel={periodLabel}
              companyName={settings.companyName}
              companyNif={settings.nif}
              branch={colaboradorBranch}
              warehouseName={warehouseName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Bonus Sheet Dialog */}
      <Dialog open={printBonusSheetOpen} onOpenChange={setPrintBonusSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Folha de Bónus' : 'Bonus Sheet'} - {bonusBranch?.name || ''}
            </DialogTitle>
          </DialogHeader>
          {bonusBranch && (
            <PrintableBonusSheet
              entries={bonusSheetEntries}
              periodLabel={periodLabel}
              companyName={settings.companyName}
              companyNif={settings.nif}
              branch={bonusBranch}
              warehouseName={warehouseName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Overtime and Absence Dialog */}
      <OvertimeAbsenceDialog
        open={overtimeDialogOpen}
        onOpenChange={setOvertimeDialogOpen}
        entry={overtimeEntry}
      />

      {/* Absence Management Dialog */}
      <AbsenceDialog
        open={absenceDialogOpen}
        onOpenChange={setAbsenceDialogOpen}
      />

      {/* Batch Receipt Printer Dialog */}
      <BatchReceiptPrinter
        open={batchReceiptOpen}
        onOpenChange={setBatchReceiptOpen}
        entries={currentEntries}
        periodLabel={periodLabel}
        companyName={settings.companyName}
        companyNif={settings.nif}
      />

      {/* Bank Payment Export Dialog */}
      <BankPaymentExport
        open={bankExportOpen}
        onOpenChange={setBankExportOpen}
        entries={currentEntries}
        periodLabel={periodLabel}
      />

      {/* Admin Password Protected Dialogs */}
      
      {/* Archive Period - requires admin password */}
      <AdminPasswordDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title={language === 'pt' ? 'Arquivar Período' : 'Archive Period'}
        description={
          language === 'pt'
            ? `Tem a certeza que pretende arquivar ${periodLabel}? Esta acção fechará o mês e abrirá o próximo período para cálculo.`
            : `Are you sure you want to archive ${periodLabel}? This will close the month and open the next period for calculation.`
        }
        warningMessage={
          language === 'pt'
            ? 'Após arquivar, os descontos serão processados e o próximo mês ficará disponível.'
            : 'After archiving, deductions will be processed and the next month will become available.'
        }
        confirmText={language === 'pt' ? 'Arquivar' : 'Archive'}
        variant="destructive"
        onConfirm={async () => {
          if (!currentPeriod) return;
          const result = await archivePeriod(currentPeriod.id, deductionStore, absenceStore);
          toast.success(
            language === 'pt'
              ? `Mês arquivado! ${result.archivedDeductions} descontos removidos, ${result.installmentsCarried} prestações continuadas.`
              : `Month archived! ${result.archivedDeductions} deductions removed, ${result.installmentsCarried} installments carried.`
          );
          setSelectedPeriodId('');
        }}
      />

      {/* Reopen Period - requires admin password */}
      <AdminPasswordDialog
        open={reopenDialogOpen}
        onOpenChange={setReopenDialogOpen}
        title={language === 'pt' ? 'Reabrir Período' : 'Reopen Period'}
        description={
          language === 'pt'
            ? `Tem a certeza que pretende reabrir ${periodLabel} para edição?`
            : `Are you sure you want to reopen ${periodLabel} for editing?`
        }
        confirmText={language === 'pt' ? 'Reabrir' : 'Reopen'}
        onConfirm={async () => {
          if (!currentPeriod) return;
          await unapplyDeductionsFromPayroll(currentPeriod.id);
          await reopenPeriod(currentPeriod.id);
          toast.success(language === 'pt' ? 'Período reaberto para edição' : 'Period reopened for editing');
        }}
      />

      {/* Unarchive Period - requires admin password */}
      <AdminPasswordDialog
        open={unarchiveDialogOpen}
        onOpenChange={setUnarchiveDialogOpen}
        title={language === 'pt' ? 'Desarquivar Período' : 'Unarchive Period'}
        description={
          language === 'pt'
            ? `Tem a certeza que pretende desarquivar ${periodLabel}? O período voltará ao estado "Aprovado".`
            : `Are you sure you want to unarchive ${periodLabel}? The period will return to "Approved" status.`
        }
        warningMessage={
          language === 'pt'
            ? 'Isto irá reverter o arquivamento. Poderá então reabrir para editar ou arquivar novamente.'
            : 'This will revert the archiving. You can then reopen to edit or archive again.'
        }
        confirmText={language === 'pt' ? 'Desarquivar' : 'Unarchive'}
        onConfirm={async () => {
          if (!currentPeriod) return;
          await unarchivePeriod(currentPeriod.id);
          toast.success(language === 'pt' ? 'Período desarquivado com sucesso' : 'Period unarchived successfully');
        }}
      />

      {/* Early Payment Dialog */}
      <EarlyPaymentDialog
        open={earlyPaymentDialogOpen}
        onOpenChange={setEarlyPaymentDialogOpen}
        entry={earlyPaymentEntry}
        employee={earlyPaymentEntry?.employee || null}
        periodLabel={periodLabel}
        companyName={settings.companyName}
        companyNif={settings.nif}
        onConfirm={async (data) => {
          if (!earlyPaymentEntry) return;
          await updateEntry(earlyPaymentEntry.id, {
            paidEarly: true,
            paidEarlyAt: new Date().toISOString(),
            paidEarlyAmount: data.amount,
            paidEarlyReason: data.reason || undefined,
            paidEarlyAuthorizedBy: data.authorizedBy || undefined,
            paidEarlyPaymentMethod: data.paymentMethod || undefined,
          });
          await usePayrollStore.getState().loadPayroll();
          toast.success(language === 'pt' ? 'Pagamento antecipado registado com sucesso' : 'Early payment registered successfully');
          setEarlyPaymentEntry(null);
        }}
      />

      <PayrollOneOffExtraDialog
        open={oneOffExtraDialogOpen}
        onOpenChange={setOneOffExtraDialogOpen}
        entry={oneOffExtraEntry}
        periodLabel={periodLabel}
        readOnly={isHistoricalView}
        onSuccess={() => {
          void usePayrollStore.getState().loadPayroll();
          setOneOffExtraEntry(null);
        }}
      />
    </TopNavLayout>
  );
};

export default Payroll;
