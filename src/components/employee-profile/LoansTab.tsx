import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Banknote, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { useLoanStore, Loan, LoanStatus } from '@/stores/loan-store';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

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
  const ptLang = language === 'pt';
  const { loans, loadLoans } = useLoanStore();

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const employeeLoans = useMemo(() => {
    return loans
      .filter((l) => l.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans, employeeId]);

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

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Activos' : 'Active',
      value: String(stats.activeCount),
      warn: stats.activeCount > 0,
      icon: Clock,
    },
    {
      label: ptLang ? 'Em dívida' : 'Outstanding',
      value: formatAOA(stats.totalActive),
      warn: stats.totalActive > 0,
      icon: Banknote,
    },
    {
      label: ptLang ? 'Mensal' : 'Monthly',
      value: formatAOA(stats.monthlyDeduction),
      icon: Banknote,
    },
    {
      label: ptLang ? 'Já pago' : 'Paid',
      value: formatAOA(stats.totalPaid),
      icon: CheckCircle,
    },
  ];

  const getTypeLabel = (type: Loan['type']) => {
    return type === 'advance'
      ? ptLang
        ? 'Adiantamento'
        : 'Advance'
      : ptLang
        ? 'Empréstimo'
        : 'Loan';
  };

  return (
    <DossierTabShell kpis={kpis}>
      <DossierTablePanel
        title={ptLang ? 'Empréstimos e adiantamentos' : 'Loans and advances'}
        subtitle={
          ptLang
            ? `${stats.totalLoans} registos`
            : `${stats.totalLoans} records`
        }
      >
        {employeeLoans.length === 0 ? (
          <DossierEmptyState
            icon={Banknote}
            message={
              ptLang
                ? 'Nenhum empréstimo ou adiantamento'
                : 'No loans or advances'
            }
          />
        ) : (
          <table className="w-full text-xs min-w-[40rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Tipo' : 'Type'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Data' : 'Date'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Valor' : 'Amount'}</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Restante' : 'Left'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Parcelas' : 'Inst.'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Estado' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {employeeLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/30">
                  <td className={ATTENDANCE_TD}>
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                      {getTypeLabel(loan.type)}
                    </Badge>
                  </td>
                  <td className={ATTENDANCE_TD}>
                    {format(new Date(loan.createdAt), 'dd/MM/yyyy', { locale: pt })}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right font-mono`}>
                    {formatAOA(loan.amount)}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right font-mono text-destructive`}>
                    {formatAOA(loan.remainingAmount)}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center font-mono text-muted-foreground`}>
                    {loan.paidInstallments}/{loan.installments}
                  </td>
                  <td className={ATTENDANCE_TD}>
                    <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[loan.status]}`}>
                      {loan.status === 'active' && <Clock className="h-3 w-3 mr-1" />}
                      {loan.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {loan.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                      {statusLabels[loan.status][ptLang ? 'pt' : 'en']}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DossierTablePanel>
    </DossierTabShell>
  );
}
