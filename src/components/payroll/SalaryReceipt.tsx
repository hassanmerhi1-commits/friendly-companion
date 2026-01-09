import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/i18n';
import { formatAOA, INSS_RATES, IRT_BRACKETS, calculateINSS, calculateIRT, getIRTTaxableAllowance } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import { Printer, Info } from 'lucide-react';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface SalaryReceiptProps {
  entry: PayrollEntry;
  employee: Employee;
  branch?: Branch;
  companyName?: string;
  companyNif?: string;
  periodLabel: string;
  onClose?: () => void;
}

export function SalaryReceipt({
  entry,
  employee,
  branch,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  periodLabel,
  onClose,
}: SalaryReceiptProps) {
  const { t, language } = useLanguage();
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

  const handlePrint = async () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Clone and replace logo with base64
    const clonedContent = printContent.cloneNode(true) as HTMLElement;
    const logoImgs = clonedContent.querySelectorAll('img.logo') as NodeListOf<HTMLImageElement>;
    logoImgs.forEach(img => {
      if (logoBase64) img.src = logoBase64;
    });

    const receiptHtml = clonedContent.innerHTML;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo Salarial - ${employee.firstName} ${employee.lastName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #1a1a1a; font-size: 9px; }
            .page-container { display: flex; flex-direction: row; gap: 10px; align-items: stretch; width: 100%; }
            .receipt-wrapper { flex: 1; border: 1px dashed #999; padding: 10px; page-break-inside: avoid; }
            .divider { width: 0; border-left: 2px dashed #999; }
            .copy-label { text-align: center; font-size: 8px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .receipt { width: 100%; }
            .header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
            .logo { width: 44px; height: auto; }
            .header-text { flex: 1; }
            .company-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
            .company-info { font-size: 8px; color: #666; }
            .receipt-title { font-size: 11px; font-weight: bold; text-transform: uppercase; text-align: center; margin: 8px 0; background: #f0f0f0; padding: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
            .info-section { background: #f8f8f8; padding: 7px; border-radius: 3px; }
            .info-label { font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-size: 9px; font-weight: 600; }
            .info-detail { font-size: 7px; color: #555; margin-top: 2px; }
            .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .section-title { font-size: 8px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
            .line-item { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #eee; }
            .line-item.deduction .amount { color: #c00; }
            .line-item .label { font-size: 8px; }
            .line-item .amount { font-size: 8px; font-family: monospace; }
            .subtotal { display: flex; justify-content: space-between; font-weight: bold; padding: 4px 0; border-top: 1px solid #333; margin-top: 4px; }
            .tax-breakdown { background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ddd; }
            .tax-breakdown h3 { font-size: 7px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; color: #666; display: flex; align-items: center; gap: 4px; }
            .tax-breakdown .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .tax-breakdown .space-y-1 > div { margin-bottom: 2px; }
            .tax-breakdown .text-\\[10px\\] { font-size: 8px; font-weight: 600; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .tax-breakdown .text-\\[9px\\] { font-size: 7px; }
            .tax-breakdown .font-mono { font-family: monospace; }
            .net-salary { display: flex; justify-content: space-between; align-items: center; background: #e8f4e8; padding: 8px; margin-top: 10px; border-radius: 4px; }
            .net-label { font-size: 10px; font-weight: bold; }
            .net-amount { font-size: 14px; font-weight: bold; color: #27ae60; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 22px; padding-top: 5px; font-size: 7px; }
            .legal-note { margin-top: 8px; font-size: 6px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { padding: 0; }
              .receipt-wrapper { border: 1px dashed #bbb; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="receipt-wrapper">
              <div class="copy-label">${language === 'pt' ? 'VIA DO FUNCIONÁRIO' : 'EMPLOYEE COPY'}</div>
              ${receiptHtml}
            </div>

            <div class="divider" aria-hidden="true"></div>

            <div class="receipt-wrapper">
              <div class="copy-label">${language === 'pt' ? 'VIA DA EMPRESA (ARQUIVO)' : 'COMPANY COPY (ARCHIVE)'}</div>
              ${receiptHtml}
            </div>
          </div>
        </body>
      </html>
    `;

    await printHtml(htmlContent, { width: 1100, height: 800 });
  };

  const labels = {
    receiptTitle: language === 'pt' ? 'RECIBO DE VENCIMENTO' : 'SALARY RECEIPT',
    employee: language === 'pt' ? 'FUNCIONÁRIO' : 'EMPLOYEE',
    period: language === 'pt' ? 'PERÍODO' : 'PERIOD',
    earnings: language === 'pt' ? 'Rendimentos' : 'Earnings',
    deductions: language === 'pt' ? 'Deduções' : 'Deductions',
    gross: language === 'pt' ? 'Total Bruto' : 'Gross Total',
    totalDeductions: language === 'pt' ? 'Total Deduções' : 'Total Deductions',
    net: language === 'pt' ? 'Salário Líquido' : 'Net Salary',
    employeeSignature: language === 'pt' ? 'Assinatura do Funcionário' : 'Employee Signature',
    employerSignature: language === 'pt' ? 'Assinatura da Entidade' : 'Employer Signature',
    baseSalary: language === 'pt' ? 'Salário Base' : 'Base Salary',
    mealAllowance: language === 'pt' ? 'Subsídio de Alimentação' : 'Meal Allowance',
    transportAllowance: language === 'pt' ? 'Subsídio de Transporte' : 'Transport Allowance',
    otherAllowances: language === 'pt' ? 'Outros Subsídios' : 'Other Allowances',
    familyAllowance: language === 'pt' ? 'Abono Familiar' : 'Family Allowance',
    overtime: language === 'pt' ? 'Horas Extra' : 'Overtime',
    holidaySubsidy: language === 'pt' ? 'Subsídio de Férias' : 'Holiday Subsidy',
    thirteenthMonth: language === 'pt' ? 'Subsídio de Natal' : '13th Month',
    irt: language === 'pt' ? 'IRT' : 'IRT',
    inss: language === 'pt' ? 'INSS' : 'INSS',
    otherDeductions: language === 'pt' ? 'Outros Descontos' : 'Other Deductions',
  };

  const overtimeTotal = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;

  // ============= TAX BREAKDOWN CALCULATION =============
  // INSS Base = Base + Transport + Meal + Natal + Overtime + Other (NOT Férias, NOT Abono Familiar)
  const inssBase = entry.baseSalary + entry.transportAllowance + entry.mealAllowance + 
                   (entry.thirteenthMonth || 0) + overtimeTotal + entry.otherAllowances;
  const { employeeContribution: calculatedInss } = calculateINSS(inssBase, employee.isRetired);

  // IRT Taxable = Base + excess of Transport/Meal above 30k + Natal + Overtime + Other
  // NOT included: Férias, Abono Familiar
  const taxableTransport = getIRTTaxableAllowance(entry.transportAllowance);
  const taxableMeal = getIRTTaxableAllowance(entry.mealAllowance);
  
  const irtTaxableGross = entry.baseSalary + taxableTransport + taxableMeal +
                          (entry.thirteenthMonth || 0) + overtimeTotal + entry.otherAllowances;
  const rendimentoColetavel = irtTaxableGross - calculatedInss;

  // Find current IRT bracket (exempt up to 100,000)
  const currentBracket = IRT_BRACKETS.find(
    b => rendimentoColetavel >= b.min && rendimentoColetavel <= b.max
  );
  const escalaoIndex = currentBracket ? IRT_BRACKETS.indexOf(currentBracket) + 1 : 1;
  const excessoDE = currentBracket ? currentBracket.min - 1 : 0;
  const excessoValue = currentBracket ? rendimentoColetavel - excessoDE : 0;
  const isIsento = rendimentoColetavel <= 100_000;

  const formatNumber = (n: number) => n.toLocaleString('pt-AO');

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="accent" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {language === 'pt' ? 'Imprimir (2 Vias)' : 'Print (2 Copies)'}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div ref={printRef} className="receipt">
            {/* Header */}
            <div className="header flex items-center gap-4 mb-4 pb-3 border-b-2 border-foreground">
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="logo h-12 object-contain"
              />
              <div className="header-text flex-1">
                <h1 className="company-name text-lg font-bold">{companyName}</h1>
                <p className="company-info text-xs text-muted-foreground">
                  NIF: {companyNif} {branch && `• ${branch.name}`}
                </p>
                {branch && (
                  <p className="company-info text-xs text-muted-foreground">
                    {branch.address}, {branch.city}, {branch.province}
                  </p>
                )}
              </div>
            </div>

            <h2 className="receipt-title text-center text-sm font-bold uppercase bg-muted/50 py-2 mb-3">
              {labels.receiptTitle}
            </h2>

            {/* Employee & Period Info */}
            <div className="info-grid grid grid-cols-2 gap-3 mb-4">
              <div className="info-section bg-muted/30 p-3 rounded">
                <div className="info-label text-xs text-muted-foreground uppercase">{labels.employee}</div>
                <div className="info-value font-medium">{employee.firstName} {employee.lastName}</div>
                <div className="info-detail text-xs text-muted-foreground">{employee.position} • {employee.department}</div>
                <div className="info-detail text-xs text-muted-foreground mt-1">NIF: {employee.nif || 'N/A'} | INSS: {employee.inssNumber || 'N/A'}</div>
              </div>
              <div className="info-section bg-muted/30 p-3 rounded">
                <div className="info-label text-xs text-muted-foreground uppercase">{labels.period}</div>
                <div className="info-value font-medium">{periodLabel}</div>
                <div className="info-detail text-xs text-muted-foreground mt-1">Nº Func: {employee.employeeNumber}</div>
                <div className="info-detail text-xs text-muted-foreground">
                  {language === 'pt' ? 'Admissão' : 'Hired'}: {new Date(employee.hireDate).toLocaleDateString('pt-AO')}
                </div>
              </div>
            </div>

            {/* Earnings & Deductions in 2 columns */}
            <div className="columns grid grid-cols-2 gap-4 mb-4">
              {/* Earnings Column */}
              <div>
                <h3 className="section-title text-xs font-semibold uppercase border-b pb-1 mb-2">{labels.earnings}</h3>
                <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                  <span className="label text-xs">{labels.baseSalary}</span>
                  <span className="amount text-xs font-mono">{formatAOA(entry.baseSalary)}</span>
                </div>
                {entry.familyAllowance > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.familyAllowance}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.familyAllowance)}</span>
                  </div>
                )}
                {entry.mealAllowance > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.mealAllowance}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.mealAllowance)}</span>
                  </div>
                )}
                {entry.transportAllowance > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.transportAllowance}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.transportAllowance)}</span>
                  </div>
                )}
                {entry.otherAllowances > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.otherAllowances}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.otherAllowances)}</span>
                  </div>
                )}
                {overtimeTotal > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.overtime}</span>
                    <span className="amount text-xs font-mono">{formatAOA(overtimeTotal)}</span>
                  </div>
                )}
                {entry.holidaySubsidy > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.holidaySubsidy}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.holidaySubsidy)}</span>
                  </div>
                )}
                {entry.thirteenthMonth > 0 && (
                  <div className="line-item flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.thirteenthMonth}</span>
                    <span className="amount text-xs font-mono">{formatAOA(entry.thirteenthMonth)}</span>
                  </div>
                )}
                <div className="subtotal flex justify-between font-semibold pt-2 border-t border-foreground mt-2">
                  <span className="text-xs">{labels.gross}</span>
                  <span className="text-xs font-mono">{formatAOA(entry.grossSalary)}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <h3 className="section-title text-xs font-semibold uppercase border-b pb-1 mb-2">{labels.deductions}</h3>
                <div className="line-item deduction flex justify-between py-1 border-b border-dashed border-border/50">
                  <span className="label text-xs">{labels.irt}</span>
                  <span className="amount text-xs font-mono text-destructive">-{formatAOA(entry.irt)}</span>
                </div>
                <div className="line-item deduction flex justify-between py-1 border-b border-dashed border-border/50">
                  <span className="label text-xs">{labels.inss} ({(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}%)</span>
                  <span className="amount text-xs font-mono text-destructive">-{formatAOA(entry.inssEmployee)}</span>
                </div>
                {entry.otherDeductions > 0 && (
                  <div className="line-item deduction flex justify-between py-1 border-b border-dashed border-border/50">
                    <span className="label text-xs">{labels.otherDeductions}</span>
                    <span className="amount text-xs font-mono text-destructive">-{formatAOA(entry.otherDeductions)}</span>
                  </div>
                )}
                <div className="subtotal flex justify-between font-semibold pt-2 border-t border-foreground mt-2">
                  <span className="text-xs">{labels.totalDeductions}</span>
                  <span className="text-xs font-mono text-destructive">-{formatAOA(entry.totalDeductions)}</span>
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Tax Breakdown Section */}
            <div className="tax-breakdown bg-muted/20 p-3 rounded-lg mb-3 border border-border/50">
              <h3 className="text-xs font-semibold uppercase mb-2 flex items-center gap-1 text-muted-foreground">
                <Info className="h-3 w-3" />
                {language === 'pt' ? 'Cálculo Tributário (Lei 14/25)' : 'Tax Calculation (Law 14/25)'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* INSS Breakdown */}
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">
                    {language === 'pt' ? 'Base INSS' : 'INSS Base'}
                  </div>
                  <div className="text-[9px] space-y-0.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{language === 'pt' ? 'Base + Natal + Transp + Alim + Fam' : 'Base + 13th + Trans + Meal + Fam'}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>=</span>
                      <span>{formatNumber(inssBase)} Kz</span>
                    </div>
                    <div className="flex justify-between font-medium text-foreground border-t border-border/30 pt-0.5">
                      <span>INSS (3%)</span>
                      <span className="font-mono">{formatNumber(calculatedInss)} Kz</span>
                    </div>
                  </div>
                </div>

                {/* IRT Breakdown */}
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">
                    {language === 'pt' ? 'Cálculo IRT' : 'IRT Calculation'}
                  </div>
                  <div className="text-[9px] space-y-0.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{language === 'pt' ? 'Rend. Coletável' : 'Taxable Income'}</span>
                      <span className="font-mono">{formatNumber(rendimentoColetavel)} Kz</span>
                    </div>
                    {isIsento ? (
                      <div className="flex justify-between font-medium text-green-600">
                        <span>{language === 'pt' ? 'Isento (≤150.000)' : 'Exempt (≤150,000)'}</span>
                        <span className="font-mono">0 Kz</span>
                      </div>
                    ) : currentBracket ? (
                      <>
                        <div className="flex justify-between">
                          <span>{escalaoIndex}º {language === 'pt' ? 'Escalão' : 'Bracket'}</span>
                          <span className="font-mono">{(currentBracket.rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'pt' ? 'Parcela Fixa' : 'Fixed Amount'}</span>
                          <span className="font-mono">{formatNumber(currentBracket.fixedAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'pt' ? 'Excesso de' : 'Excess of'} {formatNumber(excessoDE)}</span>
                          <span className="font-mono">{formatNumber(excessoValue)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-foreground border-t border-border/30 pt-0.5">
                          <span>IRT</span>
                          <span className="font-mono">{formatNumber(entry.irt)} Kz</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="net-salary bg-primary/10 p-3 rounded-lg flex justify-between items-center">
              <span className="net-label text-sm font-bold">{labels.net}</span>
              <span className="net-amount text-xl font-bold text-primary">{formatAOA(entry.netSalary)}</span>
            </div>

            {/* Signatures */}
            <div className="signatures grid grid-cols-2 gap-8 mt-6">
              <div className="signature text-center">
                <div className="signature-line border-t border-foreground mt-8 pt-2 text-xs">
                  {labels.employeeSignature}
                </div>
              </div>
              <div className="signature text-center">
                <div className="signature-line border-t border-foreground mt-8 pt-2 text-xs">
                  {labels.employerSignature}
                </div>
              </div>
            </div>

            {/* Legal Note */}
            <div className="legal-note mt-4 pt-3 border-t text-[9px] text-muted-foreground text-center">
              {language === 'pt' 
                ? `Documento processado electronicamente • Lei n.º 12/23 (Lei Geral do Trabalho) • IRT conforme Código do Imposto sobre Rendimentos do Trabalho • INSS ${(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}% trabalhador / ${(INSS_RATES.EMPLOYER_RATE * 100).toFixed(0)}% entidade (Decreto Presidencial 48/24)`
                : `Electronically processed document • Law No. 12/23 (General Labor Law) • IRT according to Income Tax Code • INSS ${(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}% employee / ${(INSS_RATES.EMPLOYER_RATE * 100).toFixed(0)}% employer (Presidential Decree 48/24)`
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
