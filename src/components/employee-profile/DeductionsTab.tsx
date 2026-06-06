import { useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import {
  useDeductionStore,
  getDeductionTypeLabel,
  getPendingDeductionsEffectiveMonthlyTotal,
} from '@/stores/deduction-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { formatPeriodLabel, isSalaryAdvanceQueued } from '@/lib/salary-advance-scheduling';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { useEmployeeStore } from '@/stores/employee-store';
import type { Deduction, DeductionType } from '@/types/deduction';
import { cn } from '@/lib/utils';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

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

export function DeductionsTab({ employeeId }: DeductionsTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { deductions, loadDeductions } = useDeductionStore();
  const { employees } = useEmployeeStore();
  const { periods } = usePayrollStore();
  const [typeFilter, setTypeFilter] = useState<DeductionType | 'all' | 'pending'>('all');

  const monthNames = ptLang
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadDeductions();
  }, [loadDeductions]);

  const employeeAllDeductions = useMemo(
    () => deductions.filter((d) => d.employeeId === employeeId),
    [deductions, employeeId]
  );

  const employeeDeductions = useMemo(() => {
    return employeeAllDeductions
      .filter((d) => {
        if (typeFilter === 'all') return true;
        if (typeFilter === 'pending') return !d.isFullyPaid;
        return d.type === typeFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [employeeAllDeductions, typeFilter]);

  const stats = useMemo(() => {
    const pending = employeeAllDeductions.filter((d) => !d.isFullyPaid);
    const totalPending = pending.reduce((sum, d) => sum + d.remainingAmount, 0);
    const monthlyDeduction = getPendingDeductionsEffectiveMonthlyTotal(
      employeeId,
      employeeAllDeductions,
      employees
    );
    const totalPaid = employeeAllDeductions
      .filter((d) => d.isFullyPaid)
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return {
      pendingCount: pending.length,
      totalPending,
      monthlyDeduction,
      totalPaid,
      totalDeductions: employeeAllDeductions.length,
    };
  }, [employeeAllDeductions, employeeId, employees]);

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Pendentes' : 'Pending',
      value: String(stats.pendingCount),
      warn: stats.pendingCount > 0,
      icon: Clock,
    },
    {
      label: ptLang ? 'Saldo' : 'Balance',
      value: formatAOA(stats.totalPending),
      warn: stats.totalPending > 0,
      icon: AlertTriangle,
    },
    {
      label: ptLang ? 'Mensal (folha)' : 'Monthly',
      value: formatAOA(stats.monthlyDeduction),
      icon: Receipt,
    },
    {
      label: ptLang ? 'Já pago' : 'Paid off',
      value: formatAOA(stats.totalPaid),
      icon: CheckCircle,
    },
  ];

  const filterChips: { value: DeductionType | 'all' | 'pending'; labelPt: string; labelEn: string }[] = [
    { value: 'all', labelPt: 'Todos', labelEn: 'All' },
    { value: 'pending', labelPt: 'Em curso', labelEn: 'Active' },
    { value: 'salary_advance', labelPt: 'Adiant.', labelEn: 'Advance' },
    { value: 'warehouse_loss', labelPt: 'Armazém', labelEn: 'Warehouse' },
    { value: 'unjustified_absence', labelPt: 'Faltas', labelEn: 'Absences' },
    { value: 'loan', labelPt: 'Emprést.', labelEn: 'Loan' },
    { value: 'disciplinary', labelPt: 'Discipl.', labelEn: 'Discip.' },
    { value: 'other', labelPt: 'Outros', labelEn: 'Other' },
  ];

  const getDeductionFolhaNote = (ded: Deduction): string | null => {
    if (ded.isFullyPaid) return null;
    if (ded.type === 'salary_advance' && isSalaryAdvanceQueued(ded, employeeAllDeductions)) {
      if (ded.deductFromPeriodId) {
        const label = formatPeriodLabel(ded.deductFromPeriodId, periods, monthNames);
        return ptLang
          ? label
            ? `Fila — ${label}`
            : 'Na fila'
          : label
            ? `Queued — ${label}`
            : 'Queued';
      }
      return ptLang ? 'Na fila' : 'Queued';
    }
    if (ded.deductFromPeriodId && ded.installmentsPaid === 0 && !ded.payrollPeriodId) {
      const label = formatPeriodLabel(ded.deductFromPeriodId, periods, monthNames);
      return ptLang ? (label ? `Início ${label}` : null) : label ? `Starts ${label}` : null;
    }
    return null;
  };

  const toolbar = (
    <div className="flex flex-wrap gap-1">
      {filterChips.map((chip) => (
        <Button
          key={chip.value}
          variant={typeFilter === chip.value ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setTypeFilter(chip.value)}
        >
          {ptLang ? chip.labelPt : chip.labelEn}
        </Button>
      ))}
    </div>
  );

  return (
    <DossierTabShell kpis={kpis}>
      <DossierTablePanel
        title={ptLang ? 'Deduções' : 'Deductions'}
        subtitle={
          ptLang
            ? `${stats.totalDeductions} registos · ${employeeDeductions.length} visíveis`
            : `${stats.totalDeductions} records · ${employeeDeductions.length} shown`
        }
        toolbar={toolbar}
      >
        {employeeDeductions.length === 0 ? (
          <DossierEmptyState
            icon={Receipt}
            message={ptLang ? 'Nenhuma dedução registada' : 'No deductions recorded'}
          />
        ) : (
          <table className="w-full text-xs min-w-[44rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Motivo' : 'Type'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Detalhe' : 'Detail'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Data' : 'Date'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Total' : 'Total'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Restante' : 'Left'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Parcelas' : 'Inst.'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Estado' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {employeeDeductions.map((ded) => {
                const folhaNote = getDeductionFolhaNote(ded);
                const advanceQueued =
                  !ded.isFullyPaid &&
                  ded.type === 'salary_advance' &&
                  isSalaryAdvanceQueued(ded, employeeAllDeductions);

                return (
                  <tr key={ded.id} className="hover:bg-muted/30">
                    <td className={ATTENDANCE_TD}>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] h-5 font-medium', typeBadgeClass[ded.type])}
                      >
                        {getDeductionTypeLabel(ded.type, language)}
                      </Badge>
                    </td>
                    <td className={`${ATTENDANCE_TD} max-w-[10rem] truncate`}>
                      {ded.description?.trim() || '—'}
                    </td>
                    <td className={ATTENDANCE_TD}>
                      {ded.date ? format(new Date(ded.date), 'dd/MM/yy', { locale: pt }) : '—'}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-right font-mono`}>
                      {formatAOA(ded.totalAmount)}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-right font-mono text-destructive`}>
                      {formatAOA(ded.remainingAmount)}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-center font-mono text-muted-foreground`}>
                      {ded.installmentsPaid}/{ded.installments}
                    </td>
                    <td className={ATTENDANCE_TD}>
                      <div className="space-y-0.5">
                        {ded.isFullyPaid ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            {ptLang ? 'Pago' : 'Paid'}
                          </Badge>
                        ) : advanceQueued ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-amber-500/10 text-amber-800 border-amber-500/30"
                          >
                            {ptLang ? 'Na fila' : 'Queued'}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-orange-500/10 text-orange-600 border-orange-500/20"
                          >
                            {ptLang ? 'Em curso' : 'Active'}
                          </Badge>
                        )}
                        {folhaNote && (
                          <p className="text-[10px] text-muted-foreground leading-snug">{folhaNote}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DossierTablePanel>
    </DossierTabShell>
  );
}
