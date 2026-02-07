import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry, PayrollPeriod, MONTH_NAMES_PT } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

interface PrintableAnnualSummaryProps {
  employees: Employee[];
  entries: PayrollEntry[];
  periods: PayrollPeriod[];
  year: number;
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Resumo Anual por Funcionário - Annual Summary Report
 * 
 * Year-end summary of all earnings and deductions per employee
 */
export const PrintableAnnualSummary: React.FC<PrintableAnnualSummaryProps> = ({
  employees,
  entries,
  periods,
  year,
  companyName,
  companyNif,
  branch,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Resumo-Anual-${year}`,
  });

  // Filter periods and entries for the selected year
  const yearPeriods = periods.filter(p => p.year === year);
  const yearPeriodIds = new Set(yearPeriods.map(p => p.id));
  const yearEntries = entries.filter(e => yearPeriodIds.has(e.payrollPeriodId));

  // Calculate annual summary per employee
  const employeeSummaries = employees.map(emp => {
    const empEntries = yearEntries.filter(e => e.employeeId === emp.id);
    
    const summary = empEntries.reduce((acc, entry) => ({
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
      absenceDeduction: acc.absenceDeduction + entry.absenceDeduction,
      loanDeduction: acc.loanDeduction + entry.loanDeduction,
      otherDeductions: acc.otherDeductions + entry.otherDeductions,
      netSalary: acc.netSalary + entry.netSalary,
      inssEmployer: acc.inssEmployer + entry.inssEmployer,
      monthsWorked: acc.monthsWorked + 1,
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
      absenceDeduction: 0,
      loanDeduction: 0,
      otherDeductions: 0,
      netSalary: 0,
      inssEmployer: 0,
      monthsWorked: 0,
    });
    
    return {
      employee: emp,
      ...summary,
      totalDeductions: summary.irt + summary.inssEmployee + summary.absenceDeduction + summary.loanDeduction + summary.otherDeductions,
      averageMonthly: summary.monthsWorked > 0 ? summary.netSalary / summary.monthsWorked : 0,
    };
  }).filter(s => s.monthsWorked > 0);

  // Calculate grand totals
  const grandTotals = employeeSummaries.reduce((acc, s) => ({
    baseSalary: acc.baseSalary + s.baseSalary,
    allowances: acc.allowances + s.mealAllowance + s.transportAllowance + s.familyAllowance,
    bonuses: acc.bonuses + s.monthlyBonus + s.thirteenthMonth + s.holidaySubsidy,
    overtime: acc.overtime + s.overtime,
    grossSalary: acc.grossSalary + s.grossSalary,
    irt: acc.irt + s.irt,
    inssEmployee: acc.inssEmployee + s.inssEmployee,
    otherDeductions: acc.otherDeductions + s.absenceDeduction + s.loanDeduction + s.otherDeductions,
    totalDeductions: acc.totalDeductions + s.totalDeductions,
    netSalary: acc.netSalary + s.netSalary,
    inssEmployer: acc.inssEmployer + s.inssEmployer,
  }), {
    baseSalary: 0,
    allowances: 0,
    bonuses: 0,
    overtime: 0,
    grossSalary: 0,
    irt: 0,
    inssEmployee: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    netSalary: 0,
    inssEmployer: 0,
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
          <h1 className="text-xl font-bold uppercase">Resumo Anual de Remunerações</h1>
          <h2 className="text-lg font-semibold mt-2">Ano Fiscal: {year}</h2>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Empresa:</strong> {companyName}</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-6 text-center">
          <div className="border border-black p-2">
            <p className="text-xs">Trabalhadores</p>
            <p className="text-xl font-bold">{employeeSummaries.length}</p>
          </div>
          <div className="border border-black p-2">
            <p className="text-xs">Total Bruto</p>
            <p className="text-lg font-bold">{formatAOA(grandTotals.grossSalary)}</p>
          </div>
          <div className="border border-black p-2">
            <p className="text-xs">Total IRT</p>
            <p className="text-lg font-bold">{formatAOA(grandTotals.irt)}</p>
          </div>
          <div className="border border-black p-2">
            <p className="text-xs">Total INSS</p>
            <p className="text-lg font-bold">{formatAOA(grandTotals.inssEmployee + grandTotals.inssEmployer)}</p>
          </div>
          <div className="border border-black p-2">
            <p className="text-xs">Total Líquido</p>
            <p className="text-lg font-bold">{formatAOA(grandTotals.netSalary)}</p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse text-[9px] mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-0.5 text-left">Nome</th>
              <th className="border border-black p-0.5 text-center">Meses</th>
              <th className="border border-black p-0.5 text-right">Sal. Base</th>
              <th className="border border-black p-0.5 text-right">Subsídios</th>
              <th className="border border-black p-0.5 text-right">Bónus</th>
              <th className="border border-black p-0.5 text-right">H. Extra</th>
              <th className="border border-black p-0.5 text-right">Bruto</th>
              <th className="border border-black p-0.5 text-right">IRT</th>
              <th className="border border-black p-0.5 text-right">INSS</th>
              <th className="border border-black p-0.5 text-right">Outros</th>
              <th className="border border-black p-0.5 text-right">Líquido</th>
              <th className="border border-black p-0.5 text-right">Média/Mês</th>
            </tr>
          </thead>
          <tbody>
            {employeeSummaries.map((summary, idx) => (
              <tr key={summary.employee.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-black p-0.5">
                  {summary.employee.firstName} {summary.employee.lastName}
                </td>
                <td className="border border-black p-0.5 text-center">{summary.monthsWorked}</td>
                <td className="border border-black p-0.5 text-right">{formatAOA(summary.baseSalary)}</td>
                <td className="border border-black p-0.5 text-right">
                  {formatAOA(summary.mealAllowance + summary.transportAllowance + summary.familyAllowance)}
                </td>
                <td className="border border-black p-0.5 text-right">
                  {formatAOA(summary.monthlyBonus + summary.thirteenthMonth + summary.holidaySubsidy)}
                </td>
                <td className="border border-black p-0.5 text-right">{formatAOA(summary.overtime)}</td>
                <td className="border border-black p-0.5 text-right font-medium">{formatAOA(summary.grossSalary)}</td>
                <td className="border border-black p-0.5 text-right">{formatAOA(summary.irt)}</td>
                <td className="border border-black p-0.5 text-right">{formatAOA(summary.inssEmployee)}</td>
                <td className="border border-black p-0.5 text-right">
                  {formatAOA(summary.absenceDeduction + summary.loanDeduction + summary.otherDeductions)}
                </td>
                <td className="border border-black p-0.5 text-right font-bold">{formatAOA(summary.netSalary)}</td>
                <td className="border border-black p-0.5 text-right">{formatAOA(summary.averageMonthly)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td className="border border-black p-0.5">TOTAIS</td>
              <td className="border border-black p-0.5 text-center">-</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.baseSalary)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.allowances)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.bonuses)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.overtime)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.grossSalary)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.irt)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.inssEmployee)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.otherDeductions)}</td>
              <td className="border border-black p-0.5 text-right">{formatAOA(grandTotals.netSalary)}</td>
              <td className="border border-black p-0.5 text-right">-</td>
            </tr>
          </tfoot>
        </table>

        {/* Monthly Breakdown */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2 text-sm">Resumo Mensal do Ano</h3>
          <div className="grid grid-cols-12 gap-1 text-[8px] text-center">
            {MONTHS_PT.map((month, idx) => {
              const monthPeriod = yearPeriods.find(p => p.month === idx + 1);
              const monthEntries = yearEntries.filter(e => e.payrollPeriodId === monthPeriod?.id);
              const monthTotal = monthEntries.reduce((sum, e) => sum + e.netSalary, 0);
              
              return (
                <div key={month} className="border border-gray-300 p-1">
                  <p className="font-bold">{month}</p>
                  <p className={monthPeriod ? 'text-green-700' : 'text-gray-400'}>
                    {monthPeriod ? formatAOA(monthTotal) : '-'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employer Costs */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2 text-sm">Custos Totais do Empregador</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p>Salários Líquidos Pagos: <strong>{formatAOA(grandTotals.netSalary)}</strong></p>
            </div>
            <div>
              <p>INSS Entidade (8%): <strong>{formatAOA(grandTotals.inssEmployer)}</strong></p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">Custo Total:</p>
              <p className="text-xl font-bold">{formatAOA(grandTotals.grossSalary + grandTotals.inssEmployer)}</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12">
              <p>Responsável pela Contabilidade</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12">
              <p>Representante Legal / Administração</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-600 border-t pt-4">
          <p>Este documento apresenta um resumo anual de todas as remunerações processadas no sistema.</p>
          <p>Deve ser utilizado para fins de arquivo interno e verificação fiscal.</p>
        </div>
      </div>
    </div>
  );
};
