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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, LogOut } from 'lucide-react';
import type { Employee, EmployeeExitReason } from '@/types/employee';
import { useLanguage } from '@/lib/i18n';
import { EMPLOYEE_EXIT_REASONS, getExitReasonLabel } from '@/lib/employee-exit';
import { useEmployeeStore } from '@/stores/employee-store';
import { toast } from 'sonner';

const schema = z.object({
  exitDate: z.string().min(1),
  exitReason: z.enum(['dismissal', 'voluntary', 'contract_end', 'retirement', 'mutual_agreement']),
  exitNote: z.string().trim().min(3).max(2000),
});

interface EmployeeOffboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  processedBy: string;
  onSuccess?: () => void;
}

export function EmployeeOffboardDialog({
  open,
  onOpenChange,
  employee,
  processedBy,
  onSuccess,
}: EmployeeOffboardDialogProps) {
  const { language } = useLanguage();
  const { offboardEmployee } = useEmployeeStore();
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitReason, setExitReason] = useState<EmployeeExitReason>('dismissal');
  const [exitNote, setExitNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setExitDate(new Date().toISOString().split('T')[0]);
      setExitReason('dismissal');
      setExitNote('');
    }
  }, [open, employee?.id]);

  const handleSubmit = async () => {
    if (!employee) return;

    const parsed = schema.safeParse({ exitDate, exitReason, exitNote });
    if (!parsed.success) {
      toast.error(
        language === 'pt'
          ? 'Preencha a data e um motivo (mín. 3 caracteres)'
          : 'Fill in the date and a reason (min. 3 characters)'
      );
      return;
    }

    setLoading(true);
    const result = await offboardEmployee(employee.id, {
      exitDate: parsed.data.exitDate,
      exitReason: parsed.data.exitReason,
      exitNote: parsed.data.exitNote,
      processedBy,
    });
    setLoading(false);

    if (result.success) {
      toast.success(
        language === 'pt'
          ? `${employee.firstName} ${employee.lastName} — saída registada`
          : `${employee.firstName} ${employee.lastName} — exit recorded`
      );
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || (language === 'pt' ? 'Falha ao registar saída' : 'Failed to record exit'));
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            {language === 'pt' ? 'Saída da empresa' : 'Left the company'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt'
              ? `${employee.firstName} ${employee.lastName} deixa de aparecer na folha activa. O histórico (dossier, deduções, folhas) mantém-se. O mesmo BI/NIF não pode ser registado de novo — use Recontratar se voltar.`
              : `${employee.firstName} ${employee.lastName} will no longer appear on active payroll. History is kept. The same ID cannot be registered again — use Rehire if they return.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="exitDate">{language === 'pt' ? 'Data de saída' : 'Exit date'}</Label>
            <Input
              id="exitDate"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Tipo de saída' : 'Exit type'}</Label>
            <Select value={exitReason} onValueChange={(v) => setExitReason(v as EmployeeExitReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_EXIT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {getExitReasonLabel(reason, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exitNote">
              {language === 'pt' ? 'Motivo / nota (obrigatório)' : 'Reason / note (required)'}
            </Label>
            <Textarea
              id="exitNote"
              value={exitNote}
              onChange={(e) => setExitNote(e.target.value)}
              placeholder={
                language === 'pt'
                  ? 'Ex.: despedimento por faltas, pedido de demissão, fim de contrato…'
                  : 'e.g. dismissal, resignation, contract end…'
              }
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {language === 'pt' ? 'Confirmar saída' : 'Confirm exit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
