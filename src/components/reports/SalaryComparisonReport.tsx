/**
 * Salary Comparison Report
 * 
 * Year-over-year salary analysis for all employees
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Printer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import type { SalaryComparison } from '@/types/audit';

interface Props {
  comparisons: SalaryComparison[];
  companyName: string;
}

export function SalaryComparisonReport({ comparisons, companyName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  const handlePrint = useReactToPrint({
    // @ts-ignore
    contentRef: printRef,
    documentTitle: `Salary-Comparison-${new Date().getFullYear()}`,
  });
  
  // Get all unique years
  const allYears = [...new Set(comparisons.flatMap(c => c.years.map(y => y.year)))].sort();
  
  // Filter employees with multiple years for meaningful comparison
  const employeesWithHistory = comparisons.filter(c => c.years.length > 0);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handlePrint()} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          {language === 'pt' ? 'Imprimir' : 'Print'}
        </Button>
      </div>
      
      <div ref={printRef} className="bg-white text-black p-6 print:p-0">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">{companyName}</h1>
          <h2 className="text-lg font-semibold mt-2">
            {language === 'pt' ? 'COMPARATIVO SALARIAL ANUAL' : 'ANNUAL SALARY COMPARISON'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {allYears.length > 0 && `${allYears[0]} - ${allYears[allYears.length - 1]}`}
          </p>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Funcionários' : 'Employees'}
            </div>
            <div className="text-2xl font-bold">{employeesWithHistory.length}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Anos Analisados' : 'Years Analyzed'}
            </div>
            <div className="text-2xl font-bold text-blue-600">{allYears.length}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Com Crescimento' : 'With Growth'}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {comparisons.filter(c => (c.salaryGrowthPercent || 0) > 0).length}
            </div>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border-r sticky left-0 bg-gray-100">
                  {language === 'pt' ? 'Funcionário' : 'Employee'}
                </th>
                {allYears.map(year => (
                  <th key={year} className="p-2 text-center border-r" colSpan={2}>
                    {year}
                  </th>
                ))}
                <th className="p-2 text-center bg-blue-50">
                  {language === 'pt' ? 'Crescimento' : 'Growth'}
                </th>
              </tr>
              <tr className="bg-gray-50 text-[10px]">
                <th className="p-1 border-r sticky left-0 bg-gray-50"></th>
                {allYears.map(year => (
                  <>
                    <th key={`${year}-gross`} className="p-1 text-right border-r">
                      {language === 'pt' ? 'Bruto' : 'Gross'}
                    </th>
                    <th key={`${year}-net`} className="p-1 text-right border-r">
                      {language === 'pt' ? 'Líq.' : 'Net'}
                    </th>
                  </>
                ))}
                <th className="p-1 text-center bg-blue-50">%</th>
              </tr>
            </thead>
            <tbody>
              {employeesWithHistory.map(comparison => (
                <tr key={comparison.employeeId} className="border-t hover:bg-gray-50">
                  <td className="p-2 border-r font-medium sticky left-0 bg-white">
                    {comparison.employeeName}
                  </td>
                  {allYears.map(year => {
                    const yearData = comparison.years.find(y => y.year === year);
                    return (
                      <>
                        <td key={`${year}-gross`} className="p-2 text-right border-r font-mono">
                          {yearData ? formatAOA(yearData.totalGross) : '-'}
                        </td>
                        <td key={`${year}-net`} className="p-2 text-right border-r font-mono">
                          {yearData ? formatAOA(yearData.totalNet) : '-'}
                        </td>
                      </>
                    );
                  })}
                  <td className="p-2 text-center font-bold bg-blue-50">
                    {comparison.salaryGrowthPercent !== undefined ? (
                      <div className="flex items-center justify-center gap-1">
                        {comparison.salaryGrowthPercent > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : comparison.salaryGrowthPercent < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : (
                          <Minus className="h-3 w-3 text-gray-400" />
                        )}
                        <span className={
                          comparison.salaryGrowthPercent > 0 
                            ? 'text-green-600' 
                            : comparison.salaryGrowthPercent < 0 
                              ? 'text-red-600' 
                              : 'text-gray-400'
                        }>
                          {comparison.salaryGrowthPercent > 0 ? '+' : ''}
                          {comparison.salaryGrowthPercent.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Year Totals */}
        <div className="mt-6">
          <h3 className="font-bold mb-3">
            {language === 'pt' ? 'Totais por Ano' : 'Totals by Year'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allYears.map(year => {
              const yearTotal = employeesWithHistory.reduce((sum, c) => {
                const yearData = c.years.find(y => y.year === year);
                return sum + (yearData?.totalNet || 0);
              }, 0);
              const yearEmployees = employeesWithHistory.filter(c => 
                c.years.some(y => y.year === year)
              ).length;
              
              return (
                <div key={year} className="border rounded p-3">
                  <div className="text-lg font-bold">{year}</div>
                  <div className="text-sm text-gray-500">
                    {yearEmployees} {language === 'pt' ? 'funcionários' : 'employees'}
                  </div>
                  <div className="text-lg font-bold text-primary mt-1">
                    {formatAOA(yearTotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          {language === 'pt' 
            ? `Documento gerado em ${new Date().toLocaleString('pt-AO')}`
            : `Document generated on ${new Date().toLocaleString('en-US')}`
          }
        </div>
      </div>
    </div>
  );
}
