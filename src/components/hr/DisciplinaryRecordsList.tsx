import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FileWarning, Printer, CheckCircle, XCircle, MoreHorizontal, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useSettingsStore } from '@/stores/settings-store';
import {
  DisciplinaryRecord,
  DisciplinaryStatus,
  DISCIPLINARY_TYPE_LABELS,
  DISCIPLINARY_STATUS_LABELS,
} from '@/types/disciplinary';
import { PrintableWarningLetter } from './PrintableWarningLetter';
import { PrintableSuspensionTerm } from './PrintableSuspensionTerm';
import { PrintableDisciplinaryHistory } from './PrintableDisciplinaryHistory';

interface DisciplinaryRecordsListProps {
  employeeId?: string;
}

const statusColors: Record<DisciplinaryStatus, string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  resolvido: 'bg-green-500/10 text-green-600 border-green-500/20',
  escalado: 'bg-red-500/10 text-red-600 border-red-500/20',
  arquivado: 'bg-muted text-muted-foreground',
};

export function DisciplinaryRecordsList({ employeeId: propEmployeeId }: DisciplinaryRecordsListProps) {
  const { records, updateRecord, getRecordsByEmployee } = useDisciplinaryStore();
  const { employees } = useEmployeeStore();
  const { settings } = useSettingsStore();
  const [printingRecord, setPrintingRecord] = useState<DisciplinaryRecord | null>(null);
  const [printingHistory, setPrintingHistory] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(propEmployeeId || '');
  const printRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);

  // Use prop employeeId if provided, otherwise use selected
  const effectiveEmployeeId = propEmployeeId || selectedEmployeeId;
  const displayRecords = effectiveEmployeeId ? getRecordsByEmployee(effectiveEmployeeId) : records;

  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const selectedEmployee = effectiveEmployeeId ? getEmployee(effectiveEmployeeId) : null;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printingRecord
      ? `${DISCIPLINARY_TYPE_LABELS[printingRecord.type]}_${printingRecord.id}`
      : 'Documento',
    onAfterPrint: () => setPrintingRecord(null),
  });

  const handlePrintHistory = useReactToPrint({
    contentRef: historyPrintRef,
    documentTitle: selectedEmployee
      ? `Historico_Disciplinar_${selectedEmployee.firstName}_${selectedEmployee.lastName}`
      : 'Historico_Disciplinar',
    onAfterPrint: () => setPrintingHistory(false),
  });

  const handleStatusChange = async (record: DisciplinaryRecord, newStatus: DisciplinaryStatus) => {
    const success = await updateRecord(record.id, {
      status: newStatus,
      resolutionDate: newStatus === 'resolvido' ? new Date().toISOString() : undefined,
    });
    if (success) {
      toast.success(`Estado alterado para ${DISCIPLINARY_STATUS_LABELS[newStatus]}`);
    } else {
      toast.error('Erro ao alterar estado');
    }
  };

  const handlePrintDocument = (record: DisciplinaryRecord) => {
    setPrintingRecord(record);
    setTimeout(() => handlePrint(), 100);
  };

  const handlePrintHistoryClick = () => {
    if (!selectedEmployee) {
      toast.error('Selecione um funcionário para imprimir o histórico');
      return;
    }
    setPrintingHistory(true);
    setTimeout(() => handlePrintHistory(), 100);
  };

  // Filter section (only show if no prop employeeId)
  const showFilter = !propEmployeeId;

  return (
    <>
      {/* Filter and Print History Button */}
      {showFilter && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEmployee && (
            <Button
              variant="outline"
              onClick={handlePrintHistoryClick}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Imprimir Histórico
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {displayRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileWarning className="h-12 w-12 mb-4 opacity-50" />
          <p>
            {selectedEmployee 
              ? `Nenhum registo disciplinar para ${selectedEmployee.firstName} ${selectedEmployee.lastName}`
              : 'Nenhum registo disciplinar encontrado'
            }
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {!effectiveEmployeeId && <TableHead>Funcionário</TableHead>}
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRecords.map((record) => {
              const employee = getEmployee(record.employeeId);
              return (
                <TableRow key={record.id}>
                  {!effectiveEmployeeId && (
                    <TableCell className="font-medium">
                      {employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionário não encontrado'}
                    </TableCell>
                  )}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {record.type !== 'processo_disciplinar' && (
                          <DropdownMenuItem onClick={() => handlePrintDocument(record)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Documento
                          </DropdownMenuItem>
                        )}
                        {record.status === 'pendente' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(record, 'resolvido')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Marcar como Resolvido
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(record, 'escalado')}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              Escalar
                            </DropdownMenuItem>
                          </>
                        )}
                        {record.status !== 'arquivado' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(record, 'arquivado')}
                          >
                            Arquivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Hidden print components */}
      <div className="hidden">
        <div ref={printRef}>
          {printingRecord && printingRecord.type === 'advertencia_escrita' && (
            <PrintableWarningLetter
              record={printingRecord}
              employee={getEmployee(printingRecord.employeeId)}
            />
          )}
          {printingRecord && printingRecord.type === 'suspensao' && (
            <PrintableSuspensionTerm
              record={printingRecord}
              employee={getEmployee(printingRecord.employeeId)}
            />
          )}
        </div>
        <div ref={historyPrintRef}>
          {printingHistory && selectedEmployee && (
            <PrintableDisciplinaryHistory
              employee={selectedEmployee}
              records={displayRecords}
              companyName={settings.companyName || 'Empresa'}
            />
          )}
        </div>
      </div>
    </>
  );
}
