import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { formatAOA } from '@/lib/angola-labor-law';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function SalaryDistributionChart() {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  
  const data = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const departmentTotals: Record<string, number> = {};
    
    activeEmployees.forEach(emp => {
      const dept = emp.department || (language === 'pt' ? 'Sem Departamento' : 'No Department');
      const totalComp = emp.baseSalary + (emp.mealAllowance || 0) + (emp.transportAllowance || 0) + 
                        (emp.familyAllowance || 0) + (emp.monthlyBonus || 0);
      departmentTotals[dept] = (departmentTotals[dept] || 0) + totalComp;
    });
    
    return Object.entries(departmentTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees, language]);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const t = {
    title: language === 'pt' ? 'Distribuição por Departamento' : 'Distribution by Department',
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatAOA(value), language === 'pt' ? 'Valor' : 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatAOA(total)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
