import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { HandCoins, ChevronDown, ChevronUp, Wallet, Calendar, Hash } from 'lucide-react';
import { usePayrollStore } from '@/stores/payroll-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import {
  getEarlyPaymentRecordAmount,
  getHolidayBuyoutPayout,
  getMonthlyBonusPayout,
  getOneOffExtraPayout,
} from '@/lib/payroll-payout';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

interface EarlyPaymentsTabProps {
  employeeId: string;
}

const monthNamesPt = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const monthNamesEn = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const paymentMethodLabels: Record<string, { pt: string; en: string }> = {
  cash: { pt: 'Numerário', en: 'Cash' },
  bank_transfer: { pt: 'Transferência', en: 'Transfer' },
  cheque: { pt: 'Cheque', en: 'Cheque' },
};

function formatPeriodLabel(month: number, year: number, language: string): string {
  const names = language === 'pt' ? monthNamesPt : monthNamesEn;
  return `${names[month - 1] ?? month} ${year}`;
}

function formatPaidAt(iso?: string, language?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function EarlyPaymentsTab({ employeeId }: EarlyPaymentsTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { periods, entries } = usePayrollStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const earlyPayments = useMemo(() => {
    const rows: {
      entryId: string;
      periodLabel: string;
      year: number;
      month: number;
      paidAt?: string;
      amount: number;
      netSalary: number;
      monthlyBonus: number;
      oneOffExtra: number;
      holidayBuyout: number;
      reason?: string;
      authorizedBy?: string;
      paymentMethod?: string;
    }[] = [];

    entries
      .filter((e) => e.employeeId === employeeId && e.paidEarly)
      .forEach((entry) => {
        const period = periods.find((p) => p.id === entry.payrollPeriodId);
        const month = period?.month ?? 0;
        const year = period?.year ?? 0;
        rows.push({
          entryId: entry.id,
          periodLabel: month && year ? formatPeriodLabel(month, year, language) : '—',
          year,
          month,
          paidAt: entry.paidEarlyAt,
          amount: getEarlyPaymentRecordAmount(entry),
          netSalary: entry.netSalary || 0,
          monthlyBonus: getMonthlyBonusPayout(entry),
          oneOffExtra: getOneOffExtraPayout(entry),
          holidayBuyout: getHolidayBuyoutPayout(entry),
          reason: entry.paidEarlyReason,
          authorizedBy: entry.paidEarlyAuthorizedBy,
          paymentMethod: entry.paidEarlyPaymentMethod,
        });
      });

    return rows.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [entries, periods, employeeId, language]);

  const stats = useMemo(() => {
    const total = earlyPayments.reduce((s, r) => s + r.amount, 0);
    const last = earlyPayments[0];
    return { total, count: earlyPayments.length, last };
  }, [earlyPayments]);

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Total antecipado' : 'Total early',
      value: stats.count > 0 ? formatAOA(stats.total) : '—',
      icon: Wallet,
    },
    {
      label: ptLang ? 'Pagamentos' : 'Payments',
      value: String(stats.count),
      icon: Hash,
    },
    {
      label: ptLang ? 'Último' : 'Last',
      value: stats.last ? formatAOA(stats.last.amount) : '—',
      sub: stats.last ? formatPaidAt(stats.last.paidAt, language) : undefined,
      icon: Calendar,
    },
  ];

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <DossierTabShell kpis={kpis}>
      <DossierTablePanel
        title={ptLang ? 'Pagamentos antecipados' : 'Early payments'}
        subtitle={
          ptLang
            ? 'Salário pago antes do fecho da folha'
            : 'Salary paid before payroll close'
        }
      >
        {earlyPayments.length === 0 ? (
          <DossierEmptyState
            icon={HandCoins}
            message={
              ptLang
                ? 'Nenhum pagamento antecipado registado'
                : 'No early payments recorded'
            }
          />
        ) : (
          <table className="w-full text-xs min-w-[36rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Folha' : 'Period'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Pago em' : 'Paid on'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Total' : 'Total'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Método' : 'Method'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Motivo' : 'Reason'}</th>
                <th className={ATTENDANCE_TH_RIGHT} />
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {earlyPayments.map((row) => {
                const methodKey = row.paymentMethod || '';
                const methodLabel =
                  paymentMethodLabels[methodKey]?.[ptLang ? 'pt' : 'en'] ||
                  row.paymentMethod ||
                  '—';
                const isExpanded = expandedRows.has(row.entryId);
                const hasDetail =
                  row.monthlyBonus > 0 ||
                  row.oneOffExtra > 0 ||
                  row.holidayBuyout > 0 ||
                  !!row.authorizedBy;

                return (
                  <Fragment key={row.entryId}>
                    <tr className="hover:bg-muted/30">
                      <td className={ATTENDANCE_TD}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{row.periodLabel}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 text-amber-800 border-amber-300 bg-amber-50 dark:bg-amber-950/40"
                          >
                            {ptLang ? 'Antecip.' : 'Early'}
                          </Badge>
                        </div>
                      </td>
                      <td className={`${ATTENDANCE_TD} whitespace-nowrap`}>
                        {formatPaidAt(row.paidAt, language)}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right font-mono font-semibold text-primary`}>
                        {formatAOA(row.amount)}
                      </td>
                      <td className={ATTENDANCE_TD}>{methodLabel}</td>
                      <td className={`${ATTENDANCE_TD} max-w-[12rem] truncate`} title={row.reason}>
                        {row.reason || '—'}
                      </td>
                      <td className={`${ATTENDANCE_TD} text-right`}>
                        {hasDetail && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRow(row.entryId)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasDetail && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-3 py-1.5 border-t border-border/40">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                {ptLang ? 'Líquido' : 'Net'}
                              </span>
                              <span className="font-mono">{formatAOA(row.netSalary)}</span>
                            </div>
                            {row.monthlyBonus > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {ptLang ? 'Bónus' : 'Bonus'}
                                </span>
                                <span className="font-mono">{formatAOA(row.monthlyBonus)}</span>
                              </div>
                            )}
                            {row.oneOffExtra > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {ptLang ? 'Extra' : 'Extra'}
                                </span>
                                <span className="font-mono">{formatAOA(row.oneOffExtra)}</span>
                              </div>
                            )}
                            {row.holidayBuyout > 0 && (
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {ptLang ? 'Compra férias' : 'Buyout'}
                                </span>
                                <span className="font-mono">{formatAOA(row.holidayBuyout)}</span>
                              </div>
                            )}
                            {row.authorizedBy && (
                              <div className="flex justify-between gap-2 col-span-2">
                                <span className="text-muted-foreground">
                                  {ptLang ? 'Autorizado' : 'Authorized'}
                                </span>
                                <span className="truncate">{row.authorizedBy}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </DossierTablePanel>
    </DossierTabShell>
  );
}
