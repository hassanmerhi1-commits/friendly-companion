import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintableCostAnalysisProps {
  entries: PayrollEntry[];
  periodLabel: string;
  branch?: Branch;
  companyName?: string;
  companyNif?: string;
  onClose?: () => void;
}

export function PrintableCostAnalysis({
  entries,
  periodLabel,
  branch,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  onClose,
}: PrintableCostAnalysisProps) {
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
    title: language === 'pt' ? 'ANÁLISE DE CUSTOS' : 'COST ANALYSIS',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    grossSalary: language === 'pt' ? 'Salário Bruto' : 'Gross Salary',
    irt: 'IRT',
    inssEmployee: language === 'pt' ? 'INSS Trab.' : 'INSS Emp.',
    inssEmployer: language === 'pt' ? 'INSS Patronal' : 'INSS Employer',
    netSalary: language === 'pt' ? 'Salário Líquido' : 'Net Salary',
    totalEmployerCost: language === 'pt' ? 'Custo Total Empresa' : 'Total Employer Cost',
    totals: language === 'pt' ? 'TOTAIS' : 'TOTALS',
    print: language === 'pt' ? 'Imprimir Análise' : 'Print Analysis',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    date: language === 'pt' ? 'Data' : 'Date',
    summary: language === 'pt' ? 'RESUMO EXECUTIVO' : 'EXECUTIVE SUMMARY',
    totalGross: language === 'pt' ? 'Total Salários Brutos' : 'Total Gross Salaries',
    totalNet: language === 'pt' ? 'Total Salários Líquidos' : 'Total Net Salaries',
    totalIRT: language === 'pt' ? 'Total IRT' : 'Total IRT',
    totalINSS: language === 'pt' ? 'Total INSS (Empresa + Trab.)' : 'Total INSS (Employer + Emp.)',
    totalCost: language === 'pt' ? 'Custo Total Empresa' : 'Total Company Cost',
    avgCost: language === 'pt' ? 'Custo Médio por Funcionário' : 'Avg Cost per Employee',
    employeeCount: language === 'pt' ? 'Número de Funcionários' : 'Number of Employees',
    generatedOn: language === 'pt' ? 'Gerado em' : 'Generated on',
  };

  const totals = entries.reduce((acc, e) => ({
    grossSalary: acc.grossSalary + e.grossSalary,
    irt: acc.irt + e.irt,
    inssEmployee: acc.inssEmployee + e.inssEmployee,
    inssEmployer: acc.inssEmployer + e.inssEmployer,
    netSalary: acc.netSalary + e.netSalary,
    totalEmployerCost: acc.totalEmployerCost + e.totalEmployerCost,
  }), { grossSalary: 0, irt: 0, inssEmployee: 0, inssEmployer: 0, netSalary: 0, totalEmployerCost: 0 });

  const avgCost = entries.length > 0 ? totals.totalEmployerCost / entries.length : 0;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement;
    if (logoImg && logoBase64) logoImg.src = logoBase64;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
          .header { display: flex; align-items: center; margin-bottom: 25px; gap: 20px; }
          .logo { width: 80px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 18px; font-weight: bold; }
          .document-title { font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #8e44ad; }
          .period { font-size: 12px; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 6px 4px; text-align: right; }
          th { background: #8e44ad; color: white; font-weight: bold; text-align: center; }
          td:first-child, td:nth-child(2) { text-align: left; }
          .totals-row { background: #ecf0f1; font-weight: bold; }
          .cost-highlight { background: #fdf2e9; font-weight: bold; }
          .summary-section { display: flex; gap: 30px; margin-top: 25px; }
          .summary-box { background: #f5eef8; border: 2px solid #8e44ad; padding: 20px; flex: 1; }
          .summary-box h3 { color: #8e44ad; margin-bottom: 15px; font-size: 14px; }
          .summary-item { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; border-bottom: 1px dashed #ccc; }
          .summary-item:last-child { border-bottom: none; }
          .summary-total { background: #8e44ad; color: white; padding: 10px; margin-top: 10px; }
          .footer { margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button onClick={handlePrint} variant="accent">
          <Printer className="h-4 w-4 mr-2" />
          {t.print}
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            {language === 'pt' ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      <div ref={printRef} className="bg-white text-black p-4 text-xs max-h-[60vh] overflow-auto">
        <div className="header">
          <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px' }} />
          <div className="header-info">
            <div className="company-name">{companyName}</div>
            <div>NIF: {companyNif}</div>
            {branch && (
              <>
                <div style={{ marginTop: '5px' }}>
                  <strong>{language === 'pt' ? 'Filial' : 'Branch'}:</strong> {branch.name} ({branch.code})
                </div>
                <div>{branch.address}</div>
                <div>{branch.city}, {branch.province}</div>
              </>
            )}
            <div className="document-title">{t.title}</div>
            <div className="period">{t.period}: {periodLabel}</div>
            <div className="generated" style={{ fontSize: '9px', color: '#666' }}>{t.generatedOn}: {new Date().toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th>{t.employee}</th>
              <th>{t.grossSalary}</th>
              <th>{t.irt}</th>
              <th>{t.inssEmployee}</th>
              <th>{t.inssEmployer}</th>
              <th>{t.netSalary}</th>
              <th className="cost-highlight">{t.totalEmployerCost}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                <td>{formatAOA(entry.grossSalary)}</td>
                <td>{formatAOA(entry.irt)}</td>
                <td>{formatAOA(entry.inssEmployee)}</td>
                <td>{formatAOA(entry.inssEmployer)}</td>
                <td>{formatAOA(entry.netSalary)}</td>
                <td className="cost-highlight">{formatAOA(entry.totalEmployerCost)}</td>
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan={2} style={{ textAlign: 'center' }}>{t.totals}</td>
              <td>{formatAOA(totals.grossSalary)}</td>
              <td>{formatAOA(totals.irt)}</td>
              <td>{formatAOA(totals.inssEmployee)}</td>
              <td>{formatAOA(totals.inssEmployer)}</td>
              <td>{formatAOA(totals.netSalary)}</td>
              <td className="cost-highlight">{formatAOA(totals.totalEmployerCost)}</td>
            </tr>
          </tbody>
        </table>

        <div className="summary-section">
          <div className="summary-box">
            <h3>{t.summary}</h3>
            <div className="summary-item">
              <span>{t.employeeCount}:</span>
              <strong>{entries.length}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalGross}:</span>
              <strong>{formatAOA(totals.grossSalary)}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalNet}:</span>
              <strong>{formatAOA(totals.netSalary)}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalIRT}:</span>
              <strong>{formatAOA(totals.irt)}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalINSS}:</span>
              <strong>{formatAOA(totals.inssEmployee + totals.inssEmployer)}</strong>
            </div>
            <div className="summary-total">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.totalCost}:</span>
                <strong>{formatAOA(totals.totalEmployerCost)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '9px' }}>
                <span>{t.avgCost}:</span>
                <span>{formatAOA(avgCost)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <div className="signature-box">
            <div className="signature-line">{t.preparedBy}</div>
            <div style={{ marginTop: '5px' }}>{t.date}: ___/___/______</div>
          </div>
        </div>
      </div>
    </div>
  );
}
