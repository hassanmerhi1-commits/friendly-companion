import { useState, useMemo, useEffect, type ElementType } from 'react';
import { EmployeeSearchSelect } from '@/components/EmployeeSearchSelect';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  History,
  Clock,
  Landmark,
  CreditCard,
  Building2,
  FileCheck,
  ClipboardList,
  Search,
  MapPin,
  Package,
  BarChart3,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useBranchStore } from '@/stores/branch-store';
import { useHolidayStore } from '@/stores/holiday-store';
import { useLoanStore } from '@/stores/loan-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { toast } from 'sonner';
import { formatAOA } from '@/lib/angola-labor-law';
import { buildEmployeeSalaryHistory, buildSalaryComparison } from '@/lib/salary-history';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import { cn } from '@/lib/utils';
import { PrintablePayrollSheet } from '@/components/payroll/PrintablePayrollSheet';
import { PrintableEmployeeReport } from '@/components/reports/PrintableEmployeeReport';
import { PrintableCostAnalysis } from '@/components/reports/PrintableCostAnalysis';
import { PrintableHolidayMap } from '@/components/reports/PrintableHolidayMap';
import { PrintableINSSMap } from '@/components/reports/PrintableINSSMap';
import { PrintableIRTMap } from '@/components/reports/PrintableIRTMap';
import { PrintableHolidayReport } from '@/components/reports/PrintableHolidayReport';
import { PrintableOvertimeReport } from '@/components/reports/PrintableOvertimeReport';
import { PrintableDeductionBalanceReport } from '@/components/reports/PrintableDeductionBalanceReport';
import { PrintableAnnualSummary } from '@/components/reports/PrintableAnnualSummary';
import { PrintableBranchCostAnalysis } from '@/components/reports/PrintableBranchCostAnalysis';
import { PrintableIncomeDeclaration } from '@/components/reports/PrintableIncomeDeclaration';
import { PrintableAuditHistoryReport } from '@/components/reports/PrintableAuditHistoryReport';
import { PrintableBonusReport } from '@/components/reports/PrintableBonusReport';
import { PrintableAttendanceMap } from '@/components/attendance/PrintableAttendanceMap';
import { EmployeeSalaryHistoryReport } from '@/components/reports/EmployeeSalaryHistoryReport';
import { SalaryComparisonReport } from '@/components/reports/SalaryComparisonReport';
import { getPayrollPeriodLabel, MONTH_NAMES_PT } from '@/types/payroll';

type ReportCategory = 'all' | 'fiscal' | 'payroll' | 'hr' | 'attendance' | 'annual';

type ReportType =
  | 'salary'
  | 'employee'
  | 'cost'
  | 'holiday'
  | 'inss'
  | 'irt'
  | 'ferias'
  | 'overtime'
  | 'loans'
  | 'annual'
  | 'branch_cost'
  | 'income_declaration'
  | 'audit_history'
  | 'bonus'
  | 'effectiveness'
  | 'salary_history'
  | 'salary_comparison'
  | 'fiscal_pack'
  | null;

interface ReportDef {
  id: string;
  type: ReportType;
  category: Exclude<ReportCategory, 'all'>;
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  icon: ElementType;
  needsPayroll?: boolean;
  needsEmployees?: boolean;
  needsEmployee?: boolean;
  needsBranch?: boolean;
  hasExcel?: boolean;
}

