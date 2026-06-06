import { useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { History, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore } from '@/stores/audit-store';
import { formatFieldName } from '@/lib/audit-helper';
import type { AuditAction } from '@/types/audit';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

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

type ActionFilter = 'all' | 'employee' | 'payroll' | 'deduction' | 'disciplinary' | 'attendance';

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('deleted') || action.includes('terminated') || action.includes('rejected'))
    return 'destructive';
  if (
    action.includes('created') ||
    action.includes('approved') ||
    action.includes('paid') ||
    action.includes('hired')
  )
    return 'default';
  return 'secondary';
}

function matchesFilter(action: string, filter: ActionFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'employee') return action.startsWith('employee_');
  if (filter === 'payroll') return action.startsWith('payroll_') || action === 'entry_updated' || action === 'salary_changed' || action === 'salary_adjusted';
  if (filter === 'deduction') return action.startsWith('deduction_') || action.startsWith('loan_');
  if (filter === 'disciplinary') return action.startsWith('disciplinary_');
  if (filter === 'attendance') return action.startsWith('absence_') || action === 'attendance_updated' || action === 'overtime_added';
  return true;
}

export function AuditHistoryTab({ employeeId }: AuditHistoryTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { logs, isLoaded, loadAuditLogs, getLogsForEmployee } = useAuditStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  useEffect(() => {
    if (!isLoaded) loadAuditLogs();
  }, [isLoaded, loadAuditLogs]);

  const employeeLogs = useMemo(() => getLogsForEmployee(employeeId), [logs, employeeId, getLogsForEmployee]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employeeLogs.filter((log) => {
      if (!matchesFilter(log.action, actionFilter)) return false;
      if (!q) return true;
      const actionLabel = actionLabels[log.action as AuditAction];
      const label = ptLang ? actionLabel?.pt : actionLabel?.en;
      return (
        log.description.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (label?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [employeeLogs, search, actionFilter, ptLang]);

  const lastLog = employeeLogs[0];

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Total' : 'Total',
      value: String(employeeLogs.length),
      icon: History,
    },
    {
      label: ptLang ? 'Visíveis' : 'Shown',
      value: String(filteredLogs.length),
      sub: search || actionFilter !== 'all' ? ptLang ? 'Filtrado' : 'Filtered' : undefined,
      icon: Search,
    },
    {
      label: ptLang ? 'Última alteração' : 'Last change',
      value: lastLog
        ? format(new Date(lastLog.timestamp), 'dd/MM/yy')
        : '—',
      sub: lastLog
        ? format(new Date(lastLog.timestamp), 'HH:mm')
        : undefined,
      icon: History,
    },
  ];

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterChips: { value: ActionFilter; labelPt: string; labelEn: string }[] = [
    { value: 'all', labelPt: 'Todos', labelEn: 'All' },
    { value: 'employee', labelPt: 'Dossier', labelEn: 'Dossier' },
    { value: 'payroll', labelPt: 'Folha', labelEn: 'Payroll' },
    { value: 'deduction', labelPt: 'Financeiro', labelEn: 'Financial' },
    { value: 'disciplinary', labelPt: 'Disciplina', labelEn: 'Disciplinary' },
    { value: 'attendance', labelPt: 'Presenças', labelEn: 'Attendance' },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ptLang ? 'Pesquisar...' : 'Search...'}
          className="h-6 pl-7 text-[10px] w-32 sm:w-40"
        />
      </div>
      {filterChips.map((chip) => (
        <Button
          key={chip.value}
          variant={actionFilter === chip.value ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setActionFilter(chip.value)}
        >
          {ptLang ? chip.labelPt : chip.labelEn}
        </Button>
      ))}
    </div>
  );

  return (
    <DossierTabShell kpis={kpis}>
      <DossierTablePanel
        title={ptLang ? 'Histórico de alterações' : 'Change history'}
        subtitle={
          ptLang
            ? `${filteredLogs.length} de ${employeeLogs.length} registos`
            : `${filteredLogs.length} of ${employeeLogs.length} records`
        }
        toolbar={toolbar}
      >
        {filteredLogs.length === 0 ? (
          <DossierEmptyState
            icon={History}
            message={
              employeeLogs.length === 0
                ? ptLang
                  ? 'Nenhuma alteração registada'
                  : 'No changes recorded'
                : ptLang
                  ? 'Nenhum resultado para o filtro'
                  : 'No results for filter'
            }
          />
        ) : (
          <table className="w-full text-xs min-w-[44rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Data' : 'Date'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Utilizador' : 'User'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Acção' : 'Action'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Descrição' : 'Description'}</th>
                <th className={ATTENDANCE_TH_RIGHT} />
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {filteredLogs.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                const hasDiff = log.previousValue || log.newValue;
                const actionLabel = actionLabels[log.action as AuditAction];

                return (
                  <tr key={log.id} className="hover:bg-muted/30 align-top">
                    <td className={`${ATTENDANCE_TD} text-muted-foreground whitespace-nowrap`}>
                      {format(new Date(log.timestamp), 'dd/MM/yy HH:mm')}
                    </td>
                    <td className={`${ATTENDANCE_TD} font-medium max-w-[5rem] truncate`}>
                      {log.description.match(/^\[([^\]]+)\]/)?.[1] || 'Sistema'}
                    </td>
                    <td className={ATTENDANCE_TD}>
                      <Badge
                        variant={getActionBadgeVariant(log.action)}
                        className="text-[10px] h-5"
                      >
                        {ptLang ? actionLabel?.pt : actionLabel?.en || log.action}
                      </Badge>
                    </td>
                    <td className={ATTENDANCE_TD}>
                      <div className="max-w-[20rem]">
                        {log.description.replace(/^\[[^\]]+\]\s*/, '')}
                      </div>
                      {isExpanded && hasDiff && (
                        <DiffView previousValue={log.previousValue} newValue={log.newValue} />
                      )}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-right`}>
                      {hasDiff && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRow(log.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DossierTablePanel>
    </DossierTabShell>
  );
}

function safeParseJson(value?: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function DiffView({ previousValue, newValue }: { previousValue?: string; newValue?: string }) {
  const prev = safeParseJson(previousValue);
  const next = safeParseJson(newValue);

  if (!prev && !next) return null;

  const allKeys = new Set([...(prev ? Object.keys(prev) : []), ...(next ? Object.keys(next) : [])]);

  return (
    <div className="mt-1.5 p-2 bg-muted/30 rounded border text-[10px] space-y-0.5">
      {Array.from(allKeys).map((key) => (
        <div key={key} className="flex items-start gap-1.5 flex-wrap">
          <span className="font-medium text-muted-foreground">{formatFieldName(key)}:</span>
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
