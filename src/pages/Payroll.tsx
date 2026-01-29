import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calculator, FileDown, Send, DollarSign, TrendingUp, Clock, CheckCircle, Receipt, Printer, Gift, UserX, Umbrella, RotateCcw, Archive } from "lucide-react";
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
import { SalaryReceipt } from "@/components/payroll/SalaryReceipt";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import { PrintableBonusSheet } from "@/components/payroll/PrintableBonusSheet";
import { OvertimeAbsenceDialog } from "@/components/payroll/OvertimeAbsenceDialog";
import { AbsenceDialog } from "@/components/payroll/AbsenceDialog";
import { BatchReceiptPrinter } from "@/components/payroll/BatchReceiptPrinter";
import { formatAOA } from "@/lib/angola-labor-law";
import { exportPayrollToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import type { PayrollEntry } from "@/types/payroll";

const Payroll = () => {
  const { t, language } = useLanguage();
  const { periods, entries, generateEntriesForPeriod, approvePeriod, reopenPeriod, archivePeriod, updateEntry, createPeriod, toggle13thMonth, toggleHolidaySubsidy, updateAbsences, updateOvertime } = usePayrollStore();
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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  const pendingAbsences = getPendingAbsences();
  const headquarters = branches.find(b => b.isHeadquarters) || branches[0];
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || headquarters;
  const bonusBranch = branches.find(b => b.id === bonusBranchId);

  // Sort periods by date (newest first)
  const sortedPeriods = [...periods].sort((a, b) => {
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
  
  // Helper to get or create current period
  const getOrCreateCurrentPeriod = async () => {
    let period = currentPeriod;

    // If we already have an active editable period, use it
    if (period && (period.status === 'draft' || period.status === 'calculated')) {
      return period;
    }

    // If we don't have an active period (common after archiving), create the NEXT month
    // relative to the latest existing period (usually the one just archived).
    const latest = sortedPeriods[0];
    const now = new Date();

    const baseYear = latest?.year ?? now.getFullYear();
    const baseMonth = latest?.month ?? (now.getMonth() + 1);

    const targetMonth = baseMonth === 12 ? 1 : baseMonth + 1;
    const targetYear = baseMonth === 12 ? baseYear + 1 : baseYear;

    const existing = periods.find(p => p.year === targetYear && p.month === targetMonth);
    period = existing ?? (await createPeriod(targetYear, targetMonth));
    return period;
  };

  // Filter entries by branch for payroll sheet
  const payrollSheetEntries = selectedBranchId 
    ? currentEntries
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
    : currentEntries;

  // Filter entries by branch for bonus sheet - check both entry.employee.branchId and current employee branchId
  const bonusSheetEntries = bonusBranchId 
    ? currentEntries
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
  
  const totals = currentEntries.reduce((acc, e) => ({
    gross: acc.gross + e.grossSalary,
    deductions: acc.deductions + e.totalDeductions,
    net: acc.net + e.netSalary,
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
    
    // Pass absence store and deduction store to integrate calculations
    await generateEntriesForPeriod(period.id, activeEmployees, holidayRecords, absenceStore, deductionStore);
    
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
    <MainLayout>
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

      {/* Calculate Payroll Button - hidden when viewing historical data */}
      {!isHistoricalView && (
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
            <Button variant="accent" onClick={handleCalculate}>
              <Calculator className="h-4 w-4 mr-2" />
              {t.payroll.calculatePayroll}
            </Button>
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
      )}

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

      {/* Stats based on filtered entries when branch is selected */}
      {(() => {
        const displayEntries = selectedBranchId ? payrollSheetEntries : currentEntries;
        const displayTotals = displayEntries.reduce((acc, e) => ({
          gross: acc.gross + e.grossSalary,
          deductions: acc.deductions + e.totalDeductions,
          net: acc.net + e.netSalary,
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

      {currentEntries.length > 0 && (
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
                {(selectedBranchId ? payrollSheetEntries : currentEntries).map(entry => {
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
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatAOA(entry.holidaySubsidy)}</span>
                          {!isHistoricalView && (
                            <Button 
                              variant={entry.holidaySubsidy > 0 ? "default" : "outline"} 
                              size="sm"
                              onClick={() => handleToggleHolidaySubsidy(entry)}
                              className="h-6 px-2 text-xs"
                              title={language === 'pt' ? '50% do salário base' : '50% of base salary'}
                            >
                              {entry.holidaySubsidy > 0 ? '✓' : '+'}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatAOA(entry.thirteenthMonth)}</span>
                          {!isHistoricalView && (
                            <Button 
                              variant={entry.thirteenthMonth > 0 ? "default" : "outline"} 
                              size="sm"
                              onClick={() => handleToggle13thMonth(entry)}
                              className="h-6 px-2 text-xs"
                              title={language === 'pt' 
                                ? `${entry.employee?.hireDate ? getMonthsWorked(entry.employee.hireDate) : 12} meses trabalhados` 
                                : `${entry.employee?.hireDate ? getMonthsWorked(entry.employee.hireDate) : 12} months worked`}
                            >
                              {entry.thirteenthMonth > 0 ? '✓' : '+'}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{formatAOA(entry.grossSalary)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-destructive">{formatAOA(entry.irt)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-destructive">{formatAOA(entry.inssEmployee)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-primary">{formatAOA(entry.netSalary)}</td>
                      <td className="px-3 py-3 text-right">
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
               
               {/* Archive button - only show for approved (not yet paid/archived) */}
               {currentPeriod?.status === 'approved' && (
                 <Button
                   variant="accent"
                   size="sm"
                   onClick={async () => {
                     if (!currentPeriod) return;
                     try {
                       const result = await archivePeriod(currentPeriod.id, deductionStore, absenceStore);
                       toast.success(
                         language === 'pt' 
                           ? `Mês arquivado! ${result.archivedDeductions} descontos removidos, ${result.installmentsCarried} prestações continuadas.`
                           : `Month archived! ${result.archivedDeductions} deductions removed, ${result.installmentsCarried} installments carried.`
                       );

                        // After archiving, return to "Current" view so user can generate the next month
                        setSelectedPeriodId('');
                     } catch (error: any) {
                       toast.error(error.message || (language === 'pt' ? 'Erro ao arquivar' : 'Error archiving'));
                     }
                   }}
                 >
                   <Archive className="h-4 w-4 mr-2" />
                   {language === 'pt' ? 'Arquivar Mês' : 'Archive Month'}
                 </Button>
               )}

               {/* Reopen button - only show for approved (not paid/archived) */}
               {currentPeriod?.status === 'approved' && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={async () => {
                     if (!currentPeriod) return;
                     // Unapply all deductions linked to this period so they become pending again
                     await unapplyDeductionsFromPayroll(currentPeriod.id);
                     await reopenPeriod(currentPeriod.id);
                     toast.success(language === 'pt' ? 'Período reaberto para edição' : 'Period reopened for editing');
                   }}
                 >
                   <RotateCcw className="h-4 w-4 mr-2" />
                   {language === 'pt' ? 'Reabrir para editar' : 'Reopen to edit'}
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
    </MainLayout>
  );
};

export default Payroll;
