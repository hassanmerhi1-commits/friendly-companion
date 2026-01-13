import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { DisciplinaryRecord, DISCIPLINARY_TYPE_LABELS, DISCIPLINARY_STATUS_LABELS } from '@/types/disciplinary';
import { Employee } from '@/types/employee';

interface PrintableDisciplinaryHistoryProps {
  employee: Employee;
  records: DisciplinaryRecord[];
  companyName?: string;
}

export function PrintableDisciplinaryHistory({ 
  employee, 
  records,
  companyName = 'Empresa'
}: PrintableDisciplinaryHistoryProps) {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt });
  const hireDate = format(new Date(employee.hireDate), "dd/MM/yyyy", { locale: pt });

  // Sort records by date descending
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Summary stats
  const summary = {
    advertencias: records.filter(r => r.type === 'advertencia_escrita').length,
    suspensoes: records.filter(r => r.type === 'suspensao').length,
    processos: records.filter(r => r.type === 'processo_disciplinar').length,
    totalDiasSuspensao: records
      .filter(r => r.type === 'suspensao' && r.duration)
      .reduce((sum, r) => sum + (r.duration || 0), 0),
    pendentes: records.filter(r => r.status === 'pendente').length,
    resolvidos: records.filter(r => r.status === 'resolvido').length,
  };

  return (
    <div className="p-8 font-serif text-black bg-white min-h-[297mm] w-[210mm]">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
          {companyName}
        </h1>
        <h2 className="text-lg font-semibold uppercase">
          Relatório de Histórico Disciplinar
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Documento gerado em {currentDate}
        </p>
      </div>

      {/* Employee Info */}
      <div className="mb-6 border border-gray-300 p-4 rounded">
        <h3 className="font-bold text-sm uppercase mb-3 border-b pb-2">
          Dados do Funcionário
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="font-semibold">Nome Completo:</span>{' '}
            {employee.firstName} {employee.lastName}
          </div>
          <div>
            <span className="font-semibold">BI/Documento:</span>{' '}
            {employee.bilheteIdentidade || '-'}
          </div>
          <div>
            <span className="font-semibold">Cargo:</span>{' '}
            {employee.position || '-'}
          </div>
          <div>
            <span className="font-semibold">Departamento:</span>{' '}
            {employee.department || '-'}
          </div>
          <div>
            <span className="font-semibold">Data de Admissão:</span>{' '}
            {hireDate}
          </div>
          <div>
            <span className="font-semibold">Estado:</span>{' '}
            {employee.status === 'active' ? 'Activo' : 'Inactivo'}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 border border-gray-300 p-4 rounded bg-gray-50">
        <h3 className="font-bold text-sm uppercase mb-3 border-b pb-2">
          Resumo Estatístico
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 border rounded bg-white">
            <div className="text-2xl font-bold text-yellow-600">{summary.advertencias}</div>
            <div className="text-xs text-gray-600">Advertências Escritas</div>
          </div>
          <div className="text-center p-2 border rounded bg-white">
            <div className="text-2xl font-bold text-orange-600">{summary.suspensoes}</div>
            <div className="text-xs text-gray-600">Suspensões</div>
            {summary.totalDiasSuspensao > 0 && (
              <div className="text-xs text-gray-500">({summary.totalDiasSuspensao} dias total)</div>
            )}
          </div>
          <div className="text-center p-2 border rounded bg-white">
            <div className="text-2xl font-bold text-red-600">{summary.processos}</div>
            <div className="text-xs text-gray-600">Processos Disciplinares</div>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-8 text-sm">
          <span>
            <strong className="text-yellow-600">{summary.pendentes}</strong> pendente(s)
          </span>
          <span>
            <strong className="text-green-600">{summary.resolvidos}</strong> resolvido(s)
          </span>
          <span>
            <strong>{records.length}</strong> registo(s) total
          </span>
        </div>
      </div>

      {/* Records Table */}
      <div className="mb-6">
        <h3 className="font-bold text-sm uppercase mb-3 border-b-2 border-black pb-2">
          Histórico Completo de Ocorrências
        </h3>
        
        {sortedRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic">
            Nenhum registo disciplinar encontrado para este funcionário.
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2 text-left font-semibold">Data</th>
                <th className="border border-gray-400 p-2 text-left font-semibold">Tipo</th>
                <th className="border border-gray-400 p-2 text-left font-semibold">Descrição</th>
                <th className="border border-gray-400 p-2 text-left font-semibold">Estado</th>
                <th className="border border-gray-400 p-2 text-left font-semibold">Resolução</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record, index) => (
                <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-2 whitespace-nowrap">
                    {format(new Date(record.date), 'dd/MM/yyyy', { locale: pt })}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {DISCIPLINARY_TYPE_LABELS[record.type]}
                    {record.type === 'suspensao' && record.duration && (
                      <span className="text-gray-600"> ({record.duration} dias)</span>
                    )}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {record.description}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {DISCIPLINARY_STATUS_LABELS[record.status]}
                    {record.resolutionDate && (
                      <div className="text-gray-500">
                        em {format(new Date(record.resolutionDate), 'dd/MM/yyyy', { locale: pt })}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {record.resolution || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Signatures */}
      <div className="mt-12 pt-8 border-t border-gray-300">
        <div className="grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="border-t border-black pt-2 mx-8 mt-12">
              <p className="font-semibold text-sm">Responsável RH</p>
              <p className="text-xs text-gray-600">Assinatura e Carimbo</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mx-8 mt-12">
              <p className="font-semibold text-sm">Director / Gerente</p>
              <p className="text-xs text-gray-600">Assinatura e Carimbo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-8 right-8 text-xs text-gray-500 text-center border-t pt-2">
        <p>Documento gerado automaticamente pelo sistema PayrollAO</p>
        <p>Ref: HIST-DISC/{employee.id.slice(-6).toUpperCase()}/{new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
