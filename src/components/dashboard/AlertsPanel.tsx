import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, Info, X, Calendar, Gift, Clock, Wallet } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAlertsStore, type AlertType, type AlertSeverity } from '@/stores/alerts-store';
import { cn } from '@/lib/utils';

const alertIcons: Record<AlertType, typeof Bell> = {
  contract_expiry: Calendar,
  birthday: Gift,
  pending_approval: Clock,
  loan_payment: Wallet,
  absence_pending: Clock,
  payroll_pending: Clock,
  budget_warning: AlertTriangle,
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

export function AlertsPanel() {
  const { language } = useLanguage();
  const { alerts, isLoaded, generateAlerts, dismissAlert, markAsRead } = useAlertsStore();
  
  useEffect(() => {
    if (!isLoaded) {
      generateAlerts();
    }
  }, [isLoaded, generateAlerts]);
  
  const visibleAlerts = alerts.filter(a => !a.isDismissed).slice(0, 10);
  
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t.title}
          {visibleAlerts.length > 0 && (
            <Badge variant="secondary" className="ml-2">{visibleAlerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visibleAlerts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>{t.noAlerts}</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-1 p-4 pt-0">
              {visibleAlerts.map(alert => {
                const Icon = alertIcons[alert.type] || Bell;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors cursor-pointer",
                      severityStyles[alert.severity],
                      !alert.isRead && "font-medium"
                    )}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mt-0.5 shrink-0",
                      alert.severity === 'critical' && "text-red-500",
                      alert.severity === 'warning' && "text-amber-500",
                      alert.severity === 'info' && "text-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                        <Badge variant={severityBadge[alert.severity]} className="text-xs shrink-0">
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      {alert.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
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
                      <X className="h-4 w-4" />
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
