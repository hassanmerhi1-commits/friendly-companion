import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EmployeeSearchSelect } from "@/components/EmployeeSearchSelect";
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { calculatePayroll, formatAOA } from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import type { Deduction, DeductionType, DeductionFormData } from '@/types/deduction';
import { Wallet, Package, Plus, Trash2, CheckCircle, Pencil, Search, Info, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { useAuthStore } from '@/stores/auth-store';
import { DeductionFormDialog } from '@/components/deductions/DeductionFormDialog';
import { formatPeriodLabel } from '@/lib/salary-advance-scheduling';
import { buildSelectablePayrollMonths } from '@/lib/payroll-period-options';

const WAREHOUSE_LOSS_MAX_RATE = 0.25;

export default function Deductions() {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuthStore();
  const { deductions, updateDeduction, deleteDeduction } = useDeductionStore();
  const { periods } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const { branches: allBranches } = useBranchStore();
  const activeBranches = allBranches.filter(b => b.isActive);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [manualOverride, setManualOverride] = useState(false);
  const [formData, setFormData] = useState<DeductionFormData>({
    employeeId: '',
    type: 'salary_advance',
    description: '',
    totalAmount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  });

  const filteredDeductions = useMemo(() => {
    let result = deductions;
    if (filterType !== 'all') result = result.filter(d => d.type === filterType);
    if (filterStatus === 'pending' || filterStatus === 'in_progress') {
      result = result.filter(d => !d.isFullyPaid);
    }
    if (filterStatus === 'paid') result = result.filter(d => d.isFullyPaid);
    if (filterEmployee !== 'all') result = result.filter(d => d.employeeId === filterEmployee);
    if (filterBranch !== 'all') {
      result = result.filter(d => {
        const emp = employees.find(e => e.id === d.employeeId);
        return emp?.branchId === filterBranch;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => {
        const emp = employees.find(e => e.id === d.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
        return empName.includes(q) || (d.description || '').toLowerCase().includes(q);
      });
    }
    return result;
  }, [deductions, filterType, filterStatus, filterEmployee, filterBranch, searchQuery, employees]);

  const pendingDeductions = deductions.filter(d => !d.isFullyPaid);
  const totalPending = pendingDeductions.reduce((sum, d) => sum + d.remainingAmount, 0);

  const getEmployeeNetSalary = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return 0;

    const result = calculatePayroll({
      baseSalary: employee.baseSalary,
      mealAllowance: employee.mealAllowance,
      transportAllowance: employee.transportAllowance,
      otherAllowances: (employee.otherAllowances || 0) + (employee.monthlyBonus || 0),
      familyAllowanceValue: employee.familyAllowance || 0,
      isRetired: employee.isRetired,
      isColaborador: employee.contractType === 'colaborador',
    });

    return result.netSalary;
  };

  const isWarehouseLoss = formData.type === 'warehouse_loss';

  const employeeNetSalary = useMemo(
    () => (formData.employeeId ? getEmployeeNetSalary(formData.employeeId) : 0),
    [formData.employeeId, employees]
  );

  const warehouseLossMaxMonthly = useMemo(
    () => Math.round(employeeNetSalary * WAREHOUSE_LOSS_MAX_RATE),
    [employeeNetSalary]
  );

  useEffect(() => {
    if (!isEditDialogOpen) return;
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0 && formData.totalAmount > 0) {
      const autoInstallments = Math.max(1, Math.ceil(formData.totalAmount / warehouseLossMaxMonthly));
      if (formData.installments !== autoInstallments) {
        setFormData(prev => ({ ...prev, installments: autoInstallments }));
      }
    }
  }, [
    isEditDialogOpen,
    isWarehouseLoss,
    manualOverride,
    warehouseLossMaxMonthly,
    formData.totalAmount,
    formData.installments,
  ]);

  const monthlyAmount = (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0)
    ? warehouseLossMaxMonthly
    : (formData.installments > 0 ? formData.totalAmount / formData.installments : formData.totalAmount);

  const exceedsLimit = isWarehouseLoss
    && manualOverride
    && formData.installments > 0
    && warehouseLossMaxMonthly > 0
    && (formData.totalAmount / formData.installments) > warehouseLossMaxMonthly;

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'salary_advance',
      description: '',
      totalAmount: 0,
      date: new Date().toISOString().split('T')[0],
      installments: 1,
    });
    setManualOverride(false);
  };

  const handleOpenAddDeduction = () => {
    if (!hasPermission('deductions.create')) {
      toast.error(language === 'pt' ? 'Sem permissão para criar deduções' : 'No permission to create deductions');
      return;
    }
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (deduction: Deduction) => {
    if (!hasPermission('deductions.edit')) {
      toast.error(language === 'pt' ? 'Sem permissão para editar deduções' : 'No permission to edit deductions');
      return;
    }
    setEditingDeduction(deduction);
    setFormData({
      employeeId: deduction.employeeId,
      type: deduction.type,
      description: deduction.description,
      totalAmount: deduction.totalAmount,
      date: deduction.date,
      installments: deduction.installments || 1,
      deductFromPeriodId: deduction.deductFromPeriodId,
    });

    if (deduction.type === 'warehouse_loss') {
      setManualOverride(Boolean(deduction.ignoreWarehouseCap));
    } else {
      setManualOverride(false);
    }

    setIsEditDialogOpen(true);
  };

  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;
    if (!formData.totalAmount || !formData.description) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    
    const normalizedInstallments = (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0)
      ? Math.max(1, Math.ceil(formData.totalAmount / warehouseLossMaxMonthly))
      : Math.max(1, formData.installments);

    const newMonthlyAmount = (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0)
      ? warehouseLossMaxMonthly
      : formData.totalAmount / normalizedInstallments;

    const newRemainingAmount = formData.totalAmount - (editingDeduction.installmentsPaid * newMonthlyAmount);
    
    const patch: Partial<Deduction> = {
      employeeId: formData.employeeId,
      type: formData.type as DeductionType,
      description: formData.description,
      totalAmount: formData.totalAmount,
      amount: newMonthlyAmount,
      date: formData.date,
      installments: normalizedInstallments,
      remainingAmount: Math.max(0, newRemainingAmount),
      isFullyPaid: newRemainingAmount <= 0,
      ignoreWarehouseCap: isWarehouseLoss && manualOverride,
    };
    if (editingDeduction.installmentsPaid === 0 && !editingDeduction.isApplied) {
      patch.deductFromPeriodId = formData.deductFromPeriodId || undefined;
    }
    await updateDeduction(editingDeduction.id, patch);
    setIsEditDialogOpen(false);
    setEditingDeduction(null);
    resetForm();
    toast.success(language === 'pt' ? 'Desconto actualizado com sucesso!' : 'Deduction updated successfully!');
  };

  const handleDelete = (deduction: Deduction) => {
    if (!hasPermission('deductions.delete')) {
      toast.error(language === 'pt' ? 'Sem permissão para eliminar deduções' : 'No permission to delete deductions');
      return;
    }
    deleteDeduction(deduction.id);
    toast.success(language === 'pt' ? 'Desconto removido' : 'Deduction removed');
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const monthNames = language === 'pt'
    ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getPeriodLabel = (periodId?: string) =>
    formatPeriodLabel(periodId, periods, monthNames);

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '—';
    return allBranches.find((b) => b.id === branchId)?.name ?? '—';
  };

  const formatDeductionDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'dd/MM/yyyy', { locale: pt });
  };

  const getAppliedPeriodLabel = (deduction: Deduction) => {
    if (deduction.payrollPeriodId) {
      const label = getPeriodLabel(deduction.payrollPeriodId);
      if (
        label &&
        deduction.installmentsPaid > 0 &&
        !deduction.isFullyPaid &&
        deduction.installments > 1
      ) {
        return language === 'pt' ? `Últ.: ${label}` : `Last: ${label}`;
      }
      return label || '—';
    }
    if (deduction.deductFromPeriodId && deduction.installmentsPaid === 0) {
      const start = getPeriodLabel(deduction.deductFromPeriodId);
      return language === 'pt' ? `Início: ${start}` : `Starts: ${start}`;
    }
    if (deduction.installmentsPaid > 0) {
      return language === 'pt' ? 'Parcial' : 'Partial';
    }
    return language === 'pt' ? 'Pendente' : 'Pending';
  };

  const selectablePayrollMonths = useMemo(
    () => buildSelectablePayrollMonths(periods, monthNames),
    [periods, monthNames]
  );

  /** Actions pinned left — visible without horizontal scroll on small screens */
  const actionsHeadClass =
    'sticky left-0 z-20 w-[76px] min-w-[76px] max-w-[76px] border-r bg-muted text-center shadow-[4px_0_12px_-10px_rgba(0,0,0,0.12)]';
  const actionsCellClass =
    'sticky left-0 z-10 w-[76px] min-w-[76px] max-w-[76px] border-r bg-background text-center shadow-[4px_0_8px_-8px_rgba(0,0,0,0.08)] group-hover:bg-muted/50';
  const tableCompactClass =
    'w-full table-fixed text-sm [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2';

  const ptLang = language === 'pt';
  const addDeductionLabel = ptLang ? 'Novo Desconto' : 'New Deduction';

  const listStats = useMemo(
    () => ({
      totalPending,
      advances: deductions.filter((d) => d.type === 'salary_advance' && !d.isFullyPaid).length,
      warehouse: deductions.filter((d) => d.type === 'warehouse_loss' && !d.isFullyPaid).length,
      completed: deductions.filter((d) => d.isFullyPaid).length,
      showing: filteredDeductions.length,
    }),
    [deductions, totalPending, filteredDeductions.length]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterType !== 'all' ||
    filterStatus !== 'pending' ||
    filterEmployee !== 'all' ||
    filterBranch !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('pending');
    setFilterEmployee('all');
    setFilterBranch('all');
  };

  const deductionTypes: { value: DeductionType; icon: typeof Wallet }[] = [
    { value: 'salary_advance', icon: Wallet },
    { value: 'warehouse_loss', icon: Package },
    { value: 'unjustified_absence', icon: Wallet },
    { value: 'disciplinary', icon: Wallet },
    { value: 'other', icon: Wallet },
  ];

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  // Inline form fields
  const deductionFormFields = (
    <div className="grid gap-4 py-4">
      {/* Searchable Employee Combobox */}
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Funcionário *' : 'Employee *'}</Label>
        <EmployeeSearchSelect
          employees={activeEmployees}
          value={formData.employeeId}
          onSelect={(id) => setFormData(prev => ({ ...prev, employeeId: id }))}
          disabled={!!editingDeduction}
        />
      </div>
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Tipo de Desconto *' : 'Deduction Type *'}</Label>
        <Select 
          value={formData.type} 
          onValueChange={(v) => {
            setFormData(prev => ({ ...prev, type: v as DeductionType }));
            setManualOverride(false);
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {deductionTypes.map(({ value }) => (
              <SelectItem key={value} value={value}>
                {getDeductionTypeLabel(value, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2", !(isWarehouseLoss && formData.employeeId) && "hidden")}>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Info className="h-4 w-4" />
          {language === 'pt' ? 'Lei Geral do Trabalho - Art. 25%' : 'Labor Law - 25% Rule'}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {language === 'pt'
              ? 'A dedução máxima por perda de armazém é 25% do salário líquido mensal.'
              : 'Maximum warehouse loss deduction is 25% of monthly net salary.'}
          </p>
          <div className="flex justify-between">
            <span>{language === 'pt' ? 'Salário Líquido:' : 'Net Salary:'}</span>
            <span className="font-semibold">{formatAOA(employeeNetSalary)}</span>
          </div>
          <div className="flex justify-between">
            <span>{language === 'pt' ? 'Máximo mensal (25%):' : 'Monthly max (25%):'}</span>
            <span className="font-semibold text-primary">{formatAOA(warehouseLossMaxMonthly)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
          <Label htmlFor="manual-override-edit" className="text-xs cursor-pointer">
            {language === 'pt' ? 'Valor personalizado (ignorar 25%)' : 'Custom amount (override 25%)'}
          </Label>
          <Switch
            id="manual-override-edit"
            checked={manualOverride}
            onCheckedChange={(checked) => {
              setManualOverride(checked);
              if (checked && formData.totalAmount > 0) {
                setFormData((prev) => ({
                  ...prev,
                  installments: 1,
                }));
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            {isWarehouseLoss
              ? (language === 'pt' ? 'Valor da Perda (AOA) *' : 'Loss Amount (AOA) *')
              : (language === 'pt' ? 'Valor Total (AOA) *' : 'Total Amount (AOA) *')}
          </Label>
          <Input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'pt' ? 'Data' : 'Date'}</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
      </div>

      {isEditDialogOpen &&
        editingDeduction &&
        editingDeduction.installmentsPaid === 0 &&
        !editingDeduction.isApplied && (
        <div className="space-y-2">
          <Label>
            {language === 'pt' ? 'Iniciar desconto na folha de (opcional)' : 'Start deduction on payroll (optional)'}
          </Label>
          <Select
            value={formData.deductFromPeriodId || '__none__'}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                deductFromPeriodId: v === '__none__' ? undefined : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {language === 'pt' ? 'Padrão (regras habituais)' : 'Default (usual rules)'}
              </SelectItem>
              {selectablePayrollMonths.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Flexible Installments - free numeric input */}
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Número de Prestações' : 'Number of Installments'}</Label>
        <div className={cn("flex items-center gap-2", !(isWarehouseLoss && !manualOverride) && "hidden")}>
          <Input
            type="number"
            value={formData.installments}
            readOnly
            className="bg-muted"
          />
          <Badge variant="outline" className="whitespace-nowrap text-xs">
            {language === 'pt' ? 'Auto (25%)' : 'Auto (25%)'}
          </Badge>
        </div>

        <div className={cn(isWarehouseLoss && !manualOverride && "hidden")}>
          <Input
            type="number"
            min={1}
            value={formData.installments}
            onChange={(e) => setFormData(prev => ({ ...prev, installments: Math.max(1, Number(e.target.value)) }))}
            placeholder={language === 'pt' ? 'Ex: 1, 6, 24...' : 'E.g.: 1, 6, 24...'}
          />
          {formData.installments === 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'pt'
                ? 'Pagamento único — desconto total no mês (com valor personalizado activo)'
                : 'Single payment — full amount this month (custom mode on)'}
            </p>
          )}
        </div>
      </div>

      {/* Show calculated monthly amount */}
      {formData.totalAmount > 0 && (
        <div className={cn("p-3 rounded-lg", exceedsLimit ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted')}>
          {exceedsLimit && (
            <div className="flex items-center gap-2 text-sm text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              {language === 'pt'
                ? 'Valor mensal excede o limite de 25%!'
                : 'Monthly amount exceeds 25% limit!'}
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {language === 'pt' ? 'Desconto mensal:' : 'Monthly deduction:'}
            </span>
            <span className={cn('font-semibold', exceedsLimit ? 'text-destructive' : 'text-foreground')}>
              {formatAOA(monthlyAmount)}
            </span>
          </div>
          {formData.installments > 1 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">
                {language === 'pt' ? 'Durante:' : 'Over:'}
              </span>
              <span className="font-medium">
                {formData.installments} {language === 'pt' ? 'meses' : 'months'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Descrição *' : 'Description *'}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={language === 'pt' ? 'Motivo do desconto...' : 'Reason for deduction...'}
        />
      </div>
    </div>
  );

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Wallet className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold shrink-0">{ptLang ? 'Deduções' : 'Deductions'}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              {ptLang ? 'Adiantamentos, perdas e outros descontos' : 'Advances, losses and other deductions'}
            </span>

            <div className="relative flex-1 min-w-[140px] max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={ptLang ? 'Nome ou descrição...' : 'Name or description...'}
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as DeductionType | 'all')}>
              <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
                <SelectValue placeholder={ptLang ? 'Tipo' : 'Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ptLang ? 'Todos os tipos' : 'All types'}</SelectItem>
                <SelectItem value="salary_advance">{getDeductionTypeLabel('salary_advance', language)}</SelectItem>
                <SelectItem value="warehouse_loss">{getDeductionTypeLabel('warehouse_loss', language)}</SelectItem>
                <SelectItem value="unjustified_absence">{getDeductionTypeLabel('unjustified_absence', language)}</SelectItem>
                <SelectItem value="disciplinary">{getDeductionTypeLabel('disciplinary', language)}</SelectItem>
                <SelectItem value="other">{getDeductionTypeLabel('other', language)}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[120px] text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ptLang ? 'Todos estados' : 'All statuses'}</SelectItem>
                <SelectItem value="pending">{ptLang ? 'Em curso' : 'In progress'}</SelectItem>
                <SelectItem value="paid">{ptLang ? 'Pagos' : 'Paid'}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="h-8 w-[160px] text-xs shrink-0">
                <SelectValue placeholder={ptLang ? 'Funcionário' : 'Employee'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ptLang ? 'Todos funcionários' : 'All employees'}</SelectItem>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="h-8 w-[140px] text-xs shrink-0">
                <SelectValue placeholder={ptLang ? 'Filial' : 'Branch'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ptLang ? 'Todas filiais' : 'All branches'}</SelectItem>
                {activeBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                {ptLang ? 'Limpar' : 'Clear'}
              </Button>
            )}

            {hasPermission('deductions.create') && (
              <Button size="sm" className="h-8 text-xs ml-auto shrink-0" onClick={handleOpenAddDeduction}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {addDeductionLabel}
              </Button>
            )}
          </div>
        </div>

        {hasPermission('deductions.create') && (
          <DeductionFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
        )}

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            {
              label: ptLang ? 'Pendente' : 'Pending',
              value: formatAOA(listStats.totalPending),
              tone: 'text-destructive',
            },
            {
              label: ptLang ? 'Adiantamentos' : 'Advances',
              value: String(listStats.advances),
              tone: 'text-foreground',
            },
            {
              label: ptLang ? 'Perdas armazém' : 'Warehouse',
              value: String(listStats.warehouse),
              tone: 'text-foreground',
            },
            {
              label: ptLang ? 'Concluídos' : 'Completed',
              value: String(listStats.completed),
              tone: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: ptLang ? 'Na lista' : 'Showing',
              value: String(listStats.showing),
              tone: 'text-muted-foreground',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-sm"
            >
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={cn('text-sm font-semibold tabular-nums truncate', kpi.tone)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AttendanceTablePanel
            toolbar={
              <span className="text-xs text-muted-foreground">
                {listStats.showing}{' '}
                {ptLang
                  ? listStats.showing === 1
                    ? 'dedução'
                    : 'deduções'
                  : listStats.showing === 1
                    ? 'deduction'
                    : 'deductions'}
              </span>
            }
          >
            <table className={cn('w-full caption-bottom', tableCompactClass)}>
              <thead className={ATTENDANCE_THEAD}>
                <tr>
                  <th className={cn(ATTENDANCE_TH, ATTENDANCE_TH_CENTER, actionsHeadClass)}>
                    {t.common.actions}
                  </th>
                  <th className={cn(ATTENDANCE_TH, 'w-[18%]')}>{ptLang ? 'Funcionário' : 'Employee'}</th>
                  <th className={cn(ATTENDANCE_TH, 'hidden xl:table-cell w-[8%]')}>{ptLang ? 'Filial' : 'Branch'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[10%]')}>{ptLang ? 'Tipo' : 'Type'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[16%]')}>{ptLang ? 'Descrição' : 'Description'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[8%] whitespace-nowrap')}>{ptLang ? 'Data' : 'Date'}</th>
                  <th className={cn(ATTENDANCE_TH_RIGHT, 'w-[9%] whitespace-nowrap')}>{ptLang ? 'Total' : 'Total'}</th>
                  <th className={cn(ATTENDANCE_TH_RIGHT, 'w-[9%] whitespace-nowrap')}>{ptLang ? 'Mensal' : 'Monthly'}</th>
                  <th className={cn(ATTENDANCE_TH_RIGHT, 'w-[9%] whitespace-nowrap')}>{ptLang ? 'Rest.' : 'Rem.'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[8%]')}>{ptLang ? 'Prog.' : 'Prog.'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[10%]')}>{ptLang ? 'Período' : 'Period'}</th>
                  <th className={cn(ATTENDANCE_TH, 'w-[9%]')}>{t.common.status}</th>
                </tr>
              </thead>
              <tbody className={ATTENDANCE_TBODY}>
                {filteredDeductions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className={cn(ATTENDANCE_TD, 'text-center py-10 text-muted-foreground')}>
                      {ptLang ? 'Nenhuma dedução encontrada' : 'No deductions found'}
                    </td>
                  </tr>
                ) : (
                  filteredDeductions.map((deduction) => {
                    const employee = getEmployee(deduction.employeeId);
                    const progressPercent =
                      deduction.installments > 0
                        ? Math.min(
                            100,
                            Math.max(0, ((deduction.installmentsPaid ?? 0) / deduction.installments) * 100)
                          )
                        : 0;

                    return (
                      <tr key={deduction.id} className="group">
                        <td className={cn(ATTENDANCE_TD, actionsCellClass)}>
                          <div className="flex items-center justify-center gap-0.5">
                            {hasPermission('deductions.edit') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleEditClick(deduction)}
                                title={ptLang ? 'Editar' : 'Edit'}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {hasPermission('deductions.delete') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleDelete(deduction)}
                                title={ptLang ? 'Apagar' : 'Delete'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!hasPermission('deductions.edit') && !hasPermission('deductions.delete') && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className={ATTENDANCE_TD}>
                          <div
                            className="font-medium truncate text-xs"
                            title={employee ? `${employee.firstName} ${employee.lastName}` : undefined}
                          >
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {employee?.department}
                            {employee?.branchId && (
                              <span className="xl:hidden"> · {getBranchName(employee.branchId)}</span>
                            )}
                          </div>
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'hidden xl:table-cell text-xs truncate')}>
                          {getBranchName(employee?.branchId)}
                        </td>
                        <td className={ATTENDANCE_TD}>
                          <Badge
                            variant={deduction.type === 'salary_advance' ? 'default' : 'secondary'}
                            className="text-[10px] whitespace-nowrap"
                          >
                            {getDeductionTypeLabel(deduction.type, language) || deduction.type}
                          </Badge>
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'truncate text-xs')} title={deduction.description}>
                          {deduction.description}
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'whitespace-nowrap text-xs')}>
                          {formatDeductionDate(deduction.date)}
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'text-right font-mono text-xs whitespace-nowrap')}>
                          {formatAOA(deduction.totalAmount)}
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'text-right font-mono text-xs whitespace-nowrap')}>
                          {formatAOA(deduction.amount)}
                        </td>
                        <td
                          className={cn(
                            ATTENDANCE_TD,
                            'text-right font-mono text-xs text-destructive whitespace-nowrap'
                          )}
                        >
                          {formatAOA(deduction.remainingAmount)}
                        </td>
                        <td className={ATTENDANCE_TD}>
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-muted-foreground text-center">
                              {deduction.installmentsPaid}/{deduction.installments}
                            </div>
                            <Progress value={progressPercent} className="h-1.5" />
                          </div>
                        </td>
                        <td className={cn(ATTENDANCE_TD, 'text-xs truncate')} title={getAppliedPeriodLabel(deduction)}>
                          {getAppliedPeriodLabel(deduction)}
                        </td>
                        <td className={ATTENDANCE_TD}>
                          {deduction.isFullyPaid ? (
                            <Badge variant="outline" className="text-green-600 text-[10px]">
                              <CheckCircle className="h-3 w-3 mr-0.5" />
                              {ptLang ? 'Pago' : 'Paid'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              {ptLang ? 'Em curso' : 'In progress'}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </AttendanceTablePanel>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingDeduction(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'pt' ? 'Editar Desconto' : 'Edit Deduction'}</DialogTitle>
            </DialogHeader>
            {deductionFormFields}
            {editingDeduction && editingDeduction.installmentsPaid > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                {language === 'pt' 
                  ? `Atenção: ${editingDeduction.installmentsPaid} prestação(ões) já foram pagas.`
                  : `Note: ${editingDeduction.installmentsPaid} installment(s) have already been paid.`}
              </div>
            )}
            <div className="sticky bottom-0 bg-background pt-3 border-t">
              <Button onClick={handleUpdateDeduction} className="w-full">
                {language === 'pt' ? 'Guardar Alterações' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TopNavLayout>
  );
}
