import { format, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { DisciplinaryRecord } from '@/types/disciplinary';
import { Employee } from '@/types/employee';

interface PrintableSuspensionTermProps {
  record: DisciplinaryRecord;
  employee?: Employee;
}

export function PrintableSuspensionTerm({ record, employee }: PrintableSuspensionTermProps) {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt });
  const startDate = new Date(record.date);
  const endDate = record.duration ? addDays(startDate, record.duration) : startDate;
  const startDateFormatted = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });
  const endDateFormatted = format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="p-8 font-serif text-black bg-white min-h-[297mm] w-[210mm]">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-2">
          Termo de Suspensão Disciplinar
        </h1>
        <div className="w-24 h-0.5 bg-black mx-auto" />
      </div>

      {/* Reference */}
      <div className="mb-8">
        <p className="text-sm text-gray-600">
          Ref: SUSP/{record.id.slice(-6).toUpperCase()}/{new Date(record.date).getFullYear()}
        </p>
      </div>

      {/* Employee Info Box */}
      <div className="border border-gray-300 p-4 mb-8">
        <h3 className="font-bold mb-2 text-sm uppercase text-gray-600">
          Dados do Funcionário
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="font-semibold">Nome:</span> {employee ? `${employee.firstName} ${employee.lastName}` : 'N/D'}
          </p>
          <p>
            <span className="font-semibold">BI/Passaporte:</span>{' '}
            {employee?.bilheteIdentidade || 'N/D'}
          </p>
          <p>
            <span className="font-semibold">Cargo:</span> {employee?.position || 'N/D'}
          </p>
          <p>
            <span className="font-semibold">Departamento:</span>{' '}
            {employee?.department || 'N/D'}
          </p>
        </div>
      </div>

      {/* Suspension Details */}
      <div className="border border-gray-300 p-4 mb-8 bg-gray-50">
        <h3 className="font-bold mb-2 text-sm uppercase text-gray-600">
          Detalhes da Suspensão
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="font-semibold">Duração:</span> {record.duration || 1} dias úteis
          </p>
          <p>
            <span className="font-semibold">Data de Início:</span> {startDateFormatted}
          </p>
          <p>
            <span className="font-semibold">Data de Retorno:</span> {endDateFormatted}
          </p>
          <p>
            <span className="font-semibold">Tipo:</span> Suspensão Disciplinar
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mb-8 space-y-4 text-justify leading-relaxed">
        <p>
          Pelo presente termo, fica o(a) funcionário(a) acima identificado(a) notificado(a) da
          aplicação de <strong>SUSPENSÃO DISCIPLINAR</strong> pelo período de{' '}
          <strong>{record.duration || 1} ({record.duration === 1 ? 'um' : record.duration}) dias úteis</strong>,
          com início em <strong>{startDateFormatted}</strong> e término previsto para{' '}
          <strong>{endDateFormatted}</strong>.
        </p>

        <p>
          <strong>Fundamentação:</strong>
        </p>

        <div className="border-l-4 border-red-400 pl-4 py-2 bg-red-50 italic">
          {record.description}
        </div>

        <p>
          Esta medida disciplinar está fundamentada na Lei Geral do Trabalho (Lei nº 7/15 de 15
          de Junho), que prevê a suspensão como sanção aplicável em casos de falta grave.
        </p>

        <p>
          Durante o período de suspensão, o(a) funcionário(a) fica impedido(a) de exercer as
          suas funções e de aceder às instalações da empresa, salvo autorização expressa da
          Direcção.
        </p>

        <p>
          O(A) funcionário(a) deverá retomar as suas actividades normais no dia útil seguinte
          ao término da suspensão, sob pena de se configurar abandono de trabalho.
        </p>
      </div>

      {/* Acknowledgment */}
      <div className="border border-gray-300 p-4 mb-8">
        <p className="text-sm">
          <strong>DECLARAÇÃO DO FUNCIONÁRIO:</strong> Declaro ter tomado conhecimento da
          presente suspensão disciplinar, dos seus fundamentos e do período de afastamento.
          Recebi uma via deste termo.
        </p>
      </div>

      {/* Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="border-t border-black pt-2 mx-8">
            <p className="font-semibold">Empregador / RH</p>
            <p className="text-sm text-gray-600">Data: {currentDate}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mx-8">
            <p className="font-semibold">Funcionário</p>
            <p className="text-sm text-gray-600">(Assinatura e Data)</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-8 right-8 text-xs text-gray-500 text-center">
        <p>Documento gerado automaticamente pelo sistema PayrollAO</p>
        <p>Este documento deve ser assinado em duas vias, ficando uma com cada parte.</p>
      </div>
    </div>
  );
}
