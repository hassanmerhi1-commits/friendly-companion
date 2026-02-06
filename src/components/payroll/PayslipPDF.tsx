import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useLanguage } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import { formatAOA } from '@/lib/angola-labor-law';
import type { Employee } from '@/types/employee';
import type { PayrollEntry } from '@/types/payroll';

interface PayslipPDFProps {
  employee: Employee;
  entry: PayrollEntry;
  periodMonth: number;
  periodYear: number;
}

export function PayslipPDF({ employee, entry, periodMonth, periodYear }: PayslipPDFProps) {
  const { language } = useLanguage();
  const { settings } = useSettingsStore();
  const payslipRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: payslipRef,
  });

  const monthNames = language === 'pt'
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const t = {
    title: language === 'pt' ? 'RECIBO DE VENCIMENTO' : 'PAYSLIP',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    employeeNumber: language === 'pt' ? 'Nº Funcionário' : 'Employee No.',
    position: language === 'pt' ? 'Cargo' : 'Position',
    department: language === 'pt' ? 'Departamento' : 'Department',
    nif: language === 'pt' ? 'NIF' : 'Tax ID',
    inss: language === 'pt' ? 'INSS' : 'Social Security',
    earnings: language === 'pt' ? 'RENDIMENTOS' : 'EARNINGS',
    baseSalary: language === 'pt' ? 'Salário Base' : 'Base Salary',
    mealAllowance: language === 'pt' ? 'Subsídio de Alimentação' : 'Meal Allowance',
    transportAllowance: language === 'pt' ? 'Subsídio de Transporte' : 'Transport Allowance',
    familyAllowance: language === 'pt' ? 'Abono de Família' : 'Family Allowance',
    monthlyBonus: language === 'pt' ? 'Bónus Mensal' : 'Monthly Bonus',
    overtime: language === 'pt' ? 'Horas Extra' : 'Overtime',
    thirteenthMonth: language === 'pt' ? 'Subsídio de Natal' : '13th Month',
    holidaySubsidy: language === 'pt' ? 'Subsídio de Férias' : 'Holiday Subsidy',
    grossTotal: language === 'pt' ? 'Total Bruto' : 'Gross Total',
    deductions: language === 'pt' ? 'DESCONTOS' : 'DEDUCTIONS',
    irt: language === 'pt' ? 'IRT (Imposto)' : 'Income Tax',
    inssContrib: language === 'pt' ? 'INSS (3%)' : 'INSS (3%)',
    otherDeductions: language === 'pt' ? 'Outros Descontos' : 'Other Deductions',
    absenceDeduction: language === 'pt' ? 'Desconto por Ausência' : 'Absence Deduction',
    totalDeductions: language === 'pt' ? 'Total Descontos' : 'Total Deductions',
    netSalary: language === 'pt' ? 'SALÁRIO LÍQUIDO' : 'NET SALARY',
    employeeSignature: language === 'pt' ? 'Assinatura do Funcionário' : 'Employee Signature',
    companySignature: language === 'pt' ? 'Assinatura da Empresa' : 'Company Signature',
    date: language === 'pt' ? 'Data' : 'Date',
    print: language === 'pt' ? 'Imprimir Recibo' : 'Print Payslip',
    generatedOn: language === 'pt' ? 'Gerado em' : 'Generated on',
  };

  return (
    <>
      <Button onClick={() => handlePrint()} variant="outline" size="sm">
        <FileText className="h-4 w-4 mr-2" />
        {t.print}
      </Button>

      {/* Hidden printable content */}
      <div className="hidden">
        <div ref={payslipRef} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">{settings.companyName || 'EMPRESA'}</h1>
                <p className="text-sm">{settings.address}</p>
                <p className="text-sm">NIF: {settings.nif}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold">{t.title}</h2>
                <p className="text-sm">{t.period}: {monthNames[periodMonth - 1]} {periodYear}</p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
            <div>
              <p><strong>{t.employee}:</strong> {employee.firstName} {employee.lastName}</p>
              <p><strong>{t.employeeNumber}:</strong> {employee.employeeNumber}</p>
              <p><strong>{t.position}:</strong> {employee.position}</p>
            </div>
            <div>
              <p><strong>{t.department}:</strong> {employee.department}</p>
              <p><strong>{t.nif}:</strong> {employee.nif || '-'}</p>
              <p><strong>{t.inss}:</strong> {employee.inssNumber || '-'}</p>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Earnings */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2">{t.earnings}</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">{t.baseSalary}</td>
                    <td className="text-right font-mono">{formatAOA(entry.baseSalary)}</td>
                  </tr>
                  {employee.mealAllowance > 0 && (
                    <tr>
                      <td className="py-1">{t.mealAllowance}</td>
                      <td className="text-right font-mono">{formatAOA(employee.mealAllowance)}</td>
                    </tr>
                  )}
                  {employee.transportAllowance > 0 && (
                    <tr>
                      <td className="py-1">{t.transportAllowance}</td>
                      <td className="text-right font-mono">{formatAOA(employee.transportAllowance)}</td>
                    </tr>
                  )}
                  {employee.familyAllowance > 0 && (
                    <tr>
                      <td className="py-1">{t.familyAllowance}</td>
                      <td className="text-right font-mono">{formatAOA(employee.familyAllowance)}</td>
                    </tr>
                  )}
                  {employee.monthlyBonus > 0 && (
                    <tr>
                      <td className="py-1">{t.monthlyBonus}</td>
                      <td className="text-right font-mono">{formatAOA(employee.monthlyBonus)}</td>
                    </tr>
                  )}
                  {(entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday) > 0 && (
                    <tr>
                      <td className="py-1">{t.overtime}</td>
                      <td className="text-right font-mono">{formatAOA(entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday)}</td>
                    </tr>
                  )}
                  {(entry.thirteenthMonth || 0) > 0 && (
                    <tr>
                      <td className="py-1">{t.thirteenthMonth}</td>
                      <td className="text-right font-mono">{formatAOA(entry.thirteenthMonth || 0)}</td>
                    </tr>
                  )}
                  {(entry.holidaySubsidy || 0) > 0 && (
                    <tr>
                      <td className="py-1">{t.holidaySubsidy}</td>
                      <td className="text-right font-mono">{formatAOA(entry.holidaySubsidy || 0)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-300 font-bold">
                    <td className="py-2">{t.grossTotal}</td>
                    <td className="text-right font-mono">{formatAOA(entry.grossSalary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2">{t.deductions}</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">{t.irt}</td>
                    <td className="text-right font-mono text-red-600">-{formatAOA(entry.irt)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">{t.inssContrib}</td>
                    <td className="text-right font-mono text-red-600">-{formatAOA(entry.inssEmployee)}</td>
                  </tr>
                  {(entry.absenceDeduction || 0) > 0 && (
                    <tr>
                      <td className="py-1">{t.absenceDeduction}</td>
                      <td className="text-right font-mono text-red-600">-{formatAOA(entry.absenceDeduction || 0)}</td>
                    </tr>
                  )}
                  {(entry.otherDeductions || 0) > 0 && (
                    <tr>
                      <td className="py-1">{t.otherDeductions}</td>
                      <td className="text-right font-mono text-red-600">-{formatAOA(entry.otherDeductions || 0)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-300 font-bold">
                    <td className="py-2">{t.totalDeductions}</td>
                    <td className="text-right font-mono text-red-600">-{formatAOA(entry.irt + entry.inss + (entry.absenceDeduction || 0) + (entry.otherDeductions || 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="p-4 bg-green-50 border-2 border-green-500 rounded mb-8">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{t.netSalary}</span>
              <span className="text-2xl font-bold text-green-700">{formatAOA(entry.netSalary)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-16">
            <div className="text-center">
              <div className="border-t border-black pt-2 mx-8">
                <p className="text-sm">{t.employeeSignature}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2 mx-8">
                <p className="text-sm">{t.companySignature}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-500">
            <p>{t.generatedOn}: {new Date().toLocaleString(language === 'pt' ? 'pt-AO' : 'en-US')}</p>
            <p>PayrollAO - Sistema de Gestão de Salários</p>
          </div>
        </div>
      </div>
    </>
  );
}
