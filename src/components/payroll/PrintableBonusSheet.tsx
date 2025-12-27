import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintableBonusSheetProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName?: string;
  companyNif?: string;
  branch: Branch;
  warehouseName?: string;
}

export function PrintableBonusSheet({
  entries,
  periodLabel,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  branch,
  warehouseName,
}: PrintableBonusSheetProps) {
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
    title: language === 'pt' ? 'FOLHA DE BÓNUS MENSAL' : 'MONTHLY BONUS SHEET',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    position: language === 'pt' ? 'Cargo' : 'Position',
    department: language === 'pt' ? 'Departamento' : 'Department',
    bonus: language === 'pt' ? 'Bónus Mensal' : 'Monthly Bonus',
    signature: language === 'pt' ? 'Assinatura' : 'Signature',
    totals: language === 'pt' ? 'TOTAL' : 'TOTAL',
    print: language === 'pt' ? 'Imprimir Folha de Bónus' : 'Print Bonus Sheet',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    approvedBy: language === 'pt' ? 'Aprovado por' : 'Approved by',
    date: language === 'pt' ? 'Data' : 'Date',
    branchLabel: language === 'pt' ? 'Filial' : 'Branch',
    warehouseLabel: language === 'pt' ? 'Armazém' : 'Warehouse',
    number: language === 'pt' ? 'Nº' : 'No.',
  };

  // Calculate total bonus - only monthlyBonus, not subsidies
  const totalBonus = entries.reduce((acc, e) => acc + (e.monthlyBonus || 0), 0);

  // Filter entries that have a bonus
  const bonusEntries = entries.filter(e => (e.monthlyBonus || 0) > 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement;
    if (logoImg && logoBase64) logoImg.src = logoBase64;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${branch.name} - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 25px; }
          .header { display: flex; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 15px; gap: 20px; }
          .logo { width: 80px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 20px; font-weight: bold; color: #2c3e50; }
          .branch-info { font-size: 12px; margin-top: 8px; color: #555; }
          .document-title { font-size: 18px; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #27ae60; background: #e8f8e8; padding: 10px; border-radius: 4px; }
          .period { font-size: 13px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th, td { border: 1px solid #333; padding: 10px 8px; }
          th { background: #27ae60; color: white; font-weight: bold; text-align: center; font-size: 12px; }
          td { text-align: center; }
          td.name { text-align: left; }
          td.amount { text-align: right; font-family: monospace; font-size: 12px; }
          .totals-row { background: #2ecc71; color: white; font-weight: bold; font-size: 13px; }
          .footer { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature-box { width: 220px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 10px; }
          .no-bonus { text-align: center; padding: 40px; color: #666; font-style: italic; }
          @media print {
            body { padding: 20px; }
            @page { size: portrait; margin: 15mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <Button onClick={handlePrint} variant="accent" className="mb-4" disabled={bonusEntries.length === 0}>
        <Printer className="h-4 w-4 mr-2" />
        {t.print}
      </Button>

      <div ref={printRef} className="bg-white text-black p-4 text-sm">
        {/* Header */}
        <div className="header">
          <img src={companyLogo} alt="Company Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
          <div className="header-info">
            <div className="company-name">{companyName}</div>
            <div>NIF: {companyNif}</div>
            <div className="branch-info">
              <strong>{t.branchLabel}:</strong> {branch.name} ({branch.code})
              {warehouseName && <> | <strong>{t.warehouseLabel}:</strong> {warehouseName}</>}
            </div>
            <div className="branch-info">
              {branch.address}, {branch.city} - {branch.province}
            </div>
            <div className="document-title">{t.title}</div>
            <div className="period">{t.period}: {periodLabel}</div>
          </div>
        </div>

        {bonusEntries.length === 0 ? (
          <div className="no-bonus">
            {language === 'pt' 
              ? 'Nenhum funcionário com bónus nesta filial para este período.' 
              : 'No employees with bonus in this branch for this period.'}
          </div>
        ) : (
          <>
            {/* Bonus Table */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>{t.number}</th>
                  <th style={{ width: '200px' }}>{t.employee}</th>
                  <th style={{ width: '150px' }}>{t.position}</th>
                  <th style={{ width: '150px' }}>{t.department}</th>
                  <th style={{ width: '120px' }}>{t.bonus}</th>
                  <th style={{ width: '150px' }}>{t.signature}</th>
                </tr>
              </thead>
              <tbody>
                {bonusEntries.map((entry, idx) => (
                  <tr key={entry.id}>
                    <td>{idx + 1}</td>
                    <td className="name">{entry.employee?.firstName} {entry.employee?.lastName}</td>
                    <td>{entry.employee?.position || '-'}</td>
                    <td>{entry.employee?.department || '-'}</td>
                    <td className="amount">{formatAOA(entry.monthlyBonus || 0)}</td>
                    <td></td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="totals-row">
                  <td colSpan={4} style={{ textAlign: 'center' }}>{t.totals}</td>
                  <td className="amount">{formatAOA(totalBonus)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="footer">
              <div className="signature-box">
                <div className="signature-line">{t.preparedBy}</div>
                <div style={{ marginTop: '8px' }}>{t.date}: ___/___/______</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">{t.approvedBy}</div>
                <div style={{ marginTop: '8px' }}>{t.date}: ___/___/______</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
