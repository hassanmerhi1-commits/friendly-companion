import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintableColaboradorSheetProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName?: string;
  companyNif?: string;
  branch?: Branch;
  warehouseName?: string;
}

export function PrintableColaboradorSheet({
  entries,
  periodLabel,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  branch,
  warehouseName,
}: PrintableColaboradorSheetProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');

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
    title: language === 'pt' ? 'FOLHA DE COLABORADORES' : 'COLLABORATORS SHEET',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Colaborador' : 'Collaborator',
    position: language === 'pt' ? 'Cargo' : 'Position',
    baseSalary: language === 'pt' ? 'Salário Base' : 'Base Salary',
    mealAllowance: language === 'pt' ? 'Sub. Alimentação' : 'Meal Allow.',
    transportAllowance: language === 'pt' ? 'Sub. Transporte' : 'Transport Allow.',
    familyAllowance: language === 'pt' ? 'Abono Familiar' : 'Family Allow.',
    grossSalary: language === 'pt' ? 'Salário Bruto' : 'Gross Salary',
    absenceDeduction: language === 'pt' ? 'Desc. Faltas' : 'Absence Ded.',
    loanDeduction: language === 'pt' ? 'Empréstimos' : 'Loans',
    totalDeductions: language === 'pt' ? 'Total Descontos' : 'Total Deductions',
    netSalary: language === 'pt' ? 'Salário Líquido' : 'Net Salary',
    signature: language === 'pt' ? 'Assinatura' : 'Signature',
    totals: language === 'pt' ? 'TOTAIS' : 'TOTALS',
    print: language === 'pt' ? 'Imprimir Folha' : 'Print Sheet',
    noTax: language === 'pt' ? 'Sem INSS / Sem IRT' : 'No INSS / No IRT',
    legalNote: language === 'pt'
      ? 'Colaboradores externos - Sem descontos de INSS e IRT'
      : 'External collaborators - No INSS or IRT deductions',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    approvedBy: language === 'pt' ? 'Aprovado por' : 'Approved by',
    date: language === 'pt' ? 'Data' : 'Date',
    daysAbsent: language === 'pt' ? 'Dias Falta' : 'Days Absent',
  };

  const totals = entries.reduce((acc, e) => ({
    baseSalary: acc.baseSalary + e.baseSalary,
    mealAllowance: acc.mealAllowance + e.mealAllowance,
    transportAllowance: acc.transportAllowance + e.transportAllowance,
    familyAllowance: acc.familyAllowance + (e.familyAllowance || 0),
    grossSalary: acc.grossSalary + e.grossSalary,
    absenceDeduction: acc.absenceDeduction + (e.absenceDeduction || 0),
    loanDeduction: acc.loanDeduction + (e.loanDeduction || 0),
    totalDeductions: acc.totalDeductions + e.totalDeductions,
    netSalary: acc.netSalary + e.netSalary,
    daysAbsent: acc.daysAbsent + (e.daysAbsent || 0),
  }), {
    baseSalary: 0, mealAllowance: 0, transportAllowance: 0, familyAllowance: 0,
    grossSalary: 0, absenceDeduction: 0, loanDeduction: 0, totalDeductions: 0,
    netSalary: 0, daysAbsent: 0,
  });

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;

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
          body { font-family: Arial, sans-serif; font-size: 8px; padding: 10px; }
          .header { display: flex; align-items: center; margin-bottom: 15px; gap: 15px; }
          .logo { width: 60px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 12px; font-weight: bold; }
          .document-title { font-size: 11px; font-weight: bold; margin: 8px 0; text-transform: uppercase; color: #e67e22; }
          .period { font-size: 9px; margin-bottom: 8px; }
          .no-tax-badge { background: #e67e22; color: white; padding: 2px 8px; border-radius: 3px; font-size: 8px; display: inline-block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #333; padding: 3px 4px; text-align: right; font-size: 8px; }
          th { background: #e67e22; color: white; font-weight: bold; text-align: center; font-size: 7px; text-transform: uppercase; }
          td:first-child { text-align: center; }
          td:nth-child(2) { text-align: left; }
          .totals-row { background: #f0e0c0; font-weight: bold; }
          .net-salary { background: #d0f0d0; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { width: 180px; text-align: center; font-size: 8px; }
          .signature-line { border-top: 1px solid #000; margin-top: 35px; padding-top: 4px; }
          .legal-note { font-size: 7px; font-style: italic; margin-top: 15px; text-align: center; color: #e67e22; }
          @media print {
            body { padding: 8px; }
            @page { size: landscape; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `;

    await printHtml(htmlContent, { width: 1000, height: 700 });
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
              <div>{branch.address}, {branch.city} - {branch.province}</div>
            )}
            <div className="document-title">{t.title}</div>
            <div className="period">{t.period}: {periodLabel}</div>
            <div className="no-tax-badge">{t.noTax}</div>
          </div>
        </div>

        {/* Main Table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th style={{ width: '140px' }}>{t.employee}</th>
              <th>{t.position}</th>
              <th>{t.baseSalary}</th>
              <th>{t.mealAllowance}</th>
              <th>{t.transportAllowance}</th>
              <th>{t.familyAllowance}</th>
              <th>{t.grossSalary}</th>
              <th>{t.daysAbsent}</th>
              <th>{t.absenceDeduction}</th>
              <th>{t.loanDeduction}</th>
              <th>{t.totalDeductions}</th>
              <th className="net-salary">{t.netSalary}</th>
              <th>{t.signature}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const fullName = `${entry.employee?.firstName || ''} ${entry.employee?.lastName || ''}`.trim();
              return (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left' }}>{fullName}</td>
                  <td style={{ textAlign: 'left', fontSize: '7px' }}>{entry.employee?.position || ''}</td>
                  <td>{formatAOA(entry.baseSalary)}</td>
                  <td>{formatAOA(entry.mealAllowance)}</td>
                  <td>{formatAOA(entry.transportAllowance)}</td>
                  <td>{formatAOA(entry.familyAllowance || 0)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatAOA(entry.grossSalary)}</td>
                  <td style={{ textAlign: 'center' }}>{entry.daysAbsent || 0}</td>
                  <td style={{ color: (entry.absenceDeduction || 0) > 0 ? '#c0392b' : 'inherit' }}>{formatAOA(entry.absenceDeduction || 0)}</td>
                  <td style={{ color: (entry.loanDeduction || 0) > 0 ? '#c0392b' : 'inherit' }}>{formatAOA(entry.loanDeduction || 0)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatAOA(entry.totalDeductions)}</td>
                  <td className="net-salary">{formatAOA(entry.netSalary)}</td>
                  <td style={{ width: '70px' }}></td>
                </tr>
              );
            })}
            <tr className="totals-row">
              <td colSpan={3} style={{ textAlign: 'center' }}>{t.totals}</td>
              <td>{formatAOA(totals.baseSalary)}</td>
              <td>{formatAOA(totals.mealAllowance)}</td>
              <td>{formatAOA(totals.transportAllowance)}</td>
              <td>{formatAOA(totals.familyAllowance)}</td>
              <td>{formatAOA(totals.grossSalary)}</td>
              <td style={{ textAlign: 'center' }}>{totals.daysAbsent}</td>
              <td>{formatAOA(totals.absenceDeduction)}</td>
              <td>{formatAOA(totals.loanDeduction)}</td>
              <td>{formatAOA(totals.totalDeductions)}</td>
              <td className="net-salary">{formatAOA(totals.netSalary)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="legal-note">{t.legalNote}</div>
        <div className="footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
          <div className="signature-box" style={{ width: '180px', textAlign: 'center' }}>
            <div className="signature-line" style={{ borderTop: '1px solid #000', marginTop: '35px', paddingTop: '4px' }}>
              {t.preparedBy}
            </div>
          </div>
          <div className="signature-box" style={{ width: '180px', textAlign: 'center' }}>
            <div className="signature-line" style={{ borderTop: '1px solid #000', marginTop: '35px', paddingTop: '4px' }}>
              {t.approvedBy}
            </div>
          </div>
          <div className="signature-box" style={{ width: '180px', textAlign: 'center' }}>
            <div className="signature-line" style={{ borderTop: '1px solid #000', marginTop: '35px', paddingTop: '4px' }}>
              {t.date}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
