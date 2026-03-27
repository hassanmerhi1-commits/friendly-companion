import { useState, useMemo, useEffect } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, ChevronDown, ChevronUp, Filter, User, Calendar } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore } from '@/stores/audit-store';
import { useEmployeeStore } from '@/stores/employee-store';
import type { AuditAction, AuditLogEntry } from '@/types/audit';
import { formatFieldName } from '@/lib/audit-helper';
import { format } from 'date-fns';

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
  employee_created: { pt: 'Funcionário Criado', en: 'Employee Created' },
  employee_updated: { pt: 'Funcionário Editado', en: 'Employee Updated' },
  employee_hired: { pt: 'Funcionário Contratado', en: 'Employee Hired' },
  employee_terminated: { pt: 'Funcionário Desligado', en: 'Employee Terminated' },
  employee_approved: { pt: 'Funcionário Aprovado', en: 'Employee Approved' },
  employee_deleted: { pt: 'Funcionário Eliminado', en: 'Employee Deleted' },
  loan_created: { pt: 'Empréstimo Criado', en: 'Loan Created' },
  loan_updated: { pt: 'Empréstimo Editado', en: 'Loan Updated' },
  loan_payment: { pt: 'Pagamento Empréstimo', en: 'Loan Payment' },
  loan_deleted: { pt: 'Empréstimo Eliminado', en: 'Loan Deleted' },
  disciplinary_created: { pt: 'Disciplinar Criado', en: 'Disciplinary Created' },
  disciplinary_updated: { pt: 'Disciplinar Editado', en: 'Disciplinary Updated' },
  disciplinary_deleted: { pt: 'Disciplinar Eliminado', en: 'Disciplinary Deleted' },
  attendance_updated: { pt: 'Assiduidade Editada', en: 'Attendance Updated' },
  settings_updated: { pt: 'Configurações Alteradas', en: 'Settings Updated' },
  correction_applied: { pt: 'Correção Aplicada', en: 'Correction Applied' },
  termination_reversed: { pt: 'Rescisão Revertida', en: 'Termination Reversed' },
};

const entityTypeLabels: Record<string, { pt: string; en: string }> = {
  employee: { pt: 'Funcionário', en: 'Employee' },
  payroll_period: { pt: 'Período Folha', en: 'Payroll Period' },
  payroll_entry: { pt: 'Entrada Folha', en: 'Payroll Entry' },
  deduction: { pt: 'Dedução', en: 'Deduction' },
  loan: { pt: 'Empréstimo', en: 'Loan' },
  absence: { pt: 'Ausência', en: 'Absence' },
  disciplinary: { pt: 'Disciplinar', en: 'Disciplinary' },
  attendance: { pt: 'Assiduidade', en: 'Attendance' },
  settings: { pt: 'Configurações', en: 'Settings' },
};

const actionSeverity: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  created: 'default',
  updated: 'secondary',
  deleted: 'destructive',
  approved: 'default',
  rejected: 'destructive',
  paid: 'default',
};

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('deleted') || action.includes('terminated') || action.includes('rejected')) return 'destructive';
  if (action.includes('created') || action.includes('approved') || action.includes('paid') || action.includes('hired')) return 'default';
  return 'secondary';
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

export default function EditHistory() {
  const { language } = useLanguage();
  const { logs, isLoaded, loadAuditLogs } = useAuditStore();
  const { employees } = useEmployeeStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) loadAuditLogs();
  }, [isLoaded, loadAuditLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
      if (employeeFilter !== 'all' && log.employeeId !== employeeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return log.description.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          (log.userName || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [logs, entityFilter, employeeFilter, searchTerm]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getEmployeeName = (employeeId?: string) => {
    if (!employeeId) return '-';
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId.substring(0, 8);
  };

  const t = {
    title: language === 'pt' ? 'Histórico de Alterações' : 'Edit History',
    subtitle: language === 'pt' ? 'Registo completo de todas as alterações no sistema' : 'Complete log of all system changes',
    search: language === 'pt' ? 'Pesquisar...' : 'Search...',
    allTypes: language === 'pt' ? 'Todos os Tipos' : 'All Types',
    allEmployees: language === 'pt' ? 'Todos os Funcionários' : 'All Employees',
    date: language === 'pt' ? 'Data/Hora' : 'Date/Time',
    user: language === 'pt' ? 'Utilizador' : 'User',
    action: language === 'pt' ? 'Acção' : 'Action',
    entity: language === 'pt' ? 'Entidade' : 'Entity',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    description: language === 'pt' ? 'Descrição' : 'Description',
    details: language === 'pt' ? 'Detalhes' : 'Details',
    noLogs: language === 'pt' ? 'Nenhum registo encontrado' : 'No records found',
    totalRecords: language === 'pt' ? 'registos' : 'records',
  };

  return (
    <TopNavLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allTypes}</SelectItem>
                  {Object.entries(entityTypeLabels).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {language === 'pt' ? labels.pt : labels.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[200px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allEmployees}</SelectItem>
                  {employees.filter(e => e.status === 'active').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t.title}</span>
              <Badge variant="outline">{filteredLogs.length} {t.totalRecords}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">{t.date}</TableHead>
                    <TableHead className="w-[100px]">{t.user}</TableHead>
                    <TableHead className="w-[150px]">{t.action}</TableHead>
                    <TableHead className="w-[100px]">{t.entity}</TableHead>
                    <TableHead className="w-[130px]">{t.employee}</TableHead>
                    <TableHead>{t.description}</TableHead>
                    <TableHead className="w-[60px]">{t.details}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        {t.noLogs}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.slice(0, 200).map(log => {
                      const isExpanded = expandedRows.has(log.id);
                      const hasDiff = log.previousValue || log.newValue;
                      const actionLabel = actionLabels[log.action];

                      return (
                        <TableRow key={log.id} className="group">
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
                            {language === 'pt' 
                              ? entityTypeLabels[log.entityType]?.pt 
                              : entityTypeLabels[log.entityType]?.en || log.entityType}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {getEmployeeName(log.employeeId)}
                          </TableCell>
                          <TableCell className="text-xs max-w-[300px]">
                            <div className="truncate" title={log.description}>
                              {log.description.replace(/^\[[^\]]+\]\s*/, '')}
                            </div>
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
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </TopNavLayout>
  );
}
