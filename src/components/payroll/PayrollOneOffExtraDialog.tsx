import { useEffect, useState } from 'react';
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
import { Loader2, Coins } from 'lucide-react';
import type { PayrollEntry } from '@/types/payroll';
import { useLanguage } from '@/lib/i18n';
import { usePayrollStore } from '@/stores/payroll-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { getPayrollPayoutAmount } from '@/lib/payroll-payout';
import { toast } from 'sonner';

const schema = z.object({
  amount: z.number().min(0),
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

export function PayrollOneOffExtraDialog({
  open,
  onOpenChange,
  entry,
  periodLabel,
  readOnly = false,
  onSuccess,
}: PayrollOneOffExtraDialogProps) {
  const { language } = useLanguage();
  const { updateEntry } = usePayrollStore();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entry) {
      setAmount(String(entry.oneOffExtra || 0));
      setNote(entry.oneOffExtraNote || '');
    }
  }, [open, entry?.id, entry?.oneOffExtra, entry?.oneOffExtraNote]);

  const handleSubmit = async () => {
    if (!entry || readOnly) return;

    const rawAmount = amount.trim() === '' ? 0 : Number(amount);
    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      toast.error(language === 'pt' ? 'Valor inválido' : 'Invalid amount');
      return;
    }

    const parsed = schema.safeParse({
      amount: rawAmount,
      note: note.trim() || undefined,
    });

    if (!parsed.success) {
      toast.error(language === 'pt' ? 'Valor inválido' : 'Invalid amount');
      return;
    }

    setLoading(true);
    try {
      const patch: Partial<PayrollEntry> = {
        oneOffExtra: parsed.data.amount,
        oneOffExtraNote: parsed.data.note,
      };
      if (entry.paidEarly) {
        patch.paidEarlyAmount = getPayrollPayoutAmount({
          ...entry,
          oneOffExtra: parsed.data.amount,
        });
      }
      await updateEntry(entry.id, patch);
      const hadExtra = (entry.oneOffExtra || 0) > 0;
      toast.success(
        language === 'pt'
          ? parsed.data.amount > 0
            ? hadExtra
              ? 'Extra pontual atualizado'
              : 'Extra pontual registado'
            : 'Extra pontual removido'
          : parsed.data.amount > 0
            ? hadExtra
              ? 'One-off extra updated'
              : 'One-off extra saved'
            : 'One-off extra cleared'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(language === 'pt' ? 'Erro ao guardar extra' : 'Failed to save extra');
    } finally {
      setLoading(false);
    }
  };

  const pt = language === 'pt';
  const employeeName = entry?.employee
    ? `${entry.employee.firstName} ${entry.employee.lastName}`
    : '';

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
            ? 'Soma ao líquido na folha e no recibo, como o bónus mensal, mas só neste período.'
            : 'Adds to net on payslip for this period only, separate from fixed allowances.'}
        </div>

        <div className="space-y-4">
          <div>
            <Label>{pt ? 'Valor (Kz)' : 'Amount (AOA)'}</Label>
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
          {entry && (entry.oneOffExtra || 0) > 0 && (
            <p className="text-sm">
              {pt ? 'Líquido folha' : 'Payroll net'}: {formatAOA(entry.netSalary)} +{' '}
              <strong>{formatAOA(entry.oneOffExtra || 0)}</strong> extra
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
