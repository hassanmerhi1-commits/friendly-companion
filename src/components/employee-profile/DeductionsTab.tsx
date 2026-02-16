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
import { Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';

interface DeductionsTabProps {
  employeeId: string;
}

export function DeductionsTab({ employeeId }: DeductionsTabProps) {
  const { language } = useLanguage();
  const { deductions, loadDeductions } = useDeductionStore();

  useEffect(() => {
    loadDeductions();
  }, [loadDeductions]);

  const employeeDeductions = useMemo(() => {
    return deductions
      .filter((d) => d.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [deductions, employeeId]);

  const stats = useMemo(() => {
    const pending = employeeDeductions.filter((d) => !d.isFullyPaid);
    const totalPending = pending.reduce((sum, d) => sum + d.remainingAmount, 0);
    const monthlyDeduction = pending.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = employeeDeductions
      .filter((d) => d.isFullyPaid)
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return {
      pendingCount: pending.length,
      totalPending,
      monthlyDeduction,
      totalPaid,
      totalDeductions: employeeDeductions.length,
    };
  }, [employeeDeductions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Deduções Pendentes' : 'Pending Deductions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {language === 'pt' ? 'Saldo Pendente' : 'Outstanding Balance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              {formatAOA(stats.totalPending)}
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
              {language === 'pt' ? 'Total Já Pago' : 'Total Paid Off'}
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

      {/* Deductions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {language === 'pt' ? 'Histórico de Deduções' : 'Deduction History'}
          </CardTitle>
          <CardDescription>
            {language === 'pt'
              ? `${employeeDeductions.length} deduções registadas`
              : `${employeeDeductions.length} deductions recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeDeductions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>
                {language === 'pt'
                  ? 'Nenhuma dedução registada'
                  : 'No deductions recorded'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Descrição' : 'Description'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead className="text-right">
                    {language === 'pt' ? 'Total' : 'Total'}
                  </TableHead>
                  <TableHead className="text-right">
                    {language === 'pt' ? 'Restante' : 'Remaining'}
                  </TableHead>
                  <TableHead>{language === 'pt' ? 'Progresso' : 'Progress'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDeductions.map((ded) => {
                  const progressPercent =
                    ded.totalAmount > 0
                      ? ((ded.totalAmount - ded.remainingAmount) / ded.totalAmount) * 100
                      : 0;

                  return (
                    <TableRow key={ded.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getDeductionTypeLabel(ded.type, language)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {ded.description || '—'}
                      </TableCell>
                      <TableCell>
                        {ded.date ? format(new Date(ded.date), 'dd/MM/yyyy', { locale: pt }) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAOA(ded.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatAOA(ded.remainingAmount)}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <div className="text-xs text-muted-foreground text-center">
                            {ded.installmentsPaid}/{ded.installments}{' '}
                            {language === 'pt' ? 'parcelas' : 'installments'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ded.isFullyPaid ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {language === 'pt' ? 'Pago' : 'Paid'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {language === 'pt' ? 'Pendente' : 'Pending'}
                          </Badge>
                        )}
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
