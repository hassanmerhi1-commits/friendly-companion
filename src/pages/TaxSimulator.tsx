import { useMemo, useRef, useState } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  RefreshCw,
  Printer,
  DollarSign,
  TrendingDown,
  Building2,
  Wallet,
  Search,
  MapPin,
  Users,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  calculatePayroll,
  formatAOA,
  getIRTTaxableAllowance,
  IRT_BRACKETS,
  IRT_ALLOWANCE_EXEMPTION,
  INSS_RATES,
} from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/employee';

interface SimState {
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  familyAllowance: number;
  holidaySubsidy: number;
  thirteenthMonth: number;
  otherAllowances: number;
  overtimeHoursNormal: number;
  overtimeHoursNight: number;
  overtimeHoursHoliday: number;
  isColaborador: boolean;
  isRetired: boolean;
}

const EMPTY_STATE: SimState = {
  baseSalary: 0,
  mealAllowance: 0,
  transportAllowance: 0,
  familyAllowance: 0,
  holidaySubsidy: 0,
  thirteenthMonth: 0,
  otherAllowances: 0,
  overtimeHoursNormal: 0,
  overtimeHoursNight: 0,
  overtimeHoursHoliday: 0,
  isColaborador: false,
  isRetired: false,
};

function MoneyInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type="number"
          min={0}
          step={100}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="h-8 pr-10 text-right text-xs"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          Kz
        </span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