const REPORT_DEFS: ReportDef[] = [
  { id: 'fiscal_pack', type: 'fiscal_pack', category: 'fiscal', namePt: 'Pacote Fiscal do Mês', nameEn: 'Monthly Fiscal Pack', descPt: 'INSS + IRT + Folha mensal (requer filial)', descEn: 'INSS + IRT + monthly payroll (branch required)', icon: Package, needsPayroll: true, needsBranch: true },
  { id: 'inss', type: 'inss', category: 'fiscal', namePt: 'Mapa de INSS', nameEn: 'INSS Map', descPt: 'Contribuições Segurança Social (3% + 8%)', descEn: 'Social security contributions (3% + 8%)', icon: Landmark, needsPayroll: true },
  { id: 'irt', type: 'irt', category: 'fiscal', namePt: 'Mapa de IRT', nameEn: 'IRT Map', descPt: 'Retenção na fonte — Imposto sobre Rendimentos', descEn: 'Withholding tax — income tax map', icon: FileCheck, needsPayroll: true },
  { id: 'salary', type: 'salary', category: 'payroll', namePt: 'Folha Mensal de Salários', nameEn: 'Monthly Payroll Sheet', descPt: 'Resumo completo da folha do período', descEn: 'Full payroll summary for the period', icon: DollarSign, needsPayroll: true },
  { id: 'cost', type: 'cost', category: 'payroll', namePt: 'Análise de Custos', nameEn: 'Cost Analysis', descPt: 'Custos laborais por departamento', descEn: 'Labor costs by department', icon: TrendingUp, needsPayroll: true },
  { id: 'bonus', type: 'bonus', category: 'payroll', namePt: 'Relatório de Bónus', nameEn: 'Bonus Report', descPt: 'Bónus mensal por funcionário', descEn: 'Monthly bonus by employee', icon: DollarSign, needsPayroll: true },
  { id: 'overtime', type: 'overtime', category: 'payroll', namePt: 'Relatório de Horas Extra', nameEn: 'Overtime Report', descPt: 'HE normal, nocturna e feriado', descEn: 'Normal, night and holiday OT', icon: Clock, needsPayroll: true },
  { id: 'loans', type: 'loans', category: 'payroll', namePt: 'Descontos e Empréstimos', nameEn: 'Deductions & Loans', descPt: 'Saldos, descontado e por descontar — Excel', descEn: 'Balances, deducted, remaining — Excel', icon: CreditCard, hasExcel: true },
  { id: 'branch_cost', type: 'branch_cost', category: 'payroll', namePt: 'Custos por Filial', nameEn: 'Branch Cost Analysis', descPt: 'Distribuição de custos por filial', descEn: 'Cost distribution by branch', icon: Building2, needsPayroll: true },
  { id: 'employee', type: 'employee', category: 'hr', namePt: 'Relatório de Funcionários', nameEn: 'Employee Report', descPt: 'Lista detalhada de funcionários activos', descEn: 'Detailed active employee list', icon: Users, needsEmployees: true },
  { id: 'holiday', type: 'holiday', category: 'hr', namePt: 'Mapa de Férias', nameEn: 'Holiday Map', descPt: 'Calendário e planeamento de férias', descEn: 'Holiday calendar and planning', icon: Calendar, needsEmployees: true },
  { id: 'ferias', type: 'ferias', category: 'hr', namePt: 'Relatório de Férias', nameEn: 'Holiday Report', descPt: 'Saldos e férias gozadas no ano', descEn: 'Balances and taken leave for the year', icon: Calendar, needsEmployees: true },
  { id: 'salary_history', type: 'salary_history', category: 'hr', namePt: 'Histórico Salarial', nameEn: 'Salary History', descPt: 'Histórico financeiro individual (seleccionar funcionário)', descEn: 'Individual financial history (select employee)', icon: History, needsEmployee: true },
  { id: 'salary_comparison', type: 'salary_comparison', category: 'hr', namePt: 'Comparativo Salarial', nameEn: 'Salary Comparison', descPt: 'Evolução salarial ano a ano', descEn: 'Year-over-year salary evolution', icon: BarChart3, needsPayroll: true },
  { id: 'effectiveness', type: 'effectiveness', category: 'attendance', namePt: 'Mapa de Efectividade', nameEn: 'Effectiveness Map', descPt: 'Presenças, faltas, atrasos e taxa de efectividade', descEn: 'Attendance, absences, delays and effectiveness rate', icon: ClipboardCheck, needsEmployees: true },
  { id: 'annual', type: 'annual', category: 'annual', namePt: 'Resumo Anual', nameEn: 'Annual Summary', descPt: 'Remunerações anuais de todos os funcionários', descEn: 'Annual remuneration for all employees', icon: History, needsPayroll: true },
  { id: 'income_declaration', type: 'income_declaration', category: 'annual', namePt: 'Declaração de Rendimentos', nameEn: 'Income Declaration', descPt: 'Declaração fiscal individual', descEn: 'Individual tax income declaration', icon: FileText, needsEmployee: true },
  { id: 'audit_history', type: 'audit_history', category: 'annual', namePt: 'Histórico de Alterações', nameEn: 'Edit History', descPt: 'Auditoria de alterações no sistema', descEn: 'System change audit log', icon: ClipboardList },
];

const STORAGE_KEY = 'payrollao-reports-filters';

