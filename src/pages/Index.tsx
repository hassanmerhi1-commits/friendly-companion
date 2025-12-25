import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PayrollSummary } from "@/components/dashboard/PayrollSummary";
import { Users, DollarSign, Clock, CheckCircle } from "lucide-react";

const Index = () => {
  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo da folha salarial da sua empresa
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Funcionários"
          value="48"
          subtitle="3 novos este mês"
          icon={Users}
          trend={{ value: 6.7, isPositive: true }}
          delay={0}
        />
        <StatCard
          title="Folha Total"
          value="15.4M Kz"
          subtitle="Dezembro 2025"
          icon={DollarSign}
          variant="accent"
          trend={{ value: 3.2, isPositive: true }}
          delay={50}
        />
        <StatCard
          title="Pendentes"
          value="5"
          subtitle="Aguardando aprovação"
          icon={Clock}
          delay={100}
        />
        <StatCard
          title="Pagos"
          value="43"
          subtitle="89.6% concluído"
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
