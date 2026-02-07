import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';

interface PrintableIRTMapProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Mapa de IRT - Income Tax Withholding Report
 * 
 * For submission to AGT (Administração Geral Tributária)
 * Shows IRT calculation details per employee
 */
export const PrintableIRTMap: React.FC<PrintableIRTMapProps> = ({
  entries,
  periodLabel,
  companyName,
  companyNif,
  branch,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Mapa-IRT-${periodLabel}`,
  });

  // Calculate totals
  const totals = entries.reduce((acc, entry) => {
    const taxableAllowances = Math.max(0, entry.mealAllowance - 30000) + Math.max(0, entry.transportAllowance - 30000);
    const grossTaxable = entry.baseSalary + taxableAllowances + entry.holidaySubsidy + 
                         entry.thirteenthMonth + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
    
    return {
      grossSalary: acc.grossSalary + entry.grossSalary,
      baseSalary: acc.baseSalary + entry.baseSalary,
      taxableAllowances: acc.taxableAllowances + taxableAllowances,
      subsidies: acc.subsidies + entry.holidaySubsidy + entry.thirteenthMonth,
      overtime: acc.overtime + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
      grossTaxable: acc.grossTaxable + grossTaxable,
      inssDeduction: acc.inssDeduction + entry.inssEmployee,
      netTaxable: acc.netTaxable + (grossTaxable - entry.inssEmployee),
      irt: acc.irt + entry.irt,
    };
  }, {
    grossSalary: 0,
    baseSalary: 0,
    taxableAllowances: 0,
    subsidies: 0,
    overtime: 0,
    grossTaxable: 0,
    inssDeduction: 0,
    netTaxable: 0,
    irt: 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 print:p-4 min-h-[297mm]">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">Mapa de Retenção na Fonte - IRT</h1>
          <h2 className="text-lg font-semibold mt-2">Imposto sobre os Rendimentos do Trabalho</h2>
          <p className="text-sm mt-1">Período: {periodLabel}</p>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Contribuinte:</strong> {companyName}</p>
            <p><strong>NIF:</strong> {companyNif}</p>
          </div>
          <div className="text-right">
            {branch && (
              <>
                <p><strong>Filial:</strong> {branch.name}</p>
                <p><strong>Cidade:</strong> {branch.city}</p>
              </>
            )}
            <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-AO')}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Nº</th>
              <th className="border border-black p-1 text-left">Nome do Trabalhador</th>
              <th className="border border-black p-1 text-right">Salário Base</th>
              <th className="border border-black p-1 text-right">Subs. Tributáveis</th>
              <th className="border border-black p-1 text-right">Férias/Natal</th>
              <th className="border border-black p-1 text-right">H. Extra</th>
              <th className="border border-black p-1 text-right">Bruto Tributável</th>
              <th className="border border-black p-1 text-right">INSS (3%)</th>
              <th className="border border-black p-1 text-right">Rend. Colectável</th>
              <th className="border border-black p-1 text-right">IRT Retido</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              // Calculate taxable allowances (only excess above 30,000 Kz)
              const taxableAllowances = Math.max(0, entry.mealAllowance - 30000) + Math.max(0, entry.transportAllowance - 30000);
              const subsidies = entry.holidaySubsidy + entry.thirteenthMonth;
              const overtime = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
              const grossTaxable = entry.baseSalary + taxableAllowances + subsidies + overtime;
              const netTaxable = grossTaxable - entry.inssEmployee;
              
              return (
                <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1">
                    {entry.employee?.firstName} {entry.employee?.lastName}
                  </td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.baseSalary)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(taxableAllowances)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(subsidies)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(overtime)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(grossTaxable)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.inssEmployee)}</td>
                  <td className="border border-black p-1 text-right font-medium">{formatAOA(netTaxable)}</td>
                  <td className="border border-black p-1 text-right font-bold">{formatAOA(entry.irt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={2} className="border border-black p-1">TOTAIS</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.baseSalary)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.taxableAllowances)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.subsidies)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.overtime)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.grossTaxable)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.inssDeduction)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.netTaxable)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.irt)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Summary */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2">Resumo do IRT</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p>Número de Trabalhadores: <strong>{entries.length}</strong></p>
              <p>Total de Remunerações Brutas: <strong>{formatAOA(totals.grossSalary)}</strong></p>
            </div>
            <div>
              <p>Rendimento Colectável Total: <strong>{formatAOA(totals.netTaxable)}</strong></p>
              <p>Isentos de IRT (≤100.000 Kz): <strong>{entries.filter(e => e.irt === 0).length}</strong></p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">Total IRT a Entregar à AGT:</p>
              <p className="text-2xl font-bold">{formatAOA(totals.irt)}</p>
            </div>
          </div>
        </div>

        {/* Tax Brackets Reference */}
        <div className="border border-black p-4 mb-6 text-xs">
          <h3 className="font-bold mb-2">Tabela de IRT (para referência)</h3>
          <div className="grid grid-cols-4 gap-2">
            <p>≤ 100.000 Kz: Isento</p>
            <p>100.001 - 150.000: 13%</p>
            <p>150.001 - 200.000: 16%</p>
            <p>200.001 - 300.000: 18%</p>
            <p>300.001 - 500.000: 19%</p>
            <p>500.001 - 1.000.000: 20%</p>
            <p>1.000.001 - 1.500.000: 21%</p>
            <p>&gt; 1.500.000: 25%</p>
          </div>
          <p className="mt-2 text-gray-600">Nota: Subsídios de alimentação e transporte são tributáveis apenas no excesso acima de 30.000 Kz cada.</p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>Responsável pela Contabilidade</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>Representante Legal / Administração</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-600 border-t pt-4">
          <p>Nota: O IRT retido deve ser entregue à Administração Geral Tributária (AGT) até ao final do mês seguinte.</p>
          <p>Base Legal: Código do Imposto sobre os Rendimentos do Trabalho (Lei nº 18/14 de 22 de Outubro).</p>
        </div>
      </div>
    </div>
  );
};
