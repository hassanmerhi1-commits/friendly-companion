import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Coins } from 'lucide-react';
import type { PayrollEntry } from '@/types/payroll';
import { useLanguage } from '@/lib/i18n';
import { usePayrollStore } from '@/stores/payroll-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { getPayrollPayoutAmount } from '@/lib/payroll-payout';
import {
  allocateOneOffDebtDiscount,
  buildAlreadyAppliedMap,
  getDeductionsEligibleForOneOffDebt,
  stripOneOffDebtLines,
  totalOpenDebt,
  type DeductionBreakdownLine,
} from '@/lib/one-off-debt-discount';
import { toast } from 'sonner';

const schema = z.object({
  amount: z.number().min(0),
  debtDiscount: z.number().min(0),
  note: z.string().max(500).optional(),
});

interface PayrollOneOffExtraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PayrollEntry | null;
  periodLabel?: string;
  readOnly?: boolean;
  onSuccess?: () => void;
}

function parseDetails(raw?: string): DeductionBreakdownLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bucketForType(type: string): 'loan' | 'advance' | 'other' {
  if (type === 'loan') return 'loan';
  if (type === 'salary_advance') return 'advance';
  return 'other';
}

export function PayrollOneOffExtraDialog({
  open,
  onOpenChange,
  entry,
  periodLabel,
  readOnly = false,
  onSuccess,
}: PayrollOneOffExtraDialogProps) {
  const { language } = useLanguage();
  const { updateEntry, periods } = usePayrollStore();
  const deductions = useDeductionStore((s) => s.deductions);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [linkDebt, setLinkDebt] = useState(false);
  const [debtDiscount, setDebtDiscount] = useState('');
  const [loading, setLoading] = useState(false);

  const pt = language === 'pt';

  const openDebtTotal = useMemo(() => {
    if (!entry) return 0;
    return totalOpenDebt(
      deductions.filter((d) => d.employeeId === entry.employeeId && !d.isFullyPaid)
    );
  }, [deductions, entry]);

  useEffect(() => {
    if (open && entry) {
      setAmount(String(entry.oneOffExtra || 0));
      setNote(entry.oneOffExtraNote || '');
      const existingDiscount = Number(entry.oneOffDebtDiscount || 0) || 0;
      setLinkDebt(existingDiscount > 0);
      setDebtDiscount(existingDiscount > 0 ? String(existingDiscount) : '');
    }
  }, [open, entry?.id, entry?.oneOffExtra, entry?.oneOffExtraNote, entry?.oneOffDebtDiscount]);

  const handleSubmit = async () => {
    if (!entry || readOnly) return;

    const rawAmount = amount.trim() === '' ? 0 : Number(amount);
    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      toast.error(pt ? 'Valor do extra inválido' : 'Invalid extra amount');
      return;
    }

    let rawDebt = 0;
    if (linkDebt) {
      rawDebt = debtDiscount.trim() === '' ? 0 : Number(debtDiscount);
      if (!Number.isFinite(rawDebt) || rawDebt < 0) {
        toast.error(pt ? 'Valor a abater da dívida inválido' : 'Invalid debt discount amount');
        return;
      }
      if (rawDebt > rawAmount + 0.01) {
        toast.error(
          pt
            ? 'O abatimento não pode ser maior que o valor do Extra'
            : 'Debt discount cannot exceed the Extra amount'
        );
        return;
      }
      if (rawDebt > openDebtTotal + 0.01) {
        toast.error(
          pt
            ? `Dívida aberta: ${formatAOA(openDebtTotal)}. Não pode abater mais do que isso.`
            : `Open debt: ${formatAOA(openDebtTotal)}. Cannot discount more than that.`
        );
        return;
      }
      if (rawDebt <= 0) {
        toast.error(
          pt
            ? 'Indique o valor a abater da dívida (ou desligue a opção)'
            : 'Enter the debt discount amount (or turn the option off)'
        );
        return;
      }
    }

    const parsed = schema.safeParse({
      amount: rawAmount,
      debtDiscount: linkDebt ? rawDebt : 0,
      note: note.trim() || undefined,
    });

    if (!parsed.success) {
      toast.error(pt ? 'Valor inválido' : 'Invalid amount');
      return;
    }

    setLoading(true);
    try {
      const extraAmount = parsed.data.amount;
      const discountAmount = parsed.data.debtDiscount;

      // Start from current entry; strip any previous Extra→dívida lines so edits are clean
      const previousDetails = parseDetails(entry.deductionDetails);
      const { kept, removed } = stripOneOffDebtLines(previousDetails);

      let loanDeduction = entry.loanDeduction || 0;
      let advanceDeduction = entry.advanceDeduction || 0;
      let otherDeductions = entry.otherDeductions || 0;

      for (const line of removed) {
        const amt = Number(line.amount || 0);
        const bucket = bucketForType(String(line.type || ''));
        if (bucket === 'loan') loanDeduction = Math.max(0, loanDeduction - amt);
        else if (bucket === 'advance') advanceDeduction = Math.max(0, advanceDeduction - amt);
        else otherDeductions = Math.max(0, otherDeductions - amt);
      }

      let nextDetails = kept;

      if (discountAmount > 0) {
        const empDeds = deductions.filter((d) => d.employeeId === entry.employeeId);
        const eligible = getDeductionsEligibleForOneOffDebt(
          empDeds,
          entry.payrollPeriodId,
          periods
        );
        const already = buildAlreadyAppliedMap(kept);
        const { allocations, applied } = allocateOneOffDebtDiscount(
          eligible,
          discountAmount,
          already
        );

        if (applied + 0.01 < discountAmount) {
          toast.error(
            pt
              ? `Só foi possível abater ${formatAOA(applied)} da dívida aberta.`
              : `Only ${formatAOA(applied)} could be applied to open debt.`
          );
          setLoading(false);
          return;
        }

        for (const a of allocations) {
          if (a.type === 'loan') loanDeduction += a.amount;
          else if (a.type === 'salary_advance') advanceDeduction += a.amount;
          else otherDeductions += a.amount;
        }
        nextDetails = [...kept, ...allocations];
      }

      const sheetReady = (entry.grossSalary || 0) > 0 || (entry.baseSalary || 0) > 0;
      const oldBucket =
        (entry.loanDeduction || 0) + (entry.advanceDeduction || 0) + (entry.otherDeductions || 0);
      const newBucket = loanDeduction + advanceDeduction + otherDeductions;
      const delta = newBucket - oldBucket;

      const patch: Partial<PayrollEntry> = {
        oneOffExtra: extraAmount,
        oneOffExtraNote: parsed.data.note,
        oneOffDebtDiscount: discountAmount,
      };

      if (sheetReady) {
        patch.loanDeduction = loanDeduction;
        patch.advanceDeduction = advanceDeduction;
        patch.otherDeductions = otherDeductions;
        patch.deductionDetails = nextDetails.length > 0 ? JSON.stringify(nextDetails) : undefined;
        patch.netSalary = (entry.netSalary || 0) - delta;
        patch.totalDeductions = (entry.totalDeductions || 0) + delta;
      }

      if (entry.paidEarly) {
        patch.paidEarlyAmount = getPayrollPayoutAmount({
          ...entry,
          ...patch,
          oneOffExtra: extraAmount,
        });
      }

      await updateEntry(entry.id, patch);

      const hadExtra = (entry.oneOffExtra || 0) > 0;
      toast.success(
        pt
          ? extraAmount > 0
            ? hadExtra
              ? discountAmount > 0
                ? `Extra atualizado · ${formatAOA(discountAmount)} abatido da dívida`
                : 'Extra pontual atualizado'
              : discountAmount > 0
                ? `Extra registado · ${formatAOA(discountAmount)} abatido da dívida`
                : 'Extra pontual registado'
            : 'Extra pontual removido'
          : extraAmount > 0
            ? hadExtra
              ? discountAmount > 0
                ? `Extra updated · ${formatAOA(discountAmount)} applied to debt`
                : 'One-off extra updated'
              : discountAmount > 0
                ? `Extra saved · ${formatAOA(discountAmount)} applied to debt`
                : 'One-off extra saved'
            : 'One-off extra cleared'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(pt ? 'Erro ao guardar extra' : 'Failed to save extra');
    } finally {
      setLoading(false);
    }
  };

  const employeeName = entry?.employee
    ? `${entry.employee.firstName} ${entry.employee.lastName}`
    : '';

  const rawExtraPreview = amount.trim() === '' ? 0 : Number(amount) || 0;
  const rawDebtPreview =
    linkDebt && debtDiscount.trim() !== '' ? Number(debtDiscount) || 0 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {(entry?.oneOffExtra || 0) > 0
              ? pt
                ? 'Editar extra pontual'
                : 'Edit one-off extra'
              : pt
                ? 'Extra pontual (este mês)'
                : 'One-off extra (this month)'}
          </DialogTitle>
          <DialogDescription>
            {employeeName}
            {periodLabel ? ` — ${periodLabel}` : ''}.{' '}
            {pt
              ? 'Não altera salário base, subsídios, IRT, INSS nem desconto de faltas.'
              : 'Does not affect base salary, allowances, IRT, INSS, or absence deductions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          {pt
            ? 'O Extra soma ao líquido. Se ligar à dívida, o valor que indicar é descontado na folha e reduz a dívida do trabalhador (após aprovar).'
            : 'Extra adds to net. If linked to debt, the amount you enter is deducted on the sheet and reduces open debt (after approve).'}
        </div>

        <div className="space-y-4">
          <div>
            <Label>{pt ? 'Valor do Extra (Kz)' : 'Extra amount (AOA)'}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={readOnly}
              placeholder="0"
            />
          </div>
          <div>
            <Label>{pt ? 'Motivo (opcional)' : 'Reason (optional)'}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              placeholder={pt ? 'Ex: prémio pontual Março, acordo verbal...' : 'e.g. March spot bonus...'}
              rows={2}
            />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="link-debt" className="cursor-pointer">
                  {pt ? 'Abater da dívida da empresa' : 'Apply toward company debt'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {pt
                    ? `Dívida aberta: ${formatAOA(openDebtTotal)} · padrão = sem abatimento`
                    : `Open debt: ${formatAOA(openDebtTotal)} · default = no discount`}
                </p>
              </div>
              <Switch
                id="link-debt"
                checked={linkDebt}
                onCheckedChange={(v) => {
                  setLinkDebt(v);
                  if (!v) setDebtDiscount('');
                }}
                disabled={readOnly || openDebtTotal <= 0}
              />
            </div>

            {linkDebt && (
              <div>
                <Label>{pt ? 'Valor a abater da dívida (Kz)' : 'Amount to apply to debt (AOA)'}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={debtDiscount}
                  onChange={(e) => setDebtDiscount(e.target.value)}
                  disabled={readOnly}
                  placeholder={pt ? 'Tudo ou só uma parte do Extra' : 'All or part of the Extra'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {pt
                    ? 'Você define o valor — pode ser o Extra inteiro ou só uma parte.'
                    : 'You set the amount — full Extra or only part of it.'}
                </p>
              </div>
            )}
          </div>

          {entry && rawExtraPreview > 0 && (
            <p className="text-sm text-muted-foreground">
              {pt ? 'Extra' : 'Extra'}: <strong className="text-foreground">{formatAOA(rawExtraPreview)}</strong>
              {rawDebtPreview > 0 && (
                <>
                  {' · '}
                  {pt ? 'Abatimento dívida' : 'Debt discount'}:{' '}
                  <strong className="text-foreground">{formatAOA(rawDebtPreview)}</strong>
                </>
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {readOnly ? (pt ? 'Fechar' : 'Close') : pt ? 'Cancelar' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={loading || !entry}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pt ? 'Guardar' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
