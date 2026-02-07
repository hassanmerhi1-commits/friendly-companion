import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Wallet } from 'lucide-react';
import { usePayrollStore } from '@/stores/payroll-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';

interface PayrollHistoryTabProps {
  employeeId: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function PayrollHistoryTab({ employeeId }: PayrollHistoryTabProps) {
  const { language } = useLanguage();
  const { periods, entries } = usePayrollStore();

  // Get all payroll entries for this employee across all periods
  const employeePayrollHistory = useMemo(() => {
    const history: Array<{
      periodId: string;
      year: number;
      month: number;
      status: string;
      grossSalary: number;
      netSalary: number;
      totalDeductions: number;
      irt: number;
      inssEmployee: number;
      approvedAt?: string;
    }> = [];

    periods.forEach((period) => {
      const employeeEntry = entries.find(
        (e) => e.payrollPeriodId === period.id && e.employeeId === employeeId
      );

      if (employeeEntry) {
        history.push({
          periodId: period.id,
          year: period.year,
          month: period.month,
          status: period.status,
          grossSalary: employeeEntry.grossSalary,
          netSalary: employeeEntry.netSalary,
          totalDeductions: employeeEntry.totalDeductions,
          irt: employeeEntry.irt,
          inssEmployee: employeeEntry.inssEmployee,
          approvedAt: period.approvedAt,
        });
      }
    });

    // Sort by date descending (most recent first)
    return history.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [periods, entries, employeeId]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (employeePayrollHistory.length === 0) {
      return { totalGross: 0, totalNet: 0, avgNet: 0, months: 0 };
    }

    const totalGross = employeePayrollHistory.reduce((sum, h) => sum + h.grossSalary, 0);
    const totalNet = employeePayrollHistory.reduce((sum, h) => sum + h.netSalary, 0);

    return {
      totalGross,
      totalNet,
      avgNet: totalNet / employeePayrollHistory.length,
      months: employeePayrollHistory.length,
    };
  }, [employeePayrollHistory]);

  // Calculate trend (comparing last 2 months if available)
  const trend = useMemo(() => {
    if (employeePayrollHistory.length < 2) return null;

    const [current, previous] = employeePayrollHistory;
    const diff = current.netSalary - previous.netSalary;
    const percent = previous.netSalary > 0 ? (diff / previous.netSalary) * 100 : 0;

    return { diff, percent };
  }, [employeePayrollHistory]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      calculated: 'bg-primary/10 text-primary border-primary/20',
      approved: 'bg-accent/10 text-accent border-accent/20',
      paid: 'bg-primary/10 text-primary border-primary/20',
    };
    const labels: Record<string, string> = {
      draft: language === 'pt' ? 'Rascunho' : 'Draft',
      calculated: language === 'pt' ? 'Calculado' : 'Calculated',
      approved: language === 'pt' ? 'Aprovado' : 'Approved',
      paid: language === 'pt' ? 'Pago' : 'Paid',
    };
    return (
      <Badge variant="outline" className={colors[status] || colors.draft}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (employeePayrollHistory.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-4 opacity-50" />
          <p>{language === 'pt' ? 'Nenhum histórico de folha salarial' : 'No payroll history'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total Bruto' : 'Total Gross'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatAOA(stats.totalGross)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total Líquido' : 'Total Net'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatAOA(stats.totalNet)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Média Mensal' : 'Monthly Average'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatAOA(stats.avgNet)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Tendência' : 'Trend'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend ? (
              <div className="flex items-center gap-2">
                {trend.diff > 0 ? (
                  <TrendingUp className="h-5 w-5 text-accent" />
                ) : trend.diff < 0 ? (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={`text-lg font-bold ${
                    trend.diff > 0
                      ? 'text-accent'
                      : trend.diff < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {trend.percent >= 0 ? '+' : ''}
                  {trend.percent.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'pt' ? 'Histórico Detalhado' : 'Detailed History'}
          </CardTitle>
          <CardDescription>
            {language === 'pt'
              ? `${stats.months} meses de histórico`
              : `${stats.months} months of history`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'pt' ? 'Período' : 'Period'}</TableHead>
                <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                <TableHead className="text-right">
                  {language === 'pt' ? 'Bruto' : 'Gross'}
                </TableHead>
                <TableHead className="text-right">
                  {language === 'pt' ? 'Deduções' : 'Deductions'}
                </TableHead>
                <TableHead className="text-right">
                  {language === 'pt' ? 'Líquido' : 'Net'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeePayrollHistory.map((record) => (
                <TableRow key={record.periodId}>
                  <TableCell className="font-medium">
                    {monthNames[record.month - 1]} {record.year}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAOA(record.grossSalary)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -{formatAOA(record.totalDeductions)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">
                    {formatAOA(record.netSalary)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
