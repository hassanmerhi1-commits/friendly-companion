import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/i18n';
import { formatAOA, INSS_RATES } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import { Printer, Download } from 'lucide-react';
import companyLogo from '@/assets/company-logo.jpg';

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
  companyName = 'Empresa Exemplo, Lda',
  companyNif = '5000123456',
  periodLabel,
  onClose,
}: SalaryReceiptProps) {
  const { t, language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo Salarial - ${employee.firstName} ${employee.lastName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a1a; }
            .receipt { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-info { font-size: 12px; color: #666; }
            .receipt-title { font-size: 18px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-section { background: #f5f5f5; padding: 15px; border-radius: 4px; }
            .info-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
            .info-value { font-size: 14px; font-weight: 500; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .table th { background: #f0f0f0; font-size: 12px; text-transform: uppercase; }
            .table td.amount { text-align: right; font-family: monospace; }
            .totals { margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total-row.highlight { background: #e8f4e8; padding: 15px; margin: 10px -15px; font-size: 18px; font-weight: bold; }
            .total-row.deduction { color: #c53030; }
            .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature { border-top: 1px solid #1a1a1a; padding-top: 10px; text-align: center; font-size: 12px; }
            .legal-note { margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { body { padding: 0; } .receipt { border: none; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const receiptTitle = language === 'pt' ? 'RECIBO DE VENCIMENTO' : 'SALARY RECEIPT';
  const employeeLabel = language === 'pt' ? 'FUNCIONÁRIO' : 'EMPLOYEE';
  const periodLabelText = language === 'pt' ? 'PERÍODO' : 'PERIOD';
  const earningsLabel = language === 'pt' ? 'Rendimentos' : 'Earnings';
  const deductionsLabel = language === 'pt' ? 'Deduções' : 'Deductions';
  const descriptionLabel = language === 'pt' ? 'Descrição' : 'Description';
  const amountLabel = language === 'pt' ? 'Valor' : 'Amount';
  const grossLabel = language === 'pt' ? 'Total Bruto' : 'Gross Total';
  const totalDeductionsLabel = language === 'pt' ? 'Total Deduções' : 'Total Deductions';
  const netLabel = language === 'pt' ? 'Salário Líquido' : 'Net Salary';
  const employeeSignature = language === 'pt' ? 'Assinatura do Funcionário' : 'Employee Signature';
  const employerSignature = language === 'pt' ? 'Assinatura da Entidade' : 'Employer Signature';

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          {language === 'pt' ? 'Imprimir' : 'Print'}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6" ref={printRef}>
          <div className="receipt">
            {/* Header */}
            <div className="header text-center mb-6 pb-4 border-b-2 border-foreground">
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-16 mx-auto mb-3 object-contain"
              />
              <h1 className="company-name text-xl font-bold">{companyName}</h1>
              <p className="company-info text-sm text-muted-foreground">
                NIF: {companyNif} {branch && `• ${branch.name}`}
              </p>
              {branch && (
                <p className="company-info text-sm text-muted-foreground">
                  {branch.address}, {branch.city}, {branch.province}
                </p>
              )}
              <h2 className="receipt-title text-lg font-bold mt-4 uppercase">{receiptTitle}</h2>
            </div>

            {/* Employee & Period Info */}
            <div className="info-grid grid grid-cols-2 gap-4 mb-6">
              <div className="info-section bg-muted/50 p-4 rounded">
                <div className="info-label text-xs text-muted-foreground uppercase mb-1">{employeeLabel}</div>
                <div className="info-value font-medium">{employee.firstName} {employee.lastName}</div>
                <div className="text-sm text-muted-foreground">{employee.position}</div>
                <div className="text-sm text-muted-foreground">{employee.department}</div>
                <div className="text-xs text-muted-foreground mt-2">NIF: {employee.nif || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">INSS: {employee.inssNumber || 'N/A'}</div>
              </div>
              <div className="info-section bg-muted/50 p-4 rounded">
                <div className="info-label text-xs text-muted-foreground uppercase mb-1">{periodLabelText}</div>
                <div className="info-value font-medium">{periodLabel}</div>
                <div className="text-sm text-muted-foreground mt-2">Nº Func: {employee.employeeNumber}</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'pt' ? 'Data de Admissão' : 'Hire Date'}: {new Date(employee.hireDate).toLocaleDateString('pt-AO')}
                </div>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{earningsLabel}</h3>
              <table className="table w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm uppercase text-muted-foreground">{descriptionLabel}</th>
                    <th className="text-right py-2 text-sm uppercase text-muted-foreground">{amountLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">{t.payroll.baseSalaries}</td>
                    <td className="py-2 text-right font-mono">{formatAOA(entry.baseSalary)}</td>
                  </tr>
                  {entry.mealAllowance > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{t.payroll.mealAllowance}</td>
                      <td className="py-2 text-right font-mono">{formatAOA(entry.mealAllowance)}</td>
                    </tr>
                  )}
                  {entry.transportAllowance > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{t.payroll.transportAllowance}</td>
                      <td className="py-2 text-right font-mono">{formatAOA(entry.transportAllowance)}</td>
                    </tr>
                  )}
                  {entry.otherAllowances > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{language === 'pt' ? 'Outros Subsídios' : 'Other Allowances'}</td>
                      <td className="py-2 text-right font-mono">{formatAOA(entry.otherAllowances)}</td>
                    </tr>
                  )}
                  {(entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday) > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{t.payroll.overtime}</td>
                      <td className="py-2 text-right font-mono">{formatAOA(entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday)}</td>
                    </tr>
                  )}
                  {entry.thirteenthMonth > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{t.payroll.thirteenthMonth}</td>
                      <td className="py-2 text-right font-mono">{formatAOA(entry.thirteenthMonth)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2">{grossLabel}</td>
                    <td className="py-2 text-right font-mono">{formatAOA(entry.grossSalary)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{deductionsLabel}</h3>
              <table className="table w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm uppercase text-muted-foreground">{descriptionLabel}</th>
                    <th className="text-right py-2 text-sm uppercase text-muted-foreground">{amountLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">{t.payroll.irt}</td>
                    <td className="py-2 text-right font-mono text-destructive">-{formatAOA(entry.irt)}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">{t.payroll.inssEmployee} ({(INSS_RATES.EMPLOYEE_RATE * 100).toFixed(0)}%)</td>
                    <td className="py-2 text-right font-mono text-destructive">-{formatAOA(entry.inssEmployee)}</td>
                  </tr>
                  {entry.otherDeductions > 0 && (
                    <tr className="border-b border-border/50">
                      <td className="py-2">{language === 'pt' ? 'Outros Descontos' : 'Other Deductions'}</td>
                      <td className="py-2 text-right font-mono text-destructive">-{formatAOA(entry.otherDeductions)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2">{totalDeductionsLabel}</td>
                    <td className="py-2 text-right font-mono text-destructive">-{formatAOA(entry.totalDeductions)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <Separator className="my-4" />

            {/* Net Salary */}
            <div className="bg-primary/10 p-4 rounded-lg flex justify-between items-center">
              <span className="text-lg font-bold">{netLabel}</span>
              <span className="text-2xl font-bold text-primary">{formatAOA(entry.netSalary)}</span>
            </div>

            {/* Signatures */}
            <div className="footer grid grid-cols-2 gap-10 mt-10 pt-4">
              <div className="signature text-center">
                <div className="border-t border-foreground pt-2 text-sm">
                  {employeeSignature}
                </div>
              </div>
              <div className="signature text-center">
                <div className="border-t border-foreground pt-2 text-sm">
                  {employerSignature}
                </div>
              </div>
            </div>

            {/* Legal Note */}
            <div className="legal-note mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
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
