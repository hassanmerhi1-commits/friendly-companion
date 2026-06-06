import { useMemo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { Umbrella, CheckCircle, Clock, Banknote } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useHolidayStore } from '@/stores/holiday-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { HolidayBuyoutDialog } from '@/components/holidays/HolidayBuyoutDialog';
import {
  calculateHolidayEntitlement,
  canBuyHolidayForYear,
  getCurrentHolidayYear,
  getDaysRemaining,
  getDaysSettled,
  getHolidayBadges,
  getTotalBuyoutAmount,
  getTotalDaysBought,
  type HolidayBadge,
} from '@/lib/holiday-utils';
import {
  DossierTabShell,
  DossierTablePanel,
  DossierEmptyState,
  type DossierKpi,
} from '@/components/employee-profile/DossierTabShell';

interface HolidaysTabProps {
  employeeId: string;
}

function StatusBadges({ badges, language }: { badges: HolidayBadge[]; language: string }) {
  const pt = language === 'pt';
  const label: Record<HolidayBadge, string> = {
    gozado: 'Gozado',
    comprado: pt ? 'Comprado' : 'Bought',
    subsídio_pago: pt ? 'Subsídio' : 'Subsidy',
    registado: pt ? 'Registado' : 'Scheduled',
    pendente: 'Pendente',
  };

  return (
    <div className="flex flex-wrap gap-0.5 justify-center">
      {badges.map((key) => {
        const outline = key === 'pendente' || key === 'registado';
        const className =
          key === 'gozado'
            ? 'bg-green-600'
            : key === 'comprado'
              ? 'bg-violet-600'
              : key === 'subsídio_pago'
                ? 'bg-blue-600'
                : 'text-amber-600 border-amber-600';
        return (
          <Badge
            key={key}
            variant={outline ? 'outline' : 'default'}
            className={`text-[10px] h-5 gap-0.5 ${className}`}
          >
            {label[key]}
          </Badge>
        );
      })}
    </div>
  );
}

