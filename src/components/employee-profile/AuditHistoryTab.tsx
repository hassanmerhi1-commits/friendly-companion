import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore } from '@/stores/audit-store';
import { formatFieldName } from '@/lib/audit-helper';
import { format } from 'date-fns';
import { useState } from 'react';
import type { AuditAction } from '@/types/audit';

interface AuditHistoryTabProps {
  employeeId: string;
}

const actionLabels: Record<AuditAction, { pt: string; en: string }> = {
  payroll_calculated: { pt: 'Folha Calculada', en: 'Payroll Calculated' },
  payroll_approved: { pt: 'Folha Aprovada', en: 'Payroll Approved' },
  payroll_reopened: { pt: 'Folha Reaberta', en: 'Payroll Reopened' },
  payroll_paid: { pt: 'Folha Paga', en: 'Payroll Paid' },
  entry_updated: { pt: 'Entrada Editada', en: 'Entry Updated' },
  overtime_added: { pt: 'Horas Extra', en: 'Overtime Added' },
  absence_recorded: { pt: 'Ausência Registada', en: 'Absence Recorded' },
  absence_justified: { pt: 'Ausência Justificada', en: 'Absence Justified' },
  absence_rejected: { pt: 'Ausência Rejeitada', en: 'Absence Rejected' },
  absence_approved: { pt: 'Ausência Aprovada', en: 'Absence Approved' },
  absence_deleted: { pt: 'Ausência Eliminada', en: 'Absence Deleted' },
  deduction_applied: { pt: 'Dedução Aplicada', en: 'Deduction Applied' },
  deduction_created: { pt: 'Dedução Criada', en: 'Deduction Created' },
  deduction_updated: { pt: 'Dedução Editada', en: 'Deduction Updated' },
  deduction_deleted: { pt: 'Dedução Eliminada', en: 'Deduction Deleted' },
  deduction_paid: { pt: 'Dedução Paga', en: 'Deduction Paid' },
  salary_changed: { pt: 'Salário Alterado', en: 'Salary Changed' },
  salary_adjusted: { pt: 'Ajuste Salarial', en: 'Salary Adjusted' },
  employee_created: { pt: 'Criação', en: 'Created' },
  employee_updated: { pt: 'Editado', en: 'Updated' },
  employee_hired: { pt: 'Contratado', en: 'Hired' },
  employee_terminated: { pt: 'Desligado', en: 'Terminated' },
  employee_approved: { pt: 'Aprovado', en: 'Approved' },
  employee_deleted: { pt: 'Eliminado', en: 'Deleted' },
  loan_created: { pt: 'Empréstimo Criado', en: 'Loan Created' },
  loan_updated: { pt: 'Empréstimo Editado', en: 'Loan Updated' },
  loan_payment: { pt: 'Pagamento', en: 'Payment' },
  loan_deleted: { pt: 'Empréstimo Eliminado', en: 'Loan Deleted' },
  disciplinary_created: { pt: 'Disciplinar Criado', en: 'Disciplinary Created' },
  disciplinary_updated: { pt: 'Disciplinar Editado', en: 'Disciplinary Updated' },
  disciplinary_deleted: { pt: 'Disciplinar Eliminado', en: 'Disciplinary Deleted' },
  attendance_updated: { pt: 'Assiduidade', en: 'Attendance' },
  settings_updated: { pt: 'Configurações', en: 'Settings' },
  correction_applied: { pt: 'Correção', en: 'Correction' },
  termination_reversed: { pt: 'Rescisão Revertida', en: 'Termination Reversed' },
};

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('deleted') || action.includes('terminated') || action.includes('rejected')) return 'destructive';
  if (action.includes('created') || action.includes('approved') || action.includes('paid') || action.includes('hired')) return 'default';
  return 'secondary';
}

export function AuditHistoryTab({ employeeId }: AuditHistoryTabProps) {
  const { language } = useLanguage();
  const { logs, isLoaded, loadAuditLogs, getLogsForEmployee } = useAuditStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) loadAuditLogs();
  }, [isLoaded, loadAuditLogs]);

  const employeeLogs = useMemo(() => {
    return getLogsForEmployee(employeeId);
  }, [logs, employeeId, getLogsForEmployee]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const t = {
    title: language === 'pt' ? 'Histórico de Alterações' : 'Edit History',
    subtitle: language === 'pt' ? `${employeeLogs.length} alterações registadas` : `${employeeLogs.length} changes recorded`,
    date: language === 'pt' ? 'Data/Hora' : 'Date/Time',
    user: language === 'pt' ? 'Utilizador' : 'User',
    action: language === 'pt' ? 'Acção' : 'Action',
    description: language === 'pt' ? 'Descrição' : 'Description',
    noLogs: language === 'pt' ? 'Nenhuma alteração registada para este funcionário' : 'No changes recorded for this employee',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {employeeLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {t.noLogs}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{t.date}</TableHead>
                  <TableHead className="w-[100px]">{t.user}</TableHead>
                  <TableHead className="w-[150px]">{t.action}</TableHead>
                  <TableHead>{t.description}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLogs.map(log => {
                  const isExpanded = expandedRows.has(log.id);
                  const hasDiff = log.previousValue || log.newValue;
                  const actionLabel = actionLabels[log.action];

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {log.description.match(/^\[([^\]]+)\]/)?.[1] || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                          {language === 'pt' ? actionLabel?.pt : actionLabel?.en || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{log.description.replace(/^\[[^\]]+\]\s*/, '')}</div>
                        {isExpanded && hasDiff && (
                          <DiffView previousValue={log.previousValue} newValue={log.newValue} />
                        )}
                      </TableCell>
                      <TableCell>
                        {hasDiff && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleRow(log.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function DiffView({ previousValue, newValue }: { previousValue?: string; newValue?: string }) {
  const prev = previousValue ? JSON.parse(previousValue) : null;
  const next = newValue ? JSON.parse(newValue) : null;

  if (!prev && !next) return null;

  const allKeys = new Set([
    ...(prev ? Object.keys(prev) : []),
    ...(next ? Object.keys(next) : []),
  ]);

  return (
    <div className="mt-2 p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
      {Array.from(allKeys).map(key => (
        <div key={key} className="flex items-start gap-2">
          <span className="font-medium min-w-[120px] text-muted-foreground">{formatFieldName(key)}:</span>
          {prev && prev[key] !== undefined && (
            <span className="text-destructive line-through">{String(prev[key])}</span>
          )}
          {prev && next && <span className="text-muted-foreground">→</span>}
          {next && next[key] !== undefined && (
            <span className="text-primary font-medium">{String(next[key])}</span>
          )}
        </div>
      ))}
    </div>
  );
}
