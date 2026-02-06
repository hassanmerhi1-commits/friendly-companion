import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}

function MetricCard({ label, value, change, prefix = '', color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
  };
  
  return (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-br border",
      colorClasses[color]
    )}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{prefix}{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {change > 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : change < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={cn(
            "text-xs font-medium",
            change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function KPIMetricsGrid() {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  
  const metrics = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const totalHeadcount = activeEmployees.length;
    
    // Calculate average salary
    const totalSalary = activeEmployees.reduce((sum, e) => {
      return sum + e.baseSalary + (e.mealAllowance || 0) + (e.transportAllowance || 0) +
             (e.familyAllowance || 0) + (e.monthlyBonus || 0);
    }, 0);
    const avgSalary = totalHeadcount > 0 ? totalSalary / totalHeadcount : 0;
    
    // Get current and previous period for comparison
    const sortedPeriods = [...periods]
      .filter(p => p.status === 'calculated' || p.status === 'approved')
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
    
    const currentPeriod = sortedPeriods[0];
    const previousPeriod = sortedPeriods[1];
    
    const currentEntries = currentPeriod 
      ? entries.filter(e => e.payrollPeriodId === currentPeriod.id)
      : [];
    const previousEntries = previousPeriod
      ? entries.filter(e => e.payrollPeriodId === previousPeriod.id)
      : [];
    
    const currentPayroll = currentEntries.reduce((sum, e) => sum + e.netSalary, 0);
    const previousPayroll = previousEntries.reduce((sum, e) => sum + e.netSalary, 0);
    
    const payrollChange = previousPayroll > 0 
      ? ((currentPayroll - previousPayroll) / previousPayroll) * 100 
      : 0;
    
    // Cost per employee
    const costPerEmployee = totalHeadcount > 0 ? currentPayroll / totalHeadcount : 0;
    
    // Total deductions this period
    const totalDeductions = currentEntries.reduce((sum, e) => sum + e.irt + e.inssEmployee, 0);
    
    return {
      headcount: totalHeadcount,
      avgSalary,
      currentPayroll,
      payrollChange,
      costPerEmployee,
      totalDeductions,
    };
  }, [employees, periods, entries]);
  
  const t = {
    headcount: language === 'pt' ? 'Funcionários Ativos' : 'Active Employees',
    avgSalary: language === 'pt' ? 'Salário Médio' : 'Average Salary',
    monthlyPayroll: language === 'pt' ? 'Folha Mensal' : 'Monthly Payroll',
    costPerEmployee: language === 'pt' ? 'Custo por Funcionário' : 'Cost per Employee',
    deductions: language === 'pt' ? 'Total Descontos' : 'Total Deductions',
    vsLastMonth: language === 'pt' ? 'vs mês anterior' : 'vs last month',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard
            label={t.headcount}
            value={metrics.headcount}
            color="blue"
          />
          <MetricCard
            label={t.avgSalary}
            value={formatAOA(metrics.avgSalary)}
            color="green"
          />
          <MetricCard
            label={t.monthlyPayroll}
            value={formatAOA(metrics.currentPayroll)}
            change={metrics.payrollChange}
            color="amber"
          />
          <MetricCard
            label={t.costPerEmployee}
            value={formatAOA(metrics.costPerEmployee)}
            color="blue"
          />
          <MetricCard
            label={t.deductions}
            value={formatAOA(metrics.totalDeductions)}
            color="red"
          />
        </div>
      </CardContent>
    </Card>
  );
}
