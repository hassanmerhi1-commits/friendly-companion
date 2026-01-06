/**
 * Employee Salary History Report
 * 
 * Complete financial history for an employee - for HR decisions
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Printer, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { MONTH_NAMES_PT } from '@/types/payroll';
import type { EmployeeSalaryHistory } from '@/types/audit';

interface Props {
  history: EmployeeSalaryHistory;
  companyName: string;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function EmployeeSalaryHistoryReport({ history, companyName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  const handlePrint = useReactToPrint({
    // @ts-ignore - react-to-print types
    contentRef: printRef,
    documentTitle: `Salary-History-${history.employeeName.replace(/\s+/g, '-')}`,
  });
  
  const monthNames = language === 'pt' ? MONTH_NAMES_PT : MONTH_NAMES_EN;
  
  // Group records by year for display
  const recordsByYear = history.records.reduce((acc, record) => {
    const existing = acc.find(y => y.year === record.year);
    if (existing) {
      existing.records.push(record);
    } else {
      acc.push({ year: record.year, records: [record] });
    }
    return acc;
  }, [] as { year: number; records: typeof history.records }[]);
  
  // Sort years descending (newest first)
  recordsByYear.sort((a, b) => b.year - a.year);
  
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
            {language === 'pt' ? 'HISTÓRICO SALARIAL' : 'SALARY HISTORY'}
          </h2>
          <p className="text-sm mt-1">{history.employeeName}</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Meses Trabalhados' : 'Months Worked'}
            </div>
            <div className="text-2xl font-bold text-blue-600">{history.monthsWorked}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Salário Médio' : 'Average Salary'}
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatAOA(history.averageMonthlySalary)}
            </div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Total Bruto' : 'Total Gross'}
            </div>
            <div className="text-lg font-bold">{formatAOA(history.totalEarnings)}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="text-xs text-gray-500">
              {language === 'pt' ? 'Total Líquido' : 'Total Net'}
            </div>
            <div className="text-lg font-bold text-primary">{formatAOA(history.totalNetPaid)}</div>
          </div>
        </div>
        
        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm border rounded p-3">
          <div>
            <span className="text-gray-500">{language === 'pt' ? 'Data de Contratação:' : 'Hire Date:'}</span>
            <span className="ml-2 font-medium">
              {new Date(history.hireDate).toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US')}
            </span>
          </div>
          <div>
            <span className="text-gray-500">{language === 'pt' ? 'Salário Actual:' : 'Current Salary:'}</span>
            <span className="ml-2 font-medium">{formatAOA(history.currentSalary)}</span>
          </div>
        </div>
        
        {/* Records by Year */}
        {recordsByYear.map(({ year, records }) => {
          const yearTotal = records.reduce((sum, r) => sum + r.netSalary, 0);
          const yearGross = records.reduce((sum, r) => sum + r.grossSalary, 0);
          
          return (
            <div key={year} className="mb-6">
              <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-t">
                <h3 className="font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {year}
                </h3>
                <div className="text-sm">
                  <span className="text-gray-500">{language === 'pt' ? 'Total:' : 'Total:'}</span>
                  <span className="ml-2 font-bold text-primary">{formatAOA(yearTotal)}</span>
                </div>
              </div>
              
              <table className="w-full text-xs border border-t-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left border-r">
                      {language === 'pt' ? 'Mês' : 'Month'}
                    </th>
                    <th className="p-2 text-right border-r">
                      {language === 'pt' ? 'Base' : 'Base'}
                    </th>
                    <th className="p-2 text-right border-r">
                      {language === 'pt' ? 'H.Extra' : 'OT'}
                    </th>
                    <th className="p-2 text-right border-r">
                      {language === 'pt' ? 'Subsídios' : 'Subsidies'}
                    </th>
                    <th className="p-2 text-right border-r">
                      {language === 'pt' ? 'Bruto' : 'Gross'}
                    </th>
                    <th className="p-2 text-right border-r">IRT</th>
                    <th className="p-2 text-right border-r">INSS</th>
                    <th className="p-2 text-right border-r">
                      {language === 'pt' ? 'Desc.' : 'Ded.'}
                    </th>
                    <th className="p-2 text-right font-bold">
                      {language === 'pt' ? 'Líquido' : 'Net'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.sort((a, b) => a.month - b.month).map(record => (
                    <tr key={`${record.year}-${record.month}`} className="border-t hover:bg-gray-50">
                      <td className="p-2 border-r font-medium">
                        {monthNames[record.month - 1]}
                      </td>
                      <td className="p-2 text-right border-r font-mono">
                        {formatAOA(record.baseSalary)}
                      </td>
                      <td className="p-2 text-right border-r font-mono text-blue-600">
                        {record.overtime > 0 ? `+${formatAOA(record.overtime)}` : '-'}
                      </td>
                      <td className="p-2 text-right border-r font-mono text-green-600">
                        {record.subsidies > 0 ? formatAOA(record.subsidies) : '-'}
                      </td>
                      <td className="p-2 text-right border-r font-mono">
                        {formatAOA(record.grossSalary)}
                      </td>
                      <td className="p-2 text-right border-r font-mono text-red-600">
                        -{formatAOA(record.irt)}
                      </td>
                      <td className="p-2 text-right border-r font-mono text-red-600">
                        -{formatAOA(record.inss)}
                      </td>
                      <td className="p-2 text-right border-r font-mono text-red-600">
                        {record.absenceDeduction > 0 ? `-${formatAOA(record.absenceDeduction)}` : '-'}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-primary">
                        {formatAOA(record.netSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr className="border-t-2">
                    <td className="p-2 border-r">{language === 'pt' ? 'TOTAL' : 'TOTAL'}</td>
                    <td className="p-2 text-right border-r font-mono">
                      {formatAOA(records.reduce((s, r) => s + r.baseSalary, 0))}
                    </td>
                    <td className="p-2 text-right border-r font-mono text-blue-600">
                      {formatAOA(records.reduce((s, r) => s + r.overtime, 0))}
                    </td>
                    <td className="p-2 text-right border-r font-mono text-green-600">
                      {formatAOA(records.reduce((s, r) => s + r.subsidies, 0))}
                    </td>
                    <td className="p-2 text-right border-r font-mono">
                      {formatAOA(yearGross)}
                    </td>
                    <td className="p-2 text-right border-r font-mono text-red-600">
                      -{formatAOA(records.reduce((s, r) => s + r.irt, 0))}
                    </td>
                    <td className="p-2 text-right border-r font-mono text-red-600">
                      -{formatAOA(records.reduce((s, r) => s + r.inss, 0))}
                    </td>
                    <td className="p-2 text-right border-r font-mono text-red-600">
                      -{formatAOA(records.reduce((s, r) => s + r.absenceDeduction, 0))}
                    </td>
                    <td className="p-2 text-right font-mono text-primary">
                      {formatAOA(yearTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
        
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
