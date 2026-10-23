import { useEffect, useMemo, useState } from 'react';
import { EmployeeSearchSelect } from '@/components/EmployeeSearchSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import {
  defaultSchedulingModeForType,
  formatPeriodLabel,
  getOpenSalaryAdvancesForEmployee,
} from '@/lib/salary-advance-scheduling';
import { buildSelectablePayrollMonths } from '@/lib/payroll-period-options';
import { formatAOA } from '@/lib/angola-labor-law';
import {
  buildDeductionFormData,
  calculateInstallments,
  createEmptyDeductionEntry,
  deductionEntryErrorMessage,
  effectiveMonthlyAmount,
  employeeNetSalary,
  exceedsWarehouseLimit,
  isWarehouseLossType,
  suggestedStartPeriodId,
  todayDateKey,
  warehouseLossMaxMonthly,
  type DeductionEntryState,
} from '@/lib/deduction-entry';
import type { Deduction, DeductionFormData, DeductionSchedulingMode, DeductionType } from '@/types/deduction';
import type { Employee } from '@/types/employee';
import type { PayrollPeriod } from '@/types/payroll';
import { toast } from 'sonner';
import { AlertTriangle, Info, Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchRow extends DeductionEntryState {
  localId: string;
}

interface RowCtx {
  net: number;
  cap: number;
  openAdvances: Deduction[];
  suggested?: string;
  installments: number;
  monthly: number;
  exceeds: boolean;
  isWh: boolean;
}

interface DeductionBatchRegisterProps {
  open: boolean;
  onClose: () => void;
}

function newRow(sharedDate: string): BatchRow {
  return {
    localId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...createEmptyDeductionEntry({ date: sharedDate || todayDateKey() }),
  };
}

function draftAsSyntheticAdvance(row: BatchRow): Deduction {
  return {
    id: row.localId,
    employeeId: row.employeeId,
    type: 'salary_advance',
    description: row.description || 'draft',
    totalAmount: row.totalAmount || 0,
    amount: row.monthlyPrestacao || row.totalAmount || 0,
    date: row.date,
    isApplied: false,
    isFullyPaid: false,
    installments: Math.max(
      1,
      row.monthlyPrestacao > 0 ? Math.ceil((row.totalAmount || 1) / row.monthlyPrestacao) : 1
    ),
    installmentsPaid: 0,
    remainingAmount: row.totalAmount || 0,
    schedulingMode: row.schedulingMode,
    deductFromPeriodId:
      row.deductStartMode === 'pick' ? row.deductFromPeriodId || undefined : undefined,
    createdAt: row.localId,
    updatedAt: row.localId,
  };
}

function priorSyntheticFor(
  row: BatchRow,
  allRows: BatchRow[],
  onlyBefore = false
): Deduction[] {
  const list = onlyBefore
    ? allRows.slice(0, allRows.findIndex((r) => r.localId === row.localId))
    : allRows.filter((o) => o.localId !== row.localId);
  return list
    .filter(
      (o) =>
        o.employeeId === row.employeeId &&
        o.type === 'salary_advance' &&
        (o.totalAmount > 0 || o.description.trim())
    )
    .map(draftAsSyntheticAdvance);
}

function applyOpenAdvanceUx(
  row: BatchRow,
  deductions: Deduction[],
  periods: PayrollPeriod[],
  siblings: BatchRow[]
): BatchRow {
  if (row.type !== 'salary_advance' || !row.employeeId) return row;
  const synthetic = priorSyntheticFor(row, siblings);
  const open = [
    ...getOpenSalaryAdvancesForEmployee(row.employeeId, deductions),
    ...synthetic,
  ];
  if (open.length === 0) return row;
  const suggested = suggestedStartPeriodId(
    row.employeeId,
    row.type,
    row.date,
    deductions,
    periods,
    synthetic
  );
  if (row.schedulingMode === 'sequential' && suggested) {
    return {
      ...row,
      deductStartMode: 'pick',
      deductFromPeriodId: row.deductFromPeriodId || suggested,
    };
  }
  if (row.schedulingMode === 'parallel') {
    return {
      ...row,
      deductStartMode: 'pick',
      deductFromPeriodId: row.deductFromPeriodId || suggested || '',
    };
  }
  return row;
}

export function DeductionBatchRegister({ open, onClose }: DeductionBatchRegisterProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { addDeduction, deductions } = useDeductionStore();
  const { employees } = useEmployeeStore();
  const { periods } = usePayrollStore();
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees]
  );

  const [sharedDate, setSharedDate] = useState(todayDateKey);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [saving, setSaving] = useState(false);

  const monthNames = pt
    ? [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ]
    : [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

  const selectableMonths = useMemo(
    () => buildSelectablePayrollMonths(periods, monthNames),
    [periods, monthNames]
  );

  useEffect(() => {
    if (!open) return;
    const d = todayDateKey();
    setSharedDate(d);
    setRows([newRow(d), newRow(d)]);
    setSaving(false);
  }, [open]);

  const computeCtx = (row: BatchRow, allRows: BatchRow[]): RowCtx => {
    const emp = employees.find((e) => e.id === row.employeeId);
    const net = employeeNetSalary(emp);
    const cap = warehouseLossMaxMonthly(net);
    const synthetic = priorSyntheticFor(row, allRows);
    const openAdvances =
      row.type === 'salary_advance' && row.employeeId
        ? [...getOpenSalaryAdvancesForEmployee(row.employeeId, deductions), ...synthetic]
        : [];
    const suggested = suggestedStartPeriodId(
      row.employeeId,
      row.type,
      row.date,
      deductions,
      periods,
      synthetic
    );
    return {
      net,
      cap,
      openAdvances,
      suggested,
      installments: calculateInstallments({
        type: row.type,
        totalAmount: row.totalAmount,
        monthlyPrestacao: row.monthlyPrestacao,
        manualOverride: row.manualOverride,
        warehouseCap: cap,
      }),
      monthly: effectiveMonthlyAmount({
        type: row.type,
        totalAmount: row.totalAmount,
        monthlyPrestacao: row.monthlyPrestacao,
        manualOverride: row.manualOverride,
        warehouseCap: cap,
      }),
      exceeds: exceedsWarehouseLimit({
        type: row.type,
        manualOverride: row.manualOverride,
        monthlyPrestacao: row.monthlyPrestacao,
        warehouseCap: cap,
      }),
      isWh: isWarehouseLossType(row.type),
    };
  };

  const patchRow = (localId: string, patch: Partial<BatchRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r));
      return next.map((r) =>
        r.localId === localId ? applyOpenAdvanceUx(r, deductions, periods, next) : r
      );
    });
  };

  const setRowType = (localId: string, type: DeductionType) => {
    setRows((prev) => {
      const next = prev.map((r) =>
        r.localId === localId
          ? {
              ...r,
              type,
              manualOverride: false,
              schedulingMode: defaultSchedulingModeForType(type),
            }
          : r
      );
      return next.map((r) =>
        r.localId === localId ? applyOpenAdvanceUx(r, deductions, periods, next) : r
      );
    });
  };

  const handleAddRow = () => setRows((prev) => [...prev, newRow(sharedDate)]);

  const handleRemoveRow = (localId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return [newRow(sharedDate)];
      return prev.filter((r) => r.localId !== localId);
    });
  };

  const handleApplySharedDate = () => {
    setRows((prev) => prev.map((r) => ({ ...r, date: sharedDate })));
    toast.success(pt ? 'Data aplicada a todas as linhas' : 'Date applied to all rows');
  };

  const handleSaveAll = async () => {
    const filled = rows.filter(
      (r) => r.employeeId || r.description.trim() || r.totalAmount > 0
    );
    if (filled.length === 0) {
      toast.error(pt ? 'Preencha pelo menos uma linha' : 'Fill at least one row');
      return;
    }

    const payloads: DeductionFormData[] = [];
    const accepted: BatchRow[] = [];

    for (let i = 0; i < filled.length; i++) {
      const row = filled[i];
      const synthetic = accepted
        .filter((o) => o.employeeId === row.employeeId && o.type === 'salary_advance')
        .map(draftAsSyntheticAdvance);
      const openAdvances =
        row.type === 'salary_advance' && row.employeeId
          ? [...getOpenSalaryAdvancesForEmployee(row.employeeId, deductions), ...synthetic]
          : [];
      const emp = employees.find((e) => e.id === row.employeeId);
      const cap = warehouseLossMaxMonthly(employeeNetSalary(emp));
      const suggested = suggestedStartPeriodId(
        row.employeeId,
        row.type,
        row.date,
        deductions,
        periods,
        synthetic
      );
      const built = buildDeductionFormData(row, {
        openAdvances,
        suggestedDeductFromPeriodId: suggested,
        warehouseCap: cap,
      });
      if (!built.ok) {
        toast.error(
          `${pt ? 'Linha' : 'Row'} ${i + 1}: ${deductionEntryErrorMessage(built.error, language)}`
        );
        return;
      }
      payloads.push(built.data);
      accepted.push(row);
    }

    setSaving(true);
    let ok = 0;
    try {
      for (let i = 0; i < payloads.length; i++) {
        try {
          await addDeduction(payloads[i]);
          ok += 1;
        } catch {
          toast.error(
            pt
              ? `Erro na linha ${i + 1}. Guardados: ${ok}. Corrija e tente de novo.`
              : `Error on line ${i + 1}. Saved: ${ok}. Fix and retry.`
          );
          return;
        }
      }
      toast.success(pt ? `${ok} desconto(s) guardado(s)` : `${ok} deduction(s) saved`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filledCount = rows.filter(
    (r) => r.employeeId || r.description.trim() || r.totalAmount > 0
  ).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <DialogContent className="!max-w-[min(98vw,1680px)] w-[min(98vw,1680px)] h-[min(94vh,920px)] overflow-hidden flex flex-col p-0 gap-0 sm:rounded-lg">
        <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0 space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="text-lg">
              {pt ? 'Registo em lote' : 'Batch register'}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-normal">
              {pt ? 'Mesmas regras do desconto individual' : 'Same rules as single entry'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs whitespace-nowrap">{pt ? 'Data padrão' : 'Default date'}</Label>
            <Input
              type="date"
              className="h-8 w-[140px]"
              value={sharedDate}
              onChange={(e) => setSharedDate(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleApplySharedDate}
            >
              {pt ? 'Aplicar a todas' : 'Apply to all'}
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 px-3 py-2">
          <table className="w-full text-xs border-collapse min-w-[1480px]">
            <thead className="bg-muted/60 sticky top-0 z-10">
              <tr>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2 min-w-[190px]">{pt ? 'Funcionário' : 'Employee'}</th>
                <th className="text-left p-2 min-w-[140px]">{pt ? 'Tipo' : 'Type'}</th>
                <th className="text-left p-2 min-w-[160px]">{pt ? 'Descrição' : 'Description'}</th>
                <th className="text-left p-2 min-w-[150px]">{pt ? 'Como descontar' : 'How to deduct'}</th>
                <th className="text-left p-2 min-w-[160px]">{pt ? 'Início na folha' : 'Start on payroll'}</th>
                <th className="text-right p-2 min-w-[110px]">{pt ? 'Total' : 'Total'}</th>
                <th className="text-left p-2 min-w-[120px]">{pt ? 'Data' : 'Date'}</th>
                <th className="text-right p-2 min-w-[130px]">{pt ? 'Prestação' : 'Installment'}</th>
                <th className="text-center p-2 min-w-[90px]">{pt ? 'Ignorar 25%' : 'Override 25%'}</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const ctx = computeCtx(row, rows);
                return (
                  <BatchRowBlock
                    key={row.localId}
                    idx={idx}
                    row={row}
                    ctx={ctx}
                    pt={pt}
                    language={language}
                    activeEmployees={activeEmployees}
                    selectableMonths={selectableMonths}
                    periods={periods}
                    monthNames={monthNames}
                    saving={saving}
                    onPatch={patchRow}
                    onType={setRowType}
                    onRemove={handleRemoveRow}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t bg-muted/20 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow} disabled={saving}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {pt ? 'Adicionar linha' : 'Add row'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {pt ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => void handleSaveAll()}
            disabled={saving || filledCount === 0}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving
              ? pt
                ? 'A guardar…'
                : 'Saving…'
              : pt
                ? `Guardar tudo (${filledCount})`
                : `Save all (${filledCount})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BatchRowBlock(props: {
  idx: number;
  row: BatchRow;
  ctx: RowCtx;
  pt: boolean;
  language: string;
  activeEmployees: Employee[];
  selectableMonths: { id: string; label: string }[];
  periods: PayrollPeriod[];
  monthNames: string[];
  saving: boolean;
  onPatch: (id: string, patch: Partial<BatchRow>) => void;
  onType: (id: string, type: DeductionType) => void;
  onRemove: (id: string) => void;
}) {
  const {
    idx,
    row,
    ctx,
    pt,
    language,
    activeEmployees,
    selectableMonths,
    periods,
    monthNames,
    saving,
    onPatch,
    onType,
    onRemove,
  } = props;

  return (
    <tr className={cn('border-t align-top', idx % 2 === 1 && 'bg-muted/20')}>
      <td className="p-2 text-muted-foreground">{idx + 1}</td>
      <td className="p-1.5">
        <EmployeeSearchSelect
          employees={activeEmployees}
          value={row.employeeId}
          onSelect={(v) => onPatch(row.localId, { employeeId: v })}
          placeholder={pt ? 'Seleccionar' : 'Select'}
        />
      </td>
      <td className="p-1.5">
        <Select value={row.type} onValueChange={(v) => onType(row.localId, v as DeductionType)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salary_advance">
              {getDeductionTypeLabel('salary_advance', language)}
            </SelectItem>
            <SelectItem value="warehouse_loss">
              {getDeductionTypeLabel('warehouse_loss', language)}
            </SelectItem>
            <SelectItem value="unjustified_absence">
              {pt ? 'Falta Injustificada' : 'Unjustified Absence'}
            </SelectItem>
            <SelectItem value="disciplinary">
              {getDeductionTypeLabel('disciplinary', language)}
            </SelectItem>
            <SelectItem value="other">{getDeductionTypeLabel('other', language)}</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="p-1.5">
        <Input
          className="h-9"
          value={row.description}
          onChange={(e) => onPatch(row.localId, { description: e.target.value })}
          placeholder={pt ? 'Descrição' : 'Description'}
        />
        {row.type === 'salary_advance' && ctx.openAdvances.length > 0 ? (
          <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {pt
              ? `${ctx.openAdvances.length} em aberto`
              : `${ctx.openAdvances.length} open`}
          </p>
        ) : null}
      </td>
      <td className="p-1.5">
        <Select
          value={row.schedulingMode}
          onValueChange={(v) =>
            onPatch(row.localId, { schedulingMode: v as DeductionSchedulingMode })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parallel">
              {pt ? 'Neste mês (junto)' : 'This month'}
            </SelectItem>
            <SelectItem value="sequential">
              {pt ? 'Fila (um de cada vez)' : 'Queue (one at a time)'}
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="p-1.5">
        <Select
          value={row.deductStartMode === 'auto' ? 'auto' : row.deductFromPeriodId || 'pick-none'}
          onValueChange={(v) => {
            if (v === 'auto') {
              onPatch(row.localId, { deductStartMode: 'auto', deductFromPeriodId: '' });
            } else {
              onPatch(row.localId, { deductStartMode: 'pick', deductFromPeriodId: v });
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
        {ctx.suggested ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {pt ? 'Sugerido: ' : 'Suggested: '}
            {formatPeriodLabel(ctx.suggested, periods, monthNames)}
          </p>
        ) : null}
      </td>
      <td className="p-1.5">
        <Input
          type="number"
          className="h-9 text-right"
          value={row.totalAmount || ''}
          onChange={(e) => onPatch(row.localId, { totalAmount: Number(e.target.value) })}
        />
      </td>
      <td className="p-1.5">
        <Input
          type="date"
          className="h-9"
          value={row.date}
          onChange={(e) => onPatch(row.localId, { date: e.target.value })}
        />
      </td>
      <td className="p-1.5">
        {ctx.isWh && !row.manualOverride ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <Input className="h-9 bg-muted text-right" type="number" value={ctx.cap} readOnly />
              <Badge variant="outline" className="text-[9px] shrink-0">
                25%
              </Badge>
            </div>
            {row.employeeId ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                {formatAOA(ctx.cap)} max
              </p>
            ) : null}
          </div>
        ) : (
          <Input
            type="number"
            className="h-9 text-right"
            value={row.monthlyPrestacao || ''}
            onChange={(e) => onPatch(row.localId, { monthlyPrestacao: Number(e.target.value) })}
          />
        )}
        {row.totalAmount > 0 && ctx.monthly > 0 ? (
          <p
            className={cn(
              'text-[10px] mt-0.5',
              ctx.exceeds ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {ctx.installments}x · {formatAOA(ctx.monthly)}
            {ctx.exceeds ? (pt ? ' · excede 25%' : ' · over 25%') : ''}
          </p>
        ) : null}
      </td>
      <td className="p-1.5 text-center">
        {ctx.isWh ? (
          <Switch
            checked={row.manualOverride}
            onCheckedChange={(checked) => {
              onPatch(row.localId, {
                manualOverride: checked,
                monthlyPrestacao:
                  checked && row.totalAmount > 0 ? row.totalAmount : row.monthlyPrestacao,
              });
            }}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onRemove(row.localId)}
          disabled={saving}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}