export function HolidaysTab({ employeeId }: HolidaysTabProps) {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const { records, isLoaded, loadHolidays } = useHolidayStore();
  const { employees } = useEmployeeStore();
  const currentHolidayYear = getCurrentHolidayYear();
  const [buyoutOpen, setBuyoutOpen] = useState(false);
  const [buyoutYear, setBuyoutYear] = useState(currentHolidayYear);

  useEffect(() => {
    if (!isLoaded) loadHolidays();
  }, [isLoaded, loadHolidays]);

  const employee = employees.find((e) => e.id === employeeId);

  const employeeRecords = useMemo(() => {
    return records.filter((r) => r.employeeId === employeeId).sort((a, b) => b.year - a.year);
  }, [records, employeeId]);

  const hireDate = employee ? new Date(employee.hireDate) : new Date();
  const yearsWorked = Math.floor(
    (Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const yearEntries = useMemo(() => {
    const startYear = hireDate.getFullYear();
    const years: number[] = [];
    for (let y = currentHolidayYear; y >= Math.max(startYear, currentHolidayYear - 5); y--) {
      years.push(y);
    }
    return years.map((year) => {
      const record = employeeRecords.find((r) => r.year === year);
      const entitled = employee ? calculateHolidayEntitlement(employee, year).daysEntitled : 22;
      const badges = getHolidayBadges(record, !!record?.subsidyPaidInMonth);
      return {
        year,
        record,
        badges,
        entitled,
        daysSettled: getDaysSettled(record),
        daysRemaining: getDaysRemaining(record, entitled),
        daysBought: getTotalDaysBought(record),
        buyoutTotal: getTotalBuyoutAmount(record),
      };
    });
  }, [employeeRecords, currentHolidayYear, hireDate, employee]);

  const currentYearEntry = yearEntries.find((e) => e.year === currentHolidayYear);
  const totalDaysUsed = employeeRecords.reduce((sum, r) => sum + (r.daysUsed || 0), 0);
  const totalDaysBought = employeeRecords.reduce((sum, r) => sum + getTotalDaysBought(r), 0);
  const totalBuyout = employeeRecords.reduce((sum, r) => sum + getTotalBuyoutAmount(r), 0);

  const kpis: DossierKpi[] = [
    {
      label: ptLang ? 'Anos serviço' : 'Years',
      value: String(yearsWorked),
      icon: Umbrella,
    },
    {
      label: ptLang ? 'Restantes' : 'Remaining',
      value: String(currentYearEntry?.daysRemaining ?? 0),
      sub: `${currentHolidayYear}`,
      icon: Clock,
    },
    {
      label: ptLang ? 'Gozados' : 'Taken',
      value: String(totalDaysUsed),
      icon: CheckCircle,
    },
    {
      label: ptLang ? 'Comprados' : 'Bought',
      value: String(totalDaysBought),
      sub: totalBuyout > 0 ? `${totalBuyout.toLocaleString('pt-AO')} Kz` : undefined,
      icon: Banknote,
    },
  ];

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' }) : '—';

  const toolbar = employee ? (
    <Button
      size="sm"
      variant="outline"
      className="h-6 text-[10px] gap-1 px-2"
      onClick={() => {
        setBuyoutYear(currentHolidayYear);
        setBuyoutOpen(true);
      }}
    >
      <Banknote className="h-3 w-3" />
      {ptLang ? `Comprar (${currentHolidayYear})` : `Buy (${currentHolidayYear})`}
    </Button>
  ) : null;

  return (
    <DossierTabShell kpis={kpis}>
      <DossierTablePanel
        title={ptLang ? 'Férias por ano' : 'Holiday by year'}
        subtitle={
          ptLang
            ? `${yearEntries.length} anos no histórico`
            : `${yearEntries.length} years in history`
        }
        toolbar={toolbar}
      >
        {yearEntries.length === 0 ? (
          <DossierEmptyState
            icon={Umbrella}
            message={ptLang ? 'Sem registos de férias' : 'No holiday records'}
          />
        ) : (
          <table className="w-full text-xs min-w-[44rem]">
            <thead className={ATTENDANCE_THEAD}>
              <tr>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Ano' : 'Year'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Goz.' : 'Taken'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Compr.' : 'Bought'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Rest.' : 'Left'}</th>
                <th className={ATTENDANCE_TH}>{ptLang ? 'Período' : 'Period'}</th>
                <th className={ATTENDANCE_TH_CENTER}>{ptLang ? 'Subsídio' : 'Subsidy'}</th>
                <th className={ATTENDANCE_TH_CENTER}>Status</th>
                <th className={ATTENDANCE_TH_RIGHT}>{ptLang ? 'Acção' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className={ATTENDANCE_TBODY}>
              {yearEntries.map(
                ({ year, record, badges, entitled, daysRemaining, daysBought, buyoutTotal }) => (
                  <tr key={year} className="hover:bg-muted/30">
                    <td className={`${ATTENDANCE_TD} font-medium`}>{year}</td>
                    <td className={`${ATTENDANCE_TD} text-center font-mono`}>
                      {record?.daysUsed || 0}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-center font-mono`}>{daysBought}</td>
                    <td className={`${ATTENDANCE_TD} text-center font-mono`}>
                      {daysRemaining}/{entitled}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-muted-foreground`}>
                      {formatDate(record?.startDate)} — {formatDate(record?.endDate)}
                    </td>
                    <td className={`${ATTENDANCE_TD} text-center text-[10px]`}>
                      {record?.subsidyPaidInMonth
                        ? `${record.subsidyPaidInMonth}/${record.subsidyPaidInYear}`
                        : '—'}
                      {buyoutTotal > 0 && (
                        <div className="text-violet-600 font-mono">
                          {buyoutTotal.toLocaleString('pt-AO')}
                        </div>
                      )}
                    </td>
                    <td className={ATTENDANCE_TD}>
                      <StatusBadges badges={badges} language={language} />
                    </td>
                    <td className={`${ATTENDANCE_TD} text-right`}>
                      {daysRemaining > 0 && canBuyHolidayForYear(year) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => {
                            setBuyoutYear(year);
                            setBuyoutOpen(true);
                          }}
                        >
                          <Banknote className="h-3 w-3" />
                          {ptLang ? 'Comprar' : 'Buy'}
                        </Button>
                      ) : year < currentHolidayYear ? (
                        <span className="text-[10px] text-muted-foreground">
                          {ptLang ? 'Fechado' : 'Closed'}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </DossierTablePanel>

      {employee && (
        <HolidayBuyoutDialog
          open={buyoutOpen}
          onOpenChange={setBuyoutOpen}
          employee={employee}
          year={buyoutYear}
        />
      )}
    </DossierTabShell>
  );
}
