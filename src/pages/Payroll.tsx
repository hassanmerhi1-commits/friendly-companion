import { useState } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calculator, FileDown, Send, DollarSign, TrendingUp, Clock, CheckCircle, Receipt, Printer, Gift, UserX, Umbrella, RotateCcw, Archive, Building2, Unlock, Users, HandCoins } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useDeductionStore } from "@/stores/deduction-store";
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
import { formatAOA } from "@/lib/angola-labor-law";
import { exportPayrollToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import type { PayrollEntry } from "@/types/payroll";

const Payroll = () => {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuthStore();
  const { periods, entries, generateEntriesForPeriod, approvePeriod, reopenPeriod, archivePeriod, unarchivePeriod, updateEntry, createPeriod, toggle13thMonth, toggleHolidaySubsidy, updateAbsences, updateOvertime } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const deductionStore = useDeductionStore();
  const { getPendingDeductions, applyDeductionToPayroll, unapplyDeductionsFromPayroll, getTotalPendingByEmployee } = deductionStore;
  const { branches: allBranches } = useBranchStore();
  // Derive active branches and employees from subscribed state - ensures re-render on changes
  const branches = allBranches.filter(b => b.isActive);
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const { settings } = useSettingsStore();
  const { records: holidayRecords, markSubsidyPaid } = useHolidayStore();
  const absenceStore = useAbsenceStore();
  const bulkAttendanceStore = useBulkAttendanceStore();
  const { calculateDeductionForEmployee, getPendingAbsences } = absenceStore;
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
  const regularEntries = currentEntries.filter(e => !isColaboradorEntry(e));
  const colaboradorEntries = currentEntries.filter(e => isColaboradorEntry(e));

  // Filter entries by branch for payroll sheet (REGULAR only)
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
  }), { gross: 0, deductions: 0, net: 0 });

  // Calculate months worked for an employee
  const getMonthsWorked = (hireDate: string): number => {
    const hire = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    return Math.min(Math.max(months, 0), 12); // Cap at 12 months
  };

  const handleCalculate = async () => {
    if (activeEmployees.length === 0) {
      toast.error(language === 'pt' ? 'Adicione funcionários primeiro' : 'Add employees first');
      return;
    }

    // PROTECTION: Block calculation on approved/paid periods
    if (currentPeriod && (currentPeriod.status === 'approved' || currentPeriod.status === 'paid')) {
      toast.error(
        language === 'pt' 
          ? 'Não é possível recalcular um período aprovado/pago. Use "Reabrir" primeiro.'
          : 'Cannot recalculate an approved/paid period. Use "Reopen" first.'
      );
      return;
    }
    
    // Get or create period for current month
    const period = await getOrCreateCurrentPeriod();
    
    // Pass absence store, deduction store and bulk attendance store to integrate calculations
    // Bulk attendance takes priority for absence/delay deductions (uses FULL salary including bonuses)
    await generateEntriesForPeriod(period.id, activeEmployees, holidayRecords, absenceStore, deductionStore, bulkAttendanceStore);
    
    // IMPORTANT: Get fresh entries from the store AFTER generation completes
    // The store.entries is now updated via loadPayroll() inside generateEntriesForPeriod
    const freshStore = usePayrollStore.getState();
    const freshEntries = freshStore.entries.filter(e => e.payrollPeriodId === period.id);
    
     // Mark subsidy as paid (deductions are only marked as applied on APPROVAL)
     for (const entry of freshEntries) {
       // If holiday subsidy was added, mark it as paid
       if (entry.holidaySubsidy > 0) {
         const nextMonth = period.month === 12 ? 1 : period.month + 1;
         const nextMonthYear = period.month === 12 ? period.year + 1 : period.year;
         await markSubsidyPaid(entry.employeeId, nextMonthYear, period.month, period.year);
       }
     }
    
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
    if (!currentPeriod) return;

    // First approve period (history)
    await approvePeriod(currentPeriod.id);

    // Then mark deductions as applied to THIS payroll period
    const periodEnd = currentPeriod.endDate;
    for (const entry of currentEntries) {
      const pending = getPendingDeductions(entry.employeeId).filter((d) => !periodEnd || !d.date || d.date <= periodEnd);
      for (const d of pending) {
        await applyDeductionToPayroll(d.id, currentPeriod.id);
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
    <TopNavLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.payroll.title}</h1>
          <p className="text-muted-foreground mt-1">
            {periodLabel} • {t.payroll.paymentPeriod}
            {isHistoricalView && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                ({language === 'pt' ? 'Visualização histórica' : 'Historical view'})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} disabled={currentEntries.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            {t.export.excel}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (!selectedBranchId) {
                toast.error(language === 'pt' ? 'Selecione uma filial primeiro' : 'Select a branch first');
                return;
              }
              setPrintSheetOpen(true);
            }} 
            disabled={currentEntries.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Imprimir Folha' : 'Print Sheet'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setBatchReceiptOpen(true)} 
            disabled={currentEntries.length === 0}
          >
            <Receipt className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Recibos em Lote' : 'Batch Receipts'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setBankExportOpen(true)} 
            disabled={currentEntries.length === 0}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Ficheiro Banco' : 'Bank File'}
          </Button>
        </div>
      </div>

      {/* Period History Selector */}
      {sortedPeriods.length > 0 && (
        <div className="stat-card mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === 'pt' ? 'Histórico de Períodos' : 'Period History'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'pt' 
                  ? 'Seleccione um período para ver dados guardados' 
                  : 'Select a period to view saved data'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label>{language === 'pt' ? 'Período:' : 'Period:'}</Label>
              <Select 
                value={selectedPeriodId || currentPeriod?.id || ''} 
                onValueChange={(v) => {
                  // Selecting the active period should behave like "Current" (no explicit selection)
                  if (activePeriod && v === activePeriod.id) {
                    setSelectedPeriodId('');
                    return;
                  }
                  setSelectedPeriodId(v);
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder={language === 'pt' ? 'Período actual' : 'Current period'} />
                </SelectTrigger>
                <SelectContent>
                  {sortedPeriods.map(period => (
                    <SelectItem key={period.id} value={period.id}>
                      <div className="flex items-center gap-2">
                        <span>{monthNames[period.month - 1]} {period.year}</span>
                        {getStatusBadge(period.status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isViewingSelectedPeriod && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPeriodId('')}
              >
                {language === 'pt' ? 'Voltar ao Actual' : 'Back to Current'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Ausências button - always visible */}
      <div className="stat-card mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h3 className="font-semibold text-foreground">
              {language === 'pt' ? 'Gerar Folha Salarial' : 'Generate Payroll'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'pt' 
                ? 'Ausências e descontos pendentes serão incluídos automaticamente.' 
                : 'Absences and pending deductions will be included automatically.'}
            </p>
          </div>
          {/* Calculate button only when not viewing historical data */}
          {!isHistoricalView && (
            <Button variant="accent" onClick={handleCalculate}>
              <Calculator className="h-4 w-4 mr-2" />
              {t.payroll.calculatePayroll}
            </Button>
          )}
          {/* Ausências button always visible */}
          <Button variant="outline" onClick={() => setAbsenceDialogOpen(true)}>
            <UserX className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Ausências' : 'Absences'}
            {pendingAbsences.length > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingAbsences.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Branch and Warehouse Selection for Print */}
      <div className="stat-card mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <h3 className="font-semibold text-foreground">
            {language === 'pt' ? 'Dados da Folha Salarial' : 'Payroll Sheet Details'}
          </h3>
          <div className="flex items-center gap-2">
            <Label>{language === 'pt' ? 'Filial:' : 'Branch:'}</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={language === 'pt' ? 'Selecionar filial' : 'Select branch'} />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>{language === 'pt' ? 'Armazém:' : 'Warehouse:'}</Label>
            <Input 
              value={warehouseName} 
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder={language === 'pt' ? 'Nome do armazém' : 'Warehouse name'}
              className="w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Bonus Sheet by Branch */}
      <div className="stat-card mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" />
            {language === 'pt' ? 'Folha de Bónus por Filial' : 'Bonus Sheet by Branch'}
          </h3>
          <div className="flex items-center gap-2">
            <Label>{language === 'pt' ? 'Selecionar Filial:' : 'Select Branch:'}</Label>
            <Select value={bonusBranchId} onValueChange={setBonusBranchId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={language === 'pt' ? 'Escolher filial' : 'Choose branch'} />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="accent" 
            onClick={() => setPrintBonusSheetOpen(true)} 
            disabled={!bonusBranchId || bonusSheetEntries.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Imprimir Folha de Bónus' : 'Print Bonus Sheet'}
          </Button>
          {bonusBranchId && (
            <span className="text-sm text-muted-foreground">
              {bonusSheetEntries.length} {language === 'pt' ? 'funcionários' : 'employees'}
            </span>
          )}
        </div>
      </div>

      {/* Colaboradores Sheet by Branch */}
      {colaboradorEntries.length > 0 && (
        <div className="stat-card mb-6 border-amber-500/30">
          <div className="flex flex-wrap items-center gap-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              {language === 'pt' ? 'Folha de Colaboradores por Filial' : 'Collaborators Sheet by Branch'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              {language === 'pt' ? 'Sem INSS / Sem IRT' : 'No INSS / No IRT'}
            </span>
            <div className="flex items-center gap-2">
              <Label>{language === 'pt' ? 'Selecionar Filial:' : 'Select Branch:'}</Label>
              <Select value={colaboradorBranchId} onValueChange={setColaboradorBranchId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={language === 'pt' ? 'Escolher filial' : 'Choose branch'} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="accent" 
              onClick={() => setPrintColaboradorSheetOpen(true)} 
              disabled={!colaboradorBranchId || colaboradorSheetEntries.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Imprimir Folha Colaboradores' : 'Print Collaborators Sheet'}
            </Button>
            {colaboradorBranchId && (
              <span className="text-sm text-muted-foreground">
                {colaboradorSheetEntries.length} {language === 'pt' ? 'colaboradores' : 'collaborators'}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              ({colaboradorEntries.length} {language === 'pt' ? 'total colaboradores' : 'total collaborators'})
            </span>
          </div>
        </div>
      )}

      {/* Stats based on filtered entries when branch is selected */}
      {(() => {
        const displayEntries = selectedBranchId ? payrollSheetEntries : regularEntries;
        const displayTotals = displayEntries.reduce((acc, e) => ({
          gross: acc.gross + e.grossSalary,
          deductions: acc.deductions + e.totalDeductions,
          net: acc.net + (e.paidEarly ? 0 : e.netSalary),
        }), { gross: 0, deductions: 0, net: 0 });
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title={t.payroll.grossSalaries} value={formatAOA(displayTotals.gross)} icon={DollarSign} variant="accent" delay={0} />
            <StatCard title={t.payroll.totalDeductions} value={formatAOA(displayTotals.deductions)} subtitle="IRT + INSS" icon={TrendingUp} delay={50} />
            <StatCard title={t.payroll.netSalaries} value={formatAOA(displayTotals.net)} icon={CheckCircle} delay={100} />
            <StatCard title={t.employees.title} value={String(displayEntries.length)} icon={Clock} delay={150} />
          </div>
        );
      })()}

      {regularEntries.length > 0 && (
        <div className="stat-card p-0 overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">{t.payroll.employeeDetails}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t.employees.employee}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.employees.baseSalary}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{language === 'pt' ? 'H. Extra' : 'Overtime'}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{language === 'pt' ? 'Faltas' : 'Absences'}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{language === 'pt' ? 'Sub. Férias' : 'Holiday'}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{language === 'pt' ? 'Sub. Natal' : '13th'}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.gross}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.irt}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.inss}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.net}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Show only entries for selected branch, or all if no branch selected */}
                {(selectedBranchId ? payrollSheetEntries : regularEntries).map(entry => {
                  const totalOvertimeHours = (entry.overtimeHoursNormal || 0) + (entry.overtimeHoursNight || 0) + (entry.overtimeHoursHoliday || 0);
                  const totalOvertimeValue = (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0);
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-3 py-3 font-medium">{entry.employee?.firstName} {entry.employee?.lastName}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{formatAOA(entry.baseSalary)}</td>
                      <td className="px-3 py-3 text-right">
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
                      <td className="px-3 py-3 text-right">
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
                      <td className="px-3 py-3 text-right">
                        {!isHistoricalView ? (
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
                              if (value !== entry.holidaySubsidy) {
                                handleUpdateHolidaySubsidy(entry, value);
                              }
                            }}
                            className="w-24 text-right font-mono text-sm h-7"
                            placeholder={formatAOA(Math.round(entry.baseSalary * 0.5))}
                            title={language === 'pt' 
                              ? `Mínimo: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% do salário base)` 
                              : `Minimum: ${formatAOA(Math.round(entry.baseSalary * 0.5))} (50% of base salary)`}
                          />
                        ) : (
                          <span className="font-mono text-sm">{formatAOA(entry.holidaySubsidy)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
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
                      <td className="px-3 py-3 text-right font-mono text-sm">{formatAOA(entry.grossSalary)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-destructive">{formatAOA(entry.irt)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-destructive">{formatAOA(entry.inssEmployee)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-primary">
                        {entry.paidEarly ? (
                          <span className="flex items-center justify-end gap-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              {language === 'pt' ? 'Pago Antecip.' : 'Paid Early'}
                            </span>
                            <span className="line-through text-muted-foreground">{formatAOA(entry.netSalary)}</span>
                            <span>{formatAOA(0)}</span>
                          </span>
                        ) : (
                          formatAOA(entry.netSalary)
                        )}
                      </td>
                      <td className="px-3 py-3 text-right flex items-center justify-end gap-1">
                        {!isHistoricalView && (
                          <Button 
                            variant={entry.paidEarly ? "destructive" : "outline"} 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                            onClick={async () => {
                              if (entry.paidEarly) {
                                // Remove early payment flag directly
                                await updateEntry(entry.id, { paidEarly: false });
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve section - only show when not viewing historical data */}
      {!isHistoricalView && currentEntries.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{t.payroll.readyToProcess}</h3>
              <p className="text-sm text-muted-foreground">
                {language === 'pt' 
                  ? 'Após aprovação, os dados ficam guardados no histórico. Pode reabrir para editar e aprovar novamente.' 
                  : 'After approval, data is saved in history. You can reopen it to edit and approve again.'}
              </p>
            </div>
            <Button variant="accent" size="lg" onClick={handleApprove}>
              <Send className="h-4 w-4 mr-2" />
              {t.payroll.approveAndProcess}
            </Button>
          </div>
        </div>
      )}

       {/* Historical view info */}
       {isHistoricalView && currentEntries.length > 0 && (
         <div className="stat-card border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
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
        onConfirm={async () => {
          if (!earlyPaymentEntry) return;
          await updateEntry(earlyPaymentEntry.id, { paidEarly: true });
          await usePayrollStore.getState().loadPayroll();
          toast.success(language === 'pt' ? 'Pagamento antecipado registado com sucesso' : 'Early payment registered successfully');
          setEarlyPaymentEntry(null);
        }}
      />
    </TopNavLayout>
  );
};

export default Payroll;
