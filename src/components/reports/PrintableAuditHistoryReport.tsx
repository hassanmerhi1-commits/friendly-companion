import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuditStore } from '@/stores/audit-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { format } from 'date-fns';
import { formatFieldName } from '@/lib/audit-helper';
import type { AuditAction } from '@/types/audit';

interface Props {
  companyName: string;
  companyNif: string;
  year: number;
  onClose: () => void;
}

const actionLabels: Record<string, { pt: string; en: string }> = {
  payroll_calculated: { pt: 'Folha Calculada', en: 'Payroll Calculated' },
  payroll_approved: { pt: 'Folha Aprovada', en: 'Payroll Approved' },
  payroll_reopened: { pt: 'Folha Reaberta', en: 'Payroll Reopened' },
  payroll_paid: { pt: 'Folha Paga', en: 'Payroll Paid' },
  entry_updated: { pt: 'Entrada Editada', en: 'Entry Updated' },
  overtime_added: { pt: 'Horas Extra', en: 'Overtime Added' },
  absence_recorded: { pt: 'Ausência Registada', en: 'Absence Recorded' },
  absence_justified: { pt: 'Ausência Justificada', en: 'Absence Justified' },
  absence_deleted: { pt: 'Ausência Eliminada', en: 'Absence Deleted' },
  deduction_created: { pt: 'Dedução Criada', en: 'Deduction Created' },
  deduction_updated: { pt: 'Dedução Editada', en: 'Deduction Updated' },
  deduction_deleted: { pt: 'Dedução Eliminada', en: 'Deduction Deleted' },
  deduction_paid: { pt: 'Dedução Paga', en: 'Deduction Paid' },
  salary_changed: { pt: 'Salário Alterado', en: 'Salary Changed' },
  salary_adjusted: { pt: 'Ajuste Salarial', en: 'Salary Adjusted' },
  employee_created: { pt: 'Funcionário Criado', en: 'Employee Created' },
  employee_updated: { pt: 'Funcionário Editado', en: 'Employee Updated' },
  employee_terminated: { pt: 'Funcionário Desligado', en: 'Employee Terminated' },
  employee_deleted: { pt: 'Funcionário Eliminado', en: 'Employee Deleted' },
  loan_created: { pt: 'Empréstimo Criado', en: 'Loan Created' },
  loan_updated: { pt: 'Empréstimo Editado', en: 'Loan Updated' },
  loan_payment: { pt: 'Pagamento Empréstimo', en: 'Loan Payment' },
  loan_deleted: { pt: 'Empréstimo Eliminado', en: 'Loan Deleted' },
  disciplinary_created: { pt: 'Disciplinar Criado', en: 'Disciplinary Created' },
  disciplinary_updated: { pt: 'Disciplinar Editado', en: 'Disciplinary Updated' },
  disciplinary_deleted: { pt: 'Disciplinar Eliminado', en: 'Disciplinary Deleted' },
  attendance_updated: { pt: 'Assiduidade Editada', en: 'Attendance Updated' },
  settings_updated: { pt: 'Definições Editadas', en: 'Settings Updated' },
};

const actionColor = (action: string) => {
  if (action.includes('created') || action.includes('hired')) return 'bg-emerald-100 text-emerald-800';
  if (action.includes('deleted') || action.includes('terminated') || action.includes('rejected')) return 'bg-red-100 text-red-800';
  if (action.includes('updated') || action.includes('changed') || action.includes('adjusted')) return 'bg-blue-100 text-blue-800';
  if (action.includes('approved') || action.includes('paid')) return 'bg-amber-100 text-amber-800';
  return 'bg-muted text-muted-foreground';
};

export const PrintableAuditHistoryReport = ({ companyName, companyNif, year, onClose }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const { logs } = useAuditStore();
  const { employees } = useEmployeeStore();

  const yearLogs = logs
    .filter(log => new Date(log.timestamp).getFullYear() === year)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEmployeeName = (id?: string) => {
    if (!id) return '-';
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : id.substring(0, 8);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Histórico de Alterações</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .header { text-align: center; margin-bottom: 15px; }
        .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .diff-old { color: #dc2626; text-decoration: line-through; }
        .diff-new { color: #16a34a; font-weight: bold; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div>
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          {language === 'pt' ? 'Imprimir' : 'Print'}
        </Button>
      </div>

      <div ref={printRef}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">{companyName}</h2>
          {companyNif && <p className="text-sm text-muted-foreground">NIF: {companyNif}</p>}
          <h3 className="text-lg font-semibold mt-2">
            {language === 'pt' ? 'Relatório de Histórico de Alterações' : 'Edit History Report'} — {year}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {yearLogs.length} {language === 'pt' ? 'registos encontrados' : 'records found'}
          </p>
        </div>

        {yearLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === 'pt' ? 'Nenhum registo de alteração encontrado para este ano.' : 'No edit history found for this year.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">{language === 'pt' ? 'Data/Hora' : 'Date/Time'}</TableHead>
                <TableHead>{language === 'pt' ? 'Utilizador' : 'User'}</TableHead>
                <TableHead>{language === 'pt' ? 'Acção' : 'Action'}</TableHead>
                <TableHead>{language === 'pt' ? 'Funcionário' : 'Employee'}</TableHead>
                <TableHead>{language === 'pt' ? 'Alterações' : 'Changes'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearLogs.map((log) => {
                const label = actionLabels[log.action]?.[language === 'pt' ? 'pt' : 'en'] || log.action;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs">{log.userName || log.userId || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${actionColor(log.action)}`}>
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{getEmployeeName(log.employeeId)}</TableCell>
                    <TableCell className="text-xs">
              {(() => {
                        const prev = log.previousValue ? (() => { try { return JSON.parse(log.previousValue); } catch { return null; } })() : null;
                        const next = log.newValue ? (() => { try { return JSON.parse(log.newValue); } catch { return null; } })() : null;
                        const diffFields = prev && next ? Object.keys(next).filter(k => JSON.stringify(prev[k]) !== JSON.stringify(next[k])) : [];
                        
                        return diffFields.length > 0 ? (
                          <div className="space-y-0.5">
                            {diffFields.slice(0, 3).map(field => (
                              <div key={field}>
                                <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                                <span className="text-destructive line-through">
                                  {String(prev?.[field] ?? '-')}
                                </span>{' → '}
                                <span className="text-emerald-600 font-medium">
                                  {String(next?.[field] ?? '-')}
                                </span>
                              </div>
                            ))}
                            {diffFields.length > 3 && (
                              <span className="text-muted-foreground">+{diffFields.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{log.description || '-'}</span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="mt-6 text-xs text-muted-foreground text-center">
          {language === 'pt' ? 'Gerado em' : 'Generated on'}: {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
};
