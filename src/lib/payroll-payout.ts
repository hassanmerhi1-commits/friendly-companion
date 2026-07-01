import type { PayrollEntry } from '@/types/payroll';

/** Salário líquido na folha/recibo — nunca negativo; saldo fica no desconto. */
export function clampNetSalary(net: number): number {
  return Math.max(0, Number(net) || 0);
}

/** Líquido após descontos extra (adiantamentos, empréstimos, etc.). Pode ser negativo quando descontos excedem o líquido legal — o bónus mensal compensa na transferência. */
export function netAfterExtraDeductions(statutoryNet: number, extraDeductions: number): number {
  return (Number(statutoryNet) || 0) - (Number(extraDeductions) || 0);
}

/** Bónus mensal (perfil) — fora do bruto/IRT/INSS */
export function getMonthlyBonusPayout(entry: PayrollEntry): number {
  return entry.monthlyBonus || 0;
}

/** Extra pontual deste mês — isolado, não entra em subsídios nem impostos */
export function getOneOffExtraPayout(entry: PayrollEntry): number {
  return entry.oneOffExtra || 0;
}

/** Compra de férias neste mês (ligada ao registo de férias) */
export function getHolidayBuyoutPayout(entry: PayrollEntry): number {
  return entry.holidayBuyoutAmount || 0;
}

/** Valores pagos além do líquido calculado */
export function getPayoutExtras(entry: PayrollEntry): number {
  return getMonthlyBonusPayout(entry) + getOneOffExtraPayout(entry) + getHolidayBuyoutPayout(entry);
}

/** Total a pagar (líquido + extras) — mesmo critério do ficheiro banco, independentemente de PA */
export function getPayrollPayoutAmount(entry: PayrollEntry): number {
  const raw = (entry.netSalary || 0) + getPayoutExtras(entry);
  return Math.max(0, raw);
}

/** Total transferido / recebido pelo trabalhador neste período (0 se já pago antecipadamente) */
export function getTotalPaidToEmployee(entry: PayrollEntry): number {
  if (entry.paidEarly) return 0;
  return getPayrollPayoutAmount(entry);
}

/** Valor registado no pagamento antecipado (dossier / recibo) */
export function getEarlyPaymentRecordAmount(entry: PayrollEntry): number {
  if (entry.paidEarlyAmount != null && entry.paidEarlyAmount > 0) {
    return entry.paidEarlyAmount;
  }
  return getPayrollPayoutAmount(entry);
}

/** Ficheiro banco (4 colunas): vírgula decimal, sem separador de milhares — ex. 200000,00 */
export function formatBankFileAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

export function isExcludedFromBankTransferExport(paymentMethod?: string): boolean {
  return paymentMethod === 'cash' || paymentMethod === 'mobile_money';
}
