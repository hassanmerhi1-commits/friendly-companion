import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PayrollSummary } from "@/components/dashboard/PayrollSummary";
import { Users, DollarSign, Clock, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { formatAOA } from "@/lib/angola-labor-law";

const Index = () => {
  const { t } = useLanguage();
  const { employees, getActiveEmployees } = useEmployeeStore();
  const { getCurrentPeriod, getEntriesForPeriod } = usePayrollStore();

  const activeEmployees = getActiveEmployees();
  const currentPeriod = getCurrentPeriod();
  const currentEntries = currentPeriod ? getEntriesForPeriod(currentPeriod.id) : [];
  
  const totalPayroll = currentEntries.reduce((sum, e) => sum + e.netSalary, 0);
  const paidEmployees = currentEntries.filter(e => e.status === 'paid').length;

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground">
          {t.dashboard.welcome}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.summary}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t.dashboard.totalEmployees}
          value={String(employees.length)}
          subtitle={`${activeEmployees.length} ${t.common.active}`}
          icon={Users}
          delay={0}
        />
        <StatCard
          title={t.dashboard.totalPayroll}
          value={formatAOA(totalPayroll)}
          subtitle={currentPeriod ? `${t.months.december} ${new Date().getFullYear()}` : '-'}
          icon={DollarSign}
          variant="accent"
          delay={50}
        />
        <StatCard
          title={t.dashboard.pendingApproval}
          value={String(currentEntries.filter(e => e.status !== 'paid').length)}
          subtitle={t.dashboard.awaitingApproval}
          icon={Clock}
          delay={100}
        />
        <StatCard
          title={t.dashboard.paidEmployees}
          value={String(paidEmployees)}
          subtitle={currentEntries.length > 0 ? `${((paidEmployees / currentEntries.length) * 100).toFixed(1)}% ${t.dashboard.completed}` : '-'}
          icon={CheckCircle}
          delay={150}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <EmployeeTable />
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          <QuickActions />
          <PayrollSummary />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
