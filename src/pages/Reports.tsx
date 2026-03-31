import { useState, useMemo } from "react";
import { EmployeeSearchSelect } from "@/components/EmployeeSearchSelect";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Calendar, TrendingUp, Users, DollarSign, History, Clock, Landmark, CreditCard, Building2, FileCheck, ClipboardList } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useBranchStore } from "@/stores/branch-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useLoanStore } from "@/stores/loan-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import { PrintableEmployeeReport } from "@/components/reports/PrintableEmployeeReport";
import { PrintableCostAnalysis } from "@/components/reports/PrintableCostAnalysis";
import { PrintableHolidayMap } from "@/components/reports/PrintableHolidayMap";
import { PrintableINSSMap } from "@/components/reports/PrintableINSSMap";
import { PrintableIRTMap } from "@/components/reports/PrintableIRTMap";
import { PrintableHolidayReport } from "@/components/reports/PrintableHolidayReport";
import { PrintableOvertimeReport } from "@/components/reports/PrintableOvertimeReport";
import { PrintableLoanReport } from "@/components/reports/PrintableLoanReport";
import { PrintableAnnualSummary } from "@/components/reports/PrintableAnnualSummary";
import { PrintableBranchCostAnalysis } from "@/components/reports/PrintableBranchCostAnalysis";
import { PrintableIncomeDeclaration } from "@/components/reports/PrintableIncomeDeclaration";
import { PrintableAuditHistoryReport } from "@/components/reports/PrintableAuditHistoryReport";
import { PrintableBonusReport } from "@/components/reports/PrintableBonusReport";
import { getPayrollPeriodLabel } from "@/types/payroll";

type ReportType = 'salary' | 'employee' | 'cost' | 'holiday' | 'inss' | 'irt' | 'ferias' | 'overtime' | 'loans' | 'annual' | 'branch_cost' | 'income_declaration' | 'audit_history' | null;

