import type { PayrollEntry } from '@/types/payroll';

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

/** Total transferido / recebido pelo trabalhador neste período */
export function getTotalPaidToEmployee(entry: PayrollEntry): number {
  if (entry.paidEarly) return 0;
  return (entry.netSalary || 0) + getPayoutExtras(entry);
}
