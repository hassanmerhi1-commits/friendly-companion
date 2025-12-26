import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';

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
  companyNif = '5417201524',
  branch,
  warehouseName,
}: PrintableBonusSheetProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const t = {
    title: language === 'pt' ? 'FOLHA DE BÓNUS / SUBSÍDIOS EXTRA' : 'BONUS / EXTRA SUBSIDIES SHEET',
    period: language === 'pt' ? 'Período' : 'Period',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    position: language === 'pt' ? 'Cargo' : 'Position',
    mealAllowance: language === 'pt' ? 'Sub. Alimentação' : 'Meal Allowance',
    transportAllowance: language === 'pt' ? 'Sub. Transporte' : 'Transport Allowance',
    familyAllowance: language === 'pt' ? 'Abono Familiar' : 'Family Allowance',
    holidaySubsidy: language === 'pt' ? 'Sub. Férias' : 'Holiday Subsidy',
    thirteenthMonth: language === 'pt' ? 'Sub. Natal' : '13th Month',
    otherAllowances: language === 'pt' ? 'Outros Subsídios' : 'Other Allowances',
    totalBonus: language === 'pt' ? 'Total Bónus' : 'Total Bonus',
    signature: language === 'pt' ? 'Assinatura' : 'Signature',
    totals: language === 'pt' ? 'TOTAIS' : 'TOTALS',
    print: language === 'pt' ? 'Imprimir Folha de Bónus' : 'Print Bonus Sheet',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    approvedBy: language === 'pt' ? 'Aprovado por' : 'Approved by',
    date: language === 'pt' ? 'Data' : 'Date',
    branchLabel: language === 'pt' ? 'Filial' : 'Branch',
    warehouseLabel: language === 'pt' ? 'Armazém' : 'Warehouse',
  };

  // Calculate totals for bonus items
  const totals = entries.reduce((acc, e) => ({
    mealAllowance: acc.mealAllowance + e.mealAllowance,
    transportAllowance: acc.transportAllowance + e.transportAllowance,
    familyAllowance: acc.familyAllowance + (e.familyAllowance || 0),
    holidaySubsidy: acc.holidaySubsidy + e.holidaySubsidy,
    thirteenthMonth: acc.thirteenthMonth + e.thirteenthMonth,
    otherAllowances: acc.otherAllowances + e.otherAllowances,
  }), {
    mealAllowance: 0, transportAllowance: 0, familyAllowance: 0,
    holidaySubsidy: 0, thirteenthMonth: 0, otherAllowances: 0,
  });

  const totalBonus = totals.mealAllowance + totals.transportAllowance + totals.familyAllowance + 
                     totals.holidaySubsidy + totals.thirteenthMonth + totals.otherAllowances;

  const calculateEmployeeBonus = (entry: PayrollEntry) => {
    return entry.mealAllowance + entry.transportAllowance + (entry.familyAllowance || 0) + 
           entry.holidaySubsidy + entry.thirteenthMonth + entry.otherAllowances;
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${branch.name} - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .company-name { font-size: 18px; font-weight: bold; color: #2c3e50; }
          .branch-info { font-size: 12px; margin-top: 8px; color: #555; }
          .document-title { font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #e67e22; background: #fef9e7; padding: 8px; border-radius: 4px; }
          .period { font-size: 12px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 6px 4px; text-align: right; }
          th { background: #e67e22; color: white; font-weight: bold; text-align: center; }
          td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
          .totals-row { background: #f39c12; color: white; font-weight: bold; }
          .total-bonus { background: #27ae60; color: white; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 220px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 8px; }
          @media print {
            body { padding: 15px; }
            @page { size: landscape; margin: 12mm; }
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

        {/* Bonus Table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '25px' }}>Nº</th>
              <th style={{ width: '150px' }}>{t.employee}</th>
              <th style={{ width: '100px' }}>{t.position}</th>
              <th>{t.mealAllowance}</th>
              <th>{t.transportAllowance}</th>
              <th>{t.familyAllowance}</th>
              <th>{t.holidaySubsidy}</th>
              <th>{t.thirteenthMonth}</th>
              <th>{t.otherAllowances}</th>
              <th className="total-bonus">{t.totalBonus}</th>
              <th style={{ width: '90px' }}>{t.signature}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                <td>{entry.employee?.position || '-'}</td>
                <td>{formatAOA(entry.mealAllowance)}</td>
                <td>{formatAOA(entry.transportAllowance)}</td>
                <td>{formatAOA(entry.familyAllowance || 0)}</td>
                <td>{formatAOA(entry.holidaySubsidy)}</td>
                <td>{formatAOA(entry.thirteenthMonth)}</td>
                <td>{formatAOA(entry.otherAllowances)}</td>
                <td className="total-bonus">{formatAOA(calculateEmployeeBonus(entry))}</td>
                <td></td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="totals-row">
              <td colSpan={3} style={{ textAlign: 'center' }}>{t.totals}</td>
              <td>{formatAOA(totals.mealAllowance)}</td>
              <td>{formatAOA(totals.transportAllowance)}</td>
              <td>{formatAOA(totals.familyAllowance)}</td>
              <td>{formatAOA(totals.holidaySubsidy)}</td>
              <td>{formatAOA(totals.thirteenthMonth)}</td>
              <td>{formatAOA(totals.otherAllowances)}</td>
              <td className="total-bonus">{formatAOA(totalBonus)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
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
    </div>
  );
}
