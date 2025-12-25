import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryItem {
  label: string;
  value: string;
  change?: number;
}

const summaryItems: SummaryItem[] = [
  { label: "Salários Brutos", value: "15.420.000 Kz", change: 3.2 },
  { label: "Impostos (IRT)", value: "2.312.000 Kz", change: 2.8 },
  { label: "Segurança Social", value: "1.234.000 Kz", change: 0 },
  { label: "Salários Líquidos", value: "11.874.000 Kz", change: 4.1 },
];

export function PayrollSummary() {
  return (
    <div className="stat-card animate-slide-up" style={{ animationDelay: "250ms" }}>
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">
        Resumo do Mês
      </h2>
      <div className="space-y-4">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{item.value}</span>
              {item.change !== undefined && (
                <span className="flex items-center text-xs">
                  {item.change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : item.change < 0 ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Dezembro 2025 • Próximo pagamento: 27 Dez
        </p>
      </div>
    </div>
  );
}