const normalizeText = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function TaxSimulator() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { employees } = useEmployeeStore();
  const { branches: allBranches } = useBranchStore();
  const branchOptions = useMemo(() => allBranches.filter((b) => b.isActive), [allBranches]);

  const [sim, setSim] = useState<SimState>(EMPTY_STATE);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [contractFilter, setContractFilter] = useState<'all' | 'employee' | 'colaborador'>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: pt ? 'Simulador-IRT' : 'Tax-Simulator',
  });

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status === 'active')
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [employees]
  );

  const departments = useMemo(
    () =>
      [...new Set(activeEmployees.map((e) => e.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [activeEmployees]
  );

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '—';
    const branch = branchOptions.find((b) => b.id === branchId);
    return branch ? branch.name : '—';
  };

  const filteredEmployees = useMemo(() => {
    const q = normalizeText(search);
    const words = q.split(/\s+/).filter(Boolean);
    return activeEmployees.filter((emp) => {
      const empText = normalizeText(
        `${emp.firstName} ${emp.lastName} ${emp.employeeNumber} ${emp.department} ${emp.position} ${emp.nif}`
      );
      const matchesSearch = words.length === 0 || words.every((w) => empText.includes(w));
      const matchesBranch =
        selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
      const matchesDepartment =
        departmentFilter === 'all' ||
        (emp.department || '').toLowerCase().trim() === departmentFilter.toLowerCase().trim();
      const matchesContract =
        contractFilter === 'all'
          ? true
          : contractFilter === 'colaborador'
            ? emp.contractType === 'colaborador'
            : emp.contractType !== 'colaborador';
      return matchesSearch && matchesBranch && matchesDepartment && matchesContract;
    });
  }, [activeEmployees, search, selectedBranchFilter, departmentFilter, contractFilter]);

  const patch = (partial: Partial<SimState>) => setSim((s) => ({ ...s, ...partial }));

  const loadEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setSim({
      baseSalary: emp.baseSalary,
      mealAllowance: emp.mealAllowance,
      transportAllowance: emp.transportAllowance,
      familyAllowance: emp.familyAllowance,
      holidaySubsidy: emp.holidaySubsidy,
      thirteenthMonth: emp.baseSalary,
      otherAllowances: emp.otherAllowances,
      overtimeHoursNormal: 0,
      overtimeHoursNight: 0,
      overtimeHoursHoliday: 0,
      isColaborador: emp.contractType === 'colaborador',
      isRetired: emp.isRetired,
    });
  };

  const clearAll = () => {
    setSim(EMPTY_STATE);
    setSelectedEmployeeId(null);
  };

  const result = useMemo(
    () =>
      calculatePayroll({
        baseSalary: sim.baseSalary,
        mealAllowance: sim.mealAllowance,
        transportAllowance: sim.transportAllowance,
        otherAllowances: sim.otherAllowances,
        familyAllowanceValue: sim.familyAllowance,
        overtimeHoursNormal: sim.overtimeHoursNormal,
        overtimeHoursNight: sim.overtimeHoursNight,
        overtimeHoursHoliday: sim.overtimeHoursHoliday,
        isRetired: sim.isRetired,
        isColaborador: sim.isColaborador,
        thirteenthMonthValue: sim.thirteenthMonth,
        holidaySubsidyValue: sim.holidaySubsidy,
      }),
    [sim]
  );

  const breakdown = useMemo(() => {
    const overtimeTotal =
      result.overtimeNormal + result.overtimeNight + result.overtimeHoliday;
    const taxableMeal = getIRTTaxableAllowance(sim.mealAllowance);
    const taxableTransport = getIRTTaxableAllowance(sim.transportAllowance);
    const inssBase =
      sim.baseSalary +
      sim.transportAllowance +
      sim.mealAllowance +
      result.thirteenthMonth +
      sim.familyAllowance +
      overtimeTotal +
      sim.otherAllowances;
    const irtTaxableGross =
      sim.baseSalary +
      taxableTransport +
      taxableMeal +
      result.thirteenthMonth +
      result.holidaySubsidy +
      overtimeTotal +
      sim.otherAllowances;
    const rendimentoColetavel = irtTaxableGross - result.inssEmployee;
    const currentBracket = IRT_BRACKETS.find(
      (b) => rendimentoColetavel >= b.min && rendimentoColetavel <= b.max
    );
    const escalaoIndex = currentBracket ? IRT_BRACKETS.indexOf(currentBracket) + 1 : 1;
    return {
      overtimeTotal,
      taxableMeal,
      taxableTransport,
      inssBase,
      irtTaxableGross,
      rendimentoColetavel,
      currentBracket,
      escalaoIndex,
    };
  }, [sim, result]);

  const inssRateLabel = sim.isColaborador
    ? '—'
    : sim.isRetired
      ? `${INSS_RATES.RETIRED_EMPLOYEE_RATE * 100}%`
      : `${INSS_RATES.EMPLOYEE_RATE * 100}%`;

  const t = {
    title: pt ? 'Simulador IRT' : 'Tax Simulator',
    subtitle: pt ? 'Grupo A — empregados (mesma lógica da Folha)' : 'Group A — employees (same logic as Payroll)',
    search: pt ? 'Nome, nº, NIF...' : 'Name, no., NIF...',
    branch: pt ? 'Filial' : 'Branch',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    department: pt ? 'Departamento' : 'Department',
    allDepartments: pt ? 'Todos' : 'All',
    contract: pt ? 'Contrato' : 'Contract',
    allContracts: pt ? 'Todos' : 'All',
    employeesOnly: pt ? 'Empregados' : 'Employees',
    colaboradoresOnly: pt ? 'Colaboradores' : 'Collaborators',
    pickEmployee: pt ? 'Seleccionar funcionário' : 'Select employee',
    manualMode: pt ? 'Modo manual' : 'Manual mode',
    noEmployees: pt ? 'Nenhum funcionário encontrado' : 'No employees found',
    clear: pt ? 'Limpar' : 'Clear',
    print: pt ? 'Imprimir' : 'Print',
    gross: pt ? 'Bruto' : 'Gross',
    inss: pt ? 'INSS' : 'INSS',
    irt: pt ? 'IRT' : 'IRT',
    net: pt ? 'Líquido' : 'Net',
    employerCost: pt ? 'Custo Empresa' : 'Employer Cost',
    taxToPay: pt ? 'Imposto a Pagar' : 'Tax Due',
    expectedNet: pt ? 'Líquido Previsto' : 'Expected Net',
    inputs: pt ? 'Dados do Simulador' : 'Simulator Inputs',
    baseSalary: pt ? 'Salário Base' : 'Base Salary',
    meal: pt ? 'Subsídio Alimentação' : 'Meal Allowance',
    transport: pt ? 'Subsídio Transporte' : 'Transport Allowance',
    family: pt ? 'Abono de Família' : 'Family Allowance',
    holiday: pt ? 'Subsídio de Férias' : 'Holiday Subsidy',
    natal: pt ? 'Subsídio de Natal' : '13th Month',
    other: pt ? 'Outros Subsídios' : 'Other Allowances',
    overtime: pt ? 'Horas Extra' : 'Overtime',
    heNormal: pt ? 'HE Normal (h)' : 'Normal OT (h)',
    heNight: pt ? 'HE Nocturna (h)' : 'Night OT (h)',
    heHoliday: pt ? 'HE Feriado (h)' : 'Holiday OT (h)',
    colaborador: pt ? 'Colaborador (sem INSS)' : 'Collaborator (no INSS)',
    retired: pt ? 'Reformado (INSS 8%)' : 'Retired (INSS 8%)',
    irtExempt: pt ? 'Isento de IRT (até 150.000 Kz)' : 'IRT exempt (up to 150,000 Kz)',
    details: pt ? 'Detalhes do Cálculo' : 'Calculation Details',
    inssBase: pt ? 'Base INSS' : 'INSS Base',
    inssNote: pt ? 'Não inclui: Subsídio de Férias' : 'Excludes: Holiday subsidy',
    irtBase: pt ? 'Base IRT (Rendimento Coletável)' : 'IRT Base (Taxable Income)',
    irtNote: pt
      ? `Alimentação/Transporte: isento até ${formatAOA(IRT_ALLOWANCE_EXEMPTION)} • Sem Abono`
      : `Meal/Transport: exempt up to ${formatAOA(IRT_ALLOWANCE_EXEMPTION)} • No family allowance`,
    irtBracket: pt ? 'Cálculo IRT' : 'IRT Calculation',
    escalao: pt ? 'Escalão' : 'Bracket',
    fixedPart: pt ? 'Parcela Fixa' : 'Fixed Amount',
    excess: pt ? 'Excesso de' : 'Excess over',
    rate: pt ? 'Taxa' : 'Rate',
    irtTable: pt ? 'Tabela IRT (Vigente)' : 'IRT Table (Current)',
    groupA: pt ? 'Grupo A' : 'Group A',
    employerInss: pt ? 'INSS Patronal (8%)' : 'Employer INSS (8%)',
    mealIrtHint: pt ? 'IRT: só excesso acima de 30.000' : 'IRT: excess above 30,000 only',
    transportIrtHint: pt ? 'IRT: só excesso acima de 30.000' : 'IRT: excess above 30,000 only',
    familyIrtHint: pt ? 'Isento de IRT' : 'IRT exempt',
    holidayInssHint: pt ? 'Não entra na base INSS' : 'Not in INSS base',
  };

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId) ?? null;

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <Calculator className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{t.title}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {t.groupA}
          </Badge>

          <div className="relative flex-1 min-w-[140px] max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
              <SelectValue placeholder={t.branch} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allBranches}</SelectItem>
              {branchOptions.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.code ? ` (${branch.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs shrink-0">
              <SelectValue placeholder={t.department} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allDepartments}</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={contractFilter}
            onValueChange={(v) => setContractFilter(v as typeof contractFilter)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs shrink-0">
              <SelectValue placeholder={t.contract} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allContracts}</SelectItem>
              <SelectItem value="employee">{t.employeesOnly}</SelectItem>
              <SelectItem value="colaborador">{t.colaboradoresOnly}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            <span className="font-medium text-foreground">{filteredEmployees.length}</span>
          </div>

          <div className="flex gap-1.5 ml-auto shrink-0">
            {selectedEmployeeId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedEmployeeId(null)}
              >
                {t.manualMode}
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handlePrint()}>
              <Printer className="h-3.5 w-3.5" />
              {t.print}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={clearAll}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t.clear}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { icon: DollarSign, label: t.gross, value: formatAOA(result.grossSalary) },
            {
              icon: TrendingDown,
              label: `${t.inss} (${inssRateLabel})`,
              value: sim.isColaborador ? '—' : formatAOA(result.inssEmployee),
            },
            { icon: Calculator, label: t.irt, value: formatAOA(result.irt), highlight: true },
            { icon: Wallet, label: t.net, value: formatAOA(result.netSalary), success: true },
            {
              icon: Building2,
              label: t.employerCost,
              value: formatAOA(result.totalEmployerCost),
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/50 bg-card px-3 py-2 flex items-center gap-2"
            >
              <kpi.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                <p
                  className={`text-sm font-semibold truncate ${
                    kpi.highlight ? 'text-primary' : kpi.success ? 'text-success' : ''
                  }`}
                >
                  {kpi.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Body: employee list + simulator */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-2 overflow-hidden">
          {/* Employee picker */}
          <div className="flex flex-col min-h-0 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30">
              <p className="text-xs font-medium">{t.pickEmployee}</p>
              <p className="text-[10px] text-muted-foreground">
                {filteredEmployees.length} {pt ? 'funcionários' : 'employees'}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">{t.noEmployees}</p>
              ) : (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => loadEmployee(emp)}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors',
                      selectedEmployeeId === emp.id && 'bg-primary/10 border-l-2 border-l-primary'
                    )}
                  >
                    <p className="text-xs font-medium truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {emp.employeeNumber || '—'} · {getBranchName(emp.branchId)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {emp.department} · {formatAOA(emp.baseSalary)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-4">
            {/* Inputs */}
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">{t.inputs}</h2>

              <MoneyInput
                id="baseSalary"
                label={t.baseSalary}
                value={sim.baseSalary}
                onChange={(v) => patch({ baseSalary: v })}
              />

              <div className="grid grid-cols-2 gap-3">
                <MoneyInput
                  id="meal"
                  label={t.meal}
                  value={sim.mealAllowance}
                  onChange={(v) => patch({ mealAllowance: v })}
                  hint={t.mealIrtHint}
                />
                <MoneyInput
                  id="transport"
                  label={t.transport}
                  value={sim.transportAllowance}
                  onChange={(v) => patch({ transportAllowance: v })}
                  hint={t.transportIrtHint}
                />
                <MoneyInput
                  id="family"
                  label={t.family}
                  value={sim.familyAllowance}
                  onChange={(v) => patch({ familyAllowance: v })}
                  hint={t.familyIrtHint}
                />
                <MoneyInput
                  id="holiday"
                  label={t.holiday}
                  value={sim.holidaySubsidy}
                  onChange={(v) => patch({ holidaySubsidy: v })}
                  hint={t.holidayInssHint}
                />
                <MoneyInput
                  id="natal"
                  label={t.natal}
                  value={sim.thirteenthMonth}
                  onChange={(v) => patch({ thirteenthMonth: v })}
                />
                <MoneyInput
                  id="other"
                  label={t.other}
                  value={sim.otherAllowances}
                  onChange={(v) => patch({ otherAllowances: v })}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{t.overtime}</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <MoneyInput
                    id="heNormal"
                    label={t.heNormal}
                    value={sim.overtimeHoursNormal}
                    onChange={(v) => patch({ overtimeHoursNormal: v })}
                  />
                  <MoneyInput
                    id="heNight"
                    label={t.heNight}
                    value={sim.overtimeHoursNight}
                    onChange={(v) => patch({ overtimeHoursNight: v })}
                  />
                  <MoneyInput
                    id="heHoliday"
                    label={t.heHoliday}
                    value={sim.overtimeHoursHoliday}
                    onChange={(v) => patch({ overtimeHoursHoliday: v })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="colaborador"
                    checked={sim.isColaborador}
                    onCheckedChange={(v) => patch({ isColaborador: v })}
                  />
                  <Label htmlFor="colaborador" className="text-xs cursor-pointer">
                    {t.colaborador}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="retired"
                    checked={sim.isRetired}
                    disabled={sim.isColaborador}
                    onCheckedChange={(v) => patch({ isRetired: v })}
                  />
                  <Label htmlFor="retired" className="text-xs cursor-pointer">
                    {t.retired}
                  </Label>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30 p-4 shadow-sm">
                <div className="text-center mb-4">
                  <p className="text-xs text-muted-foreground">{t.taxToPay}</p>
                  <p className="text-3xl font-bold text-primary mt-1">{formatAOA(result.irt)}</p>
                  {selectedEmployee && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-xs">
                      {t.inss} ({inssRateLabel})
                    </span>
                    <span className="font-medium text-xs">
                      {sim.isColaborador ? '—' : formatAOA(result.inssEmployee)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-xs">{t.employerInss}</span>
                    <span className="font-medium text-xs">
                      {sim.isColaborador ? '—' : formatAOA(result.inssEmployer)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground text-xs">{t.expectedNet}</span>
                    <span className="font-semibold text-success text-xs">{formatAOA(result.netSalary)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold">{t.details}</h3>

                <div className="p-2.5 bg-muted/40 rounded-lg space-y-1 text-xs">
                  <p className="font-medium">{t.inssBase}</p>
                  <p className="text-[10px] text-muted-foreground">{t.inssNote}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>= Base</span>
                    <span>{formatAOA(breakdown.inssBase)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-destructive">
                    <span>{t.inss}</span>
                    <span>-{sim.isColaborador ? '—' : formatAOA(result.inssEmployee)}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-muted/40 rounded-lg space-y-1 text-xs">
                  <p className="font-medium">{t.irtBase}</p>
                  <p className="text-[10px] text-muted-foreground">{t.irtNote}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>= Tributável bruto</span>
                    <span>{formatAOA(breakdown.irtTaxableGross)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>- {t.inss}</span>
                    <span>-{sim.isColaborador ? '—' : formatAOA(result.inssEmployee)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-border/50 pt-1">
                    <span>= Rend. Colectável</span>
                    <span>{formatAOA(breakdown.rendimentoColetavel)}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 space-y-1 text-xs">
                  <p className="font-medium">
                    {t.irtBracket} — {breakdown.escalaoIndex}º {t.escalao}
                  </p>
                  {breakdown.currentBracket && breakdown.rendimentoColetavel > 150_000 ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t.fixedPart}</span>
                        <span>{formatAOA(breakdown.currentBracket.fixedAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          {t.excess} {formatAOA(breakdown.currentBracket.excessOver)}
                        </span>
                        <span>
                          {formatAOA(breakdown.rendimentoColetavel - breakdown.currentBracket.excessOver)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t.rate}</span>
                        <span>{(breakdown.currentBracket.rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between font-medium text-primary border-t border-primary/20 pt-1">
                        <span>{t.irt}</span>
                        <span>{formatAOA(result.irt)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-success font-medium">{t.irtExempt}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">{t.irtTable}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5">{t.escalao}</th>
                        <th className="text-right py-1.5">{pt ? 'Até' : 'Up to'}</th>
                        <th className="text-right py-1.5">{t.fixedPart}</th>
                        <th className="text-right py-1.5">{t.rate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IRT_BRACKETS.map((bracket, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-border/30 ${
                            idx + 1 === breakdown.escalaoIndex ? 'bg-primary/10 font-medium' : ''
                          }`}
                        >
                          <td className="py-1">{idx + 1}º</td>
                          <td className="text-right py-1">
                            {bracket.max === Infinity ? '∞' : formatAOA(bracket.max)}
                          </td>
                          <td className="text-right py-1">{formatAOA(bracket.fixedAmount)}</td>
                          <td className="text-right py-1">
                            {bracket.rate === 0 ? (pt ? 'Isento' : 'Exempt') : `${(bracket.rate * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Print layout */}
        <div className="hidden">
          <div ref={printRef} className="p-8 text-black bg-white text-sm">
            <h1 className="text-xl font-bold mb-1">{t.title}</h1>
            <p className="text-gray-600 mb-4">{t.subtitle}</p>
            {selectedEmployee && (
              <p className="mb-4">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </p>
            )}
            <table className="w-full mb-6 text-xs">
              <tbody>
                <tr>
                  <td className="py-1">{t.gross}</td>
                  <td className="text-right font-medium">{formatAOA(result.grossSalary)}</td>
                </tr>
                <tr>
                  <td className="py-1">{t.inss}</td>
                  <td className="text-right">{sim.isColaborador ? '—' : formatAOA(result.inssEmployee)}</td>
                </tr>
                <tr>
                  <td className="py-1">{t.irt}</td>
                  <td className="text-right font-bold">{formatAOA(result.irt)}</td>
                </tr>
                <tr>
                  <td className="py-1">{t.net}</td>
                  <td className="text-right font-bold">{formatAOA(result.netSalary)}</td>
                </tr>
                <tr>
                  <td className="py-1">{t.employerCost}</td>
                  <td className="text-right">{formatAOA(result.totalEmployerCost)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500">
              {breakdown.escalaoIndex}º {t.escalao} — Rend. Colectável: {formatAOA(breakdown.rendimentoColetavel)}
            </p>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}
