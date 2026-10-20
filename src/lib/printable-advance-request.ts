import { formatAOA } from '@/lib/angola-labor-law';
import type { AdvanceRequest } from '@/types/advance-request';

function esc(s: string | number | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusLabel(status: AdvanceRequest['status'], pt: boolean): string {
  if (status === 'approved') return pt ? 'APROVADO' : 'APPROVED';
  if (status === 'rejected') return pt ? 'REJEITADO' : 'REJECTED';
  return pt ? 'PENDENTE' : 'PENDING';
}

/**
 * Build printable HTML for a salary-advance request paper.
 * Uses company name/logo from caller — does not touch settings store writes.
 */
export function buildAdvanceRequestPrintHtml(opts: {
  request: AdvanceRequest;
  companyName: string;
  companyLogo?: string;
  companyNif?: string;
  language?: 'pt' | 'en';
}): string {
  const { request: r, companyName, companyLogo, companyNif } = opts;
  const pt = (opts.language || 'pt') === 'pt';
  const gross =
    (Number(r.baseSalary) || 0) +
    (Number(r.mealAllowance) || 0) +
    (Number(r.transportAllowance) || 0);
  const stamp =
    r.status === 'approved'
      ? `<div class="stamp approved">${esc(statusLabel(r.status, pt))}</div>`
      : r.status === 'rejected'
        ? `<div class="stamp rejected">${esc(statusLabel(r.status, pt))}</div>`
        : `<div class="stamp pending">${esc(statusLabel(r.status, pt))}</div>`;

  const logoBlock = companyLogo
    ? `<img class="logo" src="${companyLogo}" alt="Logo" />`
    : '';

  return `<!DOCTYPE html>
<html lang="${pt ? 'pt' : 'en'}">
<head>
<meta charset="utf-8" />
<title>${pt ? 'Pedido de Adiantamento' : 'Advance Request'} — ${esc(r.employeeName)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; font-size: 12px; line-height: 1.45; }
  .sheet { position: relative; max-width: 720px; margin: 0 auto; }
  .header { display: flex; gap: 16px; align-items: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { width: 64px; height: 64px; object-fit: contain; }
  .company { flex: 1; }
  .company h1 { margin: 0; font-size: 18px; letter-spacing: 0.02em; }
  .company p { margin: 2px 0 0; font-size: 11px; color: #444; }
  h2 { margin: 0 0 12px; font-size: 15px; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; }
  table.info { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.info th, table.info td { border: 1px solid #bbb; padding: 7px 9px; text-align: left; vertical-align: top; }
  table.info th { width: 34%; background: #f4f4f4; font-weight: 600; }
  .reason { border: 1px solid #bbb; padding: 10px; min-height: 72px; margin-bottom: 18px; white-space: pre-wrap; }
  .sign-row { display: flex; gap: 24px; margin-top: 36px; }
  .sign { flex: 1; text-align: center; }
  .sign .line { border-top: 1px solid #111; margin-top: 48px; padding-top: 6px; font-size: 11px; }
  .stamp { position: absolute; top: 72px; right: 8px; border: 3px solid; padding: 8px 14px; font-weight: 700;
    font-size: 14px; letter-spacing: 0.08em; transform: rotate(-12deg); opacity: 0.85; }
  .stamp.approved { border-color: #166534; color: #166534; }
  .stamp.rejected { border-color: #991b1b; color: #991b1b; }
  .stamp.pending { border-color: #a16207; color: #a16207; }
  .meta { margin-top: 20px; font-size: 10px; color: #666; }
  .note { margin-top: 10px; font-size: 10px; color: #444; }
</style>
</head>
<body>
<div class="sheet">
  ${stamp}
  <div class="header">
    ${logoBlock}
    <div class="company">
      <h1>${esc(companyName || (pt ? 'Empresa' : 'Company'))}</h1>
      ${companyNif ? `<p>NIF: ${esc(companyNif)}</p>` : ''}
    </div>
  </div>
  <h2>${pt ? 'Pedido de Adiantamento Salarial' : 'Salary Advance Request'}</h2>
  <table class="info">
    <tr><th>${pt ? 'Funcionário' : 'Employee'}</th><td>${esc(r.employeeName)}</td></tr>
    <tr><th>${pt ? 'Nº Funcionário' : 'Employee No.'}</th><td>${esc(r.employeeNumber || '—')}</td></tr>
    <tr><th>${pt ? 'Filial' : 'Branch'}</th><td>${esc(r.branchName || '—')}</td></tr>
    <tr><th>${pt ? 'Cargo' : 'Position'}</th><td>${esc(r.position || '—')}</td></tr>
    <tr><th>${pt ? 'Data de admissão' : 'Hire date'}</th><td>${esc(r.hireDate || '—')}</td></tr>
    <tr><th>${pt ? 'Salário base' : 'Base salary'}</th><td>${esc(formatAOA(r.baseSalary))}</td></tr>
    <tr><th>${pt ? 'Subsídio alimentação' : 'Meal allowance'}</th><td>${esc(formatAOA(r.mealAllowance))}</td></tr>
    <tr><th>${pt ? 'Subsídio transporte' : 'Transport allowance'}</th><td>${esc(formatAOA(r.transportAllowance))}</td></tr>
    <tr><th>${pt ? 'Remuneração de referência' : 'Reference pay'}</th><td><strong>${esc(formatAOA(gross))}</strong></td></tr>
    <tr><th>${pt ? 'Valor em dívida à empresa' : 'Amount owed to company'}</th><td><strong>${esc(formatAOA(r.amountOwed))}</strong>
      <div class="note">${pt ? '(Adiantamentos, empréstimos e perdas em aberto)' : '(Open advances, loans and losses)'}</div>
    </td></tr>
    <tr><th>${pt ? 'Valor do adiantamento pedido' : 'Requested advance'}</th><td><strong>${esc(formatAOA(r.requestedAmount))}</strong></td></tr>
    <tr><th>${pt ? 'Prestações' : 'Installments'}</th><td>${esc(r.installments)} × ${esc(formatAOA(r.monthlyAmount))}</td></tr>
    <tr><th>${pt ? 'Data do pedido' : 'Request date'}</th><td>${esc(r.requestDate)}</td></tr>
    <tr><th>${pt ? 'Estado' : 'Status'}</th><td>${esc(statusLabel(r.status, pt))}</td></tr>
  </table>
  <div><strong>${pt ? 'Motivo do pedido' : 'Reason'}:</strong></div>
  <div class="reason">${esc(r.reason)}</div>
  ${
    r.status === 'rejected' && r.rejectionReason
      ? `<div><strong>${pt ? 'Motivo da rejeição' : 'Rejection reason'}:</strong></div><div class="reason">${esc(r.rejectionReason)}</div>`
      : ''
  }
  <div class="sign-row">
    <div class="sign"><div class="line">${pt ? 'Assinatura do trabalhador' : 'Employee signature'}</div></div>
    <div class="sign"><div class="line">${pt ? 'Assinatura da empresa' : 'Company signature'}</div></div>
  </div>
  <div class="meta">
    ${pt ? 'Pedido por' : 'Requested by'}: ${esc(r.requestedByName || '—')}
    ${r.reviewedByName ? ` · ${pt ? 'Revisado por' : 'Reviewed by'}: ${esc(r.reviewedByName)}` : ''}
    ${r.reviewedAt ? ` (${esc(r.reviewedAt.slice(0, 16).replace('T', ' '))})` : ''}
  </div>
  <p class="note">${
    pt
      ? 'Declaro que solicito o adiantamento acima e autorizo o desconto nas prestações indicadas na folha salarial.'
      : 'I request the advance above and authorize payroll deductions as stated.'
  }</p>
</div>
</body>
</html>`;
}
