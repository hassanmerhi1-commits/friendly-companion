import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { DisciplinaryRecord } from '@/types/disciplinary';
import { Employee } from '@/types/employee';

interface PrintableWarningLetterProps {
  record: DisciplinaryRecord;
  employee?: Employee;
}

export function PrintableWarningLetter({ record, employee }: PrintableWarningLetterProps) {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt });
  const recordDate = format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="p-8 font-serif text-black bg-white min-h-[297mm] w-[210mm]">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-2">
          Carta de Advertência
        </h1>
        <div className="w-24 h-0.5 bg-black mx-auto" />
      </div>

      {/* Company Info */}
      <div className="mb-8">
        <p className="text-sm text-gray-600">
          Ref: ADV/{record.id.slice(-6).toUpperCase()}/{new Date(record.date).getFullYear()}
        </p>
      </div>

      {/* Recipient */}
      <div className="mb-8">
        <p className="font-semibold">A/C:</p>
        <p className="font-bold text-lg">{employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionário'}</p>
        {employee?.position && <p>Cargo: {employee.position}</p>}
        {employee?.department && <p>Departamento: {employee.department}</p>}
      </div>

      {/* Subject */}
      <div className="mb-6">
        <p>
          <span className="font-semibold">Assunto:</span> Advertência Escrita
        </p>
        <p>
          <span className="font-semibold">Data da Ocorrência:</span> {recordDate}
        </p>
      </div>

      {/* Body */}
      <div className="mb-8 space-y-4 text-justify leading-relaxed">
        <p>Prezado(a) {employee?.firstName || 'Funcionário'},</p>

        <p>
          Pela presente, comunicamos que V. Exa. está a receber uma{' '}
          <strong>ADVERTÊNCIA ESCRITA</strong> devido ao seguinte motivo:
        </p>

        <div className="border-l-4 border-gray-400 pl-4 py-2 bg-gray-50 italic">
          {record.description}
        </div>

        <p>
          Esta advertência fica registada no seu processo individual e serve como alerta formal
          para que tal comportamento não se repita. Caso ocorram novas infrações, medidas
          disciplinares mais severas poderão ser aplicadas, conforme previsto na legislação
          laboral angolana em vigor (Lei Geral do Trabalho - Lei nº 7/15 de 15 de Junho).
        </p>

        <p>
          Esperamos que este aviso seja suficiente para a correcção do comportamento em causa
          e contamos com a sua colaboração para manter um ambiente de trabalho harmonioso.
        </p>

        <p>Sem mais de momento, subscrevemo-nos com os melhores cumprimentos.</p>
      </div>

      {/* Signatures */}
      <div className="mt-16 grid grid-cols-2 gap-8">
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
