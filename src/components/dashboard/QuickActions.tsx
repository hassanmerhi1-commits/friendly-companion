import { UserPlus, Calculator, FileDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

export function QuickActions() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const actions = [
    {
      label: language === 'pt' ? "Adicionar Funcionário" : "Add Employee",
      icon: UserPlus,
      variant: "default" as const,
      onClick: () => navigate('/employees'),
      gradient: "from-blue-500 to-blue-600"
    },
    {
      label: language === 'pt' ? "Calcular Folha" : "Calculate Payroll",
      icon: Calculator,
      variant: "default" as const,
      onClick: () => navigate('/payroll'),
      gradient: "from-emerald-500 to-emerald-600"
    },
    {
      label: language === 'pt' ? "Ver Relatórios" : "View Reports",
      icon: BarChart3,
      variant: "default" as const,
      onClick: () => navigate('/reports'),
      gradient: "from-violet-500 to-violet-600"
    },
    {
      label: language === 'pt' ? "Exportar Dados" : "Export Data",
      icon: FileDown,
      variant: "default" as const,
      onClick: () => navigate('/reports'),
      gradient: "from-amber-500 to-amber-600"
    }
  ];

  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">
        {language === 'pt' ? 'Ações Rápidas' : 'Quick Actions'}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            className={`h-auto py-5 flex-col gap-3 bg-gradient-to-br ${action.gradient} hover:opacity-90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}