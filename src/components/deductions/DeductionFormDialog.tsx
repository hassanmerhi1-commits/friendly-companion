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
import type { DeductionFormData, DeductionType } from '@/types/deduction';
import { toast } from 'sonner';

interface DeductionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeductionFormDialog({ open, onOpenChange }: DeductionFormDialogProps) {
  const { t, language } = useLanguage();
  const { addDeduction } = useDeductionStore();
  const { employees, getActiveEmployees } = useEmployeeStore();
  const activeEmployees = getActiveEmployees();

  const [formData, setFormData] = useState<DeductionFormData>({
    employeeId: '',
    type: 'salary_advance',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        employeeId: '',
        type: 'salary_advance',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        installments: 1,
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDeduction(formData);
    toast.success(t.common.save);
    onOpenChange(false);
  };

  const getTypeLabel = (type: DeductionType) => {
    const labels: Record<DeductionType, string> = {
      salary_advance: t.deductions.salaryAdvance,
      warehouse_loss: t.deductions.warehouseLoss,
      unjustified_absence: language === 'pt' ? 'Falta Injustificada' : 'Unjustified Absence',
      loan: t.deductions.loan,
      disciplinary: t.deductions.disciplinary,
      other: t.deductions.other,
    };
    return labels[type];
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
              <Label>{t.deductions.amount} (Kz)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
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

          {(formData.type === 'salary_advance' || formData.type === 'loan') && (
            <div className="space-y-2">
              <Label>{t.deductions.installments}</Label>
              <Input
                type="number"
                min="1"
                value={formData.installments || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, installments: Number(e.target.value) }))}
              />
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
