import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Calculator, FileDown, Send, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

const Payroll = () => {
  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Folha Salarial
          </h1>
          <p className="text-muted-foreground mt-1">
            Dezembro 2025 • Período de pagamento: 1-31 Dez
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="accent">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Folha
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Salários Brutos"
          value="15.4M Kz"
          icon={DollarSign}
          variant="accent"
          delay={0}
        />
        <StatCard
          title="Deduções Totais"
          value="3.5M Kz"
          subtitle="IRT + INSS"
          icon={TrendingUp}
          delay={50}
        />
        <StatCard
          title="Salários Líquidos"
          value="11.9M Kz"
          icon={CheckCircle}
          delay={100}
        />
        <StatCard
          title="A Processar"
          value="5"
          subtitle="Pendentes de aprovação"
          icon={Clock}
          delay={150}
        />
      </div>

      {/* Payroll Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown */}
        <div className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="font-display text-lg font-semibold text-foreground mb-6">
            Decomposição da Folha
          </h2>
          <div className="space-y-4">
            {[
              { label: "Salários Base", value: "12.800.000 Kz", percentage: 83 },
              { label: "Subsídio de Alimentação", value: "1.440.000 Kz", percentage: 9 },
              { label: "Subsídio de Transporte", value: "720.000 Kz", percentage: 5 },
              { label: "Horas Extra", value: "460.000 Kz", percentage: 3 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deductions */}
        <div className="stat-card animate-slide-up" style={{ animationDelay: "250ms" }}>
          <h2 className="font-display text-lg font-semibold text-foreground mb-6">
            Deduções Obrigatórias
          </h2>
          <div className="space-y-4">
            {[
              { label: "IRT (Imposto sobre Rendimento)", value: "2.312.000 Kz", rate: "15%" },
              { label: "INSS (Segurança Social)", value: "1.234.000 Kz", rate: "8%" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">Taxa: {item.rate}</p>
                </div>
                <span className="font-bold text-lg text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Total de Deduções</span>
              <span className="font-bold text-xl text-destructive">3.546.000 Kz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-8 stat-card animate-slide-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Pronto para processar?</h3>
            <p className="text-sm text-muted-foreground">
              Revise os valores e aprove o pagamento da folha salarial
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              Rever Detalhes
            </Button>
            <Button variant="accent" size="lg">
              <Send className="h-4 w-4 mr-2" />
              Aprovar e Processar
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Payroll;
