import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import type { PayrollPeriod } from '@/types/payroll';
import { formatAOA } from '@/lib/angola-labor-law';

interface DashboardHeroProps {
  period: PayrollPeriod | null;
  activeEmployeeCount: number;
  folhaPayoutTotal: number;
  showPayroll: boolean;
  showEmployees: boolean;
  compact?: boolean;
}

function periodStatusLabel(status: PayrollPeriod['status'], language: string): string {
  const pt: Record<string, string> = {
    draft: 'Rascunho',
    calculated: 'Calculada',
    approved: 'Aprovada',
    paid: 'Paga',
  };
  const en: Record<string, string> = {
    draft: 'Draft',
    calculated: 'Calculated',
    approved: 'Approved',
    paid: 'Paid',
  };
  const map = language === 'pt' ? pt : en;
  return map[status] || status;
}

function periodStatusVariant(status: PayrollPeriod['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'paid') return 'secondary';
  if (status === 'approved') return 'default';
  if (status === 'calculated') return 'outline';
  return 'destructive';
}

export function DashboardHero({
  period,
  activeEmployeeCount,
  folhaPayoutTotal,
  showPayroll,
  showEmployees,
  compact = false,
}: DashboardHeroProps) {
  const { language } = useLanguage();
  const companyName = useSettingsStore((s) => s.companyName);
  const pt = language === 'pt';

  const monthNames = pt
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const periodLabel = period
    ? `${monthNames[period.month - 1]} ${period.year}`
    : pt
      ? 'Sem folha activa'
      : 'No active payroll';

  const summaryParts: string[] = [];
  if (showEmployees) {
    summaryParts.push(
      pt ? `${activeEmployeeCount} activos` : `${activeEmployeeCount} active`
    );
  }
  if (showPayroll && period) {
    summaryParts.push(
      pt
        ? `${formatAOA(folhaPayoutTotal)} a pagar`
        : `${formatAOA(folhaPayoutTotal)} to pay`
    );
  }

  return (
    <div
      className={
        compact
          ? 'shrink-0 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm'
          : 'rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {companyName || (pt ? 'Empresa' : 'Company')}
          </p>
          <h1
            className={
              compact
                ? 'text-lg font-display font-bold tracking-tight text-foreground'
                : 'text-2xl font-display font-bold tracking-tight text-foreground'
            }
          >
            {pt ? 'Painel' : 'Dashboard'}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {pt ? 'Folha' : 'Payroll'}: <span className="font-medium text-foreground">{periodLabel}</span>
            {summaryParts.length > 0 && (
              <span className="text-muted-foreground"> · {summaryParts.join(' · ')}</span>
            )}
          </p>
        </div>
        {showPayroll && period && (
          <Badge variant={periodStatusVariant(period.status)} className="shrink-0 text-[10px] px-2 py-0.5">
            {periodStatusLabel(period.status, language)}
          </Badge>
        )}
      </div>
    </div>
  );
}
