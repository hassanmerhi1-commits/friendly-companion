import { formatAOA } from "@/lib/angola-labor-law";
import type { Employee } from "@/types/employee";
import type { TerminationReason } from "@/types/hr";

interface TerminationPackage {
  yearsOfService: number;
  severancePay: number;
  proportionalLeave: number;
  proportional13th: number;
  proportionalHolidaySubsidy: number;
  noticePeriodDays: number;
  noticeCompensation: number;
  unusedLeaveCompensation: number;
  totalPackage: number;
}

interface Props {
  employee: Employee;
  terminationDate: string;
  terminationReason: TerminationReason;
  terminationPackage: TerminationPackage;
  reasonDetails?: string;
  processedBy: string;
  language: string;
}

export function PrintableTerminationLetter({
  employee,
  terminationDate,
  terminationReason,
  terminationPackage,
  reasonDetails,
  processedBy,
  language,
}: Props) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getReasonText = (reason: TerminationReason) => {
    if (language === 'pt') {
      const texts = {
        voluntary: 'demissão voluntária',
        dismissal: 'despedimento',
        contract_end: 'término do contrato a prazo',
        retirement: 'reforma',
        mutual_agreement: 'rescisão por mútuo acordo',
      };
      return texts[reason];
    } else {
      const texts = {
        voluntary: 'voluntary resignation',
        dismissal: 'dismissal',
        contract_end: 'fixed-term contract expiration',
        retirement: 'retirement',
        mutual_agreement: 'mutual agreement termination',
      };
      return texts[reason];
    }
  };

  return (
    <div className="bg-white text-black p-8 min-h-[297mm] w-[210mm] mx-auto print:p-0" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          {language === 'pt' ? 'CARTA DE RESCISÃO DE CONTRATO' : 'CONTRACT TERMINATION LETTER'}
        </h1>
        <p className="text-sm mt-2 text-gray-600">
          {language === 'pt' ? 'Lei Geral do Trabalho de Angola' : 'Angola General Labor Law'}
        </p>
      </div>

      {/* Date and Reference */}
      <div className="text-right mb-8">
        <p>Luanda, {formatDate(new Date().toISOString())}</p>
      </div>

      {/* Employee Details */}
      <div className="mb-6">
        <p className="font-bold">{language === 'pt' ? 'Ao(À):' : 'To:'}</p>
        <p className="ml-4">{employee.firstName} {employee.lastName}</p>
        <p className="ml-4">{employee.address || 'N/A'}</p>
      </div>

      {/* Subject */}
      <div className="mb-6">
        <p>
          <span className="font-bold">{language === 'pt' ? 'Assunto:' : 'Subject:'}</span>{' '}
          {language === 'pt' ? 'Rescisão de Contrato de Trabalho' : 'Employment Contract Termination'}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-4 text-justify leading-relaxed">
        {language === 'pt' ? (
          <>
            <p>
              Pela presente, comunicamos formalmente a rescisão do contrato de trabalho celebrado 
              entre a empresa e V. Exa., por motivo de <strong>{getReasonText(terminationReason)}</strong>, 
              com efeito a partir do dia <strong>{formatDate(terminationDate)}</strong>.
            </p>
            
            <p>
              Durante o período de {terminationPackage.yearsOfService.toFixed(1)} anos de serviço prestado 
              na empresa, exercendo a função de <strong>{employee.position}</strong>, 
              V. Exa. demonstrou dedicação e profissionalismo.
            </p>

            {reasonDetails && (
              <p>
                <strong>Observações:</strong> {reasonDetails}
              </p>
            )}

            <p>
              Em conformidade com a Lei Geral do Trabalho de Angola, V. Exa. tem direito ao seguinte 
              pacote de rescisão:
            </p>
          </>
        ) : (
          <>
            <p>
              We hereby formally communicate the termination of the employment contract between 
              the company and yourself, due to <strong>{getReasonText(terminationReason)}</strong>, 
              effective from <strong>{formatDate(terminationDate)}</strong>.
            </p>
            
            <p>
              During your {terminationPackage.yearsOfService.toFixed(1)} years of service at the company, 
              working as <strong>{employee.position}</strong>, 
              you have demonstrated dedication and professionalism.
            </p>

            {reasonDetails && (
              <p>
                <strong>Notes:</strong> {reasonDetails}
              </p>
            )}

            <p>
              In accordance with the Angola General Labor Law, you are entitled to the following 
              termination package:
            </p>
          </>
        )}
      </div>

      {/* Financial Details Table */}
      <div className="my-6">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">
                {language === 'pt' ? 'Descrição' : 'Description'}
              </th>
              <th className="border border-black p-2 text-right">
                {language === 'pt' ? 'Valor (AOA)' : 'Amount (AOA)'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">
                {language === 'pt' ? 'Indemnização por Antiguidade' : 'Severance Pay'}
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatAOA(terminationPackage.severancePay)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2">
                {language === 'pt' ? 'Férias Proporcionais' : 'Proportional Leave'}
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatAOA(terminationPackage.proportionalLeave)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2">
                {language === 'pt' ? '13º Mês Proporcional' : 'Proportional 13th Month'}
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatAOA(terminationPackage.proportional13th)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2">
                {language === 'pt' ? 'Subsídio de Férias Proporcional' : 'Proportional Holiday Subsidy'}
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatAOA(terminationPackage.proportionalHolidaySubsidy)}
              </td>
            </tr>
            {terminationPackage.noticeCompensation > 0 && (
              <tr>
                <td className="border border-black p-2">
                  {language === 'pt' 
                    ? `Compensação de Aviso Prévio (${terminationPackage.noticePeriodDays} dias)` 
                    : `Notice Period Compensation (${terminationPackage.noticePeriodDays} days)`}
                </td>
                <td className="border border-black p-2 text-right font-mono">
                  {formatAOA(terminationPackage.noticeCompensation)}
                </td>
              </tr>
            )}
            {terminationPackage.unusedLeaveCompensation > 0 && (
              <tr>
                <td className="border border-black p-2">
                  {language === 'pt' ? 'Férias Não Gozadas' : 'Unused Leave Compensation'}
                </td>
                <td className="border border-black p-2 text-right font-mono">
                  {formatAOA(terminationPackage.unusedLeaveCompensation)}
                </td>
              </tr>
            )}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black p-2">
                {language === 'pt' ? 'TOTAL A RECEBER' : 'TOTAL TO RECEIVE'}
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatAOA(terminationPackage.totalPackage)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Closing */}
      <div className="space-y-4 text-justify mt-8">
        {language === 'pt' ? (
          <p>
            O pagamento dos valores acima mencionados será efectuado conforme os procedimentos 
            internos da empresa. Agradecemos a sua colaboração durante o período de trabalho.
          </p>
        ) : (
          <p>
            Payment of the above-mentioned amounts will be made according to the company's 
            internal procedures. We thank you for your collaboration during your employment period.
          </p>
        )}
      </div>

      {/* Signature Section */}
      <div className="mt-16 grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-16">
            <p className="font-bold">{language === 'pt' ? 'Pela Empresa' : 'For the Company'}</p>
            <p className="text-sm text-gray-600">{processedBy}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-16">
            <p className="font-bold">{language === 'pt' ? 'O Trabalhador' : 'The Employee'}</p>
            <p className="text-sm text-gray-600">{employee.firstName} {employee.lastName}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-500 border-t pt-4">
        <p>
          {language === 'pt' 
            ? `Documento gerado em ${new Date().toLocaleString('pt-AO')} • PayrollAO` 
            : `Document generated on ${new Date().toLocaleString('en-US')} • PayrollAO`}
        </p>
      </div>
    </div>
  );
}
