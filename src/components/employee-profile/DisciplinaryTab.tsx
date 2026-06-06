import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { FileWarning, Printer, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useLanguage } from '@/lib/i18n';
import {
  DISCIPLINARY_TYPE_LABELS,
  DISCIPLINARY_STATUS_LABELS,
  DisciplinaryStatus,
  DisciplinaryRecord,
} from '@/types/disciplinary';
import { PrintableWarningLetter } from '@/components/hr/PrintableWarningLetter';
import { PrintableSuspensionTerm } from '@/components/hr/PrintableSuspensionTerm';
import { PrintableDisciplinaryHistory } from '@/components/hr/PrintableDisciplinaryHistory';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

interface DisciplinaryTabProps {
  employeeId: string;
}

const statusColors: Record<DisciplinaryStatus, string> = {
  pendente: 'bg-warning/10 text-warning border-warning/20',
  resolvido: 'bg-accent/10 text-accent border-accent/20',
  escalado: 'bg-destructive/10 text-destructive border-destructive/20',
  arquivado: 'bg-muted text-muted-foreground',
};

export function DisciplinaryTab({ employeeId }: DisciplinaryTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { records: allRecords, loadRecords, hasActiveProcess } = useDisciplinaryStore();
  const { employees } = useEmployeeStore();
  const { settings } = useSettingsStore();

  const [printingRecord, setPrintingRecord] = useState<DisciplinaryRecord | null>(null);
  const [printingHistory, setPrintingHistory] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const employee = employees.find((e) => e.id === employeeId);
  const records = useMemo(
    () =>
      allRecords
        .filter((r) => r.employeeId === employeeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allRecords, employeeId]
  );

  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter((r) => r.status === 'pendente').length;
    const resolved = records.filter((r) => r.status === 'resolvido').length;
    const warnings = records.filter((r) => r.type === 'advertencia_escrita').length;
    const suspensions = records.filter((r) => r.type === 'suspensao').length;
    return { total, pending, resolved, warnings, suspensions };
  }, [records]);

  const escalationInfo = useMemo(() => {
    const activeIncidents = records.filter((r) => r.status !== 'arquivado');
    const warnings = activeIncidents.filter((r) => r.type === 'advertencia_escrita').length;
    const suspensions = activeIncidents.filter((r) => r.type === 'suspensao').length;
    const weightedIncidents = warnings + suspensions;
    const hasProcess = hasActiveProcess(employeeId);
    const shouldRecommendProcess = !hasProcess && weightedIncidents >= 2;
    return { warnings, suspensions, weightedIncidents, shouldRecommendProcess, hasProcess };
  }, [records, hasActiveProcess, employeeId]);

  const kpis: DossierKpi[] = [
    { label: ptLang ? 'Total' : 'Total', value: String(stats.total), icon: FileWarning },
    {
      label: ptLang ? 'Pendentes' : 'Pending',
      value: String(stats.pending),
      warn: stats.pending > 0,
      icon: Clock,
    },
    {
      label: ptLang ? 'Resolvidos' : 'Resolved',
      value: String(stats.resolved),
      icon: CheckCircle,
    },
    {
      label: ptLang ? 'Advert./Susp.' : 'Warn./Susp.',
      value: `${stats.warnings}/${stats.suspensions}`,
      warn: escalationInfo.shouldRecommendProcess || escalationInfo.hasProcess,
      icon: AlertTriangle,
    },
  ];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printingRecord
      ? `${DISCIPLINARY_TYPE_LABELS[printingRecord.type]}_${printingRecord.id}`
      : 'Documento',
    onAfterPrint: () => setPrintingRecord(null),
  });

  const handlePrintHistory = useReactToPrint({
    contentRef: historyPrintRef,
    documentTitle: employee
      ? `Historico_Disciplinar_${employee.firstName}_${employee.lastName}`
      : 'Historico_Disciplinar',
    onAfterPrint: () => setPrintingHistory(false),
  });

  const handlePrintDocument = (record: DisciplinaryRecord) => {
    setPrintingRecord(record);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => handlePrint());
    });
  };

  const handlePrintHistoryClick = () => {
    setPrintingHistory(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => handlePrintHistory());
    });
  };

  const alert =
    escalationInfo.shouldRecommendProcess || escalationInfo.hasProcess ? (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {escalationInfo.hasProcess
            ? ptLang
              ? 'Processo disciplinar activo'
              : 'Active disciplinary process'
            : ptLang
              ? 'Alerta de escalonamento'
              : 'Escalation alert'}
        </div>
        <p className="mt-1 text-muted-foreground">
          {escalationInfo.hasProcess
            ? ptLang
              ? 'Este funcionário tem um processo disciplinar em curso.'
              : 'This employee has an active disciplinary process.'
            : ptLang
              ? `${escalationInfo.weightedIncidents} ocorrência(s) activa(s) — considere abrir processo disciplinar.`
              : `${escalationInfo.weightedIncidents} active incident(s) — consider opening a disciplinary process.`}
        </p>
      </div>
    ) : null;

  const toolbar =
    records.length > 0 ? (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrintHistoryClick}
        className="h-6 text-[10px] gap-1 px-2"
      >
        <Printer className="h-3 w-3" />
        {ptLang ? 'Imprimir' : 'Print'}
      </Button>
    ) : null;

  return (
    <DossierTabShell kpis={kpis} alert={alert}>
      <DossierTablePanel
        title={ptLang ? 'Registos disciplinares' : 'Disciplinary records'}
        subtitle={
          ptLang
            ? `${records.length} registos`
            : `${records.length} records`
        }
        toolbar={toolbar}
      >
        {records.length === 0 ? (
          <DossierEmptyState
            icon={FileWarning}
            message={ptLang ? 'Nenhum registo disciplinar' : 'No disciplinary records'}
          />
        ) : (
          <table className="w-full text-xs min-w-[40rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Tipo' : 'Type'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Data' : 'Date'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Estado' : 'Status'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Descrição' : 'Description'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Acção' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30">
                  <td className={ATTENDANCE_TD}>
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                      {DISCIPLINARY_TYPE_LABELS[record.type]}
                      {record.type === 'suspensao' && record.duration && (
                        <span className="ml-1">({record.duration}d)</span>
                      )}
                    </Badge>
                  </td>
                  <td className={ATTENDANCE_TD}>
                    {format(new Date(record.date), 'dd/MM/yyyy', { locale: pt })}
                  </td>
                  <td className={ATTENDANCE_TD}>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 ${statusColors[record.status]}`}
                    >
                      {DISCIPLINARY_STATUS_LABELS[record.status]}
                    </Badge>
                  </td>
                  <td
                    className={`${ATTENDANCE_TD} max-w-[14rem] truncate`}
                    title={record.description}
                  >
                    {record.description}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right`}>
                    {(record.type === 'advertencia_escrita' || record.type === 'suspensao') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintDocument(record)}
                        className="h-6 px-2 text-[10px] gap-1"
                      >
                        <Printer className="h-3 w-3" />
                        {ptLang ? 'Imprimir' : 'Print'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DossierTablePanel>

      <div className="hidden">
        <div ref={printRef}>
          {printingRecord && printingRecord.type === 'advertencia_escrita' && (
            <PrintableWarningLetter record={printingRecord} employee={employee} />
          )}
          {printingRecord && printingRecord.type === 'suspensao' && (
            <PrintableSuspensionTerm record={printingRecord} employee={employee} />
          )}
        </div>
        <div ref={historyPrintRef}>
          {printingHistory && employee && (
            <PrintableDisciplinaryHistory
              employee={employee}
              records={records}
              companyName={settings.companyName || 'Empresa'}
            />
          )}
        </div>
      </div>
    </DossierTabShell>
  );
}
