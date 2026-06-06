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
  compact?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default",
  delay = 0,
  compact = false,
  className,
}: StatCardProps) {
  const gradients = {
    default: "from-slate-500/10 to-slate-600/10",
    accent: "from-blue-500/10 to-indigo-600/10",
    success: "from-emerald-500/10 to-green-600/10", 
    warning: "from-amber-500/10 to-orange-600/10"
  };

  const iconBg = {
    default: "bg-gradient-to-br from-slate-500 to-slate-600",
    accent: "bg-gradient-to-br from-cyan-600 to-teal-700",
    success: "bg-gradient-to-br from-emerald-500 to-green-600",
    warning: "bg-gradient-to-br from-amber-500 to-orange-600"
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-border animate-slide-up",
        compact ? "h-full rounded-xl p-3" : "rounded-2xl p-6 hover:shadow-lg",
        `bg-gradient-to-br ${gradients[variant]}`,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {!compact && (
        <div className={cn(
          "absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-20",
          iconBg[variant]
        )} />
      )}
      
      <div className={cn("relative flex h-full gap-2", compact ? "items-center justify-between" : "items-start justify-between")}>
        <div className={cn(compact ? "flex min-w-0 flex-1 flex-col justify-center space-y-0.5" : "space-y-2")}>
          <p className={cn(
            "font-medium text-muted-foreground tracking-wide uppercase",
            compact ? "text-[10px] leading-tight" : "text-sm"
          )}>
            {title}
          </p>
          <p className={cn(
            "font-display font-bold text-foreground tracking-tight",
            compact ? "text-base leading-tight" : "text-3xl"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-muted-foreground/80",
              compact ? "text-[10px] leading-tight line-clamp-2" : "text-sm"
            )}>{subtitle}</p>
          )}
          {trend && !compact && (
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
          "flex shrink-0 items-center justify-center rounded-xl text-white shadow-md",
          compact ? "h-9 w-9" : "h-14 w-14 rounded-2xl shadow-lg",
          iconBg[variant]
        )}>
          <Icon className={compact ? "h-4 w-4" : "h-7 w-7"} />
        </div>
      </div>
    </div>
  );
}