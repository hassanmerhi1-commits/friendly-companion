import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function HeadcountChart() {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  
  const data = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const departmentCounts: Record<string, number> = {};
    
    activeEmployees.forEach(emp => {
      const dept = emp.department || (language === 'pt' ? 'Sem Departamento' : 'No Department');
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    return Object.entries(departmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 departments
  }, [employees, language]);
  
  const t = {
    title: language === 'pt' ? 'Funcionários por Departamento' : 'Employees by Department',
    employees: language === 'pt' ? 'Funcionários' : 'Employees',
    noData: language === 'pt' ? 'Sem dados' : 'No data',
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
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11 }} 
                width={100}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => [value, t.employees]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
