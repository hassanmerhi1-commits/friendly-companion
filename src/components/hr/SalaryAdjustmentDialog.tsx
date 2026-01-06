import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useHRStore } from "@/stores/hr-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import type { AdjustmentType } from "@/types/hr";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
  onSuccess?: () => void;
}

export function SalaryAdjustmentDialog({ open, onOpenChange, preselectedEmployeeId, onSuccess }: Props) {
  const { language } = useLanguage();
  const { currentUser } = useAuthStore();
  const { employees } = useEmployeeStore();
  const { requestSalaryAdjustment } = useHRStore();
  
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [type, setType] = useState<AdjustmentType>("raise");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSalary, setNewSalary] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const selectedEmployee = employees.find(e => e.id === employeeId);
  
  const newSalaryNum = parseFloat(newSalary) || 0;
  const changeAmount = selectedEmployee ? newSalaryNum - selectedEmployee.baseSalary : 0;
  const changePercent = selectedEmployee && selectedEmployee.baseSalary > 0
    ? (changeAmount / selectedEmployee.baseSalary) * 100
    : 0;

  const getTypeLabel = (t: AdjustmentType) => {
    const labels: Record<AdjustmentType, { pt: string; en: string }> = {
      raise: { pt: 'Aumento Salarial', en: 'Salary Raise' },
      promotion: { pt: 'Promoção', en: 'Promotion' },
      demotion: { pt: 'Redução', en: 'Demotion' },
      correction: { pt: 'Correcção', en: 'Correction' },
      annual_review: { pt: 'Revisão Anual', en: 'Annual Review' },
    };
    return language === 'pt' ? labels[t].pt : labels[t].en;
  };

  const handleSubmit = async () => {
    if (!employeeId || !newSalary || !reason || !currentUser) {
      toast.error(language === 'pt' ? 'Preencha todos os campos obrigatórios' : 'Fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestSalaryAdjustment({
        employeeId,
        type,
        effectiveDate,
        newSalary: newSalaryNum,
        reason,
        newPosition: type === 'promotion' ? newPosition : undefined,
      }, currentUser.name);

      if (result.success) {
        toast.success(
          language === 'pt' 
            ? 'Solicitação de ajuste criada com sucesso!' 
            : 'Adjustment request created successfully!'
        );
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setEmployeeId("");
        setType("raise");
        setNewSalary("");
        setNewPosition("");
        setReason("");
      } else {
        toast.error(result.error || 'Error creating adjustment');
      }
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast.error(language === 'pt' ? 'Erro ao criar ajuste' : 'Error creating adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === 'pt' ? 'Novo Ajuste Salarial' : 'New Salary Adjustment'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Solicite um ajuste salarial que será submetido para aprovação.' 
              : 'Request a salary adjustment that will be submitted for approval.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Colaborador' : 'Employee'} *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'pt' ? 'Selecionar colaborador...' : 'Select employee...'} />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {formatAOA(emp.baseSalary)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Tipo de Ajuste' : 'Adjustment Type'} *</Label>
            <Select value={type} onValueChange={(v: AdjustmentType) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raise">{getTypeLabel('raise')}</SelectItem>
                <SelectItem value="promotion">{getTypeLabel('promotion')}</SelectItem>
                <SelectItem value="demotion">{getTypeLabel('demotion')}</SelectItem>
                <SelectItem value="correction">{getTypeLabel('correction')}</SelectItem>
                <SelectItem value="annual_review">{getTypeLabel('annual_review')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Data de Efeito' : 'Effective Date'} *</Label>
            <Input 
              type="date" 
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {/* Current vs New Salary */}
          {selectedEmployee && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Salário Actual:' : 'Current Salary:'}
                </span>
                <span className="font-medium">{formatAOA(selectedEmployee.baseSalary)}</span>
              </div>
              
              <div className="space-y-2">
                <Label>{language === 'pt' ? 'Novo Salário' : 'New Salary'} *</Label>
                <Input 
                  type="number"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="0"
                />
              </div>

              {newSalaryNum > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Diferença:' : 'Difference:'}
                  </span>
                  <div className="flex items-center gap-2">
                    {changeAmount >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`font-medium ${changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {changeAmount >= 0 ? '+' : ''}{formatAOA(changeAmount)} ({changePercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Position (for promotions) */}
          {type === 'promotion' && (
            <div className="space-y-2">
              <Label>{language === 'pt' ? 'Novo Cargo' : 'New Position'}</Label>
              <Input 
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder={language === 'pt' ? 'Ex: Gerente de Vendas' : 'Ex: Sales Manager'}
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Justificação' : 'Reason'} *</Label>
            <Textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'pt' ? 'Descreva o motivo do ajuste...' : 'Describe the reason for adjustment...'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting 
              ? (language === 'pt' ? 'A enviar...' : 'Submitting...') 
              : (language === 'pt' ? 'Solicitar Ajuste' : 'Request Adjustment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
