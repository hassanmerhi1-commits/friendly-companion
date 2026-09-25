import { useEffect, useMemo, useState } from 'react';
import { EmployeeSearchSelect } from '@/components/EmployeeSearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import {
  formatPeriodLabel,
  getOpenSalaryAdvancesForEmployee,
  suggestDeductFromPeriodIdForNewAdvance,
} from '@/lib/salary-advance-scheduling';
import { buildSelectablePayrollMonths } from '@/lib/payroll-period-options';
import { calculatePayroll, formatAOA } from '@/lib/angola-labor-law';
import type { Deduction, DeductionFormData, DeductionSchedulingMode, DeductionType } from '@/types/deduction';
import { toast } from 'sonner';
import { AlertTriangle, Info, ListPlus, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WAREHOUSE_LOSS_MAX_RATE = 0.25;

export interface DeductionDraft {
  localId: string;
  data: DeductionFormData;
  monthlyAmount: number;
  installments: number;
}

interface DeductionBatchRegisterProps {
  open: boolean;
  onClose: () => void;
}

function emptyForm(): DeductionFormData {
  return {
    employeeId: '',
    type: 'salary_advance',
    description: '',
    totalAmount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  };
}

export function DeductionBatchRegister({ open, onClose }: DeductionBatchRegisterProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { addDeduction, deductions } = useDeductionStore();
  const { employees } = useEmployeeStore();
  const { periods } = usePayrollStore();
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);

  const [drafts, setDrafts] = useState<DeductionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<DeductionFormData>(emptyForm());
  const [monthlyPrestacao, setMonthlyPrestacao] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [deductStartMode, setDeductStartMode] = useState<'auto' | 'pick'>('auto');
  const [deductFromPeriodId, setDeductFromPeriodId] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<DeductionSchedulingMode>('parallel');

  const monthNames = pt
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const selectableMonths = useMemo(
    () => buildSelectablePayrollMonths(periods, monthNames),
    [periods, monthNames]
  );

  useEffect(() => {
    if (!open) return;
    setDrafts([]);
    setFormData(emptyForm());
    setMonthlyPrestacao(0);
    setManualOverride(false);
    setDeductStartMode('auto');
    setDeductFromPeriodId('');
    setSchedulingMode('parallel');
  }, [open]);

  /** DB open advances + drafts already in this batch for same employee */
  const openAdvancesForValidation = useMemo(() => {
    if (!formData.employeeId || formData.type !== 'salary_advance') return [] as Deduction[];
    const fromDb = getOpenSalaryAdvancesForEmployee(formData.employeeId, deductions);
    const fromDrafts: Deduction[] = drafts
      .filter((d) => d.data.employeeId === formData.employeeId && d.data.type === 'salary_advance')
      .map((d) => ({
        id: d.localId,
        employeeId: d.data.employeeId,
        type: 'salary_advance' as const,
        description: d.data.description,
        totalAmount: d.data.totalAmount,
        amount: d.monthlyAmount,
        date: d.data.date,
        isApplied: false,
        isFullyPaid: false,
        installments: d.installments,
        installmentsPaid: 0,
        remainingAmount: d.data.totalAmount,
        schedulingMode: d.data.schedulingMode,
        deductFromPeriodId: d.data.deductFromPeriodId,
        createdAt: d.localId,
        updatedAt: d.localId,
      }));
    return [...fromDb, ...fromDrafts];
  }, [formData.employeeId, formData.type, deductions, drafts]);

  const suggestedDeductFromPeriodId = useMemo(() => {
    if (!formData.employeeId || formData.type !== 'salary_advance') return undefined;
    const synthetic = [
      ...deductions,
      ...openAdvancesForValidation.filter((a) => String(a.id).startsWith('draft-')),
    ];
    return suggestDeductFromPeriodIdForNewAdvance(
      formData.employeeId,
      synthetic,
      periods,
      formData.date
    );
  }, [formData.employeeId, formData.type, formData.date, deductions, periods, openAdvancesForValidation]);

  useEffect(() => {
    if (!open || formData.type !== 'salary_advance' || !formData.employeeId) return;
    if (schedulingMode === 'sequential' && openAdvancesForValidation.length > 0 && suggestedDeductFromPeriodId) {
      setDeductStartMode('pick');
      setDeductFromPeriodId(suggestedDeductFromPeriodId);
    }
    if (schedulingMode === 'parallel' && openAdvancesForValidation.length > 0) {
      setDeductStartMode('pick');
      if (!deductFromPeriodId && suggestedDeductFromPeriodId) {
        setDeductFromPeriodId(suggestedDeductFromPeriodId);
      }
    }
  }, [
    open,
    formData.employeeId,
    formData.type,
    openAdvancesForValidation.length,
    suggestedDeductFromPeriodId,
    schedulingMode,
  ]);

  const employeeNetSalary = useMemo(() => {
    if (!formData.employeeId) return 0;
    const emp = employees.find((e) => e.id === formData.employeeId);
    if (!emp) return 0;
    return calculatePayroll({
      baseSalary: emp.baseSalary,
      mealAllowance: emp.mealAllowance,
      transportAllowance: emp.transportAllowance,
      otherAllowances: (emp.otherAllowances || 0) + (emp.monthlyBonus || 0),
      familyAllowanceValue: emp.familyAllowance || 0,
      isRetired: emp.isRetired,
      isColaborador: emp.contractType === 'colaborador',
    }).netSalary;
  }, [formData.employeeId, employees]);

  const warehouseLossMaxMonthly = Math.round(employeeNetSalary * WAREHOUSE_LOSS_MAX_RATE);
  const isWarehouseLoss = formData.type === 'warehouse_loss';

  const calculatedInstallments = useMemo(() => {
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0 && formData.totalAmount > 0) {
      return Math.max(1, Math.ceil(formData.totalAmount / warehouseLossMaxMonthly));
    }
    if (isWarehouseLoss && manualOverride && formData.totalAmount > 0) {
      if (monthlyPrestacao <= 0 || monthlyPrestacao >= formData.totalAmount - 0.01) return 1;
      return Math.max(1, Math.ceil(formData.totalAmount / monthlyPrestacao));
    }
    if (monthlyPrestacao > 0 && formData.totalAmount > 0) {
      return Math.max(1, Math.ceil(formData.totalAmount / monthlyPrestacao));
    }
    return 1;
  }, [isWarehouseLoss, manualOverride, warehouseLossMaxMonthly, formData.totalAmount, monthlyPrestacao]);

  const effectiveMonthly = useMemo(() => {
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0) return warehouseLossMaxMonthly;
    return monthlyPrestacao > 0 ? monthlyPrestacao : formData.totalAmount;
  }, [isWarehouseLoss, manualOverride, warehouseLossMaxMonthly, monthlyPrestacao, formData.totalAmount]);

  const exceedsLimit =
    isWarehouseLoss &&
    manualOverride &&
    monthlyPrestacao > 0 &&
    monthlyPrestacao > warehouseLossMaxMonthly &&
    warehouseLossMaxMonthly > 0;

  const resetFormKeepEmployee = () => {
    setFormData((prev) => ({
      ...emptyForm(),
      employeeId: prev.employeeId,
      type: prev.type,
    }));
    setMonthlyPrestacao(0);
    setManualOverride(false);
    setDeductStartMode('auto');
    setDeductFromPeriodId('');
    setSchedulingMode('parallel');
  };

  const buildPayload = (): DeductionFormData | null => {
    if (!formData.employeeId) {
      toast.error(pt ? 'Seleccione o funcionário' : 'Select employee');
      return null;
    }
    if (!formData.description.trim()) {
      toast.error(pt ? 'Informe a descrição' : 'Enter description');
      return null;
    }
    if (!formData.totalAmount || formData.totalAmount <= 0) {
      toast.error(pt ? 'Informe o valor total' : 'Enter total amount');
      return null;
    }
    if (!formData.date) {
      toast.error(pt ? 'Informe a data' : 'Enter date');
      return null;
    }
    if (!isWarehouseLoss || manualOverride) {
      if (monthlyPrestacao <= 0 && formData.totalAmount > 0) {
        toast.error(pt ? 'Informe o valor da prestação mensal' : 'Enter the monthly installment amount');
        return null;
      }
    }

    let resolvedDeductFrom: string | undefined;
    if (deductStartMode === 'pick') {
      if (!deductFromPeriodId) {
        toast.error(
          pt ? 'Seleccione o mês da folha para iniciar o desconto' : 'Select the payroll month to start deductions'
        );
        return null;
      }
      resolvedDeductFrom = deductFromPeriodId;
    } else if (
      schedulingMode === 'sequential' &&
      formData.type === 'salary_advance' &&
      openAdvancesForValidation.length > 0 &&
      suggestedDeductFromPeriodId
    ) {
      resolvedDeductFrom = suggestedDeductFromPeriodId;
    }

    if (
      formData.type === 'salary_advance' &&
      schedulingMode === 'parallel' &&
      openAdvancesForValidation.length > 0 &&
      !resolvedDeductFrom
    ) {
      toast.error(
        pt
          ? 'Já existem adiantamentos em aberto. Escolha o mês de início na folha ou use a fila.'
          : 'Open advances already exist. Pick the payroll start month or use queue mode.'
      );
      return null;
    }

    return {
      ...formData,
      description: formData.description.trim(),
      installments: calculatedInstallments,
      monthlyAmount: effectiveMonthly,
      ignoreWarehouseCap: isWarehouseLoss && manualOverride,
      deductFromPeriodId: resolvedDeductFrom,
      schedulingMode,
    };
  };

  const handleAddToList = () => {
    const payload = buildPayload();
    if (!payload) return;
    setDrafts((prev) => [
      ...prev,
      {
        localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        data: payload,
        monthlyAmount: payload.monthlyAmount || effectiveMonthly,
        installments: payload.installments,
      },
    ]);
    toast.success(pt ? 'Adicionado à lista (ainda não guardado)' : 'Added to list (not saved yet)');
    resetFormKeepEmployee();
  };

  const handleRemoveDraft = (localId: string) => {
    setDrafts((prev) => prev.filter((d) => d.localId !== localId));
  };

  const handleSaveAll = async () => {
    if (drafts.length === 0) {
      toast.error(pt ? 'Lista vazia — adicione descontos primeiro' : 'List empty — add deductions first');
      return;
    }
    setSaving(true);
    let ok = 0;
    try {
      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        try {
          await addDeduction(draft.data);
          ok += 1;
        } catch {
          toast.error(
            pt
              ? `Erro na linha ${i + 1} (${draft.data.description}). Guardados: ${ok}. Corrija e tente de novo.`
              : `Error on line ${i + 1} (${draft.data.description}). Saved: ${ok}. Fix and retry.`
          );
          setDrafts((prev) => prev.slice(i));
          return;
        }
      }
      toast.success(pt ? `${ok} desconto(s) guardado(s)` : `${ok} deduction(s) saved`);
      setDrafts([]);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };

  if (!open) return null;

  return (
    <div className="shrink-0 rounded-xl border border-primary/30 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-primary/5">
        <ListPlus className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">
          {pt ? 'Registo em lote (rascunho)' : 'Batch register (draft)'}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {pt ? 'Só grava no fim' : 'Saves at the end'}
        </Badge>
        <Button type="button" variant="ghost" size="sm" className="h-7 ml-auto" onClick={onClose} disabled={saving}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-3 max-h-[42vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Funcionário *' : 'Employee *'}</Label>
            <EmployeeSearchSelect
              employees={activeEmployees}
              value={formData.employeeId}
              onSelect={(v) => setFormData((prev) => ({ ...prev, employeeId: v }))}
              placeholder={pt ? 'Seleccionar' : 'Select'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Tipo *' : 'Type *'}</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => {
                setFormData((prev) => ({ ...prev, type: v as DeductionType }));
                setManualOverride(false);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary_advance">{getDeductionTypeLabel('salary_advance', language)}</SelectItem>
                <SelectItem value="warehouse_loss">{getDeductionTypeLabel('warehouse_loss', language)}</SelectItem>
                <SelectItem value="unjustified_absence">
                  {pt ? 'Falta Injustificada' : 'Unjustified Absence'}
                </SelectItem>
                <SelectItem value="disciplinary">{getDeductionTypeLabel('disciplinary', language)}</SelectItem>
                <SelectItem value="other">{getDeductionTypeLabel('other', language)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Data *' : 'Date *'}</Label>
            <Input
              type="date"
              className="h-9"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {isWarehouseLoss
                ? pt
                  ? 'Valor da perda *'
                  : 'Loss amount *'
                : pt
                  ? 'Valor total *'
                  : 'Total amount *'}
            </Label>
            <Input
              type="number"
              className="h-9"
              value={formData.totalAmount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, totalAmount: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Prestação mensal *' : 'Monthly installment *'}</Label>
            {isWarehouseLoss && !manualOverride ? (
              <div className="flex items-center gap-2">
                <Input className="h-9 bg-muted" type="number" value={warehouseLossMaxMonthly} readOnly />
                <Badge variant="outline" className="text-[10px]">
                  Auto 25%
                </Badge>
              </div>
            ) : (
              <Input
                type="number"
                className="h-9"
                value={monthlyPrestacao || ''}
                onChange={(e) => setMonthlyPrestacao(Number(e.target.value))}
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Iniciar na folha' : 'Start on payroll'}</Label>
            <Select
              value={deductStartMode === 'auto' ? 'auto' : deductFromPeriodId || 'pick-none'}
              onValueChange={(v) => {
                if (v === 'auto') {
                  setDeductStartMode('auto');
                  setDeductFromPeriodId('');
                } else {
                  setDeductStartMode('pick');
                  setDeductFromPeriodId(v);
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{pt ? 'Padrão' : 'Default'}</SelectItem>
                {selectableMonths.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isWarehouseLoss && formData.employeeId ? (
          <div className="p-2 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Info className="h-3.5 w-3.5" />
              {pt ? 'Limite 25% do líquido' : '25% net salary cap'} — {formatAOA(warehouseLossMaxMonthly)}
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {pt ? 'Valor personalizado (ignorar 25%)' : 'Custom amount (override 25%)'}
              </Label>
              <Switch checked={manualOverride} onCheckedChange={setManualOverride} />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2 p-2 rounded-lg border bg-muted/30">
            <Label className="text-xs font-medium">{pt ? 'Como descontar' : 'How to deduct'}</Label>
            <RadioGroup
              value={schedulingMode}
              onValueChange={(v) => setSchedulingMode(v as DeductionSchedulingMode)}
              className="space-y-1"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="parallel" id="batch-parallel" className="mt-0.5" />
                <Label htmlFor="batch-parallel" className="text-xs font-normal">
                  {pt ? 'Neste mês (junto)' : 'Same month'}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="sequential" id="batch-sequential" className="mt-0.5" />
                <Label htmlFor="batch-sequential" className="text-xs font-normal">
                  {pt ? 'Fila (um de cada vez)' : 'Queue (one at a time)'}
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pt ? 'Descrição *' : 'Description *'}</Label>
            <Textarea
              className="min-h-[72px]"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        {formData.totalAmount > 0 && effectiveMonthly > 0 ? (
          <div
            className={cn(
              'p-2 rounded-lg text-xs flex flex-wrap gap-4',
              exceedsLimit ? 'bg-destructive/10' : 'bg-muted'
            )}
          >
            {exceedsLimit ? (
              <span className="text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {pt ? 'Excede 25%' : 'Over 25%'}
              </span>
            ) : null}
            <span>
              {pt ? 'Mensal' : 'Monthly'}: <strong>{formatAOA(effectiveMonthly)}</strong>
            </span>
            <span>
              {pt ? 'Prestações' : 'Installments'}: <strong>{calculatedInstallments}</strong>
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleAddToList} disabled={saving}>
            <ListPlus className="h-3.5 w-3.5 mr-1" />
            {pt ? 'Adicionar à lista' : 'Add to list'}
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-1.5 bg-amber-500/10 border-b text-xs font-medium flex items-center justify-between">
            <span>{pt ? 'Rascunhos (não gravados)' : 'Drafts (not saved)'}</span>
            <Badge variant="secondary" className="text-[10px]">
              {drafts.length}
            </Badge>
          </div>
          {drafts.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              {pt
                ? 'Nenhuma linha ainda. Preencha e clique Adicionar à lista.'
                : 'No lines yet. Fill the form and Add to list.'}
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">{pt ? 'Funcionário' : 'Employee'}</th>
                    <th className="text-left p-2">{pt ? 'Tipo' : 'Type'}</th>
                    <th className="text-left p-2">{pt ? 'Desc.' : 'Desc.'}</th>
                    <th className="text-right p-2">{pt ? 'Total' : 'Total'}</th>
                    <th className="text-right p-2">{pt ? 'Mensal' : 'Monthly'}</th>
                    <th className="text-left p-2">{pt ? 'Início' : 'Start'}</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.localId} className="border-t">
                      <td className="p-2">{employeeName(d.data.employeeId)}</td>
                      <td className="p-2">{getDeductionTypeLabel(d.data.type, language)}</td>
                      <td className="p-2 truncate max-w-[140px]">{d.data.description}</td>
                      <td className="p-2 text-right tabular-nums">{formatAOA(d.data.totalAmount)}</td>
                      <td className="p-2 text-right tabular-nums">{formatAOA(d.monthlyAmount)}</td>
                      <td className="p-2">
                        {d.data.deductFromPeriodId
                          ? formatPeriodLabel(d.data.deductFromPeriodId, periods, monthNames)
                          : pt
                            ? 'Padrão'
                            : 'Default'}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleRemoveDraft(d.localId)}
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t bg-muted/20">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
          {pt ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          onClick={() => void handleSaveAll()}
          disabled={saving || drafts.length === 0}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving
            ? pt
              ? 'A guardar…'
              : 'Saving…'
            : pt
              ? `Guardar tudo (${drafts.length})`
              : `Save all (${drafts.length})`}
        </Button>
      </div>
    </div>
  );
}
