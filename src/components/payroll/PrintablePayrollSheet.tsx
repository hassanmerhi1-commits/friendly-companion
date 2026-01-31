import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA, INSS_RATES } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintablePayrollSheetProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName?: string;
  companyNif?: string;
  branch?: Branch;
  warehouseName?: string;
}

export function PrintablePayrollSheet({
  entries,
  periodLabel,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  branch,
  warehouseName,
}: PrintablePayrollSheetProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Convert logo to base64 for print window
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL('image/jpeg'));
      }
    };
    img.src = companyLogo;
  }, []);

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
    loanDeduction: language === 'pt' ? 'Empréstimos' : 'Loans',
    advanceDeduction: language === 'pt' ? 'Adiantamentos' : 'Advances',
    absenceDeduction: language === 'pt' ? 'Desc. Faltas' : 'Absence Ded.',
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
    overtime: language === 'pt' ? 'Horas Extra' : 'Overtime',
    daysAbsent: language === 'pt' ? 'Dias Falta' : 'Days Absent',
  };

  // Calculate totals
  const totals = entries.reduce((acc, e) => ({
    baseSalary: acc.baseSalary + e.baseSalary,
    mealAllowance: acc.mealAllowance + e.mealAllowance,
    transportAllowance: acc.transportAllowance + e.transportAllowance,
    familyAllowance: acc.familyAllowance + (e.familyAllowance || 0),
    holidaySubsidy: acc.holidaySubsidy + e.holidaySubsidy,
    thirteenthMonth: acc.thirteenthMonth + e.thirteenthMonth,
    overtime: acc.overtime + (e.overtimeNormal || 0) + (e.overtimeNight || 0) + (e.overtimeHoliday || 0),
    grossSalary: acc.grossSalary + e.grossSalary,
    irt: acc.irt + e.irt,
    inssEmployee: acc.inssEmployee + e.inssEmployee,
    loanDeduction: acc.loanDeduction + (e.loanDeduction || 0),
    advanceDeduction: acc.advanceDeduction + (e.advanceDeduction || 0),
    absenceDeduction: acc.absenceDeduction + (e.absenceDeduction || 0),
    otherDeductions: acc.otherDeductions + (e.otherDeductions || 0),
    totalDeductions: acc.totalDeductions + e.totalDeductions,
    netSalary: acc.netSalary + e.netSalary,
    inssEmployer: acc.inssEmployer + e.inssEmployer,
    daysAbsent: acc.daysAbsent + (e.daysAbsent || 0),
  }), {
    baseSalary: 0, mealAllowance: 0, transportAllowance: 0, familyAllowance: 0,
    holidaySubsidy: 0, thirteenthMonth: 0, overtime: 0, grossSalary: 0, irt: 0,
    inssEmployee: 0, loanDeduction: 0, advanceDeduction: 0, absenceDeduction: 0,
    otherDeductions: 0, totalDeductions: 0, netSalary: 0, inssEmployer: 0, daysAbsent: 0,
  });

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;

    // Replace the logo src with base64 in the cloned content
    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement;
    if (logoImg && logoBase64) {
      logoImg.src = logoBase64;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 7px; padding: 10px; }
          .header { display: flex; align-items: center; margin-bottom: 15px; gap: 15px; }
          .logo { width: 60px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 12px; font-weight: bold; }
          .document-title { font-size: 11px; font-weight: bold; margin: 8px 0; text-transform: uppercase; }
          .period { font-size: 9px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #333; padding: 2px 2px; text-align: right; font-size: 7px; }
          th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 6px; text-transform: uppercase; }
          td:first-child { text-align: center; }
          td:nth-child(2) { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
          .employee-name { font-size: 7px; }
          .totals-row { background: #e0e0e0; font-weight: bold; }
          .net-salary { background: #d0f0d0; font-weight: bold; }
          .inss-table { width: 280px; margin-top: 15px; }
          .inss-table th { background: #4a90d9; color: white; font-size: 7px; }
          .inss-total { background: #2e5a8a; color: white; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { width: 180px; text-align: center; font-size: 8px; }
          .signature-line { border-top: 1px solid #000; margin-top: 35px; padding-top: 4px; }
          .legal-note { font-size: 6px; font-style: italic; margin-top: 15px; text-align: center; }
          .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
          @media print {
            body { padding: 8px; font-size: 7px; }
            @page { size: landscape; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `;

    await printHtml(htmlContent, { width: 1200, height: 800 });
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
          <img src={companyLogo} alt="Company Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
          <div className="header-info">
            <div className="company-name">{companyName}</div>
            <div>NIF: {companyNif}</div>
            {branch && (
              <div>
                <strong>{language === 'pt' ? 'Filial' : 'Branch'}:</strong> {branch.name} ({branch.code})
                {warehouseName && <> | <strong>{language === 'pt' ? 'Armazém' : 'Warehouse'}:</strong> {warehouseName}</>}
              </div>
            )}
            {branch && (
              <div>
                {branch.address}, {branch.city} - {branch.province}
              </div>
            )}
            <div className="document-title">{t.title}</div>
            <div className="period">{t.period}: {periodLabel}</div>
          </div>
        </div>

        {/* Main Payroll Table - ABONOS/EARNINGS Section */}
        <table>
          <thead>
            <tr>
              <th colSpan={11} style={{ background: '#4a90d9', color: 'white', fontSize: '8px' }}>{language === 'pt' ? 'ABONOS / RENDIMENTOS' : 'EARNINGS / INCOME'}</th>
            </tr>
            <tr>
              <th style={{ width: '18px', fontSize: '6px' }}>Nº</th>
              <th style={{ width: '130px', fontSize: '6px' }}>{t.employee}</th>
              <th style={{ fontSize: '6px' }}>{t.baseSalary}</th>
              <th style={{ fontSize: '6px' }}>{t.mealAllowance}</th>
              <th style={{ fontSize: '6px' }}>{t.transportAllowance}</th>
              <th style={{ fontSize: '6px' }}>{t.familyAllowance}</th>
              <th style={{ fontSize: '6px' }}>{t.overtime}</th>
              <th style={{ fontSize: '6px' }}>{t.holidaySubsidy}</th>
              <th style={{ fontSize: '6px' }}>{t.thirteenthMonth}</th>
              <th style={{ fontSize: '6px' }}>{t.grossSalary}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const totalOvertime = (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0);
              const fullName = `${entry.employee?.firstName || ''} ${entry.employee?.lastName || ''}`.trim();
              return (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'center', fontSize: '7px' }}>{idx + 1}</td>
                  <td className="employee-name" style={{ textAlign: 'left', fontSize: '7px' }}>{fullName}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.baseSalary)}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.mealAllowance)}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.transportAllowance)}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.familyAllowance || 0)}</td>
                  <td style={{ color: totalOvertime > 0 ? '#27ae60' : 'inherit', fontSize: '7px' }}>{formatAOA(totalOvertime)}</td>
                  <td style={{ color: entry.holidaySubsidy > 0 ? '#27ae60' : 'inherit', fontSize: '7px' }}>{formatAOA(entry.holidaySubsidy)}</td>
                  <td style={{ color: entry.thirteenthMonth > 0 ? '#27ae60' : 'inherit', fontSize: '7px' }}>{formatAOA(entry.thirteenthMonth)}</td>
                  <td style={{ fontWeight: 'bold', fontSize: '7px' }}>{formatAOA(entry.grossSalary)}</td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="totals-row">
              <td colSpan={2} style={{ textAlign: 'center', fontSize: '7px' }}>{t.totals}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.baseSalary)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.mealAllowance)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.transportAllowance)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.familyAllowance)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.overtime)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.holidaySubsidy)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.thirteenthMonth)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.grossSalary)}</td>
            </tr>
          </tbody>
        </table>

        {/* DESCONTOS/DEDUCTIONS Section - Separate Tables for IRT and INSS */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '12px' }}>
          {/* IRT Table */}
          <table style={{ flex: '1' }}>
            <thead>
              <tr>
                <th colSpan={3} style={{ background: '#e74c3c', color: 'white', fontSize: '7px' }}>{language === 'pt' ? 'IMPOSTO (IRT)' : 'TAX (IRT)'}</th>
              </tr>
              <tr>
                <th style={{ width: '18px', fontSize: '6px' }}>Nº</th>
                <th style={{ fontSize: '6px' }}>{t.employee}</th>
                <th style={{ fontSize: '6px' }}>{t.irt}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'center', fontSize: '7px' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left', fontSize: '7px' }}>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.irt)}</td>
                </tr>
              ))}
              <tr className="totals-row">
                <td colSpan={2} style={{ textAlign: 'center', fontSize: '7px' }}>{t.totals}</td>
                <td style={{ fontSize: '7px' }}>{formatAOA(totals.irt)}</td>
              </tr>
            </tbody>
          </table>

          {/* INSS Table */}
          <table style={{ flex: '1' }}>
            <thead>
              <tr>
                <th colSpan={4} style={{ background: '#27ae60', color: 'white', fontSize: '7px' }}>{language === 'pt' ? 'SEGURANÇA SOCIAL (INSS)' : 'SOCIAL SECURITY (INSS)'}</th>
              </tr>
              <tr>
                <th style={{ width: '18px', fontSize: '6px' }}>Nº</th>
                <th style={{ fontSize: '6px' }}>{t.employee}</th>
                <th style={{ fontSize: '6px' }}>{t.inssEmployee} (3%)</th>
                <th style={{ fontSize: '6px' }}>{t.inssEmployer} (8%)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'center', fontSize: '7px' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left', fontSize: '7px' }}>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.inssEmployee)}</td>
                  <td style={{ fontSize: '7px' }}>{formatAOA(entry.inssEmployer)}</td>
                </tr>
              ))}
              <tr className="totals-row">
                <td colSpan={2} style={{ textAlign: 'center', fontSize: '7px' }}>{t.totals}</td>
                <td style={{ fontSize: '7px' }}>{formatAOA(totals.inssEmployee)}</td>
                <td style={{ fontSize: '7px' }}>{formatAOA(totals.inssEmployer)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Salary and All Deductions Detailed */}
        <table style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th colSpan={10} style={{ background: '#2c3e50', color: 'white', fontSize: '7px' }}>{language === 'pt' ? 'DESCONTOS DETALHADOS / RESUMO' : 'DETAILED DEDUCTIONS / SUMMARY'}</th>
            </tr>
            <tr>
              <th style={{ width: '18px', fontSize: '6px' }}>Nº</th>
              <th style={{ fontSize: '6px' }}>{t.employee}</th>
              <th style={{ fontSize: '6px' }}>{t.daysAbsent}</th>
              <th style={{ fontSize: '6px' }}>{t.absenceDeduction}</th>
              <th style={{ fontSize: '6px' }}>{t.loanDeduction}</th>
              <th style={{ fontSize: '6px' }}>{t.advanceDeduction}</th>
              <th style={{ fontSize: '6px' }}>{t.otherDeductions}</th>
              <th style={{ fontSize: '6px' }}>{t.totalDeductions}</th>
              <th style={{ fontSize: '6px' }} className="net-salary">{t.netSalary}</th>
              <th style={{ fontSize: '6px' }}>{t.signature}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'center', fontSize: '7px' }}>{idx + 1}</td>
                <td style={{ textAlign: 'left', fontSize: '7px' }}>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                <td style={{ textAlign: 'center', fontSize: '7px' }}>{entry.daysAbsent || 0}</td>
                <td style={{ fontSize: '7px', color: entry.absenceDeduction ? '#c0392b' : 'inherit' }}>{formatAOA(entry.absenceDeduction || 0)}</td>
                <td style={{ fontSize: '7px', color: entry.loanDeduction ? '#c0392b' : 'inherit' }}>{formatAOA(entry.loanDeduction || 0)}</td>
                <td style={{ fontSize: '7px', color: entry.advanceDeduction ? '#c0392b' : 'inherit' }}>{formatAOA(entry.advanceDeduction || 0)}</td>
                <td style={{ fontSize: '7px' }}>{formatAOA(entry.otherDeductions || 0)}</td>
                <td style={{ fontWeight: 'bold', fontSize: '7px' }}>{formatAOA(entry.totalDeductions)}</td>
                <td className="net-salary" style={{ fontSize: '7px' }}>{formatAOA(entry.netSalary)}</td>
                <td style={{ width: '60px' }}></td>
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan={2} style={{ textAlign: 'center', fontSize: '7px' }}>{t.totals}</td>
              <td style={{ textAlign: 'center', fontSize: '7px' }}>{totals.daysAbsent}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.absenceDeduction)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.loanDeduction)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.advanceDeduction)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.otherDeductions)}</td>
              <td style={{ fontSize: '7px' }}>{formatAOA(totals.totalDeductions)}</td>
              <td className="net-salary" style={{ fontSize: '7px' }}>{formatAOA(totals.netSalary)}</td>
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
