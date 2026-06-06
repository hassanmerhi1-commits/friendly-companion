import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardDateTime } from "@/components/dashboard/DashboardDateTime";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { Users, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { getTotalPaidToEmployee } from "@/lib/payroll-payout";
import { useEffect, useMemo } from "react";
import { useAlertsStore } from "@/stores/alerts-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useDisciplinaryStore } from "@/stores/disciplinary-store";
import { useAbsenceStore } from "@/stores/absence-store";
import { useLoanStore } from "@/stores/loan-store";
import { useDeductionStore } from "@/stores/deduction-store";
import { useBulkAttendanceStore } from "@/stores/bulk-attendance-store";

const Index = () => {
  const { t, language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { hasPermission } = useAuthStore();
  const { alerts, generateAlerts } = useAlertsStore();
  const holidayRecords = useHolidayStore((s) => s.records);
  const disciplinaryRecords = useDisciplinaryStore((s) => s.records);
  const absences = useAbsenceStore((s) => s.absences);
  const loans = useLoanStore((s) => s.loans);
  const deductions = useDeductionStore((s) => s.deductions);
  const bulkEntries = useBulkAttendanceStore((s) => s.entries);

  const canViewEmployees = hasPermission('employees.view');
  const canViewPayroll = hasPermission('payroll.view');
  const canViewHR = hasPermission('hr.view');

  const showAlertsPanel = canViewHR || canViewPayroll || canViewEmployees;

  const activeEmployees = canViewEmployees ? employees.filter((emp) => emp.status === 'active') : [];
  const regularActiveEmployees = activeEmployees.filter((emp) => emp.contractType !== 'colaborador');

  const currentPeriod = useMemo(() => {
    if (!canViewPayroll) return null;
    const now = new Date();
    const thisMonth = periods.find((p) => p.year === now.getFullYear() && p.month === now.getMonth() + 1);
    if (thisMonth) return thisMonth;
    return (
      periods.find((p) => p.status === 'calculated' || p.status === 'draft' || p.status === 'approved') ||
      periods[periods.length - 1] ||
      null
    );
  }, [canViewPayroll, periods]);

  const regularEmployeeIdSet = useMemo(
    () => new Set(regularActiveEmployees.map((e) => e.id)),
    [regularActiveEmployees]
  );

  const currentEntries = useMemo(() => {
    if (!canViewPayroll || !currentPeriod) return [];
    return entries.filter(
      (e) => e.payrollPeriodId === currentPeriod.id && regularEmployeeIdSet.has(e.employeeId)
    );
  }, [canViewPayroll, currentPeriod, entries, regularEmployeeIdSet]);

  const folhaPayoutTotal = useMemo(
    () => currentEntries.reduce((sum, e) => sum + getTotalPaidToEmployee(e), 0),
    [currentEntries]
  );

  useEffect(() => {
    if (showAlertsPanel) {
      generateAlerts(language);
    }
  }, [
    showAlertsPanel,
    language,
    generateAlerts,
    employees,
    holidayRecords,
    disciplinaryRecords,
    periods,
    absences,
    loans,
    deductions,
    bulkEntries,
  ]);

  const alertCount = alerts.filter((a) => !a.isDismissed).length;
  const criticalAlertCount = alerts.filter(
    (a) => !a.isDismissed && a.severity === 'critical'
  ).length;

  const pendingCount = useMemo(() => {
    if (canViewPayroll && currentPeriod && currentPeriod.status !== 'paid') {
      return 1;
    }
    return 0;
  }, [canViewPayroll, currentPeriod]);

  const monthNames =
    language === 'pt'
      ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const periodMonthLabel = currentPeriod ? monthNames[currentPeriod.month - 1] : '-';

  const pendingSubtitle = useMemo(() => {
    if (!canViewPayroll || !currentPeriod) return '-';
    if (currentPeriod.status === 'paid') {
      return language === 'pt' ? 'Folha fechada' : 'Payroll closed';
    }
    if (currentPeriod.status === 'approved') {
      return language === 'pt' ? `${periodMonthLabel} · aguarda pagamento` : `${periodMonthLabel} · awaiting payment`;
    }
    if (currentPeriod.status === 'calculated') {
      return language === 'pt' ? `${periodMonthLabel} · aguarda aprovação` : `${periodMonthLabel} · awaiting approval`;
    }
    return language === 'pt' ? `${periodMonthLabel} · em preparação` : `${periodMonthLabel} · in progress`;
  }, [canViewPayroll, currentPeriod, language, periodMonthLabel]);

  const alertSubtitle =
    alertCount === 0
      ? language === 'pt'
        ? 'Sem alertas'
        : 'No alerts'
      : criticalAlertCount > 0
        ? language === 'pt'
          ? `${criticalAlertCount} crítico(s) · ${alertCount} total`
          : `${criticalAlertCount} critical · ${alertCount} total`
        : language === 'pt'
          ? `${alertCount} notificação(ões)`
          : `${alertCount} notification(s)`;

  const kpiCards = [
    canViewEmployees && {
      key: 'employees',
      title: t.dashboard.totalEmployees,
      value: String(activeEmployees.length),
      subtitle: `${employees.length} ${language === 'pt' ? 'registados' : 'registered'}`,
      icon: Users,
      variant: 'default' as const,
      delay: 0,
    },
    canViewPayroll && {
      key: 'payroll',
      title: language === 'pt' ? 'Líquido folha' : 'Payroll net',
      value: formatAOA(folhaPayoutTotal),
      subtitle: currentPeriod ? periodMonthLabel : '-',
      icon: DollarSign,
      variant: 'accent' as const,
      delay: 50,
    },
    canViewPayroll && {
      key: 'pending',
      title: language === 'pt' ? 'Pendências' : 'Pending',
      value: String(pendingCount),
      subtitle: pendingSubtitle,
      icon: Clock,
      variant: pendingCount > 0 ? ('warning' as const) : ('default' as const),
      delay: 100,
    },
    canViewEmployees && {
      key: 'alerts',
      title: language === 'pt' ? 'Alertas' : 'Alerts',
      value: String(alertCount),
      subtitle: alertSubtitle,
      icon: AlertTriangle,
      variant: alertCount > 0 ? ('warning' as const) : ('default' as const),
      delay: 150,
    },
  ].filter(Boolean) as {
    key: string;
    title: string;
    value: string;
    subtitle: string;
    icon: typeof Users;
    variant: 'default' | 'accent' | 'success' | 'warning';
    delay: number;
  }[];

  const kpiCols =
    kpiCards.length <= 1
      ? 'grid-cols-1'
      : kpiCards.length === 2
        ? 'grid-cols-2'
        : kpiCards.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4';

  return (
    <TopNavLayout scrollable={false}>
      <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
        <DashboardHero
          compact
          period={currentPeriod}
          activeEmployeeCount={regularActiveEmployees.length}
          folhaPayoutTotal={folhaPayoutTotal}
          showPayroll={canViewPayroll}
          showEmployees={canViewEmployees}
        />

        {kpiCards.length > 0 && (
          <div className={`shrink-0 grid ${kpiCols} items-stretch gap-3`}>
            {kpiCards.map((card) => (
              <StatCard
                key={card.key}
                compact
                className="min-h-[5.5rem]"
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                variant={card.variant}
                delay={card.delay}
              />
            ))}
          </div>
        )}

        <div
          className={`flex-1 min-h-0 gap-3 overflow-hidden ${
            showAlertsPanel ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex flex-col'
          }`}
        >
          <div className="min-h-0 flex flex-col rounded-xl border border-border/50 bg-card p-4 shadow-sm overflow-y-auto">
            <QuickActions compact />
            <DashboardDateTime />
          </div>
          {showAlertsPanel && (
            <div className="min-h-0 overflow-hidden">
              <AlertsPanel compact className="h-full" />
            </div>
          )}
        </div>
      </div>
    </TopNavLayout>
  );
};

export default Index;