export default function Reports() {
  const { t, language } = useLanguage();
  const pt = language === 'pt';
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches: allBranches } = useBranchStore();
  const branches = useMemo(() => allBranches.filter((b) => b.isActive), [allBranches]);
  const { records: holidayRecords, saveRecords } = useHolidayStore();
  const { loans, loadLoans } = useLoanStore();
  const { deductions, loadDeductions } = useDeductionStore();
  const { settings } = useSettingsStore();

  const [openReport, setOpenReport] = useState<ReportType>(null);
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('all');
  const [reportSearch, setReportSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  useEffect(() => {
    void loadDeductions();
    void loadLoans();
  }, [loadDeductions, loadLoans]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { branch?: string; year?: number; month?: number };
      if (saved.branch) setSelectedBranchId(saved.branch);
      if (saved.year) setSelectedYear(saved.year);
      if (saved.month) setSelectedMonth(saved.month);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ branch: selectedBranchId, year: selectedYear, month: selectedMonth })
    );
  }, [selectedBranchId, selectedYear, selectedMonth]);

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    [periods]
  );

  const availableYears = useMemo(() => {
    const years = new Set(periods.map((p) => p.year));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [periods]);

  const monthsInYear = useMemo(
    () =>
      periods
        .filter((p) => p.year === selectedYear)
        .sort((a, b) => b.month - a.month)
        .map((p) => p.month),
    [periods, selectedYear]
  );

  useEffect(() => {
    if (selectedMonth !== null) return;
    const latest = sortedPeriods[0];
    if (latest) {
      setSelectedYear(latest.year);
      setSelectedMonth(latest.month);
    }
  }, [sortedPeriods, selectedMonth]);

  useEffect(() => {
    if (selectedMonth !== null && !monthsInYear.includes(selectedMonth)) {
      setSelectedMonth(monthsInYear[0] ?? null);
    }
  }, [monthsInYear, selectedMonth]);

  const selectedPeriod = useMemo(() => {
    if (selectedMonth === null) return sortedPeriods[0] ?? null;
    return periods.find((p) => p.year === selectedYear && p.month === selectedMonth) ?? null;
  }, [periods, selectedYear, selectedMonth, sortedPeriods]);

  const selectedBranch =
    selectedBranchId !== 'all' ? branches.find((b) => b.id === selectedBranchId) : undefined;

  const filteredEmployees = useMemo(() => {
    let list = employees.filter((e) => e.status === 'active');
    if (selectedBranchId !== 'all') {
      list = list.filter((e) => e.branchId === selectedBranchId);
    }
    return list;
  }, [employees, selectedBranchId]);

  const employeeIdSet = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);

  const entriesWithEmployeeData = useMemo(
    () =>
      entries
        .filter((e) => employeeIdSet.has(e.employeeId))
        .map((e) => ({
          ...e,
          employee: employees.find((emp) => emp.id === e.employeeId),
        })),
    [entries, employeeIdSet, employees]
  );

  const filteredEntries = useMemo(() => {
    let result = entriesWithEmployeeData;
    if (selectedPeriod) {
      result = result.filter((e) => e.payrollPeriodId === selectedPeriod.id);
    }
    if (selectedBranchId !== 'all') {
      result = result.filter((e) => e.employee?.branchId === selectedBranchId);
    }
    return result;
  }, [entriesWithEmployeeData, selectedPeriod, selectedBranchId]);

  const periodTotals = useMemo(
    () =>
      filteredEntries.reduce(
        (acc, e) => ({
          gross: acc.gross + e.grossSalary,
          inss: acc.inss + e.inssEmployee,
          irt: acc.irt + e.irt,
          net: acc.net + e.netSalary,
          employer: acc.employer + e.grossSalary + e.inssEmployer,
        }),
        { gross: 0, inss: 0, irt: 0, net: 0, employer: 0 }
      ),
    [filteredEntries]
  );

  const periodLabel = selectedPeriod
    ? getPayrollPeriodLabel(selectedPeriod.year, selectedPeriod.month)
    : new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });

  const monthNames = pt ? MONTH_NAMES_PT : [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const salaryHistory = useMemo(() => {
    if (!selectedEmployee) return null;
    return buildEmployeeSalaryHistory(selectedEmployee, entries, periods);
  }, [selectedEmployee, entries, periods]);

  const salaryComparisons = useMemo(
    () => buildSalaryComparison(filteredEmployees, entries, periods, selectedYear),
    [filteredEmployees, entries, periods, selectedYear]
  );

  const getReportAvailability = (def: ReportDef): { available: boolean; reason?: string } => {
    if (def.needsPayroll && filteredEntries.length === 0) {
      return {
        available: false,
        reason: pt ? 'Sem folha para este período/filial' : 'No payroll for this period/branch',
      };
    }
    if (def.needsEmployees && filteredEmployees.length === 0) {
      return {
        available: false,
        reason: pt ? 'Sem funcionários activos' : 'No active employees',
      };
    }
    if (def.needsEmployee && !selectedEmployeeId) {
      return {
        available: false,
        reason: pt ? 'Seleccione um funcionário' : 'Select an employee',
      };
    }
    if (def.needsBranch && selectedBranchId === 'all') {
      return {
        available: false,
        reason: pt ? 'Seleccione uma filial' : 'Select a branch',
      };
    }
    if (def.type === 'annual' && entries.length === 0) {
      return { available: false, reason: pt ? 'Sem dados de folha' : 'No payroll data' };
    }
    if (def.type === 'effectiveness' && selectedMonth === null) {
      return { available: false, reason: pt ? 'Seleccione um mês' : 'Select a month' };
    }
    return { available: true };
  };

  const handleOpenReport = (type: ReportType) => {
    const def = REPORT_DEFS.find((r) => r.type === type);
    if (!def) return;

    const { available, reason } = getReportAvailability(def);
    if (!available) {
      toast.error(reason);
      return;
    }

    if (['inss', 'irt', 'fiscal_pack'].includes(type as string)) {
      if (selectedBranchId === 'all') {
        toast.error(pt ? 'Seleccione uma filial para mapas fiscais' : 'Select a branch for fiscal maps');
        return;
      }
      if (selectedPeriod && !['approved', 'paid'].includes(selectedPeriod.status)) {
        toast.warning(
          pt
            ? 'Período ainda não aprovado — confirme antes de submeter'
            : 'Period not yet approved — verify before submitting'
        );
      }
    }

    if (type === 'income_declaration' && !selectedEmployeeId) {
      toast.error(pt ? 'Seleccione um funcionário primeiro' : 'Select an employee first');
      return;
    }

    setOpenReport(type);
  };

  const handleFiscalPack = () => handleOpenReport('fiscal_pack');

  const handleSaveHolidayRecords = (records: typeof holidayRecords) => {
    saveRecords(records);
    toast.success(pt ? 'Registos de férias guardados' : 'Holiday records saved');
  };

  const normalizeSearch = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const visibleReports = useMemo(() => {
    const q = normalizeSearch(reportSearch.trim());
    return REPORT_DEFS.filter((def) => {
      const matchesCategory = activeCategory === 'all' || def.category === activeCategory;
      const name = pt ? def.namePt : def.nameEn;
      const desc = pt ? def.descPt : def.descEn;
      const matchesSearch =
        !q || normalizeSearch(`${name} ${desc}`).includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, reportSearch, pt]);

  const periodStatusLabel = (() => {
    if (!selectedPeriod) return null;
    const map: Record<string, { pt: string; en: string; variant: 'default' | 'secondary' | 'outline' }> = {
      draft: { pt: 'Rascunho', en: 'Draft', variant: 'outline' },
      calculated: { pt: 'Calculado', en: 'Calculated', variant: 'secondary' },
      approved: { pt: 'Aprovado', en: 'Approved', variant: 'default' },
      paid: { pt: 'Pago', en: 'Paid', variant: 'default' },
    };
    const s = map[selectedPeriod.status] ?? map.draft;
    return { label: pt ? s.pt : s.en, variant: s.variant };
  })();

  const labels = {
    title: t.reports.title,
    searchReports: pt ? 'Pesquisar relatório...' : 'Search reports...',
    branch: pt ? 'Filial' : 'Branch',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    year: pt ? 'Ano' : 'Year',
    month: pt ? 'Mês' : 'Month',
    employee: pt ? 'Funcionário' : 'Employee',
    fiscalPack: pt ? 'Pacote Fiscal' : 'Fiscal Pack',
    records: pt ? 'registos' : 'records',
    tabAll: pt ? 'Todos' : 'All',
    tabFiscal: pt ? 'Fiscal' : 'Fiscal',
    tabPayroll: pt ? 'Folha' : 'Payroll',
    tabHr: pt ? 'RH' : 'HR',
    tabAttendance: pt ? 'Presenças' : 'Attendance',
    tabAnnual: pt ? 'Anual' : 'Annual',
    gross: pt ? 'Bruto' : 'Gross',
    net: pt ? 'Líquido' : 'Net',
    employer: pt ? 'Custo Emp.' : 'Employer',
    open: pt ? 'Abrir' : 'Open',
    excel: 'Excel',
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) setOpenReport(null);
  };

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{labels.title}</span>

          <div className="relative flex-1 min-w-[140px] max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={labels.searchReports}
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
            />
          </div>

          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
              <SelectValue placeholder={labels.branch} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allBranches}</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              setSelectedYear(Number(v));
              setSelectedMonth(null);
            }}
          >
            <SelectTrigger className="h-8 w-[90px] text-xs shrink-0">
              <SelectValue placeholder={labels.year} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth?.toString() ?? 'none'}
            onValueChange={(v) => setSelectedMonth(v === 'none' ? null : Number(v))}
            disabled={monthsInYear.length === 0}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs shrink-0">
              <SelectValue placeholder={labels.month} />
            </SelectTrigger>
            <SelectContent>
              {monthsInYear.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {monthNames[m - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="min-w-[160px] max-w-[200px]">
            <EmployeeSearchSelect
              employees={filteredEmployees}
              value={selectedEmployeeId}
              onSelect={setSelectedEmployeeId}
              placeholder={labels.employee}
            />
          </div>

          {periodStatusLabel && (
            <Badge variant={periodStatusLabel.variant} className="text-[10px] shrink-0">
              {periodStatusLabel.label}
            </Badge>
          )}

          <Button
            size="sm"
            className="h-8 text-xs gap-1 ml-auto shrink-0"
            disabled={selectedBranchId === 'all' || filteredEntries.length === 0}
            onClick={handleFiscalPack}
          >
            <Package className="h-3.5 w-3.5" />
            {labels.fiscalPack}
          </Button>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: pt ? 'Funcionários' : 'Employees', value: String(filteredEmployees.length) },
            { label: labels.records, value: String(filteredEntries.length) },
            { label: labels.gross, value: formatAOA(periodTotals.gross) },
            { label: 'INSS', value: formatAOA(periodTotals.inss) },
            { label: 'IRT', value: formatAOA(periodTotals.irt), highlight: true },
            { label: labels.net, value: formatAOA(periodTotals.net), success: true },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/50 bg-card px-3 py-2"
            >
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p
                className={cn(
                  'text-sm font-semibold truncate',
                  kpi.highlight && 'text-primary',
                  kpi.success && 'text-success'
                )}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Category tabs + report grid */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="shrink-0 px-3 py-2 border-b border-border/50 flex flex-wrap items-center gap-2">
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ReportCategory)}>
              <TabsList className="h-8 bg-muted/40 p-0.5">
                {(
                  [
                    ['all', labels.tabAll],
                    ['fiscal', labels.tabFiscal],
                    ['payroll', labels.tabPayroll],
                    ['hr', labels.tabHr],
                    ['attendance', labels.tabAttendance],
                    ['annual', labels.tabAnnual],
                  ] as const
                ).map(([val, label]) => (
                  <TabsTrigger key={val} value={val} className="text-xs h-7 px-2.5">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {visibleReports.length} {pt ? 'relatórios' : 'reports'}
              {selectedPeriod && ` · ${periodLabel}`}
              {selectedBranch && ` · ${selectedBranch.name}`}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {visibleReports.map((def) => {
                const { available, reason } = getReportAvailability(def);
                const name = pt ? def.namePt : def.nameEn;
                const desc = pt ? def.descPt : def.descEn;
                return (
                  <div
                    key={def.id}
                    className={cn(
                      'rounded-lg border border-border/50 p-3 flex gap-3 transition-all',
                      available
                        ? 'hover:border-primary/30 hover:shadow-sm cursor-pointer bg-card'
                        : 'opacity-55 bg-muted/20'
                    )}
                    onClick={() => available && handleOpenReport(def.type)}
                    title={!available ? reason : undefined}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <def.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-xs font-semibold leading-tight">{name}</h3>
                        {def.hasExcel && (
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {labels.excel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>
                      {!available && reason && (
                        <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={openReport === 'salary'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Folha Mensal' : 'Monthly Payroll'} — {periodLabel}</DialogTitle>
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

        <Dialog open={openReport === 'employee'} onOpenChange={handleDialogChange}>
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

        <Dialog open={openReport === 'cost'} onOpenChange={handleDialogChange}>
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

        <Dialog open={openReport === 'holiday'} onOpenChange={handleDialogChange}>
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

        <Dialog open={openReport === 'inss'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Mapa de INSS' : 'INSS Map'} — {periodLabel}</DialogTitle>
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

        <Dialog open={openReport === 'irt'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Mapa de IRT' : 'IRT Map'} — {periodLabel}</DialogTitle>
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

        <Dialog open={openReport === 'fiscal_pack'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {pt ? 'Pacote Fiscal' : 'Fiscal Pack'} — {periodLabel}
                {selectedBranch ? ` · ${selectedBranch.name}` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold mb-2 border-b pb-1">INSS</h3>
                <PrintableINSSMap
                  entries={filteredEntries}
                  periodLabel={periodLabel}
                  companyName={settings.companyName}
                  companyNif={settings.nif}
                  branch={selectedBranch}
                />
              </section>
              <section className="break-before-page">
                <h3 className="text-sm font-semibold mb-2 border-b pb-1">IRT</h3>
                <PrintableIRTMap
                  entries={filteredEntries}
                  periodLabel={periodLabel}
                  companyName={settings.companyName}
                  companyNif={settings.nif}
                  branch={selectedBranch}
                />
              </section>
              <section className="break-before-page">
                <h3 className="text-sm font-semibold mb-2 border-b pb-1">
                  {pt ? 'Folha Mensal' : 'Monthly Payroll'}
                </h3>
                <PrintablePayrollSheet
                  entries={filteredEntries}
                  periodLabel={periodLabel}
                  companyName={settings.companyName}
                  companyNif={settings.nif}
                  branch={selectedBranch}
                />
              </section>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'ferias'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Relatório de Férias' : 'Holiday Report'} — {selectedYear}</DialogTitle>
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

        <Dialog open={openReport === 'overtime'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Horas Extra' : 'Overtime'} — {periodLabel}</DialogTitle>
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

        <Dialog open={openReport === 'loans'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Descontos e Empréstimos' : 'Deductions & Loans'}</DialogTitle>
            </DialogHeader>
            <PrintableDeductionBalanceReport
              employees={filteredEmployees}
              deductions={deductions}
              loans={loans}
              branches={branches}
              companyName={settings.companyName}
              companyNif={settings.nif}
              branch={selectedBranch}
              language={language}
              onClose={() => setOpenReport(null)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'annual'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Resumo Anual' : 'Annual Summary'} — {selectedYear}</DialogTitle>
            </DialogHeader>
            <PrintableAnnualSummary
              employees={filteredEmployees}
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

        <Dialog open={openReport === 'branch_cost'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Custos por Filial' : 'Branch Costs'} — {periodLabel}</DialogTitle>
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

        <Dialog open={openReport === 'income_declaration'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {pt ? 'Declaração de Rendimentos' : 'Income Declaration'} — {selectedYear}
              </DialogTitle>
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

        <Dialog open={openReport === 'audit_history'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {pt ? 'Histórico de Alterações' : 'Edit History'} — {selectedYear}
              </DialogTitle>
            </DialogHeader>
            <PrintableAuditHistoryReport
              companyName={settings.companyName}
              companyNif={settings.nif}
              year={selectedYear}
              onClose={() => setOpenReport(null)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'bonus'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Relatório de Bónus' : 'Bonus Report'} — {periodLabel}</DialogTitle>
            </DialogHeader>
            <PrintableBonusReport
              entries={filteredEntries}
              periodLabel={periodLabel}
              companyName={settings.companyName}
              branchName={selectedBranch?.name}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'effectiveness'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 shrink-0">
              <DialogTitle>
                {pt ? 'Mapa de Efectividade' : 'Effectiveness Map'} —{' '}
                {selectedMonth ? monthNames[selectedMonth - 1] : ''} {selectedYear}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 px-6 pb-6 overflow-hidden">
              {selectedMonth && (
                <PrintableAttendanceMap
                  month={selectedMonth}
                  year={selectedYear}
                  embedded
                  branchFilter={selectedBranchId !== 'all' ? selectedBranchId : undefined}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'salary_history'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Histórico Salarial' : 'Salary History'}</DialogTitle>
            </DialogHeader>
            {salaryHistory && (
              <EmployeeSalaryHistoryReport
                history={salaryHistory}
                companyName={settings.companyName}
                language={language}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={openReport === 'salary_comparison'} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{pt ? 'Comparativo Salarial' : 'Salary Comparison'} — {selectedYear}</DialogTitle>
            </DialogHeader>
            <SalaryComparisonReport
              comparisons={salaryComparisons}
              companyName={settings.companyName}
              year={selectedYear}
              language={language}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TopNavLayout>
  );
}
