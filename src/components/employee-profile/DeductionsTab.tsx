import { useMemo, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Receipt, CheckCircle, Clock, AlertTriangle, Package, Wallet, Gavel } from 'lucide-react';
import {
  useDeductionStore,
  getDeductionTypeLabel,
  getPendingDeductionsEffectiveMonthlyTotal,
  DEDUCTION_TYPE_ORDER,
} from '@/stores/deduction-store';
import { usePayrollStore } from '@/stores/payroll-store';
import {
  formatPeriodLabel,
  isSalaryAdvanceQueued,
} from '@/lib/salary-advance-scheduling';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { useEmployeeStore } from '@/stores/employee-store';
import type { Deduction, DeductionType } from '@/types/deduction';
import { cn } from '@/lib/utils';

interface DeductionsTabProps {
  employeeId: string;
}

const typeBadgeClass: Record<DeductionType, string> = {
  salary_advance: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  warehouse_loss: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  unjustified_absence: 'bg-red-500/10 text-red-700 border-red-500/30',
  loan: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  disciplinary: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
  other: 'bg-muted text-muted-foreground',
};

const typeIcons: Record<DeductionType, typeof Wallet> = {
  salary_advance: Wallet,
  warehouse_loss: Package,
  unjustified_absence: Clock,
  loan: Receipt,
  disciplinary: Gavel,
  other: Receipt,
};

