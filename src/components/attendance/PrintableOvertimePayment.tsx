import type { OvertimePayment } from '@/stores/overtime-payment-store';
import { formatAOA } from '@/lib/angola-labor-law';

interface Props {
  payment: OvertimePayment;
  companyName: string;
  companyNif: string;
}

function getRateLabel(type: string, rate: number): string {
  if (type === 'holiday') return 'Holiday/Rest (+100%)';
  if (type === 'night') return 'Night (+75%)';
  if (rate >= 1.75) return 'Normal (>30h, +75%)';
  return 'Normal (≤30h, +50%)';
}

export function generateOvertimePaymentHtml({ payment, companyName, companyNif }: Props): string {
  const rows = payment.entries.map(e => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;">${e.employeeName}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${e.baseSalary.toLocaleString('pt-AO')} Kz</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${e.hoursWorked.toFixed(1)}h</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${getRateLabel(e.overtimeType, e.rate)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${e.rate}x</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;font-weight:600;">${e.amount.toLocaleString('pt-AO')} Kz</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Overtime Payment - ${payment.date}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 2px 0; font-size: 12px; color: #555; }
    .meta { display: flex; justify-content: space-between; margin: 15px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
    th { background: #f5f5f5; padding: 8px 10px; border: 1px solid #ddd; text-align: center; font-weight: 600; }
    .total-row { background: #f0f7ff; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .sig-line { width: 200px; border-top: 1px solid #333; padding-top: 5px; text-align: center; margin-top: 50px; }
    .notes { margin-top: 15px; padding: 8px; background: #fafafa; border: 1px solid #eee; font-size: 11px; }
    .legal { margin-top: 10px; font-size: 10px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companyName}</h1>
    <p>NIF: ${companyNif}</p>
    <h2 style="margin-top:10px;font-size:15px;">COMPROVATIVO DE PAGAMENTO DE HORAS EXTRAORDINÁRIAS</h2>
    <p>OVERTIME PAYMENT RECEIPT</p>
  </div>

  <div class="meta">
    <div>
      <strong>Branch / Filial:</strong> ${payment.branchName}<br>
      <strong>Date / Data:</strong> ${new Date(payment.date).toLocaleDateString('pt-AO')}
    </div>
    <div style="text-align:right;">
      <strong>Ref:</strong> ${payment.id.substring(0, 15)}<br>
      <strong>Issued / Emitido:</strong> ${new Date(payment.createdAt).toLocaleDateString('pt-AO')}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Employee / Funcionário</th>
        <th>Base Salary / Salário Base</th>
        <th>Hours / Horas</th>
        <th>Type / Tipo</th>
        <th>Rate / Taxa</th>
        <th style="text-align:right;">Amount / Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="5" style="padding:8px 10px;border:1px solid #ddd;text-align:right;">TOTAL:</td>
        <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;">${payment.totalAmount.toLocaleString('pt-AO')} Kz</td>
      </tr>
    </tbody>
  </table>

  ${payment.notes ? `<div class="notes"><strong>Notes / Observações:</strong> ${payment.notes}</div>` : ''}

  <div class="legal">
    Lei Geral do Trabalho (Lei n.º 12/23) - Art. 185 & 188: Normal ≤30h/mês +50% | Normal >30h/mês +75% | Nocturno +75% | Feriados +100%
  </div>

  <div class="footer">
    <div class="sig-line">Prepared by / Elaborado por</div>
    <div class="sig-line">Approved by / Aprovado por</div>
    <div class="sig-line">Received by / Recebido por</div>
  </div>
</body>
</html>`;
}
