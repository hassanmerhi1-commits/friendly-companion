import { useState, useEffect, useMemo } from 'react';
import { EmployeeSearchSelect } from "@/components/EmployeeSearchSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { useDeductionStore } from '@/stores/deduction-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { calculatePayroll, formatAOA } from '@/lib/angola-labor-law';
import type { DeductionFormData, DeductionType } from '@/types/deduction';
import { toast } from 'sonner';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Angolan Labor Law: Maximum deduction for warehouse loss = 25% of net salary
const WAREHOUSE_LOSS_MAX_RATE = 0.25;

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

  // Monthly prestação amount (user sets this manually)
  const [monthlyPrestacao, setMonthlyPrestacao] = useState<number>(0);
  const [manualOverride, setManualOverride] = useState(false);

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
      setMonthlyPrestacao(0);
      setManualOverride(false);
    }
  }, [open]);

  // Calculate net salary for selected employee
  const employeeNetSalary = useMemo(() => {
    if (!formData.employeeId) return 0;
    const emp = employees.find(e => e.id === formData.employeeId);
    if (!emp) return 0;

    const result = calculatePayroll({
      baseSalary: emp.baseSalary,
      mealAllowance: emp.mealAllowance,
      transportAllowance: emp.transportAllowance,
      otherAllowances: (emp.otherAllowances || 0) + (emp.monthlyBonus || 0),
      familyAllowanceValue: emp.familyAllowance || 0,
      isRetired: emp.isRetired,
      isColaborador: emp.contractType === 'colaborador',
    });
    return result.netSalary;
  }, [formData.employeeId, employees]);

  // 25% of net salary for warehouse loss
  const warehouseLossMaxMonthly = useMemo(() => {
    return Math.round(employeeNetSalary * WAREHOUSE_LOSS_MAX_RATE);
  }, [employeeNetSalary]);

  // Auto-calculate installments for warehouse loss when not in manual mode
  const isWarehouseLoss = formData.type === 'warehouse_loss';

  // Auto-calculate installments from monthly prestação
  const calculatedInstallments = useMemo(() => {
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0 && formData.totalAmount > 0) {
      return Math.max(1, Math.ceil(formData.totalAmount / warehouseLossMaxMonthly));
    }
    if (monthlyPrestacao > 0 && formData.totalAmount > 0) {
      return Math.max(1, Math.ceil(formData.totalAmount / monthlyPrestacao));
    }
    return 1;
  }, [isWarehouseLoss, manualOverride, warehouseLossMaxMonthly, formData.totalAmount, monthlyPrestacao]);

  // Effective monthly amount
  const effectiveMonthly = useMemo(() => {
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0) {
      return warehouseLossMaxMonthly;
    }
    return monthlyPrestacao > 0 ? monthlyPrestacao : formData.totalAmount;
  }, [isWarehouseLoss, manualOverride, warehouseLossMaxMonthly, monthlyPrestacao, formData.totalAmount]);

  // Calculate what the last installment would be
  const lastInstallmentAmount = useMemo(() => {
    if (calculatedInstallments > 1 && formData.totalAmount > 0) {
      return Math.max(0, formData.totalAmount - (effectiveMonthly * (calculatedInstallments - 1)));
    }
    return effectiveMonthly;
  }, [calculatedInstallments, formData.totalAmount, effectiveMonthly]);

  // Duration display
  const durationText = useMemo(() => {
    if (calculatedInstallments <= 1) return '';
    const years = Math.floor(calculatedInstallments / 12);
    const months = calculatedInstallments % 12;
    if (language === 'pt') {
      if (years > 0 && months > 0) return `${years} ano${years > 1 ? 's' : ''} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
      if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`;
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    if (years > 0 && months > 0) return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`;
    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${months} month${months > 1 ? 's' : ''}`;
  }, [calculatedInstallments, language]);

  // For warehouse loss, check if monthly exceeds 25% limit (only relevant in manual mode)
  const exceedsLimit = isWarehouseLoss && manualOverride && monthlyPrestacao > 0
    && monthlyPrestacao > warehouseLossMaxMonthly && warehouseLossMaxMonthly > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWarehouseLoss || manualOverride) {
      if (monthlyPrestacao <= 0 && formData.totalAmount > 0) {
        toast.error(language === 'pt' ? 'Informe o valor da prestação mensal' : 'Enter the monthly installment amount');
        return;
      }
    }
    const submitData: DeductionFormData = {
      ...formData,
      installments: calculatedInstallments,
      monthlyAmount: effectiveMonthly,
    };
    addDeduction(submitData);
    toast.success(t.common.save);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.deductions.addDeduction}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.deductions.selectEmployee}</Label>
            <EmployeeSearchSelect
              employees={activeEmployees}
              value={formData.employeeId}
              onSelect={(v) => setFormData(prev => ({ ...prev, employeeId: v }))}
              placeholder={t.deductions.selectEmployee}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.deductions.selectType}</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => {
                setFormData(prev => ({ ...prev, type: v as DeductionType }));
                setManualOverride(false);
              }}
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

          {/* Warehouse Loss - Law info banner (always rendered to avoid DOM conflicts with Radix portals) */}
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

              {/* Manual override toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                <Label htmlFor="manual-override" className="text-xs cursor-pointer">
                  {language === 'pt' ? 'Valor personalizado (ignorar 25%)' : 'Custom amount (override 25%)'}
                </Label>
                <Switch
                  id="manual-override"
                  checked={manualOverride}
                  onCheckedChange={setManualOverride}
                />
              </div>
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
              <Label>
                {isWarehouseLoss
                  ? (language === 'pt' ? 'Valor da Perda (Kz)' : 'Loss Amount (Kz)')
                  : (language === 'pt' ? 'Valor Total (Kz)' : 'Total Amount (Kz)')}
              </Label>
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

          {/* Monthly Prestação */}
          <div className="space-y-2">
            <Label>
              {language === 'pt' ? 'Prestação Mensal (Kz)' : 'Monthly Installment (Kz)'}
            </Label>
            {isWarehouseLoss && !manualOverride ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={warehouseLossMaxMonthly}
                  readOnly
                  className="bg-muted"
                />
                <Badge variant="outline" className="whitespace-nowrap text-xs">
                  {language === 'pt' ? 'Auto (25%)' : 'Auto (25%)'}
                </Badge>
              </div>
            ) : (
              <Input
                type="number"
                min={1}
                value={monthlyPrestacao || ''}
                onChange={(e) => setMonthlyPrestacao(Number(e.target.value))}
                placeholder={language === 'pt' ? 'Quanto por mês?' : 'How much per month?'}
                required
              />
            )}
          </div>

          {/* Show calculated summary */}
          {formData.totalAmount > 0 && (effectiveMonthly > 0 || (isWarehouseLoss && !manualOverride)) && (
            <div className={`p-3 rounded-lg ${exceedsLimit ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted'}`}>
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
                <span className={`font-semibold ${exceedsLimit ? 'text-destructive' : 'text-foreground'}`}>
                  {formatAOA(effectiveMonthly)}
                </span>
              </div>
              {calculatedInstallments > 1 && (
                <>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">
                      {language === 'pt' ? 'Prestações:' : 'Installments:'}
                    </span>
                    <span className="font-medium">
                      {calculatedInstallments}x {durationText ? `(~${durationText})` : ''}
                    </span>
                  </div>
                  {Math.abs(lastInstallmentAmount - effectiveMonthly) > 1 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">
                        {language === 'pt' ? 'Última prestação:' : 'Last installment:'}
                      </span>
                      <span className="font-medium text-accent">
                        {formatAOA(lastInstallmentAmount)}
                      </span>
                    </div>
                  )}
                </>
              )}
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
