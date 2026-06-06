import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DossierKpi {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  icon?: ElementType;
}

export function DossierKpiStrip({ kpis }: { kpis: DossierKpi[] }) {
  if (kpis.length === 0) return null;

  return (
    <div
      className={cn(
        'grid gap-2',
        kpis.length <= 4
          ? 'grid-cols-2 sm:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      )}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            'rounded-lg border border-border/50 bg-card p-2.5 shadow-sm',
            kpi.warn && 'border-warning/40 bg-warning/5'
          )}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {kpi.icon && <kpi.icon className="h-3 w-3 shrink-0" />}
            <span className="truncate">{kpi.label}</span>
          </div>
          <div
            className={cn(
              'mt-1 text-sm font-semibold font-mono truncate',
              kpi.warn ? 'text-warning' : 'text-foreground'
            )}
          >
            {kpi.value}
          </div>
          {kpi.sub && (
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{kpi.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface DossierTablePanelProps {
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DossierTablePanel({
  title,
  subtitle,
  toolbar,
  children,
  className,
}: DossierTablePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm',
        className
      )}
    >
      {(title || toolbar) && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-muted/20">
          <div className="min-w-0">
            {title && <div className="text-xs font-medium text-foreground">{title}</div>}
            {subtitle && (
              <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
            )}
          </div>
          {toolbar && <div className="flex flex-wrap items-center gap-1.5 shrink-0">{toolbar}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">{children}</div>
    </div>
  );
}

interface DossierEmptyStateProps {
  icon: ElementType;
  message: string;
}

export function DossierEmptyState({ icon: Icon, message }: DossierEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Icon className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface DossierTabShellProps {
  kpis?: DossierKpi[];
  alert?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DossierTabShell({ kpis, alert, children, className }: DossierTabShellProps) {
  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 overflow-hidden gap-2 p-0.5',
        className
      )}
    >
      {kpis && kpis.length > 0 && (
        <div className="shrink-0">
          <DossierKpiStrip kpis={kpis} />
        </div>
      )}
      {alert && <div className="shrink-0">{alert}</div>}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
