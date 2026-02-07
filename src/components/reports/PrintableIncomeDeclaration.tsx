import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry, PayrollPeriod } from '@/types/payroll';
import type { Employee } from '@/types/employee';

interface PrintableIncomeDeclarationProps {
  employee: Employee;
  entries: PayrollEntry[];
  periods: PayrollPeriod[];
  year: number;
  companyName: string;
  companyNif: string;
  onClose?: () => void;
}

const MONTHS_PT_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Declaração de Rendimentos - Annual Income Declaration
 * 
 * Individual employee income declaration for tax purposes
 */
export const PrintableIncomeDeclaration: React.FC<PrintableIncomeDeclarationProps> = ({
  employee,
  entries,
  periods,
  year,
  companyName,
  companyNif,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Declaracao-Rendimentos-${employee.firstName}-${employee.lastName}-${year}`,
  });

  // Filter entries for this employee and year
  const yearPeriods = periods.filter(p => p.year === year);
  const yearPeriodIds = new Set(yearPeriods.map(p => p.id));
  const employeeEntries = entries
    .filter(e => e.employeeId === employee.id && yearPeriodIds.has(e.payrollPeriodId))
    .map(entry => {
      const period = periods.find(p => p.id === entry.payrollPeriodId);
      return { ...entry, month: period?.month || 0 };
    })
    .sort((a, b) => a.month - b.month);

  // Calculate annual totals
  const annualTotals = employeeEntries.reduce((acc, entry) => ({
    baseSalary: acc.baseSalary + entry.baseSalary,
    mealAllowance: acc.mealAllowance + entry.mealAllowance,
    transportAllowance: acc.transportAllowance + entry.transportAllowance,
    familyAllowance: acc.familyAllowance + entry.familyAllowance,
    monthlyBonus: acc.monthlyBonus + entry.monthlyBonus,
    overtime: acc.overtime + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
    thirteenthMonth: acc.thirteenthMonth + entry.thirteenthMonth,
    holidaySubsidy: acc.holidaySubsidy + entry.holidaySubsidy,
    grossSalary: acc.grossSalary + entry.grossSalary,
    irt: acc.irt + entry.irt,
    inssEmployee: acc.inssEmployee + entry.inssEmployee,
    netSalary: acc.netSalary + entry.netSalary,
  }), {
    baseSalary: 0,
    mealAllowance: 0,
    transportAllowance: 0,
    familyAllowance: 0,
    monthlyBonus: 0,
    overtime: 0,
    thirteenthMonth: 0,
    holidaySubsidy: 0,
    grossSalary: 0,
    irt: 0,
    inssEmployee: 0,
    netSalary: 0,
  });

  // Calculate taxable income
  const taxableAllowances = Math.max(0, annualTotals.mealAllowance - 30000 * employeeEntries.length) +
                            Math.max(0, annualTotals.transportAllowance - 30000 * employeeEntries.length);
  const totalTaxableIncome = annualTotals.baseSalary + taxableAllowances + annualTotals.holidaySubsidy + 
                             annualTotals.thirteenthMonth + annualTotals.overtime + annualTotals.monthlyBonus;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 print:p-6 min-h-[297mm]">
        {/* Header */}
        <div className="text-center border-2 border-black p-4 mb-6">
          <h1 className="text-xl font-bold uppercase">Declaração de Rendimentos</h1>
          <h2 className="text-lg font-semibold mt-2">Ano Fiscal: {year}</h2>
          <p className="text-sm mt-1">Para efeitos de IRT - Imposto sobre os Rendimentos do Trabalho</p>
        </div>

        {/* Company Info */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2 text-sm border-b pb-1">ENTIDADE EMPREGADORA</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Designação:</strong> {companyName}</p>
              <p><strong>NIF:</strong> {companyNif}</p>
            </div>
            <div className="text-right">
              <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-AO')}</p>
            </div>
          </div>
        </div>

        {/* Employee Info */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2 text-sm border-b pb-1">IDENTIFICAÇÃO DO TRABALHADOR</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Nome Completo:</strong> {employee.firstName} {employee.lastName}</p>
              <p><strong>NIF:</strong> {employee.nif || 'Não registado'}</p>
              <p><strong>BI:</strong> {employee.bilheteIdentidade || 'Não registado'}</p>
            </div>
            <div>
              <p><strong>Cargo:</strong> {employee.position}</p>
              <p><strong>Departamento:</strong> {employee.department}</p>
              <p><strong>Data de Admissão:</strong> {new Date(employee.hireDate).toLocaleDateString('pt-AO')}</p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="border border-black mb-6">
          <h3 className="font-bold text-sm p-2 bg-gray-100 border-b border-black">DISCRIMINAÇÃO MENSAL DE RENDIMENTOS</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-r border-black p-1 text-left">Mês</th>
                <th className="border-r border-black p-1 text-right">Sal. Base</th>
                <th className="border-r border-black p-1 text-right">Subsídios</th>
                <th className="border-r border-black p-1 text-right">Bónus</th>
                <th className="border-r border-black p-1 text-right">H. Extra</th>
                <th className="border-r border-black p-1 text-right">Bruto</th>
                <th className="border-r border-black p-1 text-right">INSS</th>
                <th className="border-r border-black p-1 text-right">IRT</th>
                <th className="p-1 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {employeeEntries.map((entry, idx) => (
                <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-r border-t border-black p-1">{MONTHS_PT_FULL[entry.month - 1]}</td>
                  <td className="border-r border-t border-black p-1 text-right">{formatAOA(entry.baseSalary)}</td>
                  <td className="border-r border-t border-black p-1 text-right">
                    {formatAOA(entry.mealAllowance + entry.transportAllowance + entry.familyAllowance)}
                  </td>
                  <td className="border-r border-t border-black p-1 text-right">
                    {formatAOA(entry.monthlyBonus + entry.thirteenthMonth + entry.holidaySubsidy)}
                  </td>
                  <td className="border-r border-t border-black p-1 text-right">
                    {formatAOA(entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday)}
                  </td>
                  <td className="border-r border-t border-black p-1 text-right font-medium">{formatAOA(entry.grossSalary)}</td>
                  <td className="border-r border-t border-black p-1 text-right">{formatAOA(entry.inssEmployee)}</td>
                  <td className="border-r border-t border-black p-1 text-right">{formatAOA(entry.irt)}</td>
                  <td className="border-t border-black p-1 text-right font-medium">{formatAOA(entry.netSalary)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold border-t-2 border-black">
                <td className="border-r border-black p-1">TOTAIS</td>
                <td className="border-r border-black p-1 text-right">{formatAOA(annualTotals.baseSalary)}</td>
                <td className="border-r border-black p-1 text-right">
                  {formatAOA(annualTotals.mealAllowance + annualTotals.transportAllowance + annualTotals.familyAllowance)}
                </td>
                <td className="border-r border-black p-1 text-right">
                  {formatAOA(annualTotals.monthlyBonus + annualTotals.thirteenthMonth + annualTotals.holidaySubsidy)}
                </td>
                <td className="border-r border-black p-1 text-right">{formatAOA(annualTotals.overtime)}</td>
                <td className="border-r border-black p-1 text-right">{formatAOA(annualTotals.grossSalary)}</td>
                <td className="border-r border-black p-1 text-right">{formatAOA(annualTotals.inssEmployee)}</td>
                <td className="border-r border-black p-1 text-right">{formatAOA(annualTotals.irt)}</td>
                <td className="p-1 text-right">{formatAOA(annualTotals.netSalary)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Annual Summary */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold text-sm border-b pb-2 mb-3">RESUMO ANUAL</h3>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Rendimentos</h4>
              <p className="flex justify-between"><span>Salário Base Anual:</span> <strong>{formatAOA(annualTotals.baseSalary)}</strong></p>
              <p className="flex justify-between"><span>Subsídio de Alimentação:</span> <strong>{formatAOA(annualTotals.mealAllowance)}</strong></p>
              <p className="flex justify-between"><span>Subsídio de Transporte:</span> <strong>{formatAOA(annualTotals.transportAllowance)}</strong></p>
              <p className="flex justify-between"><span>Abono de Família:</span> <strong>{formatAOA(annualTotals.familyAllowance)}</strong></p>
              <p className="flex justify-between"><span>Subsídio de Natal (13º):</span> <strong>{formatAOA(annualTotals.thirteenthMonth)}</strong></p>
              <p className="flex justify-between"><span>Subsídio de Férias:</span> <strong>{formatAOA(annualTotals.holidaySubsidy)}</strong></p>
              <p className="flex justify-between"><span>Bónus Mensal:</span> <strong>{formatAOA(annualTotals.monthlyBonus)}</strong></p>
              <p className="flex justify-between"><span>Horas Extraordinárias:</span> <strong>{formatAOA(annualTotals.overtime)}</strong></p>
              <div className="border-t pt-2 mt-2">
                <p className="flex justify-between text-lg"><span>Rendimento Bruto Total:</span> <strong>{formatAOA(annualTotals.grossSalary)}</strong></p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Deduções e Impostos</h4>
              <p className="flex justify-between"><span>Contribuição INSS (3%):</span> <strong>{formatAOA(annualTotals.inssEmployee)}</strong></p>
              <p className="flex justify-between"><span>Rendimento Colectável:</span> <strong>{formatAOA(annualTotals.grossSalary - annualTotals.inssEmployee)}</strong></p>
              <div className="border-t pt-2 mt-2">
                <p className="flex justify-between text-lg"><span>IRT Retido na Fonte:</span> <strong>{formatAOA(annualTotals.irt)}</strong></p>
              </div>
              <div className="border-t pt-2 mt-4">
                <p className="flex justify-between text-lg"><span>Rendimento Líquido Anual:</span> <strong>{formatAOA(annualTotals.netSalary)}</strong></p>
                <p className="flex justify-between text-sm text-gray-600"><span>Média Mensal Líquida:</span> <span>{formatAOA(annualTotals.netSalary / (employeeEntries.length || 1))}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Declaration */}
        <div className="border border-black p-4 mb-6 text-sm">
          <p className="text-justify">
            Declara-se, para os devidos efeitos, que o trabalhador acima identificado auferiu, durante o ano de <strong>{year}</strong>, 
            os rendimentos discriminados neste documento, tendo sido efectuadas as correspondentes retenções na fonte de 
            <strong> IRT no montante de {formatAOA(annualTotals.irt)}</strong> e 
            <strong> INSS no montante de {formatAOA(annualTotals.inssEmployee)}</strong>.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>O Trabalhador</p>
              <p className="text-xs text-gray-500 mt-1">{employee.firstName} {employee.lastName}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>A Entidade Empregadora</p>
              <p className="text-xs text-gray-500 mt-1">(Carimbo e Assinatura)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-600 border-t pt-4">
          <p>Este documento serve como comprovativo de rendimentos para efeitos fiscais.</p>
          <p>Em caso de dúvidas, o trabalhador deverá contactar a Administração Geral Tributária (AGT).</p>
          <p className="mt-2">Documento emitido electronicamente pelo sistema PayrollAO em {new Date().toLocaleString('pt-AO')}.</p>
        </div>
      </div>
    </div>
  );
};
