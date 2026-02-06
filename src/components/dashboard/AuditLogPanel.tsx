import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, FileText, Users, DollarSign, Settings, Trash2, Edit, Plus, LogIn, LogOut, Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore, type AuditAction, type AuditEntity } from '@/stores/audit-store';
import { cn } from '@/lib/utils';

const actionIcons: Record<AuditAction, typeof Edit> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  approve: Check,
  reject: X,
  process: DollarSign,
  export: FileText,
};

const actionColors: Record<AuditAction, string> = {
  create: 'text-green-500',
  update: 'text-blue-500',
  delete: 'text-red-500',
  login: 'text-emerald-500',
  logout: 'text-gray-500',
  approve: 'text-green-500',
  reject: 'text-red-500',
  process: 'text-amber-500',
  export: 'text-purple-500',
};

const entityIcons: Record<AuditEntity, typeof Users> = {
  employee: Users,
  payroll: DollarSign,
  deduction: DollarSign,
  branch: Settings,
  user: User,
  settings: Settings,
  absence: FileText,
  loan: DollarSign,
  termination: FileText,
};

export function AuditLogPanel() {
  const { language } = useLanguage();
  const { logs, isLoaded, loadLogs, getRecentLogs } = useAuditStore();
  
  useEffect(() => {
    if (!isLoaded) {
      loadLogs();
    }
  }, [isLoaded, loadLogs]);
  
  const recentLogs = getRecentLogs(15);
  
  const t = {
    title: language === 'pt' ? 'Registo de Auditoria' : 'Audit Log',
    noLogs: language === 'pt' ? 'Nenhum registo de auditoria' : 'No audit logs',
    actions: {
      create: language === 'pt' ? 'Criou' : 'Created',
      update: language === 'pt' ? 'Atualizou' : 'Updated',
      delete: language === 'pt' ? 'Eliminou' : 'Deleted',
      login: language === 'pt' ? 'Entrou' : 'Logged in',
      logout: language === 'pt' ? 'Saiu' : 'Logged out',
      approve: language === 'pt' ? 'Aprovou' : 'Approved',
      reject: language === 'pt' ? 'Rejeitou' : 'Rejected',
      process: language === 'pt' ? 'Processou' : 'Processed',
      export: language === 'pt' ? 'Exportou' : 'Exported',
    },
    entities: {
      employee: language === 'pt' ? 'funcionário' : 'employee',
      payroll: language === 'pt' ? 'folha salarial' : 'payroll',
      deduction: language === 'pt' ? 'desconto' : 'deduction',
      branch: language === 'pt' ? 'filial' : 'branch',
      user: language === 'pt' ? 'utilizador' : 'user',
      settings: language === 'pt' ? 'configurações' : 'settings',
      absence: language === 'pt' ? 'ausência' : 'absence',
      loan: language === 'pt' ? 'empréstimo' : 'loan',
      termination: language === 'pt' ? 'rescisão' : 'termination',
    },
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
              {recentLogs.map(log => {
                const ActionIcon = actionIcons[log.action];
                const EntityIcon = entityIcons[log.entity];
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      "bg-muted"
                    )}>
                      <ActionIcon className={cn("h-4 w-4", actionColors[log.action])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{log.userName}</span>
                        <span className="text-muted-foreground">
                          {t.actions[log.action]} {t.entities[log.entity]}
                        </span>
                      </div>
                      {log.entityName && (
                        <p className="text-sm text-muted-foreground truncate">
                          {log.entityName}
                        </p>
                      )}
                      {log.details && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {log.details}
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
