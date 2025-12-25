import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp, Users, DollarSign } from "lucide-react";

const reports = [
  {
    id: "1",
    name: "Relatório Mensal de Salários",
    description: "Resumo completo da folha salarial do mês",
    icon: DollarSign,
    lastGenerated: "25 Dez 2025",
    type: "PDF"
  },
  {
    id: "2",
    name: "Relatório de Funcionários",
    description: "Lista detalhada de todos os funcionários",
    icon: Users,
    lastGenerated: "24 Dez 2025",
    type: "Excel"
  },
  {
    id: "3",
    name: "Análise de Custos",
    description: "Análise de custos laborais por departamento",
    icon: TrendingUp,
    lastGenerated: "20 Dez 2025",
    type: "PDF"
  },
  {
    id: "4",
    name: "Mapa de Férias",
    description: "Calendário de férias dos funcionários",
    icon: Calendar,
    lastGenerated: "15 Dez 2025",
    type: "Excel"
  },
];

const Reports = () => {
  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerar e descarregar relatórios da folha salarial
          </p>
        </div>
        <Button variant="accent">
          <FileText className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div 
            key={report.id}
            className="stat-card animate-slide-up hover:shadow-lg cursor-pointer group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                    {report.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Última geração: {report.lastGenerated} • {report.type}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Estatísticas Rápidas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Relatórios Gerados", value: "24", period: "Este mês" },
            { label: "Downloads", value: "156", period: "Este mês" },
            { label: "Média de Geração", value: "2.3s", period: "Por relatório" },
            { label: "Formatos Disponíveis", value: "3", period: "PDF, Excel, CSV" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.period}</p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
