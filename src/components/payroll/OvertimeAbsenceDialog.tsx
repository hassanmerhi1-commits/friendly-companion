import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { LABOR_LAW, formatAOA, calculateHourlyRate } from "@/lib/angola-labor-law";
import { Clock, AlertTriangle } from "lucide-react";
import type { PayrollEntry } from "@/types/payroll";

interface OvertimeAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PayrollEntry | null;
}

export function OvertimeAbsenceDialog({ open, onOpenChange, entry }: OvertimeAbsenceDialogProps) {
  const { language } = useLanguage();
  const { updateAbsences, updateOvertime } = usePayrollStore();
  
  const [daysAbsent, setDaysAbsent] = useState(0);
  const [hoursNormal, setHoursNormal] = useState(0);
  const [hoursNight, setHoursNight] = useState(0);
  const [hoursHoliday, setHoursHoliday] = useState(0);
  
  useEffect(() => {
    if (entry) {
      setDaysAbsent(entry.daysAbsent || 0);
      setHoursNormal(entry.overtimeHoursNormal || 0);
      setHoursNight(entry.overtimeHoursNight || 0);
      setHoursHoliday(entry.overtimeHoursHoliday || 0);
    }
  }, [entry]);
  
  if (!entry) return null;
  
  const hourlyRate = calculateHourlyRate(entry.baseSalary);
  const dailyRate = entry.baseSalary / LABOR_LAW.WORKING_DAYS_PER_MONTH;
  
  // Calculate preview values
  const absenceDeductionPreview = Math.round(dailyRate * daysAbsent);
  
  // Overtime calculations with progressive rates
  const overtimeNormalFirst30 = Math.min(hoursNormal, LABOR_LAW.OVERTIME.THRESHOLD_HOURS);
  const overtimeNormalOver30 = Math.max(0, hoursNormal - LABOR_LAW.OVERTIME.THRESHOLD_HOURS);
  const overtimeNormalPreview = Math.round(
    hourlyRate * overtimeNormalFirst30 * LABOR_LAW.OVERTIME.NORMAL_RATE_FIRST_30 +
    hourlyRate * overtimeNormalOver30 * LABOR_LAW.OVERTIME.NORMAL_RATE_OVER_30
  );
  const overtimeNightPreview = Math.round(hourlyRate * hoursNight * LABOR_LAW.OVERTIME.NIGHT_RATE);
  const overtimeHolidayPreview = Math.round(hourlyRate * hoursHoliday * LABOR_LAW.OVERTIME.HOLIDAY_RATE);
  const totalOvertimePreview = overtimeNormalPreview + overtimeNightPreview + overtimeHolidayPreview;
  
  const totalHoursMonth = hoursNormal + hoursNight + hoursHoliday;
  const exceedsMonthlyLimit = totalHoursMonth > LABOR_LAW.OVERTIME.MONTHLY_LIMIT;
  
  const handleSave = () => {
    if (entry) {
      updateAbsences(entry.id, daysAbsent);
      updateOvertime(entry.id, hoursNormal, hoursNight, hoursHoliday);
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {language === 'pt' ? 'Horas Extra e Faltas' : 'Overtime & Absences'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-sm text-muted-foreground">
            <strong>{entry.employee?.firstName} {entry.employee?.lastName}</strong>
            <br />
            {language === 'pt' ? 'Salário Base:' : 'Base Salary:'} {formatAOA(entry.baseSalary)}
            <br />
            {language === 'pt' ? 'Taxa Horária:' : 'Hourly Rate:'} {formatAOA(Math.round(hourlyRate))}
            <br />
            {language === 'pt' ? 'Taxa Diária:' : 'Daily Rate:'} {formatAOA(Math.round(dailyRate))} (22 {language === 'pt' ? 'dias/mês' : 'days/month'})
          </div>
          
          {/* Absences Section */}
          <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-semibold text-destructive">
              {language === 'pt' ? 'Faltas (Desconto)' : 'Absences (Deduction)'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'pt' ? 'Dias de Falta' : 'Days Absent'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="22"
                  value={daysAbsent}
                  onChange={(e) => setDaysAbsent(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <div>
                <Label>{language === 'pt' ? 'Desconto' : 'Deduction'}</Label>
                <div className="h-10 flex items-center font-mono text-destructive">
                  -{formatAOA(absenceDeductionPreview)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Overtime Section */}
          <div className="space-y-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <h4 className="font-semibold text-accent-foreground">
              {language === 'pt' ? 'Horas Extraordinárias' : 'Overtime Hours'}
            </h4>
            
            {exceedsMonthlyLimit && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                {language === 'pt' 
                  ? `Limite mensal de ${LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h ultrapassado!` 
                  : `Monthly limit of ${LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h exceeded!`}
              </div>
            )}
            
            {/* Normal Overtime */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'pt' ? 'Normal' : 'Normal'}</span>
                <span>
                  {language === 'pt' ? 'Até 30h: +50%' : 'Up to 30h: +50%'} | 
                  {language === 'pt' ? ' Acima 30h: +75%' : ' Over 30h: +75%'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hoursNormal}
                    onChange={(e) => setHoursNormal(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={language === 'pt' ? 'Horas' : 'Hours'}
                  />
                </div>
                <div className="flex items-center font-mono text-primary">
                  +{formatAOA(overtimeNormalPreview)}
                </div>
              </div>
            </div>
            
            {/* Night Overtime */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'pt' ? 'Nocturno (20h-06h)' : 'Night (8pm-6am)'}</span>
                <span>+75%</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hoursNight}
                    onChange={(e) => setHoursNight(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={language === 'pt' ? 'Horas' : 'Hours'}
                  />
                </div>
                <div className="flex items-center font-mono text-primary">
                  +{formatAOA(overtimeNightPreview)}
                </div>
              </div>
            </div>
            
            {/* Holiday/Rest Day Overtime */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'pt' ? 'Feriado/Descanso' : 'Holiday/Rest Day'}</span>
                <span>+100%</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hoursHoliday}
                    onChange={(e) => setHoursHoliday(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={language === 'pt' ? 'Horas' : 'Hours'}
                  />
                </div>
                <div className="flex items-center font-mono text-primary">
                  +{formatAOA(overtimeHolidayPreview)}
                </div>
              </div>
            </div>
            
            {/* Total Overtime */}
            <div className="pt-2 border-t border-accent/20">
              <div className="flex justify-between font-semibold">
                <span>
                  {language === 'pt' ? 'Total Horas Extra' : 'Total Overtime'}
                  <span className="font-normal text-sm text-muted-foreground ml-2">
                    ({totalHoursMonth}h)
                  </span>
                </span>
                <span className="font-mono text-primary">+{formatAOA(totalOvertimePreview)}</span>
              </div>
            </div>
          </div>
          
          {/* Net Impact Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between font-semibold">
              <span>{language === 'pt' ? 'Impacto Líquido' : 'Net Impact'}</span>
              <span className={`font-mono ${totalOvertimePreview - absenceDeductionPreview >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {totalOvertimePreview - absenceDeductionPreview >= 0 ? '+' : ''}
                {formatAOA(totalOvertimePreview - absenceDeductionPreview)}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {language === 'pt' ? 'Guardar' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}