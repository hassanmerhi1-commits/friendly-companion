import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DailyWallpaper } from "@/components/dashboard/DailyWallpaper";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SalaryDistributionChart } from "@/components/dashboard/SalaryDistributionChart";
import { SalaryTrendChart } from "@/components/dashboard/SalaryTrendChart";
import { HeadcountChart } from "@/components/dashboard/HeadcountChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AuditLogPanel } from "@/components/dashboard/AuditLogPanel";
import { KPIMetricsGrid } from "@/components/dashboard/KPIMetricsGrid";
import { Users, DollarSign, Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { useMemo } from "react";

const Index = () => {
  const { t, language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();

  // Derive from subscribed state - ensures re-render on changes
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const currentPeriod = periods.find(p => p.status === 'calculated' || p.status === 'draft') || periods[periods.length - 1];
  const employeeIdSet = new Set(employees.map(e => e.id));
  const currentEntries = currentPeriod ? entries.filter(e => e.payrollPeriodId === currentPeriod.id && employeeIdSet.has(e.employeeId)) : [];
  const totalPayroll = currentEntries.reduce((sum, e) => sum + e.netSalary, 0);
  const paidEmployees = currentEntries.filter(e => e.status === 'paid').length;
  const pendingCount = currentEntries.filter(e => e.status !== 'paid').length;

  // Contract expiry warnings
  const contractWarnings = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return activeEmployees.filter(emp => {
      if (!emp.contractEndDate) return false;
      const endDate = new Date(emp.contractEndDate);
      return endDate <= thirtyDaysFromNow && endDate >= new Date();
    }).length;
  }, [activeEmployees]);

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return activeEmployees.filter(emp => {
      if (!emp.dateOfBirth) return false;
      const birth = new Date(emp.dateOfBirth);
      const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      return thisYearBirthday >= now && thisYearBirthday <= sevenDaysFromNow;
    }).length;
  }, [activeEmployees]);

  const monthNames = language === 'pt'
    ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  const currentMonth = monthNames[new Date().getMonth()];

  return (
    <TopNavLayout>
      {/* Modern Header with gradient accent */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/60" />
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              {t.dashboard.welcome}
            </h1>
            <p className="text-muted-foreground mt-0.5">
              {t.dashboard.summary} • {currentMonth} {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="mb-6">
        <KPIMetricsGrid />
      </div>

      {/* Stats Grid with modern cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          title={t.dashboard.totalEmployees}
          value={String(employees.length)}
          subtitle={`${activeEmployees.length} ${t.common.active}`}
          icon={Users}
          variant="default"
          delay={0}
        />
        <StatCard
          title={t.dashboard.totalPayroll}
          value={formatAOA(totalPayroll)}
          subtitle={currentPeriod ? currentMonth : '-'}
          icon={DollarSign}
          variant="accent"
          delay={50}
        />
        <StatCard
          title={t.dashboard.pendingApproval}
          value={String(pendingCount)}
          subtitle={t.dashboard.awaitingApproval}
          icon={Clock}
          variant="warning"
          delay={100}
        />
        <StatCard
          title={t.dashboard.paidEmployees}
          value={String(paidEmployees)}
          subtitle={currentEntries.length > 0 ? `${((paidEmployees / currentEntries.length) * 100).toFixed(0)}% ${t.dashboard.completed}` : '-'}
          icon={CheckCircle}
          variant="success"
          delay={150}
        />
        <StatCard
          title={language === 'pt' ? 'Contratos a Expirar' : 'Expiring Contracts'}
          value={String(contractWarnings)}
          subtitle={language === 'pt' ? 'Próximos 30 dias' : 'Next 30 days'}
          icon={AlertTriangle}
          variant={contractWarnings > 0 ? "warning" : "default"}
          delay={200}
        />
        <StatCard
          title={language === 'pt' ? 'Aniversários' : 'Birthdays'}
          value={String(upcomingBirthdays)}
          subtitle={language === 'pt' ? 'Esta semana' : 'This week'}
          icon={Calendar}
          variant="default"
          delay={250}
        />
      </div>

      {/* Quick Actions - HORIZONTAL AT TOP */}
      <div className="mb-6">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <QuickActions />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <SalaryTrendChart />
        <SalaryDistributionChart />
        <HeadcountChart />
      </div>

      {/* Alerts and Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AlertsPanel />
        <AuditLogPanel />
      </div>

      {/* Daily Wallpaper - FULL WIDTH */}
      <div>
        <DailyWallpaper />
      </div>
    </TopNavLayout>
  );
};

export default Index;
