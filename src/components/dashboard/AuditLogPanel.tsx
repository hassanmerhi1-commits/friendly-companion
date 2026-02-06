import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, FileText, Users, DollarSign, Settings, Trash2, Edit, Plus, Check, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore } from '@/stores/audit-store';
import type { AuditAction, AuditLogEntry } from '@/types/audit';
import { cn } from '@/lib/utils';

const actionIcons: Record<AuditAction, typeof Edit> = {
  payroll_calculated: DollarSign,
  payroll_approved: Check,
  payroll_reopened: Clock,
  payroll_paid: DollarSign,
  entry_updated: Edit,
  overtime_added: Plus,
  absence_recorded: Clock,
  deduction_applied: DollarSign,
  salary_changed: Edit,
  salary_adjusted: Edit,
  employee_hired: Plus,
  employee_terminated: Trash2,
  correction_applied: AlertTriangle,
};

const actionColors: Record<AuditAction, string> = {
  payroll_calculated: 'text-blue-500',
  payroll_approved: 'text-green-500',
  payroll_reopened: 'text-amber-500',
  payroll_paid: 'text-emerald-500',
  entry_updated: 'text-blue-500',
  overtime_added: 'text-purple-500',
  absence_recorded: 'text-orange-500',
  deduction_applied: 'text-red-500',
  salary_changed: 'text-blue-500',
  salary_adjusted: 'text-amber-500',
  employee_hired: 'text-green-500',
  employee_terminated: 'text-red-500',
  correction_applied: 'text-amber-500',
};

export function AuditLogPanel() {
  const { language } = useLanguage();
  const { logs, isLoaded, loadAuditLogs, getRecentLogs } = useAuditStore();
  
  useEffect(() => {
    if (!isLoaded) {
      loadAuditLogs();
    }
  }, [isLoaded, loadAuditLogs]);
  
  const recentLogs = getRecentLogs(15);
  
  const t = {
    title: language === 'pt' ? 'Registo de Auditoria' : 'Audit Log',
    noLogs: language === 'pt' ? 'Nenhum registo de auditoria' : 'No audit logs',
    actions: {
      payroll_calculated: language === 'pt' ? 'Folha calculada' : 'Payroll calculated',
      payroll_approved: language === 'pt' ? 'Folha aprovada' : 'Payroll approved',
      payroll_reopened: language === 'pt' ? 'Folha reaberta' : 'Payroll reopened',
      payroll_paid: language === 'pt' ? 'Folha paga' : 'Payroll paid',
      entry_updated: language === 'pt' ? 'Registo atualizado' : 'Entry updated',
      overtime_added: language === 'pt' ? 'Horas extra adicionadas' : 'Overtime added',
      absence_recorded: language === 'pt' ? 'Ausência registada' : 'Absence recorded',
      deduction_applied: language === 'pt' ? 'Desconto aplicado' : 'Deduction applied',
      salary_changed: language === 'pt' ? 'Salário alterado' : 'Salary changed',
      salary_adjusted: language === 'pt' ? 'Salário ajustado' : 'Salary adjusted',
      employee_hired: language === 'pt' ? 'Funcionário contratado' : 'Employee hired',
      employee_terminated: language === 'pt' ? 'Funcionário desligado' : 'Employee terminated',
      correction_applied: language === 'pt' ? 'Correção aplicada' : 'Correction applied',
    } as Record<AuditAction, string>,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return language === 'pt' ? 'agora' : 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {recentLogs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>{t.noLogs}</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-1 p-4 pt-0">
              {recentLogs.map((log: AuditLogEntry) => {
                const ActionIcon = actionIcons[log.action] || Edit;
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted">
                      <ActionIcon className={cn("h-4 w-4", actionColors[log.action] || 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">
                          {t.actions[log.action] || log.action}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.description}
                      </p>
                      {log.userName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'pt' ? 'Por' : 'By'}: {log.userName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
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
