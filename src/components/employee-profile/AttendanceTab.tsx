import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useAbsenceStore } from '@/stores/absence-store';
import { useLanguage } from '@/lib/i18n';

interface AttendanceTabProps {
  employeeId: string;
}

export function AttendanceTab({ employeeId }: AttendanceTabProps) {
  const { language } = useLanguage();
  const { entries: bulkEntries, loadEntries } = useBulkAttendanceStore();
  const { absences, loadAbsences } = useAbsenceStore();

  // Force reload data on mount to get latest
  useEffect(() => {
    loadEntries();
    loadAbsences();
  }, [loadEntries, loadAbsences]);

  // Filter bulk entries for this employee (sorted by year/month descending)
  const employeeBulkEntries = useMemo(() => {
    return bulkEntries
      .filter((e) => e.employeeId === employeeId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [bulkEntries, employeeId]);

  const employeeAbsences = useMemo(() => {
    return absences
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [absences, employeeId]);

  // Calculate stats from bulk entries (monthly records)
  const stats = useMemo(() => {
    const totalMonths = employeeBulkEntries.length;
    const totalAbsenceDays = employeeBulkEntries.reduce((sum, e) => sum + (e.absenceDays || 0), 0);
    const totalDelayHours = employeeBulkEntries.reduce((sum, e) => sum + (e.delayHours || 0), 0);

    return {
      totalMonths,
      totalAbsenceDays,
      totalDelayHours,
    };
  }, [employeeBulkEntries]);

  const getAbsenceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sick: 'bg-destructive/10 text-destructive border-destructive/20',
      vacation: 'bg-primary/10 text-primary border-primary/20',
      personal: 'bg-warning/10 text-warning border-warning/20',
      maternity: 'bg-accent/10 text-accent border-accent/20',
      paternity: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      bereavement: 'bg-muted text-muted-foreground',
      unpaid: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    };
    const labels: Record<string, string> = {
      sick: language === 'pt' ? 'Doença' : 'Sick',
      vacation: language === 'pt' ? 'Férias' : 'Vacation',
      personal: language === 'pt' ? 'Pessoal' : 'Personal',
      maternity: language === 'pt' ? 'Maternidade' : 'Maternity',
      paternity: language === 'pt' ? 'Paternidade' : 'Paternity',
      bereavement: language === 'pt' ? 'Luto' : 'Bereavement',
      unpaid: language === 'pt' ? 'Não Remunerada' : 'Unpaid',
    };
    return (
      <Badge variant="outline" className={colors[type] || colors.personal}>
        {labels[type] || type}
      </Badge>
    );
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Meses Registados' : 'Months Recorded'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMonths}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total Dias de Falta' : 'Total Absence Days'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{stats.totalAbsenceDays}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total Horas de Atraso' : 'Total Delay Hours'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats.totalDelayHours}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Absences List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'pt' ? 'Histórico de Ausências' : 'Absence History'}
          </CardTitle>
          <CardDescription>
            {language === 'pt'
              ? `${employeeAbsences.length} ausências registadas`
              : `${employeeAbsences.length} absences recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeAbsences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'pt' ? 'Nenhuma ausência registada' : 'No absences recorded'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Início' : 'Start'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Fim' : 'End'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Dias' : 'Days'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Motivo' : 'Reason'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeAbsences.map((absence) => {
                  const startDate = new Date(absence.startDate);
                  const endDate = new Date(absence.endDate);
                  const days = Math.ceil(
                    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1;

                  return (
                    <TableRow key={absence.id}>
                      <TableCell>{getAbsenceTypeBadge(absence.type)}</TableCell>
                      <TableCell>
                        {format(startDate, 'dd/MM/yyyy', { locale: pt })}
                      </TableCell>
                      <TableCell>
                        {format(endDate, 'dd/MM/yyyy', { locale: pt })}
                      </TableCell>
                      <TableCell className="font-medium">{days}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={absence.reason}>
                        {absence.reason || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Monthly Attendance Summary */}
      {employeeBulkEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {language === 'pt' ? 'Registo Mensal de Assiduidade' : 'Monthly Attendance Record'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Período' : 'Period'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Faltas (dias)' : 'Absences (days)'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Atrasos (horas)' : 'Delays (hours)'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Notas' : 'Notes'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeBulkEntries.slice(0, 12).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {monthNames[entry.month - 1]} {entry.year}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.absenceDays > 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">
                          {entry.absenceDays}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          0
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.delayHours > 0 ? `${entry.delayHours}h` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
