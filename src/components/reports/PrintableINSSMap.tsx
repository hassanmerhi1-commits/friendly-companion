import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';

interface PrintableINSSMapProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Mapa de INSS - Social Security Contribution Report
 * 
 * For submission to INSS (Instituto Nacional de Segurança Social)
 * Shows employee contributions (3%) and employer contributions (8%)
 */
export const PrintableINSSMap: React.FC<PrintableINSSMapProps> = ({
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
    documentTitle: `Mapa-INSS-${periodLabel}`,
  });

  // Calculate totals
  const totals = entries.reduce((acc, entry) => ({
    baseSalary: acc.baseSalary + entry.baseSalary,
    mealAllowance: acc.mealAllowance + entry.mealAllowance,
    transportAllowance: acc.transportAllowance + entry.transportAllowance,
    thirteenthMonth: acc.thirteenthMonth + entry.thirteenthMonth,
    overtime: acc.overtime + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
    inssBase: acc.inssBase + entry.baseSalary + entry.mealAllowance + entry.transportAllowance + 
              entry.thirteenthMonth + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
    inssEmployee: acc.inssEmployee + entry.inssEmployee,
    inssEmployer: acc.inssEmployer + entry.inssEmployer,
    totalINSS: acc.totalINSS + entry.inssEmployee + entry.inssEmployer,
  }), {
    baseSalary: 0,
    mealAllowance: 0,
    transportAllowance: 0,
    thirteenthMonth: 0,
    overtime: 0,
    inssBase: 0,
    inssEmployee: 0,
    inssEmployer: 0,
    totalINSS: 0,
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
          <h1 className="text-xl font-bold uppercase">Mapa de Contribuições para a Segurança Social</h1>
          <h2 className="text-lg font-semibold mt-2">INSS - Instituto Nacional de Segurança Social</h2>
          <p className="text-sm mt-1">Período: {periodLabel}</p>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Entidade Empregadora:</strong> {companyName}</p>
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
              <th className="border border-black p-1 text-right">Subsídios</th>
              <th className="border border-black p-1 text-right">13º Mês</th>
              <th className="border border-black p-1 text-right">Horas Extra</th>
              <th className="border border-black p-1 text-right">Base INSS</th>
              <th className="border border-black p-1 text-right">INSS Trab. (3%)</th>
              <th className="border border-black p-1 text-right">INSS Emp. (8%)</th>
              <th className="border border-black p-1 text-right">Total INSS</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const subsidies = entry.mealAllowance + entry.transportAllowance;
              const overtime = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
              const inssBase = entry.baseSalary + subsidies + entry.thirteenthMonth + overtime;
              const totalINSS = entry.inssEmployee + entry.inssEmployer;
              
              return (
                <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1">
                    {entry.employee?.firstName} {entry.employee?.lastName}
                  </td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.baseSalary)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(subsidies)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.thirteenthMonth)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(overtime)}</td>
                  <td className="border border-black p-1 text-right font-medium">{formatAOA(inssBase)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.inssEmployee)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.inssEmployer)}</td>
                  <td className="border border-black p-1 text-right font-bold">{formatAOA(totalINSS)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={2} className="border border-black p-1">TOTAIS</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.baseSalary)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.mealAllowance + totals.transportAllowance)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.thirteenthMonth)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.overtime)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.inssBase)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.inssEmployee)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.inssEmployer)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.totalINSS)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Summary */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2">Resumo das Contribuições</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p>Número de Trabalhadores: <strong>{entries.length}</strong></p>
              <p>Base de Incidência Total: <strong>{formatAOA(totals.inssBase)}</strong></p>
            </div>
            <div>
              <p>Contribuição dos Trabalhadores (3%): <strong>{formatAOA(totals.inssEmployee)}</strong></p>
              <p>Contribuição da Entidade Empregadora (8%): <strong>{formatAOA(totals.inssEmployer)}</strong></p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">Total a Pagar ao INSS:</p>
              <p className="text-2xl font-bold">{formatAOA(totals.totalINSS)}</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>Responsável pelos Recursos Humanos</p>
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
          <p>Nota: Este documento deve ser entregue ao INSS até ao dia 15 do mês seguinte ao período de referência.</p>
          <p>Base Legal: Lei nº 7/04 de 15 de Outubro (Lei de Bases da Protecção Social) e Decreto Executivo nº 84/07.</p>
        </div>
      </div>
    </div>
  );
};
