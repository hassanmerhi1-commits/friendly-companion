import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useLanguage } from "@/lib/i18n";
import { LABOR_LAW, formatAOA, calculateHourlyRate, calculateOvertime } from "@/lib/angola-labor-law";
import { format, subMonths } from "date-fns";

export function OvertimeTracker() {
  const { language } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const { employees } = useEmployeeStore();
  const { getOvertimeSummary } = useAttendanceStore();

  const t = {
    title: language === 'pt' ? 'Horas Extraordinárias' : 'Overtime Tracking',
    description: language === 'pt' ? 'Controlo de horas extra mensais' : 'Monthly overtime control',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    normalHours: language === 'pt' ? 'Horas Normais' : 'Normal Hours',
    nightHours: language === 'pt' ? 'Horas Nocturnas' : 'Night Hours',
    holidayHours: language === 'pt' ? 'Feriados/Fins-de-semana' : 'Holiday/Weekend',
    totalHours: language === 'pt' ? 'Total Horas' : 'Total Hours',
    estimatedValue: language === 'pt' ? 'Valor Estimado' : 'Estimated Value',
    limitWarning: language === 'pt' ? 'Limite mensal' : 'Monthly limit',
    threshold: language === 'pt' ? 'Limiar 50%/75%' : '50%/75% Threshold',
    monthlyLimit: language === 'pt' ? 'Limite mensal' : 'Monthly limit',
    annualLimit: language === 'pt' ? 'Limite anual' : 'Annual limit',
    hours: language === 'pt' ? 'horas' : 'hours',
    noData: language === 'pt' ? 'Sem dados de horas extra' : 'No overtime data',
    legalInfo: {
      title: language === 'pt' ? 'Informação Legal' : 'Legal Information',
      threshold30: language === 'pt' 
        ? 'Até 30h/mês: +50% (1.5x do salário horário)' 
        : 'Up to 30h/month: +50% (1.5x hourly rate)',
      above30: language === 'pt' 
        ? 'Acima de 30h/mês: +75% (1.75x do salário horário)' 
        : 'Above 30h/month: +75% (1.75x hourly rate)',
      night: language === 'pt' 
        ? 'Horas nocturnas (20h-06h): +75%' 
        : 'Night hours (20h-06h): +75%',
      holiday: language === 'pt' 
        ? 'Feriados/descanso: +100% (2x do salário horário)' 
        : 'Holidays/rest: +100% (2x hourly rate)',
    },
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const activeEmployees = employees.filter(e => e.status === 'active');

  const overtimeData = activeEmployees.map(employee => {
    const summary = getOvertimeSummary(employee.id, month - 1, year);
    const hourlyRate = calculateHourlyRate(employee.baseSalary);
    
    // Calculate estimated overtime value
    const normalValue = calculateOvertime(hourlyRate, summary.normalHours, 'normal', 0);
    const nightValue = calculateOvertime(hourlyRate, summary.nightHours, 'night');
    const holidayValue = calculateOvertime(hourlyRate, summary.holidayHours, 'holiday');
    const totalValue = normalValue + nightValue + holidayValue;
    
    const limitProgress = (summary.totalHours / LABOR_LAW.OVERTIME.MONTHLY_LIMIT) * 100;
    const thresholdProgress = (summary.normalHours / LABOR_LAW.OVERTIME.THRESHOLD_HOURS) * 100;
    
    return {
      employee,
      summary,
      hourlyRate,
      totalValue,
      limitProgress,
      thresholdProgress,
      isNearLimit: summary.totalHours >= LABOR_LAW.OVERTIME.MONTHLY_LIMIT * 0.8,
      exceedsLimit: summary.totalHours > LABOR_LAW.OVERTIME.MONTHLY_LIMIT,
      aboveThreshold: summary.normalHours > LABOR_LAW.OVERTIME.THRESHOLD_HOURS,
    };
  }).filter(d => d.summary.totalHours > 0);

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  return (
    <div className="space-y-6">
      {/* Legal Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t.legalInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-muted-foreground">{t.legalInfo.threshold30}</p>
              <p className="text-muted-foreground">{t.legalInfo.above30}</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">{t.legalInfo.night}</p>
              <p className="text-muted-foreground">{t.legalInfo.holiday}</p>
            </div>
            <div className="col-span-full flex gap-6 pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground">{t.monthlyLimit}:</span>
                <span className="ml-2 font-medium">{LABOR_LAW.OVERTIME.MONTHLY_LIMIT} {t.hours}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t.annualLimit}:</span>
                <span className="ml-2 font-medium">{LABOR_LAW.OVERTIME.ANNUAL_LIMIT} {t.hours}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t.threshold}:</span>
                <span className="ml-2 font-medium">{LABOR_LAW.OVERTIME.THRESHOLD_HOURS} {t.hours}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.title}
              </CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {overtimeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.noData}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead className="text-center">{t.normalHours}</TableHead>
                    <TableHead className="text-center">{t.nightHours}</TableHead>
                    <TableHead className="text-center">{t.holidayHours}</TableHead>
                    <TableHead className="text-center">{t.totalHours}</TableHead>
                    <TableHead className="text-right">{t.estimatedValue}</TableHead>
                    <TableHead>{t.limitWarning}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeData.map(({ employee, summary, totalValue, limitProgress, exceedsLimit, isNearLimit, aboveThreshold }) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                          <p className="text-xs text-muted-foreground">{employee.position}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">
                          {summary.normalHours.toFixed(1)}h
                        </span>
                        {aboveThreshold && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            +75%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {summary.nightHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {summary.holidayHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-medium">
                          {summary.totalHours.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAOA(totalValue)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={Math.min(limitProgress, 100)} 
                            className={exceedsLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-orange-500" : ""}
                          />
                          <div className="flex items-center gap-1">
                            {exceedsLimit && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {summary.totalHours.toFixed(0)}/{LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
