import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';

interface PrintableBranchCostAnalysisProps {
  entries: PayrollEntry[];
  employees: Employee[];
  branches: Branch[];
  periodLabel: string;
  companyName: string;
  companyNif: string;
  onClose?: () => void;
}

/**
 * Análise de Custos por Filial - Branch Cost Analysis Report
 * 
 * Cost breakdown by branch/location for multi-site companies
 */
export const PrintableBranchCostAnalysis: React.FC<PrintableBranchCostAnalysisProps> = ({
  entries,
  employees,
  branches,
  periodLabel,
  companyName,
  companyNif,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Custos-Filiais-${periodLabel}`,
  });

  // Get branch name by ID
  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'Sem Filial';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Desconhecida';
  };

  const getBranchCity = (branchId?: string) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch?.city || '-';
  };

  // Group entries by branch
  const branchGroups = new Map<string, {
    branchId: string;
    branchName: string;
    city: string;
    entries: PayrollEntry[];
    employees: Employee[];
  }>();

  entries.forEach(entry => {
    const branchId = entry.employee?.branchId || 'no-branch';
    if (!branchGroups.has(branchId)) {
      branchGroups.set(branchId, {
        branchId,
        branchName: getBranchName(entry.employee?.branchId),
        city: getBranchCity(entry.employee?.branchId),
        entries: [],
        employees: [],
      });
    }
    branchGroups.get(branchId)!.entries.push(entry);
  });

  // Add employees to their branches
  employees.forEach(emp => {
    const branchId = emp.branchId || 'no-branch';
    if (branchGroups.has(branchId)) {
      branchGroups.get(branchId)!.employees.push(emp);
    }
  });

  // Calculate costs per branch
  const branchCosts = Array.from(branchGroups.values()).map(group => {
    const totals = group.entries.reduce((acc, entry) => ({
      baseSalary: acc.baseSalary + entry.baseSalary,
      allowances: acc.allowances + entry.mealAllowance + entry.transportAllowance + entry.familyAllowance,
      bonuses: acc.bonuses + entry.monthlyBonus + entry.thirteenthMonth + entry.holidaySubsidy,
      overtime: acc.overtime + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
      grossSalary: acc.grossSalary + entry.grossSalary,
      irt: acc.irt + entry.irt,
      inssEmployee: acc.inssEmployee + entry.inssEmployee,
      inssEmployer: acc.inssEmployer + entry.inssEmployer,
      netSalary: acc.netSalary + entry.netSalary,
      totalEmployerCost: acc.totalEmployerCost + entry.grossSalary + entry.inssEmployer,
    }), {
      baseSalary: 0,
      allowances: 0,
      bonuses: 0,
      overtime: 0,
      grossSalary: 0,
      irt: 0,
      inssEmployee: 0,
      inssEmployer: 0,
      netSalary: 0,
      totalEmployerCost: 0,
    });

    return {
      ...group,
      employeeCount: group.entries.length,
      ...totals,
      averagePerEmployee: group.entries.length > 0 ? totals.totalEmployerCost / group.entries.length : 0,
    };
  }).sort((a, b) => b.totalEmployerCost - a.totalEmployerCost);

  // Grand totals
  const grandTotals = branchCosts.reduce((acc, b) => ({
    employeeCount: acc.employeeCount + b.employeeCount,
    baseSalary: acc.baseSalary + b.baseSalary,
    allowances: acc.allowances + b.allowances,
    bonuses: acc.bonuses + b.bonuses,
    overtime: acc.overtime + b.overtime,
    grossSalary: acc.grossSalary + b.grossSalary,
    irt: acc.irt + b.irt,
    inssEmployee: acc.inssEmployee + b.inssEmployee,
    inssEmployer: acc.inssEmployer + b.inssEmployer,
    netSalary: acc.netSalary + b.netSalary,
    totalEmployerCost: acc.totalEmployerCost + b.totalEmployerCost,
  }), {
    employeeCount: 0,
    baseSalary: 0,
    allowances: 0,
    bonuses: 0,
    overtime: 0,
    grossSalary: 0,
    irt: 0,
    inssEmployee: 0,
    inssEmployer: 0,
    netSalary: 0,
    totalEmployerCost: 0,
  });

  // Calculate percentages
  const branchPercentages = branchCosts.map(b => ({
    ...b,
    percentage: grandTotals.totalEmployerCost > 0 
      ? (b.totalEmployerCost / grandTotals.totalEmployerCost * 100).toFixed(1)
      : '0',
  }));

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
          <h1 className="text-xl font-bold uppercase">Análise de Custos por Filial</h1>
          <h2 className="text-lg font-semibold mt-2">Período: {periodLabel}</h2>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Empresa:</strong> {companyName}</p>
            <p><strong>NIF:</strong> {companyNif}</p>
          </div>
          <div className="text-right">
            <p><strong>Total de Filiais:</strong> {branches.length}</p>
            <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-AO')}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Filiais Activas</p>
            <p className="text-2xl font-bold">{branchCosts.length}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Total Trabalhadores</p>
            <p className="text-2xl font-bold">{grandTotals.employeeCount}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Custo Total Empresa</p>
            <p className="text-xl font-bold">{formatAOA(grandTotals.totalEmployerCost)}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Custo Médio/Funcionário</p>
            <p className="text-xl font-bold">
              {formatAOA(grandTotals.employeeCount > 0 ? grandTotals.totalEmployerCost / grandTotals.employeeCount : 0)}
            </p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Filial</th>
              <th className="border border-black p-1 text-left">Cidade</th>
              <th className="border border-black p-1 text-center">Func.</th>
              <th className="border border-black p-1 text-right">Sal. Base</th>
              <th className="border border-black p-1 text-right">Subsídios</th>
              <th className="border border-black p-1 text-right">Bónus</th>
              <th className="border border-black p-1 text-right">H. Extra</th>
              <th className="border border-black p-1 text-right">Bruto</th>
              <th className="border border-black p-1 text-right">INSS Emp.</th>
              <th className="border border-black p-1 text-right">Custo Total</th>
              <th className="border border-black p-1 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {branchPercentages.map((branch, idx) => (
              <tr key={branch.branchId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-black p-1 font-medium">{branch.branchName}</td>
                <td className="border border-black p-1">{branch.city}</td>
                <td className="border border-black p-1 text-center">{branch.employeeCount}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.baseSalary)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.allowances)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.bonuses)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.overtime)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.grossSalary)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(branch.inssEmployer)}</td>
                <td className="border border-black p-1 text-right font-bold">{formatAOA(branch.totalEmployerCost)}</td>
                <td className="border border-black p-1 text-center font-medium">{branch.percentage}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td className="border border-black p-1">TOTAIS</td>
              <td className="border border-black p-1">-</td>
              <td className="border border-black p-1 text-center">{grandTotals.employeeCount}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.baseSalary)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.allowances)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.bonuses)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.overtime)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.grossSalary)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.inssEmployer)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(grandTotals.totalEmployerCost)}</td>
              <td className="border border-black p-1 text-center">100%</td>
            </tr>
          </tfoot>
        </table>

        {/* Cost Distribution Visual */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-3 text-sm">Distribuição de Custos por Filial</h3>
          <div className="space-y-2">
            {branchPercentages.map(branch => (
              <div key={branch.branchId} className="flex items-center gap-2">
                <span className="w-24 text-xs truncate">{branch.branchName}</span>
                <div className="flex-1 bg-gray-200 h-4 rounded">
                  <div 
                    className="bg-blue-600 h-4 rounded"
                    style={{ width: `${branch.percentage}%` }}
                  />
                </div>
                <span className="w-16 text-xs text-right">{branch.percentage}%</span>
                <span className="w-28 text-xs text-right font-medium">{formatAOA(branch.totalEmployerCost)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Average Cost per Branch */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2 text-sm">Custo Médio por Funcionário (por Filial)</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">Filial</th>
                <th className="border border-black p-1 text-center">Funcionários</th>
                <th className="border border-black p-1 text-right">Custo Total</th>
                <th className="border border-black p-1 text-right">Custo Médio</th>
                <th className="border border-black p-1 text-center">vs. Média Geral</th>
              </tr>
            </thead>
            <tbody>
              {branchPercentages.map((branch, idx) => {
                const avgGeneral = grandTotals.employeeCount > 0 ? grandTotals.totalEmployerCost / grandTotals.employeeCount : 0;
                const diff = branch.averagePerEmployee - avgGeneral;
                const diffPercent = avgGeneral > 0 ? (diff / avgGeneral * 100).toFixed(1) : '0';
                
                return (
                  <tr key={branch.branchId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-black p-1">{branch.branchName}</td>
                    <td className="border border-black p-1 text-center">{branch.employeeCount}</td>
                    <td className="border border-black p-1 text-right">{formatAOA(branch.totalEmployerCost)}</td>
                    <td className="border border-black p-1 text-right font-medium">{formatAOA(branch.averagePerEmployee)}</td>
                    <td className="border border-black p-1 text-center">
                      <span className={diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}>
                        {diff > 0 ? '+' : ''}{diffPercent}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12">
              <p>Responsável Financeiro</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-12">
              <p>Direcção Geral</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-600 border-t pt-4">
          <p>Nota: O custo total do empregador inclui salário bruto + contribuições INSS patronal (8%).</p>
        </div>
      </div>
    </div>
  );
};
