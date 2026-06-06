import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { usePayrollStore } from '@/stores/payroll-store';
import { getDeductionTypeLabel } from '@/stores/deduction-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { getHolidayBuyoutPayout, getOneOffExtraPayout } from '@/lib/payroll-payout';
import {
  parsePayrollEntryDeductionBreakdown,
  PAYROLL_HISTORY_DEDUCTION_COLUMNS,
  type PayrollDeductionBreakdown,
} from '@/lib/payroll-deduction-breakdown';
import type { PayrollStatus } from '@/types/payroll';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';
import { cn } from '@/lib/utils';

interface PayrollHistoryTabProps {
  employeeId: string;
  variant?: 'full' | 'slim';
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type HistoryRow = {
  periodId: string;
  year: number;
  month: number;
  status: PayrollStatus;
  grossSalary: number;
  inssEmployee: number;
  irt: number;
  netSalary: number;
  oneOffExtra: number;
  holidayBuyout: number;
  totalDeductions: number;
  deductionBreakdown: PayrollDeductionBreakdown;
  approvedAt?: string;
};

function DeductionAmountCell({ amount }: { amount: number }) {
  if (amount <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="text-destructive font-mono text-xs whitespace-nowrap">
      -{formatAOA(amount)}
    </span>
  );
}

function DeductionBreakdownExpand({
  breakdown,
  language,
}: {
  breakdown: PayrollDeductionBreakdown;
  language: string;
}) {
  const pt = language === 'pt';
  const items = PAYROLL_HISTORY_DEDUCTION_COLUMNS.map(({ key, type }) => ({
    key,
    label: getDeductionTypeLabel(type, language),
    amount: breakdown[key],
  })).filter((i) => i.amount > 0);

  if (items.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground py-1">
        {pt ? 'Sem deduções por tipo neste mês' : 'No per-type deductions this month'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 py-1.5 text-[10px]">
      {items.map((item) => (
        <div key={item.key} className="flex justify-between gap-2">
          <span className="text-muted-foreground truncate">{item.label}</span>
          <span className="font-mono text-destructive shrink-0">-{formatAOA(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export function PayrollHistoryTab({ employeeId, variant = 'full' }: PayrollHistoryTabProps) {
  const slim = variant === 'slim';
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { periods, entries } = usePayrollStore();
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const employeePayrollHistory = useMemo(() => {
    const history: HistoryRow[] = [];

    periods.forEach((period) => {
      const employeeEntry = entries.find(
        (e) => e.payrollPeriodId === period.id && e.employeeId === employeeId
      );

      if (employeeEntry) {
        history.push({
          periodId: period.id,
          year: period.year,
          month: period.month,
          status: period.status,
          grossSalary: employeeEntry.grossSalary,
          inssEmployee: employeeEntry.inssEmployee,
          irt: employeeEntry.irt,
          netSalary: employeeEntry.netSalary,
          oneOffExtra: getOneOffExtraPayout(employeeEntry),
          holidayBuyout: getHolidayBuyoutPayout(employeeEntry),
          totalDeductions: employeeEntry.totalDeductions,
          deductionBreakdown: parsePayrollEntryDeductionBreakdown(employeeEntry),
          approvedAt: period.approvedAt,
        });
      }
    });

    return history.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [periods, entries, employeeId]);

  const availableYears = useMemo(() => {
    const years = new Set(employeePayrollHistory.map((h) => h.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [employeePayrollHistory]);

  const filteredHistory = useMemo(() => {
    return employeePayrollHistory.filter((row) => {
      if (yearFilter !== 'all' && row.year !== yearFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      return true;
    });
  }, [employeePayrollHistory, yearFilter, statusFilter]);

  const stats = useMemo(() => {
    const source = filteredHistory;
    if (source.length === 0) {
      return { totalGross: 0, totalNet: 0, avgNet: 0, months: 0 };
    }
    const totalGross = source.reduce((sum, h) => sum + h.grossSalary, 0);
    const totalNet = source.reduce((sum, h) => sum + h.netSalary, 0);
    return {
      totalGross,
      totalNet,
      avgNet: totalNet / source.length,
      months: source.length,
    };
  }, [filteredHistory]);

  const trend = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const [current, previous] = filteredHistory;
    const diff = current.netSalary - previous.netSalary;
    const percent = previous.netSalary > 0 ? (diff / previous.netSalary) * 100 : 0;
    return { diff, percent };
  }, [filteredHistory]);

  const lastRow = filteredHistory[0];

  const toggleRow = (periodId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(periodId)) next.delete(periodId);
      else next.add(periodId);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      calculated: 'bg-primary/10 text-primary border-primary/20',
      approved: 'bg-accent/10 text-accent border-accent/20',
      paid: 'bg-primary/10 text-primary border-primary/20',
    };
    const labels: Record<string, string> = {
      draft: ptLang ? 'Rascunho' : 'Draft',
      calculated: ptLang ? 'Calculado' : 'Calculated',
      approved: ptLang ? 'Aprovado' : 'Approved',
      paid: ptLang ? 'Pago' : 'Paid',
    };
    return (
      <Badge variant="outline" className={cn('text-[10px] h-5', colors[status] || colors.draft)}>
        {labels[status] || status}
      </Badge>
    );
  };

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Último líquido' : 'Last net',
      value: lastRow ? formatAOA(lastRow.netSalary) : '—',
      sub: lastRow ? `${monthNames[lastRow.month - 1]} ${lastRow.year}` : undefined,
      icon: Wallet,
    },
    {
      label: ptLang ? 'Média líquida' : 'Avg net',
      value: stats.months > 0 ? formatAOA(stats.avgNet) : '—',
      sub: stats.months > 0 ? `${stats.months} ${ptLang ? 'meses' : 'months'}` : undefined,
      icon: BarChart3,
    },
    {
      label: ptLang ? 'Total bruto' : 'Total gross',
      value: stats.months > 0 ? formatAOA(stats.totalGross) : '—',
      sub: yearFilter !== 'all' ? String(yearFilter) : ptLang ? 'Todos' : 'All',
      icon: Calendar,
    },
    {
      label: ptLang ? 'Tendência' : 'Trend',
      value: trend
        ? `${trend.percent >= 0 ? '+' : ''}${trend.percent.toFixed(1)}%`
        : '—',
      warn: trend ? trend.diff < 0 : false,
      icon: trend
        ? trend.diff > 0
          ? TrendingUp
          : trend.diff < 0
            ? TrendingDown
            : Minus
        : Minus,
    },
  ];

  const statusChips: { value: PayrollStatus | 'all'; labelPt: string; labelEn: string }[] = [
    { value: 'all', labelPt: 'Todos', labelEn: 'All' },
    { value: 'paid', labelPt: 'Pago', labelEn: 'Paid' },
    { value: 'approved', labelPt: 'Aprovado', labelEn: 'Approved' },
    { value: 'calculated', labelPt: 'Calculado', labelEn: 'Calculated' },
    { value: 'draft', labelPt: 'Rascunho', labelEn: 'Draft' },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant={yearFilter === 'all' ? 'default' : 'outline'}
        size="sm"
        className="h-6 px-2 text-[10px]"
        onClick={() => setYearFilter('all')}
      >
        {ptLang ? 'Todos anos' : 'All years'}
      </Button>
      {availableYears.map((year) => (
        <Button
          key={year}
          variant={yearFilter === year ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setYearFilter(year)}
        >
          {year}
        </Button>
      ))}
      <span className="w-px h-4 bg-border mx-0.5" />
      {statusChips.map((chip) => (
        <Button
          key={chip.value}
          variant={statusFilter === chip.value ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setStatusFilter(chip.value)}
        >
          {ptLang ? chip.labelPt : chip.labelEn}
        </Button>
      ))}
    </div>
  );

  if (employeePayrollHistory.length === 0) {
    if (slim) {
      return (
        <DossierTabShell kpis={kpis}>
          <DossierTablePanel title={ptLang ? 'Histórico salarial' : 'Salary history'}>
            <DossierEmptyState
              icon={Wallet}
              message={ptLang ? 'Nenhum histórico de folha salarial' : 'No payroll history'}
            />
          </DossierTablePanel>
        </DossierTabShell>
      );
    }
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-4 opacity-50" />
          <p>{ptLang ? 'Nenhum histórico de folha salarial' : 'No payroll history'}</p>
        </CardContent>
      </Card>
    );
  }

  const slimTable = (
    <table className="w-full text-xs min-w-[44rem]">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={`${ATTENDANCE_TH} sticky left-0 z-20 bg-muted/95 min-w-[6.5rem]`}>
            {ptLang ? 'Período' : 'Period'}
          </th>
          <th className={ATTENDANCE_TH}>{ptLang ? 'Estado' : 'Status'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Bruto' : 'Gross'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>INSS</th>
          <th className={ATTENDANCE_TH_RIGHT}>IRT</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Total ded.' : 'Ded.'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Extra' : 'Extra'}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Líquido' : 'Net'}</th>
          <th className={ATTENDANCE_TH_RIGHT} />
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {filteredHistory.map((record) => {
          const isExpanded = expandedRows.has(record.periodId);
          const hasBreakdown = PAYROLL_HISTORY_DEDUCTION_COLUMNS.some(
            ({ key }) => record.deductionBreakdown[key] > 0
          );
          const extraTotal = record.oneOffExtra + record.holidayBuyout;

          return (
            <Fragment key={record.periodId}>
              <tr className="hover:bg-muted/30">
                <td className={`${ATTENDANCE_TD} font-medium sticky left-0 z-10 bg-card`}>
                  {monthNames[record.month - 1]} {record.year}
                </td>
                <td className={ATTENDANCE_TD}>{getStatusBadge(record.status)}</td>
                <td className={`${ATTENDANCE_TD} text-right font-mono`}>
                  {formatAOA(record.grossSalary)}
                </td>
                <td className={`${ATTENDANCE_TD} text-right font-mono text-muted-foreground`}>
                  {record.inssEmployee > 0 ? `-${formatAOA(record.inssEmployee)}` : '—'}
                </td>
                <td className={`${ATTENDANCE_TD} text-right font-mono text-muted-foreground`}>
                  {record.irt > 0 ? `-${formatAOA(record.irt)}` : '—'}
                </td>
                <td className={`${ATTENDANCE_TD} text-right font-mono text-destructive`}>
                  -{formatAOA(record.totalDeductions)}
                </td>
                <td className={`${ATTENDANCE_TD} text-right font-mono text-violet-600`}>
                  {extraTotal > 0 ? formatAOA(extraTotal) : '—'}
                </td>
                <td className={`${ATTENDANCE_TD} text-right font-mono font-semibold text-primary`}>
                  {formatAOA(record.netSalary)}
                </td>
                <td className={`${ATTENDANCE_TD} text-right`}>
                  {hasBreakdown && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleRow(record.periodId)}
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
              {isExpanded && hasBreakdown && (
                <tr className="bg-muted/20">
                  <td colSpan={9} className="px-3 py-1 border-t border-border/40">
                    <DeductionBreakdownExpand
                      breakdown={record.deductionBreakdown}
                      language={language}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );

  if (slim) {
    return (
      <DossierTabShell kpis={kpis}>
        <DossierTablePanel
          title={ptLang ? 'Histórico salarial' : 'Salary history'}
          subtitle={
            ptLang
              ? `${filteredHistory.length} de ${employeePayrollHistory.length} meses`
              : `${filteredHistory.length} of ${employeePayrollHistory.length} months`
          }
          toolbar={toolbar}
        >
          {filteredHistory.length === 0 ? (
            <DossierEmptyState
              icon={Wallet}
              message={ptLang ? 'Nenhum resultado para o filtro' : 'No results for filter'}
            />
          ) : (
            slimTable
          )}
        </DossierTablePanel>
      </DossierTabShell>
    );
  }

  // Full variant (standalone / legacy)
  const tableBody = employeePayrollHistory.map((record) => (
    <tr key={record.periodId} className="hover:bg-muted/30">
      <td className={`${ATTENDANCE_TD} font-medium sticky left-0 z-10 bg-card`}>
        {monthNames[record.month - 1]} {record.year}
      </td>
      <td className={ATTENDANCE_TD}>{getStatusBadge(record.status)}</td>
      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs`}>
        {formatAOA(record.grossSalary)}
      </td>
      {PAYROLL_HISTORY_DEDUCTION_COLUMNS.map(({ key }) => (
        <td key={key} className={`${ATTENDANCE_TD} text-right`}>
          <DeductionAmountCell amount={record.deductionBreakdown[key]} />
        </td>
      ))}
      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs text-destructive`}>
        -{formatAOA(record.totalDeductions)}
      </td>
      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs text-violet-600`}>
        {record.oneOffExtra + record.holidayBuyout > 0
          ? formatAOA(record.oneOffExtra + record.holidayBuyout)
          : '—'}
      </td>
      <td className={`${ATTENDANCE_TD} text-right font-mono text-xs font-semibold text-primary`}>
        {formatAOA(record.netSalary)}
      </td>
    </tr>
  ));

  const fullTable = (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[56rem]">
        <thead className={ATTENDANCE_THEAD}>
          <tr>
            <th className={`${ATTENDANCE_TH} sticky left-0 z-20 bg-muted/95 min-w-[7rem]`}>
              {ptLang ? 'Período' : 'Period'}
            </th>
            <th className={ATTENDANCE_TH}>{ptLang ? 'Estado' : 'Status'}</th>
            <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Bruto' : 'Gross'}</th>
            {PAYROLL_HISTORY_DEDUCTION_COLUMNS.map(({ key, type }) => (
              <th key={key} className={ATTENDANCE_TH_RIGHT}>
                <span className="leading-tight block">{getDeductionTypeLabel(type, language)}</span>
              </th>
            ))}
            <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Total ded.' : 'Total ded.'}</th>
            <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Extra' : 'Extra'}</th>
            <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Líquido' : 'Net'}</th>
          </tr>
        </thead>
        <tbody className={ATTENDANCE_TBODY}>{tableBody}</tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">
              {ptLang ? 'Total Bruto' : 'Total Gross'}
            </div>
            <div className="text-2xl font-bold font-mono">{formatAOA(stats.totalGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">
              {ptLang ? 'Total Líquido' : 'Total Net'}
            </div>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatAOA(stats.totalNet)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">
              {ptLang ? 'Média Mensal' : 'Monthly Average'}
            </div>
            <div className="text-2xl font-bold font-mono">{formatAOA(stats.avgNet)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">
              {ptLang ? 'Tendência' : 'Trend'}
            </div>
            {trend ? (
              <div className="flex items-center gap-2">
                {trend.diff > 0 ? (
                  <TrendingUp className="h-5 w-5 text-accent" />
                ) : trend.diff < 0 ? (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={`text-lg font-bold ${
                    trend.diff > 0
                      ? 'text-accent'
                      : trend.diff < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {trend.percent >= 0 ? '+' : ''}
                  {trend.percent.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <div className="font-medium text-sm">
            {ptLang ? 'Histórico Detalhado' : 'Detailed History'}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ptLang
              ? `${stats.months} meses — deduções por tipo conforme folhas processadas`
              : `${stats.months} months — deductions by type from processed payroll`}
          </div>
        </div>
        {fullTable}
      </div>
    </div>
  );
}
