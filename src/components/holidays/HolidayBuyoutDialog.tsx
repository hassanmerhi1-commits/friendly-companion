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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Banknote } from 'lucide-react';
import type { Employee } from '@/types/employee';
import { useLanguage } from '@/lib/i18n';
import { useHolidayStore } from '@/stores/holiday-store';
import { usePayrollStore } from '@/stores/payroll-store';
import {
  calculateHolidayEntitlement,
  canBuyHolidayForYear,
  getCurrentHolidayYear,
  getDaysRemaining,
  getDaysSettled,
  getTotalDaysBought,
  getTotalBuyoutAmount,
} from '@/lib/holiday-utils';
import { toast } from 'sonner';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const schema = z.object({
  amount: z.number().positive(),
  agreedDate: z.string().min(1),
  note: z.string().trim().min(3).max(2000),
  days: z.number().int().min(0).optional(),
  payrollPeriodId: z.string().min(1),
});

interface HolidayBuyoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  year: number;
  onSuccess?: () => void;
}

export function HolidayBuyoutDialog({
  open,
  onOpenChange,
  employee,
  year,
  onSuccess,
}: HolidayBuyoutDialogProps) {
  const { language } = useLanguage();
  const { records, addBuyout, getRecordForEmployee } = useHolidayStore();
  const { periods, entries: payrollEntries, loadPayroll, isLoaded: payrollLoaded } = usePayrollStore();
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [agreedDate, setAgreedDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [payrollPeriodId, setPayrollPeriodId] = useState('');
  const [loading, setLoading] = useState(false);

  const currentYear = getCurrentHolidayYear();
  const yearAllowed = canBuyHolidayForYear(year);
  const record = employee ? getRecordForEmployee(employee.id, year) : undefined;

  const entitlement = useMemo(() => {
    if (!employee) return { daysEntitled: 22, daysRemaining: 22, daysSettled: 0, daysBought: 0, buyoutTotal: 0 };
    const { daysEntitled } = calculateHolidayEntitlement(employee, year);
    return {
      daysEntitled,
      daysRemaining: getDaysRemaining(record, daysEntitled),
      daysSettled: getDaysSettled(record),
      daysBought: getTotalDaysBought(record),
      buyoutTotal: getTotalBuyoutAmount(record),
    };
  }, [employee, year, record, records]);

  const folhaOptions = useMemo(() => {
    return periods
      .filter((p) => p.year === currentYear && p.status !== 'archived')
      .sort((a, b) => b.month - a.month)
      .map((p) => {
        const onFolha = employee
          ? payrollEntries.some((e) => e.employeeId === employee.id && e.payrollPeriodId === p.id)
          : false;
        const label = `${MONTHS_PT[p.month - 1]} ${p.year} (${p.status})`;
        return { id: p.id, label, onFolha, disabled: p.status === 'paid' };
      });
  }, [periods, currentYear, payrollEntries, employee]);

  useEffect(() => {
    if (open && !payrollLoaded) {
      void loadPayroll();
    }
  }, [open, payrollLoaded, loadPayroll]);

  useEffect(() => {
    if (open) {
      setAmount('');
      setDays('');
      setAgreedDate(new Date().toISOString().split('T')[0]);
      setNote('');
      const first = folhaOptions.find((o) => o.onFolha && !o.disabled) ?? folhaOptions.find((o) => o.onFolha);
      setPayrollPeriodId(first?.id ?? folhaOptions[0]?.id ?? '');
    }
  }, [open, employee?.id, year, folhaOptions]);

  const handleSubmit = async () => {
    if (!employee || !yearAllowed) return;

    const parsedDays = days.trim() === '' ? undefined : Number(days);
    const parsed = schema.safeParse({
      amount: Number(amount),
      agreedDate,
      note,
      days: parsedDays,
      payrollPeriodId,
    });

    if (!parsed.success) {
      toast.error(
        language === 'pt'
          ? 'Preencha valor, folha, data, nota (mín. 3 caracteres)'
          : 'Fill amount, payroll month, date, and note (min. 3 characters)'
      );
      return;
    }

    if (parsed.data.days != null && parsed.data.days > entitlement.daysRemaining) {
      toast.error(
        language === 'pt'
          ? `Só restam ${entitlement.daysRemaining} dia(s) para comprar neste ano`
          : `Only ${entitlement.daysRemaining} day(s) left to buy this year`
      );
      return;
    }

    const selected = folhaOptions.find((o) => o.id === parsed.data.payrollPeriodId);
    if (!selected?.onFolha) {
      toast.error(
        language === 'pt'
          ? 'Calcule a folha desse mês com este funcionário antes de registar a compra'
          : 'Calculate that payroll month with this employee first'
      );
      return;
    }

    setLoading(true);
    const result = await addBuyout(
      employee.id,
      year,
      {
        days: parsed.data.days,
        amount: parsed.data.amount,
        agreedDate: parsed.data.agreedDate,
        note: parsed.data.note,
        payrollPeriodId: parsed.data.payrollPeriodId,
      },
      entitlement.daysEntitled
    );
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || (language === 'pt' ? 'Erro ao registar compra' : 'Failed to register buyout'));
      return;
    }

    toast.success(
      language === 'pt'
        ? 'Compra registada e ligada à folha (recibo e folha salarial)'
        : 'Buyout recorded and linked to payroll'
    );
    onOpenChange(false);
    onSuccess?.();
  };

  const pt = language === 'pt';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {pt ? 'Comprar / indemnizar férias' : 'Buy / settle vacation days'}
          </DialogTitle>
          <DialogDescription>
            {employee ? (
              <>
                <strong>
                  {employee.firstName} {employee.lastName}
                </strong>{' '}
                — {year}.{' '}
                {yearAllowed
                  ? pt
                    ? 'Valor negociado; pago na folha seleccionada (fora do bruto/IRT/INSS).'
                    : 'Negotiated amount; paid on selected payroll (outside gross/tax).'
                  : pt
                    ? `Só é permitido comprar férias de ${currentYear}.`
                    : `Only ${currentYear} holidays can be bought.`}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {!yearAllowed ? (
          <p className="text-sm text-destructive">
            {pt
              ? `Anos anteriores (${year}) são apenas consulta. Use o ano ${currentYear}.`
              : `Past years (${year}) are read-only. Use ${currentYear}.`}
          </p>
        ) : (
          <>
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p>
                {pt ? 'Direito' : 'Entitled'}: <strong>{entitlement.daysEntitled}</strong> {pt ? 'dias' : 'days'}
              </p>
              <p>
                {pt ? 'Já gozado + comprado' : 'Already taken + bought'}: <strong>{entitlement.daysSettled}</strong>
              </p>
              <p>
                {pt ? 'Restantes' : 'Remaining'}:{' '}
                <strong className="text-primary">{entitlement.daysRemaining}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{pt ? 'Pagar na folha (mês)' : 'Pay on payroll (month)'}</Label>
                <Select value={payrollPeriodId} onValueChange={setPayrollPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder={pt ? 'Seleccionar mês' : 'Select month'} />
                  </SelectTrigger>
                  <SelectContent>
                    {folhaOptions.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {pt ? 'Nenhum período — crie/calcule a folha' : 'No periods'}
                      </SelectItem>
                    ) : (
                      folhaOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id} disabled={!o.onFolha}>
                          {o.label}
                          {!o.onFolha ? (pt ? ' — calcular folha' : ' — run payroll') : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{pt ? 'Valor acordado (Kz)' : 'Agreed amount (AOA)'}</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>{pt ? 'Dias comprados (opcional)' : 'Days bought (optional)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={entitlement.daysRemaining}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <div>
                <Label>{pt ? 'Data do acordo' : 'Agreement date'}</Label>
                <Input type="date" value={agreedDate} onChange={(e) => setAgreedDate(e.target.value)} />
              </div>
              <div>
                <Label>{pt ? 'Nota / acordo' : 'Note'}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {pt ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !employee || !yearAllowed || entitlement.daysRemaining === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {pt ? 'Registar e ligar à folha' : 'Save & link to payroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
