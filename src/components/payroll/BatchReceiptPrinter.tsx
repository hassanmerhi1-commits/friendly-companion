import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Printer, Users, Building2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA, INSS_RATES, IRT_BRACKETS, calculateINSS, getIRTTaxableAllowance } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import { useBranchStore } from '@/stores/branch-store';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface BatchReceiptPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PayrollEntry[];
  periodLabel: string;
  companyName: string;
  companyNif: string;
}

export function BatchReceiptPrinter({
  open,
  onOpenChange,
  entries,
  periodLabel,
  companyName,
  companyNif,
}: BatchReceiptPrinterProps) {
  const { language } = useLanguage();
  const { branches } = useBranchStore();
  const activeBranches = branches.filter(b => b.isActive);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isPrinting, setIsPrinting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Load logo as base64
  useState(() => {
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
  });

  // Filter entries by branch
  const filteredEntries = selectedBranchId === 'all' 
    ? entries 
    : entries.filter(e => e.employee?.branchId === selectedBranchId);

  const selectedBranch = activeBranches.find(b => b.id === selectedBranchId);

  // Get branch for an entry
  const getBranchForEntry = (entry: PayrollEntry): Branch | undefined => {
    return branches.find(b => b.id === entry.employee?.branchId);
  };

  // Generate receipt HTML for a single entry
  // isEmployeeCopy: true = shows bonus, false = no bonus (company archive)
  const generateReceiptHtml = (entry: PayrollEntry, employee: Employee, branch?: Branch, isEmployeeCopy: boolean = true): string => {
    const labels = {
      receiptTitle: language === 'pt' ? 'RECIBO DE VENCIMENTO' : 'SALARY RECEIPT',
      employee: language === 'pt' ? 'FUNCIONÁRIO' : 'EMPLOYEE',
      period: language === 'pt' ? 'PERÍODO' : 'PERIOD',
      earnings: language === 'pt' ? 'Rendimentos' : 'Earnings',
      deductions: language === 'pt' ? 'Deduções' : 'Deductions',
      gross: language === 'pt' ? 'Total Bruto' : 'Gross Total',
      totalDeductions: language === 'pt' ? 'Total Deduções' : 'Total Deductions',
      net: language === 'pt' ? 'Salário Líquido' : 'Net Salary',
      totalReceived: language === 'pt' ? 'Total Recebido' : 'Total Received',
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
      bonus: language === 'pt' ? 'Bónus' : 'Bonus',
      irt: language === 'pt' ? 'IRT' : 'IRT',
      inss: language === 'pt' ? 'INSS' : 'INSS',
      advanceDeduction: language === 'pt' ? 'Adiantamento' : 'Advance',
      loanDeduction: language === 'pt' ? 'Empréstimo' : 'Loan',
      absenceDeduction: language === 'pt' ? 'Falta Injustificada' : 'Unjustified Absence',
      otherDeductions: language === 'pt' ? 'Outros Descontos' : 'Other Deductions',
    };

    const overtimeTotal = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
    const inssBase = entry.baseSalary + entry.transportAllowance + entry.mealAllowance + 
                     (entry.thirteenthMonth || 0) + overtimeTotal + entry.otherAllowances;
    const { employeeContribution: calculatedInss } = calculateINSS(inssBase, employee.isRetired);
    const taxableTransport = getIRTTaxableAllowance(entry.transportAllowance);
    const taxableMeal = getIRTTaxableAllowance(entry.mealAllowance);
    const irtTaxableGross = entry.baseSalary + taxableTransport + taxableMeal +
                            (entry.thirteenthMonth || 0) + overtimeTotal + entry.otherAllowances;
    const rendimentoColetavel = irtTaxableGross - calculatedInss;
    const currentBracket = IRT_BRACKETS.find(b => rendimentoColetavel >= b.min && rendimentoColetavel <= b.max);
    const escalaoIndex = currentBracket ? IRT_BRACKETS.indexOf(currentBracket) + 1 : 1;
    const excessoDE = currentBracket ? currentBracket.min - 1 : 0;
    const excessoValue = currentBracket ? rendimentoColetavel - excessoDE : 0;
    const isIsento = rendimentoColetavel <= 100_000;
    const formatNumber = (n: number) => n.toLocaleString('pt-AO');

    // Bonus is ONLY shown on employee copy, does NOT affect taxes
    const bonus = isEmployeeCopy ? (entry.monthlyBonus || 0) : 0;
    const totalReceived = entry.netSalary + bonus;

    return `
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          <div class="logo-placeholder"></div>
          <div class="header-text">
            <h1 class="company-name">${companyName}</h1>
            <p class="company-info">NIF: ${companyNif} ${branch ? `• ${branch.name}` : ''}</p>
            ${branch ? `<p class="company-info">${branch.address}, ${branch.city}, ${branch.province}</p>` : ''}
          </div>
        </div>

        <h2 class="receipt-title">${labels.receiptTitle}</h2>

        <!-- Employee & Period Info -->
        <div class="info-grid">
          <div class="info-section">
            <div class="info-label">${labels.employee}</div>
            <div class="info-value">${employee.firstName} ${employee.lastName}</div>
            <div class="info-detail">${employee.position} • ${employee.department}</div>
            <div class="info-detail">NIF: ${employee.nif || 'N/A'} | INSS: ${employee.inssNumber || 'N/A'}</div>
          </div>
          <div class="info-section">
            <div class="info-label">${labels.period}</div>
            <div class="info-value">${periodLabel}</div>
            <div class="info-detail">Nº Func: ${employee.employeeNumber}</div>
            <div class="info-detail">${language === 'pt' ? 'Admissão' : 'Hired'}: ${new Date(employee.hireDate).toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        <!-- Earnings & Deductions -->
        <div class="columns">
          <div>
            <h3 class="section-title">${labels.earnings}</h3>
            <div class="line-item"><span class="label">${labels.baseSalary}</span><span class="amount">${formatAOA(entry.baseSalary)}</span></div>
            ${entry.familyAllowance > 0 ? `<div class="line-item"><span class="label">${labels.familyAllowance}</span><span class="amount">${formatAOA(entry.familyAllowance)}</span></div>` : ''}
            ${entry.mealAllowance > 0 ? `<div class="line-item"><span class="label">${labels.mealAllowance}</span><span class="amount">${formatAOA(entry.mealAllowance)}</span></div>` : ''}
            ${entry.transportAllowance > 0 ? `<div class="line-item"><span class="label">${labels.transportAllowance}</span><span class="amount">${formatAOA(entry.transportAllowance)}</span></div>` : ''}
            ${entry.otherAllowances > 0 ? `<div class="line-item"><span class="label">${labels.otherAllowances}</span><span class="amount">${formatAOA(entry.otherAllowances)}</span></div>` : ''}
            ${overtimeTotal > 0 ? `<div class="line-item"><span class="label">${labels.overtime}</span><span class="amount">${formatAOA(overtimeTotal)}</span></div>` : ''}
            ${entry.holidaySubsidy > 0 ? `<div class="line-item"><span class="label">${labels.holidaySubsidy}</span><span class="amount">${formatAOA(entry.holidaySubsidy)}</span></div>` : ''}
            ${entry.thirteenthMonth > 0 ? `<div class="line-item"><span class="label">${labels.thirteenthMonth}</span><span class="amount">${formatAOA(entry.thirteenthMonth)}</span></div>` : ''}
            <div class="subtotal"><span>${labels.gross}</span><span>${formatAOA(entry.grossSalary)}</span></div>
          </div>
          <div>
            <h3 class="section-title">${labels.deductions}</h3>
            <div class="line-item deduction"><span class="label">${labels.irt}</span><span class="amount">-${formatAOA(entry.irt)}</span></div>
            <div class="line-item deduction"><span class="label">${labels.inss} (${(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}%)</span><span class="amount">-${formatAOA(entry.inssEmployee)}</span></div>
            ${entry.advanceDeduction > 0 ? `<div class="line-item deduction"><span class="label">${labels.advanceDeduction}</span><span class="amount">-${formatAOA(entry.advanceDeduction)}</span></div>` : ''}
            ${entry.loanDeduction > 0 ? `<div class="line-item deduction"><span class="label">${labels.loanDeduction}</span><span class="amount">-${formatAOA(entry.loanDeduction)}</span></div>` : ''}
            ${entry.absenceDeduction > 0 ? `<div class="line-item deduction"><span class="label">${labels.absenceDeduction}</span><span class="amount">-${formatAOA(entry.absenceDeduction)}</span></div>` : ''}
            ${entry.otherDeductions > 0 ? `<div class="line-item deduction"><span class="label">${labels.otherDeductions}</span><span class="amount">-${formatAOA(entry.otherDeductions)}</span></div>` : ''}
            <div class="subtotal"><span>${labels.totalDeductions}</span><span class="deduction-total">-${formatAOA(entry.totalDeductions)}</span></div>
          </div>
        </div>

        <!-- Tax Breakdown -->
        <div class="tax-breakdown">
          <h3 class="tax-title">${language === 'pt' ? 'Cálculo Tributário (Lei 14/25)' : 'Tax Calculation (Law 14/25)'}</h3>
          <div class="tax-grid">
            <div class="tax-section">
              <div class="tax-header">${language === 'pt' ? 'Base INSS' : 'INSS Base'}</div>
              <div class="tax-line"><span>Base + Natal + Transp + Alim</span></div>
              <div class="tax-line"><span>=</span><span class="tax-value">${formatNumber(inssBase)} Kz</span></div>
              <div class="tax-line tax-result"><span>INSS (3%)</span><span class="tax-value">${formatNumber(calculatedInss)} Kz</span></div>
            </div>
            <div class="tax-section">
              <div class="tax-header">${language === 'pt' ? 'Cálculo IRT' : 'IRT Calculation'}</div>
              <div class="tax-line"><span>${language === 'pt' ? 'Rend. Coletável' : 'Taxable Income'}</span><span class="tax-value">${formatNumber(rendimentoColetavel)} Kz</span></div>
              ${isIsento 
                ? `<div class="tax-line tax-exempt"><span>${language === 'pt' ? 'Isento (≤150.000)' : 'Exempt (≤150,000)'}</span><span class="tax-value">0 Kz</span></div>`
                : currentBracket ? `
                  <div class="tax-line"><span>${escalaoIndex}º ${language === 'pt' ? 'Escalão' : 'Bracket'}</span><span class="tax-value">${(currentBracket.rate * 100).toFixed(1)}%</span></div>
                  <div class="tax-line"><span>${language === 'pt' ? 'Parcela Fixa' : 'Fixed Amount'}</span><span class="tax-value">${formatNumber(currentBracket.fixedAmount)}</span></div>
                  <div class="tax-line tax-result"><span>IRT</span><span class="tax-value">${formatNumber(entry.irt)} Kz</span></div>
                ` : ''}
            </div>
          </div>
        </div>

        <!-- Net Salary -->
        <div class="net-salary">
          <span class="net-label">${labels.net}</span>
          <span class="net-amount">${formatAOA(entry.netSalary)}</span>
        </div>

        ${isEmployeeCopy && bonus > 0 ? `
        <!-- Bonus Section (Employee Copy Only) -->
        <div class="bonus-section">
          <div class="bonus-line"><span class="label">${labels.bonus}</span><span class="amount bonus-amount">+${formatAOA(bonus)}</span></div>
          <div class="total-received"><span>${labels.totalReceived}</span><span class="total-amount">${formatAOA(totalReceived)}</span></div>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature"><div class="signature-line">${labels.employeeSignature}</div></div>
          <div class="signature"><div class="signature-line">${labels.employerSignature}</div></div>
        </div>

        <!-- Legal Note -->
        <div class="legal-note">
          ${language === 'pt' 
            ? `Documento processado electronicamente • Lei n.º 12/23 (Lei Geral do Trabalho) • IRT conforme Código do Imposto sobre Rendimentos do Trabalho • INSS ${(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}% trabalhador / ${(INSS_RATES.EMPLOYER_RATE * 100).toFixed(0)}% entidade (Decreto Presidencial 48/24)`
            : `Electronically processed document • Law No. 12/23 (General Labor Law) • IRT according to Income Tax Code • INSS ${(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}% employee / ${(INSS_RATES.EMPLOYER_RATE * 100).toFixed(0)}% employer (Presidential Decree 48/24)`
          }
        </div>
      </div>
    `;
  };

  const handlePrintBatch = async () => {
    if (filteredEntries.length === 0) return;
    
    setIsPrinting(true);
    
    try {
      // Process in smaller batches to avoid memory issues
      const validEntries = filteredEntries.filter(entry => entry.employee);
      
      // Generate all receipts - employee copy shows bonus, company copy does not
      const receiptsHtml = validEntries
        .map(entry => {
          const branch = getBranchForEntry(entry);
          const employeeReceiptHtml = generateReceiptHtml(entry, entry.employee!, branch, true); // With bonus
          const companyReceiptHtml = generateReceiptHtml(entry, entry.employee!, branch, false); // Without bonus
          
          // Each page has two copies (employee + company)
          return `
            <div class="page-container">
              <div class="receipt-wrapper">
                <div class="copy-label">${language === 'pt' ? 'VIA DO FUNCIONÁRIO' : 'EMPLOYEE COPY'}</div>
                ${employeeReceiptHtml}
              </div>
              <div class="divider"></div>
              <div class="receipt-wrapper">
                <div class="copy-label">${language === 'pt' ? 'VIA DA EMPRESA (ARQUIVO)' : 'COMPANY COPY (ARCHIVE)'}</div>
                ${companyReceiptHtml}
              </div>
            </div>
          `;
        })
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Recibos Salariais - ${periodLabel}${selectedBranch ? ` - ${selectedBranch.name}` : ''}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #1a1a1a; font-size: 9px; }
              
              .page-container { 
                display: flex; 
                flex-direction: row; 
                gap: 10px; 
                align-items: stretch; 
                width: 100%; 
                page-break-after: always;
                page-break-inside: avoid;
              }
              .page-container:last-child { page-break-after: auto; }
              
              .receipt-wrapper { flex: 1; border: 1px dashed #999; padding: 10px; }
              .divider { width: 0; border-left: 2px dashed #999; }
              .copy-label { text-align: center; font-size: 8px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
              
              .receipt { width: 100%; }
              .header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
              .logo-placeholder { width: 44px; height: 44px; background: url('${logoBase64}') no-repeat center; background-size: contain; }
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
              .deduction-total { color: #c00; }
              
              .tax-breakdown { background: #f5f5f5; padding: 8px; border-radius: 4px; margin: 8px 0; border: 1px solid #ddd; }
              .tax-title { font-size: 7px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; color: #666; }
              .tax-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .tax-section { }
              .tax-header { font-size: 8px; font-weight: 600; color: #555; text-transform: uppercase; margin-bottom: 4px; }
              .tax-line { display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px; }
              .tax-value { font-family: monospace; }
              .tax-result { font-weight: bold; border-top: 1px solid #ccc; padding-top: 2px; margin-top: 2px; }
              .tax-exempt { color: #27ae60; font-weight: bold; }
              
              .net-salary { display: flex; justify-content: space-between; align-items: center; background: #e8f4e8; padding: 8px; margin-top: 10px; border-radius: 4px; }
              .net-label { font-size: 10px; font-weight: bold; }
              .net-amount { font-size: 14px; font-weight: bold; color: #27ae60; }
              
              .bonus-section { background: #fff8e6; padding: 8px; margin-top: 8px; border-radius: 4px; border: 1px dashed #f0c020; }
              .bonus-line { display: flex; justify-content: space-between; padding: 2px 0; }
              .bonus-line .label { font-size: 9px; font-weight: 600; }
              .bonus-amount { font-size: 9px; font-family: monospace; color: #d4a000; font-weight: bold; }
              .total-received { display: flex; justify-content: space-between; font-weight: bold; padding: 4px 0; border-top: 1px solid #f0c020; margin-top: 4px; }
              .total-received span:first-child { font-size: 10px; }
              .total-amount { font-size: 14px; color: #d4a000; }
              
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
            ${receiptsHtml}
          </body>
        </html>
      `;

      await printHtml(htmlContent, { width: 1100, height: 800, delayMs: 800 });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {language === 'pt' ? 'Imprimir Recibos em Lote' : 'Batch Print Receipts'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Imprima recibos salariais para uma filial específica ou para todos os funcionários. Cada recibo tem duas vias (funcionário e empresa).'
              : 'Print salary receipts for a specific branch or all employees. Each receipt has two copies (employee and company).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Selecionar Filial' : 'Select Branch'}</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'pt' ? 'Escolha uma opção' : 'Choose an option'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {language === 'pt' ? 'Todas as Filiais' : 'All Branches'}
                  </div>
                </SelectItem>
                {activeBranches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {branch.name} ({branch.code})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{language === 'pt' ? 'Período:' : 'Period:'}</span>
              <span className="font-medium">{periodLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{language === 'pt' ? 'Recibos a imprimir:' : 'Receipts to print:'}</span>
              <span className="font-medium">{filteredEntries.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{language === 'pt' ? 'Páginas (estimado):' : 'Pages (estimated):'}</span>
              <span className="font-medium">{filteredEntries.length}</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {language === 'pt' 
              ? '💡 Cada página contém 2 vias do mesmo recibo: uma para o funcionário e outra para arquivo da empresa.'
              : '💡 Each page contains 2 copies of the same receipt: one for the employee and one for company archive.'}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            variant="accent" 
            onClick={handlePrintBatch}
            disabled={filteredEntries.length === 0 || isPrinting}
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'pt' ? 'A preparar...' : 'Preparing...'}
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                {language === 'pt' ? `Imprimir ${filteredEntries.length} Recibos` : `Print ${filteredEntries.length} Receipts`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
