import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import { Progress } from '@/components/ui/progress';
import { Banknote, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useLoanStore, Loan, LoanStatus } from '@/stores/loan-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';

interface LoansTabProps {
  employeeId: string;
}

const statusColors: Record<LoanStatus, string> = {
  active: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paid: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<LoanStatus, { pt: string; en: string }> = {
  active: { pt: 'Activo', en: 'Active' },
  paid: { pt: 'Pago', en: 'Paid' },
  cancelled: { pt: 'Cancelado', en: 'Cancelled' },
};

export function LoansTab({ employeeId }: LoansTabProps) {
  const { language } = useLanguage();
  const { loans, loadLoans } = useLoanStore();

  // Force reload loans on mount to get latest data
  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  // Filter loans for this employee
  const employeeLoans = useMemo(() => {
    return loans
      .filter((l) => l.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans, employeeId]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeLoans = employeeLoans.filter((l) => l.status === 'active');
    const totalActive = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const monthlyDeduction = activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0);
    const totalPaid = employeeLoans
      .filter((l) => l.status === 'paid')
      .reduce((sum, l) => sum + l.amount, 0);

    return {
      activeCount: activeLoans.length,
      totalActive,
      monthlyDeduction,
      totalPaid,
      totalLoans: employeeLoans.length,
    };
  }, [employeeLoans]);

  const getTypeLabel = (type: Loan['type']) => {
    return type === 'advance'
      ? language === 'pt'
        ? 'Adiantamento'
        : 'Advance'
      : language === 'pt'
      ? 'Empréstimo'
      : 'Loan';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Empréstimos Activos' : 'Active Loans'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.activeCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Saldo em Dívida' : 'Outstanding Balance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              {formatAOA(stats.totalActive)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Dedução Mensal' : 'Monthly Deduction'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-orange-600">
              {formatAOA(stats.monthlyDeduction)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Total Já Pago' : 'Total Paid'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold font-mono text-green-600">
                {formatAOA(stats.totalPaid)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {language === 'pt' ? 'Histórico de Empréstimos' : 'Loan History'}
          </CardTitle>
          <CardDescription>
            {language === 'pt'
              ? `${employeeLoans.length} empréstimos/adiantamentos registados`
              : `${employeeLoans.length} loans/advances recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeLoans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mb-4 opacity-50" />
              <p>
                {language === 'pt'
                  ? 'Nenhum empréstimo ou adiantamento registado'
                  : 'No loans or advances recorded'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead className="text-right">
                    {language === 'pt' ? 'Valor' : 'Amount'}
                  </TableHead>
                  <TableHead className="text-right">
                    {language === 'pt' ? 'Restante' : 'Remaining'}
                  </TableHead>
                  <TableHead>{language === 'pt' ? 'Progresso' : 'Progress'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLoans.map((loan) => {
                  const progressPercent =
                    loan.amount > 0
                      ? ((loan.amount - loan.remainingAmount) / loan.amount) * 100
                      : 0;

                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getTypeLabel(loan.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(loan.createdAt), 'dd/MM/yyyy', { locale: pt })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAOA(loan.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatAOA(loan.remainingAmount)}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <div className="text-xs text-muted-foreground text-center">
                            {loan.paidInstallments}/{loan.installments}{' '}
                            {language === 'pt' ? 'parcelas' : 'installments'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[loan.status]}>
                          {loan.status === 'active' && <Clock className="h-3 w-3 mr-1" />}
                          {loan.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {loan.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                          {statusLabels[loan.status][language === 'pt' ? 'pt' : 'en']}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
