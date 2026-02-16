import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import { Printer, HandCoins } from 'lucide-react';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface EarlyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PayrollEntry | null;
  employee: Employee | null;
  periodLabel: string;
  companyName?: string;
  companyNif?: string;
  onConfirm: (data: { reason: string; authorizedBy: string; paymentMethod: string }) => void;
}

export function EarlyPaymentDialog({
  open,
  onOpenChange,
  entry,
  employee,
  periodLabel,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  onConfirm,
}: EarlyPaymentDialogProps) {
  const { language } = useLanguage();
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [logoBase64, setLogoBase64] = useState('');

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

  if (!entry || !employee) return null;

  const t = {
    title: language === 'pt' ? 'Pagamento Antecipado' : 'Early Payment',
    subtitle: language === 'pt' 
      ? 'Preencha os dados antes de imprimir o recibo' 
      : 'Fill in the details before printing the receipt',
    reason: language === 'pt' ? 'Motivo do Adiantamento' : 'Reason for Early Payment',
    reasonPlaceholder: language === 'pt' ? 'Ex: Solicitação do funcionário, urgência pessoal...' : 'e.g. Employee request, personal urgency...',
    authorizedBy: language === 'pt' ? 'Autorizado Por' : 'Authorized By',
    authorizedPlaceholder: language === 'pt' ? 'Nome do responsável' : 'Name of authorizer',
    paymentMethod: language === 'pt' ? 'Método de Pagamento' : 'Payment Method',
    cash: language === 'pt' ? 'Dinheiro (Numerário)' : 'Cash',
    bankTransfer: language === 'pt' ? 'Transferência Bancária' : 'Bank Transfer',
    cheque: language === 'pt' ? 'Cheque' : 'Cheque',
    confirm: language === 'pt' ? 'Confirmar e Imprimir Recibo' : 'Confirm & Print Receipt',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    period: language === 'pt' ? 'Período' : 'Period',
    netSalary: language === 'pt' ? 'Salário Líquido a Receber' : 'Net Salary to Receive',
    warning: language === 'pt' 
      ? 'Após confirmação, o funcionário será marcado como "Pago Antecipadamente" e não receberá novamente na folha salarial deste mês.' 
      : 'After confirmation, the employee will be marked as "Paid Early" and will not receive payment again on this month\'s payroll.',
  };

  const paymentMethodLabel = {
    cash: t.cash,
    bank_transfer: t.bankTransfer,
    cheque: t.cheque,
  }[paymentMethod] || paymentMethod;

  const handleConfirmAndPrint = async () => {
    const today = new Date().toLocaleDateString('pt-AO');
    const logoSrc = logoBase64 || '';

    const receiptBody = `
      <div class="receipt">
        <div class="header">
          ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="Logo" />` : ''}
          <div class="header-text">
            <div class="company-name">${companyName}</div>
            <div class="company-info">NIF: ${companyNif}</div>
          </div>
        </div>
        <div class="receipt-title">${language === 'pt' ? 'RECIBO DE PAGAMENTO ANTECIPADO' : 'EARLY PAYMENT RECEIPT'}</div>
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">${t.employee}</div>
            <div class="info-value">${employee.firstName} ${employee.lastName}</div>
            <div class="info-detail">${employee.position || ''} • Nº ${employee.employeeNumber || 'N/A'}</div>
            <div class="info-detail">NIF: ${employee.nif || 'N/A'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">${t.period}</div>
            <div class="info-value">${periodLabel}</div>
            <div class="info-detail">${language === 'pt' ? 'Data de Pagamento' : 'Payment Date'}: ${today}</div>
            <div class="info-detail">${t.paymentMethod}: ${paymentMethodLabel}</div>
          </div>
        </div>
        <div class="salary-section">
          <div class="salary-row">
            <span>${language === 'pt' ? 'Salário Bruto' : 'Gross Salary'}</span>
            <span class="amount">${formatAOA(entry.grossSalary)}</span>
          </div>
          <div class="salary-row deduction">
            <span>${language === 'pt' ? 'Total Descontos (IRT + INSS + Outros)' : 'Total Deductions (IRT + INSS + Other)'}</span>
            <span class="amount">-${formatAOA(entry.totalDeductions)}</span>
          </div>
          <div class="net-row">
            <span>${t.netSalary}</span>
            <span class="net-amount">${formatAOA(entry.netSalary)}</span>
          </div>
        </div>
        ${reason ? `
        <div class="reason-section">
          <div class="reason-label">${t.reason}</div>
          <div class="reason-text">${reason}</div>
        </div>` : ''}
        <div class="auth-section">
          <div class="auth-label">${t.authorizedBy}: <strong>${authorizedBy || '____________________'}</strong></div>
        </div>
        <div class="warning-box">
          ${language === 'pt' 
            ? 'NOTA: Este pagamento refere-se ao salário do mês indicado acima. O funcionário NÃO receberá novamente na folha salarial do mesmo mês.' 
            : 'NOTE: This payment refers to the salary for the month indicated above. The employee will NOT receive payment again on the same month\'s payroll.'}
        </div>
        <div class="signatures">
          <div class="signature">
            <div class="sig-line"></div>
            <div class="sig-label">${language === 'pt' ? 'Assinatura do Funcionário' : 'Employee Signature'}</div>
            <div class="sig-note">${language === 'pt' ? '(Recebi o valor acima indicado)' : '(I received the amount stated above)'}</div>
          </div>
          <div class="signature">
            <div class="sig-line"></div>
            <div class="sig-label">${language === 'pt' ? 'Assinatura do Responsável / Tesoureiro' : 'Authorized / Treasury Signature'}</div>
          </div>
        </div>
        <div class="footer">
          ${language === 'pt' ? 'Documento processado electronicamente' : 'Electronically processed document'} • ${today}
        </div>
      </div>
    `;

    const htmlContent = `<!DOCTYPE html>
<html><head>
<title>${language === 'pt' ? 'Recibo Pagamento Antecipado' : 'Early Payment Receipt'} - ${employee.firstName} ${employee.lastName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #1a1a1a; font-size: 9px; }
  .page-container { display: flex; flex-direction: row; gap: 10px; align-items: stretch; width: 100%; }
  .receipt-wrapper { flex: 1; border: 1px dashed #999; padding: 12px; page-break-inside: avoid; }
  .divider { width: 0; border-left: 2px dashed #999; }
  .copy-label { text-align: center; font-size: 8px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .receipt { width: 100%; }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  .logo { width: 44px; height: auto; }
  .header-text { flex: 1; }
  .company-name { font-size: 13px; font-weight: bold; }
  .company-info { font-size: 8px; color: #666; }
  .receipt-title { font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: center; margin: 10px 0; background: #e8d44d; color: #333; padding: 6px; border-radius: 3px; letter-spacing: 1px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .info-box { background: #f8f8f8; padding: 8px; border-radius: 4px; border: 1px solid #eee; }
  .info-label { font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
  .info-value { font-size: 10px; font-weight: 700; }
  .info-detail { font-size: 8px; color: #555; margin-top: 2px; }
  .salary-section { margin: 12px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
  .salary-row { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 9px; }
  .salary-row.deduction { color: #c00; }
  .salary-row .amount { font-family: monospace; font-weight: 600; }
  .net-row { display: flex; justify-content: space-between; padding: 10px; background: #e8f4e8; font-weight: bold; font-size: 12px; }
  .net-amount { font-family: monospace; color: #27ae60; font-size: 14px; }
  .reason-section { background: #f5f5f5; padding: 8px; margin: 10px 0; border-radius: 4px; border-left: 3px solid #e8d44d; }
  .reason-label { font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
  .reason-text { font-size: 9px; }
  .auth-section { padding: 6px 0; font-size: 9px; margin: 8px 0; }
  .auth-label { }
  .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 8px; border-radius: 4px; font-size: 8px; font-weight: 600; margin: 10px 0; text-align: center; color: #856404; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
  .signature { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-top: 30px; padding-top: 5px; }
  .sig-label { font-size: 8px; font-weight: 600; }
  .sig-note { font-size: 7px; color: #666; font-style: italic; margin-top: 2px; }
  .footer { margin-top: 12px; font-size: 6px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="page-container">
    <div class="receipt-wrapper">
      <div class="copy-label">${language === 'pt' ? 'VIA DO FUNCIONÁRIO' : 'EMPLOYEE COPY'}</div>
      ${receiptBody}
    </div>
    <div class="divider" aria-hidden="true"></div>
    <div class="receipt-wrapper">
      <div class="copy-label">${language === 'pt' ? 'VIA DA EMPRESA (TESOURARIA)' : 'COMPANY COPY (TREASURY)'}</div>
      ${receiptBody}
    </div>
  </div>
</body>
</html>`;

    await printHtml(htmlContent, { width: 1100, height: 800 });
    
    // After printing, confirm and mark as paid early
    onConfirm({ reason, authorizedBy, paymentMethod });
    onOpenChange(false);
    setReason('');
    setAuthorizedBy('');
    setPaymentMethod('cash');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-amber-500" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t.subtitle}</p>

        {/* Employee summary */}
        <div className="bg-muted/30 p-3 rounded-lg border">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{employee.firstName} {employee.lastName}</span>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t.netSalary}</span>
            <span className="text-lg font-bold text-primary font-mono">{formatAOA(entry.netSalary)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.reason}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.authorizedBy} *</Label>
            <Input
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              placeholder={t.authorizedPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.paymentMethod}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t.cash}</SelectItem>
                <SelectItem value="bank_transfer">{t.bankTransfer}</SelectItem>
                <SelectItem value="cheque">{t.cheque}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
          ⚠️ {t.warning}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            variant="accent" 
            onClick={handleConfirmAndPrint}
            disabled={!authorizedBy.trim()}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {t.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
