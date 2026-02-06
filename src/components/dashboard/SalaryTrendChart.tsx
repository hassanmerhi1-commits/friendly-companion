import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { usePayrollStore } from '@/stores/payroll-store';
import { formatAOA } from '@/lib/angola-labor-law';

export function SalaryTrendChart() {
  const { language } = useLanguage();
  const { periods, entries } = usePayrollStore();
  
  const monthNames = language === 'pt'
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const data = useMemo(() => {
    // Get last 6 periods
    const sortedPeriods = [...periods]
      .filter(p => p.status === 'calculated' || p.status === 'approved')
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .slice(-6);
    
    return sortedPeriods.map(period => {
      const periodEntries = entries.filter(e => e.payrollPeriodId === period.id);
      const grossTotal = periodEntries.reduce((sum, e) => sum + e.grossSalary, 0);
      const netTotal = periodEntries.reduce((sum, e) => sum + e.netSalary, 0);
      const employeeCount = periodEntries.length;
      
      return {
        name: `${monthNames[period.month - 1]} ${period.year}`,
        gross: grossTotal,
        net: netTotal,
        count: employeeCount,
      };
    });
  }, [periods, entries, monthNames]);
  
  const t = {
    title: language === 'pt' ? 'Tendência Salarial (6 meses)' : 'Salary Trend (6 months)',
    gross: language === 'pt' ? 'Bruto' : 'Gross',
    net: language === 'pt' ? 'Líquido' : 'Net',
    noData: language === 'pt' ? 'Processe folhas para ver tendências' : 'Process payroll to see trends',
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          {t.noData}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatAOA(value), 
                  name === 'gross' ? t.gross : t.net
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }}
              />
              <Area
                type="monotone"
                dataKey="gross"
                name="gross"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorGross)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="net"
                name="net"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorNet)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">{t.gross}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">{t.net}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
