import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
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
import { Button } from '@/components/ui/button';
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
  const { getRecordsByEmployee, loadRecords, isLoaded } = useDisciplinaryStore();
  const { employees } = useEmployeeStore();
  const { settings } = useSettingsStore();
  
  const [printingRecord, setPrintingRecord] = useState<DisciplinaryRecord | null>(null);
  const [printingHistory, setPrintingHistory] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);

  // Ensure disciplinary records are loaded
  useEffect(() => {
    if (!isLoaded) {
      loadRecords();
    }
  }, [isLoaded, loadRecords]);

  const employee = employees.find((e) => e.id === employeeId);
  const records = getRecordsByEmployee(employeeId);

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter((r) => r.status === 'pendente').length;
    const resolved = records.filter((r) => r.status === 'resolvido').length;
    const warnings = records.filter((r) => r.type === 'advertencia_escrita').length;
    const suspensions = records.filter((r) => r.type === 'suspensao').length;

    return { total, pending, resolved, warnings, suspensions };
  }, [records]);

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
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handlePrint();
      });
    });
  };

  const handlePrintHistoryClick = () => {
    setPrintingHistory(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handlePrintHistory();
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total' : 'Total'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Pendentes' : 'Pending'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold text-warning">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Resolvidos' : 'Resolved'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold text-accent">{stats.resolved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Advertências' : 'Warnings'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.warnings}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Suspensões' : 'Suspensions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{stats.suspensions}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              {language === 'pt' ? 'Registos Disciplinares' : 'Disciplinary Records'}
            </CardTitle>
            <CardDescription>
              {language === 'pt'
                ? `${records.length} registos para este funcionário`
                : `${records.length} records for this employee`}
            </CardDescription>
          </div>
          {records.length > 0 && (
            <Button variant="outline" onClick={handlePrintHistoryClick} className="gap-2">
              <Printer className="h-4 w-4" />
              {language === 'pt' ? 'Imprimir Histórico' : 'Print History'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileWarning className="h-12 w-12 mb-4 opacity-50" />
              <p>
                {language === 'pt'
                  ? 'Nenhum registo disciplinar'
                  : 'No disciplinary records'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Descrição' : 'Description'}</TableHead>
                  <TableHead className="text-right">
                    {language === 'pt' ? 'Acções' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {DISCIPLINARY_TYPE_LABELS[record.type]}
                        {record.type === 'suspensao' && record.duration && (
                          <span className="ml-1">({record.duration} dias)</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.date), 'dd/MM/yyyy', { locale: pt })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[record.status]}>
                        {DISCIPLINARY_STATUS_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={record.description}>
                      {record.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {(record.type === 'advertencia_escrita' || record.type === 'suspensao') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintDocument(record)}
                          className="gap-1"
                        >
                          <Printer className="h-4 w-4" />
                          {language === 'pt' ? 'Imprimir' : 'Print'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hidden print components */}
      <div className="hidden">
        <div ref={printRef}>
          {printingRecord && printingRecord.type === 'advertencia_escrita' && (
            <PrintableWarningLetter
              record={printingRecord}
              employee={employee}
            />
          )}
          {printingRecord && printingRecord.type === 'suspensao' && (
            <PrintableSuspensionTerm
              record={printingRecord}
              employee={employee}
            />
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
    </div>
  );
}
