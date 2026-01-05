import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Calendar, TrendingUp, Users, DollarSign, History } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useBranchStore } from "@/stores/branch-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import { PrintableEmployeeReport } from "@/components/reports/PrintableEmployeeReport";
import { PrintableCostAnalysis } from "@/components/reports/PrintableCostAnalysis";
import { PrintableHolidayMap } from "@/components/reports/PrintableHolidayMap";
import { getPayrollPeriodLabel } from "@/types/payroll";

type ReportType = 'salary' | 'employee' | 'cost' | 'holiday' | null;

const Reports = () => {
  const { t, language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches: allBranches } = useBranchStore();
  // Derive active branches from subscribed state - ensures re-render on changes
  const branches = allBranches.filter(b => b.isActive);
  const { records: holidayRecords, saveRecords } = useHolidayStore();
  const { settings } = useSettingsStore();
  const [openReport, setOpenReport] = useState<ReportType>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('latest');

  const handleSaveHolidayRecords = (records: typeof holidayRecords) => {
    saveRecords(records);
    toast.success(language === 'pt' ? 'Registos de férias guardados' : 'Holiday records saved');
  };

  const selectedBranch = selectedBranchId !== 'all' ? branches.find(b => b.id === selectedBranchId) : undefined;
  
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
    if (type === 'salary' || type === 'cost') {
      if (filteredEntries.length === 0) {
        toast.error(language === 'pt' ? 'Nenhum processamento salarial encontrado para este período/filial.' : 'No payroll data found for this period/branch.');
        return;
      }
    }
    if (type === 'employee' || type === 'holiday') {
      if (filteredEmployees.length === 0) {
        toast.error(language === 'pt' ? 'Nenhum funcionário registado.' : 'No employees registered.');
        return;
      }
    }
    setOpenReport(type);
  };

  const reports = [
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

  const stats = {
    employees: filteredEmployees.length,
    activeEmployees: filteredEmployees.filter(e => e.status === 'active').length,
    branches: branches.length,
    payrollPeriods: periods.length
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.reports.title}</h1>
          <p className="text-muted-foreground mt-1">{t.reports.subtitle}</p>
        </div>
      </div>

      {/* Period and Branch Selection */}
      <div className="stat-card mb-6 animate-fade-in">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Period/Date Selection */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <History className="h-4 w-4" />
              {language === 'pt' ? 'Período / Histórico' : 'Period / History'}
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
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium mb-2 block">
              {language === 'pt' ? 'Seleccionar Filial' : 'Select Branch'}
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
                    {branch.name} ({branch.code}) - {branch.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Info display */}
          <div className="text-sm text-muted-foreground">
            {selectedPeriod && (
              <p><strong>{language === 'pt' ? 'Período' : 'Period'}:</strong> {periodLabel}</p>
            )}
            {selectedBranch && (
              <p><strong>{language === 'pt' ? 'Filial' : 'Branch'}:</strong> {selectedBranch.name}, {selectedBranch.city}</p>
            )}
            <p className="text-xs mt-1">
              {filteredEntries.length} {language === 'pt' ? 'registos encontrados' : 'records found'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div 
            key={report.id} 
            className={`stat-card animate-slide-up hover:shadow-lg cursor-pointer group transition-all duration-200 ${!report.available ? 'opacity-60' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleOpenReport(report.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${report.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {report.available 
                      ? (language === 'pt' ? 'Clique para imprimir' : 'Click to print')
                      : (language === 'pt' ? 'Sem dados disponíveis' : 'No data available')
                    }
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={!report.available}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
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
    </MainLayout>
  );
};

export default Reports;
