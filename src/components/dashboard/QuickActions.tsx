import { UserPlus, Calculator, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    label: "Adicionar Funcionário",
    icon: UserPlus,
    variant: "accent" as const
  },
  {
    label: "Calcular Folha",
    icon: Calculator,
    variant: "outline" as const
  },
  {
    label: "Exportar Relatório",
    icon: FileDown,
    variant: "outline" as const
  },
  {
    label: "Enviar Recibos",
    icon: Send,
    variant: "outline" as const
  }
];

export function QuickActions() {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">
        Ações Rápidas
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto py-4 flex-col gap-2"
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
