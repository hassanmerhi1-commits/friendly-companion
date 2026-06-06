import { useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Clock,
  Umbrella,
  FileWarning,
  Pencil,
  CreditCard,
  ArrowRight,
  History,
  Banknote,
  CalendarDays,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePayrollStore } from '@/stores/payroll-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { useLoanStore } from '@/stores/loan-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useHolidayStore } from '@/stores/holiday-store';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { formatAOA } from '@/lib/angola-labor-law';
import {
  calculateHolidayEntitlement,
  getCurrentHolidayYear,
  getDaysRemaining,
} from '@/lib/holiday-utils';
import type { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';

export type DossierTab =
  | 'overview'
  | 'folha'
  | 'attendance'
  | 'financeiro'
  | 'rh'
  | 'auditoria';

interface OverviewTabProps {
  employee: Employee;
  onNavigateTab: (tab: DossierTab) => void;
  onEdit?: () => void;
  onPrintCard?: () => void;
  canEdit: boolean;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function OverviewTab({
  employee,
  onNavigateTab,
  onEdit,
  onPrintCard,
  canEdit,
}: OverviewTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { periods, entries } = usePayrollStore();
  const { deductions } = useDeductionStore();
  const { loans } = useLoanStore();
  const { entries: bulkEntries } = useBulkAttendanceStore();
  const { records: holidayRecords } = useHolidayStore();
  const { records: disciplinaryRecords, hasActiveProcess } = useDisciplinaryStore();

  const metrics = useMemo(() => {
    const payrollRows = periods
      .map((period) => {
        const entry = entries.find(
          (e) => e.payrollPeriodId === period.id && e.employeeId === employee.id
        );
        if (!entry) return null;
        return {
          year: period.year,
          month: period.month,
          netSalary: entry.netSalary,
          status: period.status,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));

    const lastPayroll = payrollRows[0] ?? null;
    const avgNet =
      payrollRows.length > 0
        ? payrollRows.reduce((s, r) => s + r.netSalary, 0) / payrollRows.length
        : 0;

    const openDeductions = deductions
      .filter((d) => d.employeeId === employee.id && !d.isFullyPaid)
      .reduce((s, d) => s + d.remainingAmount, 0);

    const openLoans = loans
      .filter((l) => l.employeeId === employee.id && l.status === 'active')
      .reduce((s, l) => s + l.remainingAmount, 0);

    const openDebt = openDeductions + openLoans;

    const now = new Date();
    const currentBulk = bulkEntries.find(
      (e) =>
        e.employeeId === employee.id &&
        e.year === now.getFullYear() &&
        e.month === now.getMonth() + 1
    );
    const attendanceLabel = currentBulk
      ? `${currentBulk.absenceDays ?? 0} ${ptLang ? 'faltas' : 'absences'}`
      : ptLang
        ? 'Sem registo'
        : 'No record';

    const holidayYear = getCurrentHolidayYear();
    const holidayRecord = holidayRecords.find(
      (r) => r.employeeId === employee.id && r.year === holidayYear
    );
    const { daysEntitled } = calculateHolidayEntitlement(employee, holidayYear);
    const daysRemaining = getDaysRemaining(holidayRecord, daysEntitled);

    const activeDisciplinary = hasActiveProcess(employee.id);
    const disciplinaryCount = disciplinaryRecords.filter((r) => r.employeeId === employee.id).length;

    return {
      lastPayroll,
      avgNet,
      openDebt,
      openDeductions,
      openLoans,
      attendanceLabel,
      daysRemaining,
      holidayYear,
      activeDisciplinary,
      disciplinaryCount,
      payrollCount: payrollRows.length,
    };
  }, [
    periods,
    entries,
    employee,
    deductions,
    loans,
    bulkEntries,
    holidayRecords,
    disciplinaryRecords,
    hasActiveProcess,
    ptLang,
  ]);

  const quickLinks: {
    tab: DossierTab;
    icon: typeof Wallet;
    label: string;
    hint: string;
    warn?: boolean;
  }[] = [
    {
      tab: 'folha',
      icon: Wallet,
      label: ptLang ? 'Folha salarial' : 'Payroll',
      hint:
        metrics.lastPayroll != null
          ? `${monthNames[metrics.lastPayroll.month - 1]} ${metrics.lastPayroll.year}`
          : ptLang
            ? 'Sem folhas'
            : 'No payroll',
    },
    {
      tab: 'attendance',
      icon: Clock,
      label: ptLang ? 'Presenças' : 'Attendance',
      hint: metrics.attendanceLabel,
    },
    {
      tab: 'financeiro',
      icon: Receipt,
      label: ptLang ? 'Financeiro' : 'Financial',
      hint:
        metrics.openDebt > 0
          ? formatAOA(metrics.openDebt)
          : ptLang
            ? 'Sem dívidas'
            : 'No debt',
      warn: metrics.openDebt > 0,
    },
    {
      tab: 'rh',
      icon: Umbrella,
      label: 'RH',
      hint: `${metrics.daysRemaining} ${ptLang ? 'dias férias' : 'holiday days'}`,
    },
    {
      tab: 'auditoria',
      icon: History,
      label: ptLang ? 'Auditoria' : 'Audit',
      hint: ptLang ? 'Histórico de alterações' : 'Change history',
    },
  ];

  const kpis = [
    {
      label: ptLang ? 'Último líquido' : 'Last net pay',
      value: metrics.lastPayroll ? formatAOA(metrics.lastPayroll.netSalary) : '—',
      sub: metrics.lastPayroll
        ? `${monthNames[metrics.lastPayroll.month - 1]} ${metrics.lastPayroll.year}`
        : undefined,
      icon: Wallet,
    },
    {
      label: ptLang ? 'Média líquida' : 'Avg net pay',
      value: metrics.payrollCount > 0 ? formatAOA(metrics.avgNet) : '—',
      sub: metrics.payrollCount > 0 ? `${metrics.payrollCount} ${ptLang ? 'meses' : 'months'}` : undefined,
      icon: TrendingUp,
    },
    {
      label: ptLang ? 'Dívida aberta' : 'Open debt',
      value: metrics.openDebt > 0 ? formatAOA(metrics.openDebt) : '—',
      sub:
        metrics.openDebt > 0
          ? `${ptLang ? 'Ded.' : 'Ded.'} ${formatAOA(metrics.openDeductions)} · ${ptLang ? 'Emp.' : 'Loans'} ${formatAOA(metrics.openLoans)}`
          : ptLang
            ? 'Em dia'
            : 'Clear',
      icon: Banknote,
      warn: metrics.openDebt > 0,
    },
    {
      label: ptLang ? 'Presenças (mês)' : 'Attendance (month)',
      value: metrics.attendanceLabel,
      icon: CalendarDays,
    },
    {
      label: ptLang ? 'Férias restantes' : 'Holiday left',
      value: `${metrics.daysRemaining}`,
      sub: `${ptLang ? 'Ano' : 'Year'} ${metrics.holidayYear}`,
      icon: Umbrella,
    },
    {
      label: ptLang ? 'Disciplina' : 'Disciplinary',
      value: metrics.activeDisciplinary
        ? ptLang
          ? 'Processo activo'
          : 'Active case'
        : metrics.disciplinaryCount > 0
          ? `${metrics.disciplinaryCount} ${ptLang ? 'registos' : 'records'}`
          : ptLang
            ? 'Sem ocorrências'
            : 'None',
      icon: FileWarning,
      warn: metrics.activeDisciplinary,
    },
  ];

  return (
    <div className="space-y-3 p-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              'rounded-lg border border-border/50 bg-card p-2.5 shadow-sm',
              kpi.warn && 'border-warning/40 bg-warning/5'
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <kpi.icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{kpi.label}</span>
            </div>
            <div
              className={cn(
                'mt-1 text-sm font-semibold font-mono truncate',
                kpi.warn ? 'text-warning' : 'text-foreground'
              )}
            >
              {kpi.value}
            </div>
            {kpi.sub && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {(canEdit || onPrintCard) && (
        <div className="flex flex-wrap gap-2">
          {canEdit && onEdit && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {ptLang ? 'Editar dossier' : 'Edit dossier'}
            </Button>
          )}
          {onPrintCard && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onPrintCard}>
              <CreditCard className="h-3.5 w-3.5" />
              {ptLang ? 'Cartão ID' : 'ID card'}
            </Button>
          )}
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {ptLang ? 'Acesso rápido' : 'Quick access'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.tab}
              type="button"
              onClick={() => onNavigateTab(link.tab)}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40',
                link.warn && 'border-warning/30'
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  link.warn ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                )}
              >
                <link.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{link.label}</div>
                <div className="text-xs text-muted-foreground truncate">{link.hint}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {ptLang ? 'Admissão' : 'Hired'}:{' '}
            {employee.hireDate
              ? format(new Date(employee.hireDate), 'dd MMM yyyy', { locale: pt })
              : '—'}
          </span>
          {employee.status === 'active' && (
            <Badge variant="outline" className="text-[10px] h-5 bg-accent/10 text-accent border-accent/20">
              {ptLang ? 'Activo' : 'Active'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