export function DeductionsTab({ employeeId }: DeductionsTabProps) {
  const { language } = useLanguage();
  const { deductions, loadDeductions } = useDeductionStore();
  const { employees } = useEmployeeStore();
  const { periods } = usePayrollStore();
  const [typeFilter, setTypeFilter] = useState<DeductionType | 'all'>('all');

  const monthNames =
    language === 'pt'
      ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadDeductions();
  }, [loadDeductions]);

  const employeeDeductions = useMemo(() => {
    return deductions
      .filter((d) => d.employeeId === employeeId)
      .filter((d) => typeFilter === 'all' || d.type === typeFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [deductions, employeeId, typeFilter]);

  const groupedByType = useMemo(() => {
    const groups = new Map<DeductionType, Deduction[]>();
    for (const type of DEDUCTION_TYPE_ORDER) {
      const items = employeeDeductions.filter((d) => d.type === type);
      if (items.length > 0) groups.set(type, items);
    }
    return groups;
  }, [employeeDeductions]);

  const stats = useMemo(() => {
    const allForEmployee = deductions.filter((d) => d.employeeId === employeeId);
    const pending = allForEmployee.filter((d) => !d.isFullyPaid);
    const totalPending = pending.reduce((sum, d) => sum + d.remainingAmount, 0);
    const monthlyDeduction = getPendingDeductionsEffectiveMonthlyTotal(employeeId, allForEmployee, employees);
    const totalPaid = allForEmployee
      .filter((d) => d.isFullyPaid)
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return {
      pendingCount: pending.length,
      totalPending,
      monthlyDeduction,
      totalPaid,
      totalDeductions: allForEmployee.length,
    };
  }, [deductions, employeeId, employees]);

  const filterChips: { value: DeductionType | 'all'; labelPt: string; labelEn: string }[] = [
    { value: 'all', labelPt: 'Todos', labelEn: 'All' },
    { value: 'salary_advance', labelPt: 'Adiantamentos', labelEn: 'Advances' },
    { value: 'warehouse_loss', labelPt: 'Perdas Armazém', labelEn: 'Warehouse' },
    { value: 'unjustified_absence', labelPt: 'Faltas', labelEn: 'Absences' },
    { value: 'loan', labelPt: 'Empréstimos', labelEn: 'Loans' },
    { value: 'disciplinary', labelPt: 'Disciplinar', labelEn: 'Disciplinary' },
    { value: 'other', labelPt: 'Outros', labelEn: 'Other' },
  ];

  const employeeAllDeductions = useMemo(
    () => deductions.filter((d) => d.employeeId === employeeId),
    [deductions, employeeId]
  );

  const getDeductionFolhaNote = (ded: Deduction): string | null => {
    if (ded.isFullyPaid) return null;
    if (ded.type === 'salary_advance' && isSalaryAdvanceQueued(ded, employeeAllDeductions)) {
      if (ded.deductFromPeriodId) {
        const label = formatPeriodLabel(ded.deductFromPeriodId, periods, monthNames);
        return language === 'pt'
          ? label
            ? `Na fila — início ${label}`
            : 'Na fila — aguarda adiantamento anterior'
          : label
            ? `Queued — starts ${label}`
            : 'Queued — waiting for prior advance';
      }
      return language === 'pt' ? 'Na fila' : 'Queued';
    }
    if (ded.deductFromPeriodId && ded.installmentsPaid === 0 && !ded.payrollPeriodId) {
      const label = formatPeriodLabel(ded.deductFromPeriodId, periods, monthNames);
      return language === 'pt'
        ? label
          ? `Início: ${label}`
          : null
        : label
          ? `Starts: ${label}`
          : null;
    }
    return null;
  };

  const renderRow = (ded: Deduction) => {
    const progressPercent =
      ded.totalAmount > 0 ? ((ded.totalAmount - ded.remainingAmount) / ded.totalAmount) * 100 : 0;
    const paidAmount = Math.max(0, ded.totalAmount - ded.remainingAmount);
    const motive = getDeductionTypeLabel(ded.type, language);
    const folhaNote = getDeductionFolhaNote(ded);
    const advanceQueued =
      !ded.isFullyPaid && ded.type === 'salary_advance' && isSalaryAdvanceQueued(ded, employeeAllDeductions);

    return (
      <TableRow key={ded.id}>
        <TableCell>
          <Badge variant="outline" className={cn('font-medium', typeBadgeClass[ded.type])}>
            {motive}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[220px] text-sm">
          {ded.description?.trim() ? ded.description : '—'}
        </TableCell>
        <TableCell>
          {ded.date ? format(new Date(ded.date), 'dd/MM/yyyy', { locale: pt }) : '—'}
        </TableCell>
        <TableCell className="text-right font-mono">{formatAOA(ded.totalAmount)}</TableCell>
        <TableCell className="text-right font-mono text-emerald-600">{formatAOA(paidAmount)}</TableCell>
        <TableCell className="text-right font-mono text-destructive">{formatAOA(ded.remainingAmount)}</TableCell>
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
          <div className="space-y-1">
            {ded.isFullyPaid ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {language === 'pt' ? 'Pago' : 'Paid'}
              </Badge>
            ) : advanceQueued ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-800 border-amber-500/30">
                <Clock className="h-3 w-3 mr-1" />
                {language === 'pt' ? 'Na fila' : 'Queued'}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {language === 'pt' ? 'Em curso' : 'Active'}
              </Badge>
            )}
            {folhaNote && (
              <p className="text-xs text-muted-foreground max-w-[200px] leading-snug">{folhaNote}</p>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
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
              {language === 'pt' ? 'Dedução Mensal (folha)' : 'Monthly Deduction (payroll)'}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {language === 'pt' ? 'Deduções por Motivo' : 'Deductions by Type'}
          </CardTitle>
          <CardDescription>
            {language === 'pt'
              ? `${stats.totalDeductions} registos — agrupados por tipo (adiantamento, perda armazém, falta, empréstimo, etc.)`
              : `${stats.totalDeductions} records — grouped by type`}
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {filterChips.map((chip) => (
              <Button
                key={chip.value}
                variant={typeFilter === chip.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(chip.value)}
              >
                {language === 'pt' ? chip.labelPt : chip.labelEn}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {employeeDeductions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>{language === 'pt' ? 'Nenhuma dedução registada' : 'No deductions recorded'}</p>
            </div>
          ) : typeFilter !== 'all' ? (
            <Table stickyHeader scrollMaxHeight="min(70vh, 28rem)">
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Motivo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Detalhe' : 'Detail'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Total' : 'Total'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Pago' : 'Paid'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Restante' : 'Remaining'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Progresso' : 'Progress'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{employeeDeductions.map(renderRow)}</TableBody>
            </Table>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedByType.entries()).map(([type, items]) => {
                const Icon = typeIcons[type];
                const pendingInGroup = items.filter((d) => !d.isFullyPaid);
                const groupRemaining = pendingInGroup.reduce((s, d) => s + d.remainingAmount, 0);
                return (
                  <div key={type}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {getDeductionTypeLabel(type, language)}
                        <Badge variant="secondary" className="font-normal">
                          {items.length}
                        </Badge>
                      </h3>
                      {groupRemaining > 0 && (
                        <span className="text-sm font-mono text-destructive">
                          {language === 'pt' ? 'Pendente:' : 'Outstanding:'} {formatAOA(groupRemaining)}
                        </span>
                      )}
                    </div>
                    <Table stickyHeader scrollMaxHeight="min(50vh, 20rem)">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'pt' ? 'Motivo' : 'Type'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Detalhe' : 'Detail'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                          <TableHead className="text-right">{language === 'pt' ? 'Total' : 'Total'}</TableHead>
                          <TableHead className="text-right">{language === 'pt' ? 'Pago' : 'Paid'}</TableHead>
                          <TableHead className="text-right">{language === 'pt' ? 'Restante' : 'Remaining'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Progresso' : 'Progress'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{items.map(renderRow)}</TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