const Reports = () => {
  const { t, language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches: allBranches } = useBranchStore();
  const branches = allBranches.filter(b => b.isActive);
  const { records: holidayRecords, saveRecords } = useHolidayStore();
  const { loans } = useLoanStore();
  const { settings } = useSettingsStore();
  const [openReport, setOpenReport] = useState<ReportType>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('latest');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const handleSaveHolidayRecords = (records: typeof holidayRecords) => {
    saveRecords(records);
    toast.success(language === 'pt' ? 'Registos de férias guardados' : 'Holiday records saved');
  };

  const selectedBranch = selectedBranchId !== 'all' ? branches.find(b => b.id === selectedBranchId) : undefined;
  
  // Get available years from periods
  const availableYears = useMemo(() => {
    const years = new Set(periods.map(p => p.year));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [periods]);
  
  // Sort periods by date (newest first) for the dropdown
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [periods]);

  // Get selected period - either specific or latest
  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId === 'latest') {
      return sortedPeriods[0] || null;
    }
    return periods.find(p => p.id === selectedPeriodId) || null;
  }, [selectedPeriodId, sortedPeriods, periods]);

  // Filter employees by branch
  const filteredEmployees = selectedBranchId === 'all'
    ? employees
    : employees.filter(e => e.branchId === selectedBranchId);

  // Always hide payroll entries for employees that no longer exist
  // and attach employee data to each entry for printing
  const employeeIdSet = new Set(employees.map(e => e.id));
  const entriesWithEmployeeData = entries
    .filter(e => employeeIdSet.has(e.employeeId))
    .map(e => ({
      ...e,
      employee: employees.find(emp => emp.id === e.employeeId)
    }));

  // Filter entries by BOTH period AND branch
  const filteredEntries = useMemo(() => {
    let result = entriesWithEmployeeData;
    
    // Filter by period
    if (selectedPeriod) {
      result = result.filter(e => e.payrollPeriodId === selectedPeriod.id);
    }
    
    // Filter by branch
    if (selectedBranchId !== 'all') {
      result = result.filter(e => e.employee?.branchId === selectedBranchId);
    }
    
    return result;
  }, [entriesWithEmployeeData, selectedPeriod, selectedBranchId]);

  const periodLabel = selectedPeriod 
    ? getPayrollPeriodLabel(selectedPeriod.year, selectedPeriod.month)
    : new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  const handleOpenReport = (type: ReportType) => {
    // Validate data availability based on report type
    if (['salary', 'cost', 'inss', 'irt', 'overtime'].includes(type as string)) {
      if (filteredEntries.length === 0) {
        toast.error(language === 'pt' ? 'Nenhum processamento salarial encontrado para este período/filial.' : 'No payroll data found for this period/branch.');
        return;
      }
    }
    if (['employee', 'holiday', 'ferias'].includes(type as string)) {
      if (filteredEmployees.length === 0) {
        toast.error(language === 'pt' ? 'Nenhum funcionário registado.' : 'No employees registered.');
        return;
      }
    }
    if (type === 'income_declaration' && !selectedEmployeeId) {
      toast.error(language === 'pt' ? 'Seleccione um funcionário primeiro.' : 'Select an employee first.');
      return;
    }
    setOpenReport(type);
  };

  // Primary reports (existing)
  const primaryReports = [
    { 
      id: "1", 
      type: 'salary' as ReportType,
      name: t.reports.monthlySalaryReport, 
      description: t.reports.monthlySalaryDesc, 
      icon: DollarSign, 
      color: 'bg-blue-500',
      available: filteredEntries.length > 0
    },
    { 
      id: "2", 
      type: 'employee' as ReportType,
      name: t.reports.employeeReport, 
      description: t.reports.employeeReportDesc, 
      icon: Users, 
      color: 'bg-emerald-500',
      available: filteredEmployees.length > 0
    },
    { 
      id: "3", 
      type: 'cost' as ReportType,
      name: t.reports.costAnalysis, 
      description: t.reports.costAnalysisDesc, 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      available: filteredEntries.length > 0
    },
    { 
      id: "4", 
      type: 'holiday' as ReportType,
      name: t.reports.holidayMap, 
      description: t.reports.holidayMapDesc, 
      icon: Calendar, 
      color: 'bg-green-500',
      available: filteredEmployees.length > 0
    },
  ];

  // New fiscal/compliance reports
  const fiscalReports = [
    { 
      id: "5", 
      type: 'inss' as ReportType,
      name: 'Mapa de INSS', 
      description: 'Relatório mensal de contribuições para a Segurança Social', 
      icon: Landmark, 
      color: 'bg-orange-500',
      available: filteredEntries.length > 0
    },
    { 
      id: "6", 
      type: 'irt' as ReportType,
      name: 'Mapa de IRT', 
      description: 'Mapa de retenção na fonte do Imposto sobre Rendimentos do Trabalho', 
      icon: FileCheck, 
      color: 'bg-red-500',
      available: filteredEntries.length > 0
    },
  ];

  // HR/Operational reports
  const hrReports = [
    { 
      id: "7", 
      type: 'ferias' as ReportType,
      name: 'Relatório de Férias', 
      description: 'Controlo de férias anuais, saldos e planeamento', 
      icon: Calendar, 
      color: 'bg-teal-500',
      available: filteredEmployees.length > 0
    },
    { 
      id: "8", 
      type: 'overtime' as ReportType,
      name: 'Relatório de Horas Extra', 
      description: 'Detalhamento de horas extraordinárias por tipo', 
      icon: Clock, 
      color: 'bg-indigo-500',
      available: filteredEntries.length > 0
    },
    { 
      id: "9", 
      type: 'loans' as ReportType,
      name: 'Relatório de Empréstimos', 
      description: 'Empréstimos e adiantamentos activos e histórico', 
      icon: CreditCard, 
      color: 'bg-pink-500',
      available: true
    },
    { 
      id: "10", 
      type: 'branch_cost' as ReportType,
      name: 'Análise de Custos por Filial', 
      description: 'Distribuição de custos salariais por filial/localização', 
      icon: Building2, 
      color: 'bg-cyan-500',
      available: filteredEntries.length > 0 && branches.length > 0
    },
  ];

  // Annual/Tax reports
  const annualReports = [
    { 
      id: "11", 
      type: 'annual' as ReportType,
      name: 'Resumo Anual', 
      description: 'Resumo anual de remunerações de todos os funcionários', 
      icon: History, 
      color: 'bg-amber-500',
      available: entries.length > 0
    },
    { 
      id: "12", 
      type: 'income_declaration' as ReportType,
      name: 'Declaração de Rendimentos', 
      description: 'Declaração anual de rendimentos individual para fins fiscais', 
      icon: FileText, 
      color: 'bg-slate-500',
      available: employees.length > 0
    },
    { 
      id: "13", 
      type: 'audit_history' as ReportType,
      name: language === 'pt' ? 'Histórico de Alterações' : 'Edit History', 
      description: language === 'pt' ? 'Relatório completo de todas as alterações feitas no sistema' : 'Complete report of all system changes', 
      icon: ClipboardList, 
      color: 'bg-violet-500',
      available: true
    },
  ];

  const stats = {
    employees: filteredEmployees.length,
    activeEmployees: filteredEmployees.filter(e => e.status === 'active').length,
    branches: branches.length,
    payrollPeriods: periods.length
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  return (
    <TopNavLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.reports.title}</h1>
          <p className="text-muted-foreground mt-1">{t.reports.subtitle}</p>
        </div>
      </div>

      {/* Period, Branch, and Year Selection */}
      <div className="stat-card mb-6 animate-fade-in">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Period/Date Selection */}
          <div className="flex-1 min-w-[180px]">
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <History className="h-4 w-4" />
              {language === 'pt' ? 'Período' : 'Period'}
            </Label>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'pt' ? 'Seleccionar período' : 'Select period'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  {language === 'pt' ? 'Período Mais Recente' : 'Latest Period'}
                </SelectItem>
                {sortedPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {getPayrollPeriodLabel(period.year, period.month)} 
                    {period.status === 'approved' && ' ✓'}
                    {period.status === 'paid' && ' 💰'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Branch Selection */}
          <div className="flex-1 min-w-[180px]">
            <Label className="text-sm font-medium mb-2 block">
              {language === 'pt' ? 'Filial' : 'Branch'}
            </Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'pt' ? 'Todas as filiais' : 'All branches'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === 'pt' ? 'Todas as Filiais' : 'All Branches'}
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selection (for annual reports) */}
          <div className="min-w-[120px]">
            <Label className="text-sm font-medium mb-2 block">
              {language === 'pt' ? 'Ano' : 'Year'}
            </Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection (for income declaration) */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium mb-2 block">
              {language === 'pt' ? 'Funcionário (Declaração)' : 'Employee (Declaration)'}
            </Label>
            <EmployeeSearchSelect
              employees={employees}
              value={selectedEmployeeId}
              onSelect={setSelectedEmployeeId}
            />
          </div>
          
          {/* Info display */}
          <div className="text-sm text-muted-foreground">
            <p className="text-xs">
              {filteredEntries.length} {language === 'pt' ? 'registos' : 'records'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Reports */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {language === 'pt' ? 'Relatórios Principais' : 'Primary Reports'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {primaryReports.map((report, index) => (
          <div 
            key={report.id} 
            className={`stat-card animate-slide-up hover:shadow-lg cursor-pointer group transition-all duration-200 ${!report.available ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleOpenReport(report.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fiscal/Compliance Reports */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {language === 'pt' ? 'Relatórios Fiscais (INSS/IRT)' : 'Fiscal Reports (INSS/IRT)'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {fiscalReports.map((report, index) => (
          <div 
            key={report.id} 
            className={`stat-card animate-slide-up hover:shadow-lg cursor-pointer group transition-all duration-200 ${!report.available ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleOpenReport(report.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* HR/Operational Reports */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {language === 'pt' ? 'Relatórios de RH/Operacionais' : 'HR/Operational Reports'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {hrReports.map((report, index) => (
          <div 
            key={report.id} 
            className={`stat-card animate-slide-up hover:shadow-lg cursor-pointer group transition-all duration-200 ${!report.available ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleOpenReport(report.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Annual/Tax Reports */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {language === 'pt' ? 'Relatórios Anuais/Fiscais' : 'Annual/Tax Reports'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {annualReports.map((report, index) => (
          <div 
            key={report.id} 
            className={`stat-card animate-slide-up hover:shadow-lg cursor-pointer group transition-all duration-200 ${!report.available ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleOpenReport(report.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">{t.reports.quickStats}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: language === 'pt' ? 'Total Funcionários' : 'Total Employees', value: String(stats.employees) },
            { label: language === 'pt' ? 'Funcionários Activos' : 'Active Employees', value: String(stats.activeEmployees) },
            { label: language === 'pt' ? 'Filiais' : 'Branches', value: String(stats.branches) },
            { label: language === 'pt' ? 'Períodos Processados' : 'Processed Periods', value: String(stats.payrollPeriods) },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Report Dialog */}
      <Dialog open={openReport === 'salary'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t.reports.monthlySalaryReport}</DialogTitle>
          </DialogHeader>
          <PrintablePayrollSheet
            entries={filteredEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
          />
        </DialogContent>
      </Dialog>

      {/* Employee Report Dialog */}
      <Dialog open={openReport === 'employee'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t.reports.employeeReport}</DialogTitle>
          </DialogHeader>
          <PrintableEmployeeReport
            employees={filteredEmployees}
            branches={branches}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Cost Analysis Dialog */}
      <Dialog open={openReport === 'cost'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t.reports.costAnalysis}</DialogTitle>
          </DialogHeader>
          <PrintableCostAnalysis
            entries={filteredEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Holiday Map Dialog */}
      <Dialog open={openReport === 'holiday'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t.reports.holidayMap}</DialogTitle>
          </DialogHeader>
          <PrintableHolidayMap
            employees={filteredEmployees}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            holidayRecords={holidayRecords}
            onSaveRecords={handleSaveHolidayRecords}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* INSS Map Dialog */}
      <Dialog open={openReport === 'inss'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Mapa de INSS</DialogTitle>
          </DialogHeader>
          <PrintableINSSMap
            entries={filteredEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* IRT Map Dialog */}
      <Dialog open={openReport === 'irt'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Mapa de IRT</DialogTitle>
          </DialogHeader>
          <PrintableIRTMap
            entries={filteredEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Holiday Report Dialog */}
      <Dialog open={openReport === 'ferias'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Férias</DialogTitle>
          </DialogHeader>
          <PrintableHolidayReport
            employees={filteredEmployees}
            holidayRecords={holidayRecords}
            year={selectedYear}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Overtime Report Dialog */}
      <Dialog open={openReport === 'overtime'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Horas Extra</DialogTitle>
          </DialogHeader>
          <PrintableOvertimeReport
            entries={filteredEntries}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Loan Report Dialog */}
      <Dialog open={openReport === 'loans'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Empréstimos</DialogTitle>
          </DialogHeader>
          <PrintableLoanReport
            employees={employees}
            loans={loans}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Annual Summary Dialog */}
      <Dialog open={openReport === 'annual'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Resumo Anual - {selectedYear}</DialogTitle>
          </DialogHeader>
          <PrintableAnnualSummary
            employees={employees}
            entries={entries}
            periods={periods}
            year={selectedYear}
            companyName={settings.companyName}
            companyNif={settings.nif}
            branch={selectedBranch}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Branch Cost Analysis Dialog */}
      <Dialog open={openReport === 'branch_cost'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Análise de Custos por Filial</DialogTitle>
          </DialogHeader>
          <PrintableBranchCostAnalysis
            entries={filteredEntries}
            employees={employees}
            branches={branches}
            periodLabel={periodLabel}
            companyName={settings.companyName}
            companyNif={settings.nif}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Income Declaration Dialog */}
      <Dialog open={openReport === 'income_declaration'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Declaração de Rendimentos - {selectedYear}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <PrintableIncomeDeclaration
              employee={selectedEmployee}
              entries={entries}
              periods={periods}
              year={selectedYear}
              companyName={settings.companyName}
              companyNif={settings.nif}
              onClose={() => setOpenReport(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Audit History Report Dialog */}
      <Dialog open={openReport === 'audit_history'} onOpenChange={() => setOpenReport(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Histórico de Alterações' : 'Edit History'} — {selectedYear}</DialogTitle>
          </DialogHeader>
          <PrintableAuditHistoryReport
            companyName={settings.companyName}
            companyNif={settings.nif}
            year={selectedYear}
            onClose={() => setOpenReport(null)}
          />
        </DialogContent>
      </Dialog>
    </TopNavLayout>
  );
};

export default Reports;
