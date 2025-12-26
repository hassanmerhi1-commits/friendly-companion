import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA, INSS_RATES } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';

interface PrintablePayrollSheetProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName?: string;
  companyNif?: string;
  branch?: Branch;
}

export function PrintablePayrollSheet({
  entries,
  periodLabel,
  companyName = 'DISTRI-GOOI, LDA',
  companyNif = '5417201524',
  branch,
}: PrintablePayrollSheetProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const t = {
    title: language === 'pt' ? 'FOLHA SALARIAL' : 'PAYROLL SHEET',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    position: language === 'pt' ? 'Cargo' : 'Position',
    baseSalary: language === 'pt' ? 'Salário Base' : 'Base Salary',
    mealAllowance: language === 'pt' ? 'Sub. Alimentação' : 'Meal Allow.',
    transportAllowance: language === 'pt' ? 'Sub. Transporte' : 'Transport Allow.',
    familyAllowance: language === 'pt' ? 'Abono Familiar' : 'Family Allow.',
    holidaySubsidy: language === 'pt' ? 'Sub. Férias' : 'Holiday Sub.',
    thirteenthMonth: language === 'pt' ? 'Sub. Natal' : '13th Month',
    grossSalary: language === 'pt' ? 'Salário Bruto' : 'Gross Salary',
    irt: 'IRT',
    inssEmployee: language === 'pt' ? 'INSS Trab.' : 'INSS Emp.',
    otherDeductions: language === 'pt' ? 'Outros Desc.' : 'Other Ded.',
    totalDeductions: language === 'pt' ? 'Total Descontos' : 'Total Deductions',
    netSalary: language === 'pt' ? 'Salário Líquido' : 'Net Salary',
    inssEmployer: language === 'pt' ? 'INSS Patronal' : 'INSS Employer',
    signature: language === 'pt' ? 'Assinatura' : 'Signature',
    totals: language === 'pt' ? 'TOTAIS' : 'TOTALS',
    print: language === 'pt' ? 'Imprimir Folha' : 'Print Sheet',
    inssTable: language === 'pt' ? 'Resumo INSS' : 'INSS Summary',
    employeeContrib: language === 'pt' ? 'Contribuição do Trabalhador' : 'Employee Contribution',
    employerContrib: language === 'pt' ? 'Contribuição Patronal' : 'Employer Contribution',
    totalInss: language === 'pt' ? 'Total INSS a Entregar' : 'Total INSS Due',
    legalNote: language === 'pt' 
      ? 'Conforme Decreto Presidencial 48/24 e Lei Geral do Trabalho (Lei n.º 12/23)'
      : 'According to Presidential Decree 48/24 and General Labor Law (Law No. 12/23)',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    approvedBy: language === 'pt' ? 'Aprovado por' : 'Approved by',
    date: language === 'pt' ? 'Data' : 'Date',
  };

  // Calculate totals
  const totals = entries.reduce((acc, e) => ({
    baseSalary: acc.baseSalary + e.baseSalary,
    mealAllowance: acc.mealAllowance + e.mealAllowance,
    transportAllowance: acc.transportAllowance + e.transportAllowance,
    familyAllowance: acc.familyAllowance + (e.familyAllowance || 0),
    holidaySubsidy: acc.holidaySubsidy + e.holidaySubsidy,
    thirteenthMonth: acc.thirteenthMonth + e.thirteenthMonth,
    grossSalary: acc.grossSalary + e.grossSalary,
    irt: acc.irt + e.irt,
    inssEmployee: acc.inssEmployee + e.inssEmployee,
    otherDeductions: acc.otherDeductions + e.otherDeductions,
    totalDeductions: acc.totalDeductions + e.totalDeductions,
    netSalary: acc.netSalary + e.netSalary,
    inssEmployer: acc.inssEmployer + e.inssEmployer,
  }), {
    baseSalary: 0, mealAllowance: 0, transportAllowance: 0, familyAllowance: 0,
    holidaySubsidy: 0, thirteenthMonth: 0, grossSalary: 0, irt: 0,
    inssEmployee: 0, otherDeductions: 0, totalDeductions: 0, netSalary: 0, inssEmployer: 0,
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; padding: 15px; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 16px; font-weight: bold; }
          .document-title { font-size: 14px; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
          .period { font-size: 11px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #333; padding: 4px 3px; text-align: right; }
          th { background: #f0f0f0; font-weight: bold; text-align: center; }
          td:first-child, td:nth-child(2) { text-align: left; }
          .totals-row { background: #e0e0e0; font-weight: bold; }
          .net-salary { background: #d0f0d0; font-weight: bold; }
          .inss-table { width: 300px; margin-top: 20px; }
          .inss-table th { background: #4a90d9; color: white; }
          .inss-total { background: #2e5a8a; color: white; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
          .legal-note { font-size: 8px; font-style: italic; margin-top: 20px; text-align: center; }
          .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30px; }
          @media print {
            body { padding: 10px; }
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <Button onClick={handlePrint} variant="accent" className="mb-4">
        <Printer className="h-4 w-4 mr-2" />
        {t.print}
      </Button>

      <div ref={printRef} className="bg-white text-black p-4 text-xs">
        {/* Header */}
        <div className="header">
          <div className="company-name">{companyName}</div>
          <div>NIF: {companyNif}</div>
          {branch && <div>{branch.address}, {branch.city} - {branch.province}</div>}
          <div className="document-title">{t.title}</div>
          <div className="period">{t.period}: {periodLabel}</div>
        </div>

        {/* Main Payroll Table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th style={{ width: '140px' }}>{t.employee}</th>
              <th>{t.baseSalary}</th>
              <th>{t.mealAllowance}</th>
              <th>{t.transportAllowance}</th>
              <th>{t.familyAllowance}</th>
              <th>{t.holidaySubsidy}</th>
              <th>{t.thirteenthMonth}</th>
              <th>{t.grossSalary}</th>
              <th>{t.irt}</th>
              <th>{t.inssEmployee}</th>
              <th>{t.otherDeductions}</th>
              <th>{t.totalDeductions}</th>
              <th className="net-salary">{t.netSalary}</th>
              <th>{t.signature}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                <td>{formatAOA(entry.baseSalary)}</td>
                <td>{formatAOA(entry.mealAllowance)}</td>
                <td>{formatAOA(entry.transportAllowance)}</td>
                <td>{formatAOA(entry.familyAllowance || 0)}</td>
                <td>{formatAOA(entry.holidaySubsidy)}</td>
                <td>{formatAOA(entry.thirteenthMonth)}</td>
                <td>{formatAOA(entry.grossSalary)}</td>
                <td>{formatAOA(entry.irt)}</td>
                <td>{formatAOA(entry.inssEmployee)}</td>
                <td>{formatAOA(entry.otherDeductions)}</td>
                <td>{formatAOA(entry.totalDeductions)}</td>
                <td className="net-salary">{formatAOA(entry.netSalary)}</td>
                <td style={{ width: '80px' }}></td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="totals-row">
              <td colSpan={2} style={{ textAlign: 'center' }}>{t.totals}</td>
              <td>{formatAOA(totals.baseSalary)}</td>
              <td>{formatAOA(totals.mealAllowance)}</td>
              <td>{formatAOA(totals.transportAllowance)}</td>
              <td>{formatAOA(totals.familyAllowance)}</td>
              <td>{formatAOA(totals.holidaySubsidy)}</td>
              <td>{formatAOA(totals.thirteenthMonth)}</td>
              <td>{formatAOA(totals.grossSalary)}</td>
              <td>{formatAOA(totals.irt)}</td>
              <td>{formatAOA(totals.inssEmployee)}</td>
              <td>{formatAOA(totals.otherDeductions)}</td>
              <td>{formatAOA(totals.totalDeductions)}</td>
              <td className="net-salary">{formatAOA(totals.netSalary)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Section with INSS Table and Signatures */}
        <div className="bottom-section">
          {/* INSS Summary Table - Left */}
          <table className="inss-table">
            <thead>
              <tr>
                <th colSpan={2}>{t.inssTable}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>{t.employeeContrib} ({(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}%)</td>
                <td>{formatAOA(totals.inssEmployee)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>{t.employerContrib} ({(INSS_RATES.EMPLOYER_RATE * 100).toFixed(0)}%)</td>
                <td>{formatAOA(totals.inssEmployer)}</td>
              </tr>
              <tr className="inss-total">
                <td style={{ textAlign: 'left' }}>{t.totalInss}</td>
                <td>{formatAOA(totals.inssEmployee + totals.inssEmployer)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures - Right */}
          <div className="footer">
            <div className="signature-box">
              <div className="signature-line">{t.preparedBy}</div>
              <div style={{ marginTop: '5px' }}>{t.date}: ___/___/______</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">{t.approvedBy}</div>
              <div style={{ marginTop: '5px' }}>{t.date}: ___/___/______</div>
            </div>
          </div>
        </div>

        {/* Legal Note */}
        <div className="legal-note">
          {t.legalNote}
        </div>
      </div>
    </div>
  );
}
