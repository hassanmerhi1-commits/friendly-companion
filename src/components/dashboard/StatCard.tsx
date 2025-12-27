import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "accent" | "success" | "warning";
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default",
  delay = 0
}: StatCardProps) {
  const gradients = {
    default: "from-slate-500/10 to-slate-600/10",
    accent: "from-blue-500/10 to-indigo-600/10",
    success: "from-emerald-500/10 to-green-600/10", 
    warning: "from-amber-500/10 to-orange-600/10"
  };

  const iconBg = {
    default: "bg-gradient-to-br from-slate-500 to-slate-600",
    accent: "bg-gradient-to-br from-blue-500 to-indigo-600",
    success: "bg-gradient-to-br from-emerald-500 to-green-600",
    warning: "bg-gradient-to-br from-amber-500 to-orange-600"
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border animate-slide-up",
        `bg-gradient-to-br ${gradients[variant]}`
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative gradient orb */}
      <div className={cn(
        "absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-20",
        iconBg[variant]
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>
          <p className="text-3xl font-display font-bold text-foreground tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground/80">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 pt-1">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg",
          iconBg[variant]
        )}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}