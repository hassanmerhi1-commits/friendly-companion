import { useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertCircle, CheckCircle, List } from 'lucide-react';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useAbsenceStore } from '@/stores/absence-store';
import { useLanguage } from '@/lib/i18n';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

interface AttendanceTabProps {
  employeeId: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function AttendanceTab({ employeeId }: AttendanceTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const [subTab, setSubTab] = useState('monthly');
  const { entries: bulkEntries, loadEntries } = useBulkAttendanceStore();
  const { absences, loadAbsences } = useAbsenceStore();

  useEffect(() => {
    loadEntries();
    loadAbsences();
  }, [loadEntries, loadAbsences]);

  const employeeBulkEntries = useMemo(() => {
    return bulkEntries
      .filter((e) => e.employeeId === employeeId)
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
  }, [bulkEntries, employeeId]);

  const employeeAbsences = useMemo(() => {
    return absences
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [absences, employeeId]);

  const stats = useMemo(() => {
    const totalMonths = employeeBulkEntries.length;
    const totalAbsenceDays = employeeBulkEntries.reduce((sum, e) => sum + (e.absenceDays || 0), 0);
    const totalJustifiedDays = employeeBulkEntries.reduce(
      (sum, e) => sum + (e.justifiedAbsenceDays || 0),
      0
    );
    const totalDelayHours = employeeBulkEntries.reduce((sum, e) => sum + (e.delayHours || 0), 0);
    return { totalMonths, totalAbsenceDays, totalJustifiedDays, totalDelayHours };
  }, [employeeBulkEntries]);

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Meses' : 'Months',
      value: String(stats.totalMonths),
      icon: Calendar,
    },
    {
      label: ptLang ? 'Faltas injust.' : 'Unjust. abs.',
      value: String(stats.totalAbsenceDays),
      warn: stats.totalAbsenceDays > 0,
      icon: AlertCircle,
    },
    {
      label: ptLang ? 'Faltas just.' : 'Just. abs.',
      value: String(stats.totalJustifiedDays),
      icon: CheckCircle,
    },
    {
      label: ptLang ? 'Atrasos' : 'Delays',
      value: `${stats.totalDelayHours}h`,
      warn: stats.totalDelayHours > 0,
      icon: Clock,
    },
  ];

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
      sick: ptLang ? 'Doença' : 'Sick',
      vacation: ptLang ? 'Férias' : 'Vacation',
      personal: ptLang ? 'Pessoal' : 'Personal',
      maternity: ptLang ? 'Maternidade' : 'Maternity',
      paternity: ptLang ? 'Paternidade' : 'Paternity',
      bereavement: ptLang ? 'Luto' : 'Bereavement',
      unpaid: ptLang ? 'Não remunerada' : 'Unpaid',
    };
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${colors[type] || colors.personal}`}>
        {labels[type] || type}
      </Badge>
    );
  };

  const monthlyTable = (
    <table className="w-full text-xs min-w-[32rem]">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Período' : 'Period'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Injust.' : 'Unjust.'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Just.' : 'Just.'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Atrasos' : 'Delays'}</th>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Notas' : 'Notes'}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {employeeBulkEntries.map((entry) => (
          <tr key={entry.id} className="hover:bg-muted/30">
            <td className={`${ATTENDANCE_TD} font-medium`}>
              {monthNames[entry.month - 1]} {entry.year}
            </td>
            <td className={`${ATTENDANCE_TD} text-right`}>
              {entry.absenceDays > 0 ? (
                <span className="text-destructive font-mono">{entry.absenceDays}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </td>
            <td className={`${ATTENDANCE_TD} text-right font-mono`}>
              {(entry.justifiedAbsenceDays || 0) > 0 ? entry.justifiedAbsenceDays : '—'}
            </td>
            <td className={`${ATTENDANCE_TD} text-right font-mono`}>
              {entry.delayHours > 0 ? `${entry.delayHours}h` : '—'}
            </td>
            <td className={`${ATTENDANCE_TD} max-w-[12rem] truncate text-muted-foreground`}>
              {entry.notes || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const absencesTable = (
    <table className="w-full text-xs min-w-[36rem]">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Tipo' : 'Type'}</th>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Início' : 'Start'}</th>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Fim' : 'End'}</th>
          <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Dias' : 'Days'}</th>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Motivo' : 'Reason'}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {employeeAbsences.map((absence) => {
          const startDate = new Date(absence.startDate);
          const endDate = new Date(absence.endDate);
          const days =
            Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          return (
            <tr key={absence.id} className="hover:bg-muted/30">
              <td className={ATTENDANCE_TD}>{getAbsenceTypeBadge(absence.type)}</td>
              <td className={ATTENDANCE_TD}>{format(startDate, 'dd/MM/yyyy', { locale: pt })}</td>
              <td className={ATTENDANCE_TD}>{format(endDate, 'dd/MM/yyyy', { locale: pt })}</td>
              <td className={`${ATTENDANCE_TD} text-center font-mono`}>{days}</td>
              <td className={`${ATTENDANCE_TD} max-w-[14rem] truncate`} title={absence.reason}>
                {absence.reason || '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const hasData = employeeBulkEntries.length > 0 || employeeAbsences.length > 0;

  if (!hasData) {
    return (
      <DossierTabShell kpis={kpis}>
        <DossierTablePanel>
          <DossierEmptyState
            icon={Clock}
            message={ptLang ? 'Nenhum registo de presenças' : 'No attendance records'}
          />
        </DossierTablePanel>
      </DossierTabShell>
    );
  }

  return (
    <DossierTabShell kpis={kpis}>
      <Tabs
        value={subTab}
        onValueChange={setSubTab}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <TabsList className="h-8 w-fit shrink-0 mb-2">
          <TabsTrigger value="monthly" className="text-xs gap-1.5 h-7 px-3">
            <List className="h-3.5 w-3.5" />
            {ptLang ? 'Registo mensal' : 'Monthly'}
            {employeeBulkEntries.length > 0 && (
              <span className="ml-1 rounded bg-muted px-1 text-[10px] font-mono">
                {employeeBulkEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="absences" className="text-xs gap-1.5 h-7 px-3">
            <Calendar className="h-3.5 w-3.5" />
            {ptLang ? 'Ausências' : 'Absences'}
            {employeeAbsences.length > 0 && (
              <span className="ml-1 rounded bg-muted px-1 text-[10px] font-mono">
                {employeeAbsences.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {subTab === 'monthly' && (
            <DossierTablePanel
              title={ptLang ? 'Assiduidade mensal' : 'Monthly attendance'}
              subtitle={
                ptLang
                  ? `${employeeBulkEntries.length} meses registados`
                  : `${employeeBulkEntries.length} months recorded`
              }
            >
              {employeeBulkEntries.length === 0 ? (
                <DossierEmptyState
                  icon={List}
                  message={ptLang ? 'Sem registo mensal' : 'No monthly records'}
                />
              ) : (
                monthlyTable
              )}
            </DossierTablePanel>
          )}
          {subTab === 'absences' && (
            <DossierTablePanel
              title={ptLang ? 'Histórico de ausências' : 'Absence history'}
              subtitle={
                ptLang
                  ? `${employeeAbsences.length} ausências registadas`
                  : `${employeeAbsences.length} absences recorded`
              }
            >
              {employeeAbsences.length === 0 ? (
                <DossierEmptyState
                  icon={Calendar}
                  message={ptLang ? 'Nenhuma ausência registada' : 'No absences recorded'}
                />
              ) : (
                absencesTable
              )}
            </DossierTablePanel>
          )}
        </div>
      </Tabs>
    </DossierTabShell>
  );
}
