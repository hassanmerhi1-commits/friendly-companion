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

  useEffect(() => {
    if (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0 && formData.totalAmount > 0) {
      const installments = Math.max(1, Math.ceil(formData.totalAmount / warehouseLossMaxMonthly));
      setFormData(prev => ({ ...prev, installments }));
    }
  }, [isWarehouseLoss, manualOverride, warehouseLossMaxMonthly, formData.totalAmount]);

  // For warehouse loss auto mode, the monthly deduction is exactly the 25% cap value
  // But the last installment should only be the remaining balance
  const rawMonthlyAmount = (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0)
    ? warehouseLossMaxMonthly
    : (formData.installments > 0 ? formData.totalAmount / formData.installments : formData.totalAmount);
  const monthlyAmount = rawMonthlyAmount;
  
  // Calculate what the last installment would be
  const lastInstallmentAmount = (formData.installments > 1 && formData.totalAmount > 0)
    ? Math.max(0, formData.totalAmount - (rawMonthlyAmount * (formData.installments - 1)))
    : rawMonthlyAmount;

  // For warehouse loss, check if monthly exceeds 25% limit (only relevant in manual mode)
  const exceedsLimit = isWarehouseLoss && manualOverride && formData.installments > 0 
    && (formData.totalAmount / formData.installments) > warehouseLossMaxMonthly && warehouseLossMaxMonthly > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For warehouse loss in auto mode, pass the exact 25% monthly amount
    const submitData: DeductionFormData = {
      ...formData,
      monthlyAmount: (isWarehouseLoss && !manualOverride && warehouseLossMaxMonthly > 0)
        ? warehouseLossMaxMonthly
        : undefined,
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

          {/* Installments */}
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
          </div>

          {/* Show calculated monthly amount */}
          {formData.totalAmount > 0 && (
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
