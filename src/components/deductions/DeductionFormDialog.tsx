import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { useDeductionStore } from '@/stores/deduction-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { formatAOA } from '@/lib/angola-labor-law';
import type { DeductionFormData, DeductionType } from '@/types/deduction';
import { toast } from 'sonner';

interface DeductionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeductionFormDialog({ open, onOpenChange }: DeductionFormDialogProps) {
  const { t, language } = useLanguage();
  const { addDeduction } = useDeductionStore();
  const { employees } = useEmployeeStore();
  const activeEmployees = employees.filter(emp => emp.status === 'active');

  const [formData, setFormData] = useState<DeductionFormData>({
    employeeId: '',
    type: 'salary_advance',
    description: '',
    totalAmount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        employeeId: '',
        type: 'salary_advance',
        description: '',
        totalAmount: 0,
        date: new Date().toISOString().split('T')[0],
        installments: 1,
      });
    }
  }, [open]);

  const monthlyAmount = formData.installments > 0 ? formData.totalAmount / formData.installments : formData.totalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDeduction(formData);
    toast.success(t.common.save);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.deductions.addDeduction}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.deductions.selectEmployee}</Label>
            <Select
              value={formData.employeeId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, employeeId: v }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={t.deductions.selectEmployee} />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.deductions.selectType}</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as DeductionType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary_advance">{t.deductions.salaryAdvance}</SelectItem>
                <SelectItem value="warehouse_loss">{t.deductions.warehouseLoss}</SelectItem>
                <SelectItem value="unjustified_absence">{language === 'pt' ? 'Falta Injustificada' : 'Unjustified Absence'}</SelectItem>
                <SelectItem value="loan">{t.deductions.loan}</SelectItem>
                <SelectItem value="disciplinary">{t.deductions.disciplinary}</SelectItem>
                <SelectItem value="other">{t.deductions.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.deductions.description}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'pt' ? 'Valor Total (Kz)' : 'Total Amount (Kz)'}</Label>
              <Input
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t.deductions.date}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Installments - available for ALL deduction types */}
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Número de Prestações' : 'Number of Installments'}</Label>
            <Select 
              value={String(formData.installments)} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, installments: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}x {n === 1 ? (language === 'pt' ? '(pagamento único)' : '(single payment)') : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show calculated monthly amount */}
          {formData.installments > 1 && formData.totalAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Desconto mensal:' : 'Monthly deduction:'}
                </span>
                <span className="font-semibold text-destructive">
                  {formatAOA(monthlyAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Durante:' : 'Over:'}
                </span>
                <span className="font-medium">
                  {formData.installments} {language === 'pt' ? 'meses' : 'months'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
