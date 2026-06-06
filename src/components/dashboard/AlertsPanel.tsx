import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, X, Calendar, Gift, Clock, Wallet, Palmtree, Gavel, Scale } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAlertsStore, type AlertType, type AlertSeverity } from '@/stores/alerts-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useHolidayStore } from '@/stores/holiday-store';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useAbsenceStore } from '@/stores/absence-store';
import { useLoanStore } from '@/stores/loan-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { cn } from '@/lib/utils';

const alertIcons: Record<AlertType, typeof Bell> = {
  contract_expiry: Calendar,
  birthday: Gift,
  pending_approval: Clock,
  loan_payment: Wallet,
  absence_pending: Clock,
  excessive_absence: AlertTriangle,
  payroll_pending: Clock,
  budget_warning: AlertTriangle,
  holiday_upcoming: Palmtree,
  holiday_active: Palmtree,
  holiday_unscheduled: Calendar,
  disciplinary_process: Gavel,
  disciplinary_warning: Scale,
  deduction_outstanding: Wallet,
};

const severityStyles: Record<AlertSeverity, string> = {
  info: 'border-l-blue-500 bg-blue-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  critical: 'border-l-red-500 bg-red-500/5',
};

const severityBadge: Record<AlertSeverity, 'default' | 'secondary' | 'destructive'> = {
  info: 'secondary',
  warning: 'default',
  critical: 'destructive',
};

interface AlertsPanelProps {
  compact?: boolean;
  className?: string;
}

export function AlertsPanel({ compact = false, className }: AlertsPanelProps) {
  const { language } = useLanguage();
  const { alerts, generateAlerts, dismissAlert, markAsRead } = useAlertsStore();
  const employees = useEmployeeStore((s) => s.employees);
  const holidayRecords = useHolidayStore((s) => s.records);
  const disciplinaryRecords = useDisciplinaryStore((s) => s.records);
  const periods = usePayrollStore((s) => s.periods);
  const absences = useAbsenceStore((s) => s.absences);
  const loans = useLoanStore((s) => s.loans);
  const deductions = useDeductionStore((s) => s.deductions);
  const bulkEntries = useBulkAttendanceStore((s) => s.entries);

  useEffect(() => {
    void useHolidayStore.getState().loadHolidays();
    void useDisciplinaryStore.getState().loadRecords();
  }, []);

  useEffect(() => {
    generateAlerts(language);
  }, [
    language,
    generateAlerts,
    employees,
    holidayRecords,
    disciplinaryRecords,
    periods,
    absences,
    loans,
    deductions,
    bulkEntries,
  ]);

  const visibleAlerts = alerts.filter((a) => !a.isDismissed);
  
  const t = {
    title: language === 'pt' ? 'Alertas e Notificações' : 'Alerts & Notifications',
    noAlerts: language === 'pt' ? 'Nenhum alerta no momento' : 'No alerts at the moment',
    viewAll: language === 'pt' ? 'Ver todos' : 'View all',
    today: language === 'pt' ? 'Hoje' : 'Today',
    info: language === 'pt' ? 'Info' : 'Info',
    warning: language === 'pt' ? 'Aviso' : 'Warning',
    critical: language === 'pt' ? 'Crítico' : 'Critical',
  };

  const getSeverityLabel = (severity: AlertSeverity) => {
    const labels = { info: t.info, warning: t.warning, critical: t.critical };
    return labels[severity];
  };

  return (
    <Card className={cn(compact && 'h-full flex flex-col min-h-0 overflow-hidden', className)}>
      <CardHeader className={cn('pb-3', compact && 'shrink-0 py-3 px-4')}>
        <CardTitle className={cn('flex items-center gap-2', compact ? 'text-sm' : 'text-lg')}>
          <Bell className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          {t.title}
          {visibleAlerts.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{visibleAlerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('p-0', compact && 'flex-1 min-h-0 flex flex-col overflow-hidden')}>
        {visibleAlerts.length === 0 ? (
          <div className={cn('text-center text-muted-foreground', compact ? 'p-4' : 'p-6')}>
            <Bell className={cn('mx-auto mb-2 opacity-20', compact ? 'h-8 w-8' : 'h-10 w-10')} />
            <p className={compact ? 'text-sm' : undefined}>{t.noAlerts}</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'flex-1 min-h-0 h-full' : 'h-[350px]'}>
            <div className={cn('space-y-1', compact ? 'p-3 pt-0' : 'p-4 pt-0')}>
              {visibleAlerts.map(alert => {
                const Icon = alertIcons[alert.type] || Bell;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "relative flex items-start gap-3 rounded-lg border-l-4 transition-colors cursor-pointer",
                      compact ? 'p-2' : 'p-3',
                      severityStyles[alert.severity],
                      !alert.isRead && "font-medium"
                    )}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <Icon className={cn(
                      "mt-0.5 shrink-0",
                      compact ? 'h-4 w-4' : 'h-5 w-5',
                      alert.severity === 'critical' && "text-red-500",
                      alert.severity === 'warning' && "text-amber-500",
                      alert.severity === 'info' && "text-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('font-medium truncate', compact ? 'text-xs' : 'text-sm')}>{alert.title}</span>
                        <Badge variant={severityBadge[alert.severity]} className="text-[10px] shrink-0 px-1.5 py-0">
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                      </div>
                      <p className={cn('text-muted-foreground line-clamp-2', compact ? 'text-xs' : 'text-sm')}>
                        {alert.message}
                      </p>
                      {alert.dueDate && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(alert.dueDate).toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
