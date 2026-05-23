import { useMemo, useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Umbrella, CheckCircle, Clock, AlertCircle, Banknote, AlertTriangle } from 'lucide-react';
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
import { usePayrollStore } from '@/stores/payroll-store';

interface HolidaysTabProps {
  employeeId: string;
}

function StatusBadges({ badges, language }: { badges: HolidayBadge[]; language: string }) {
  const pt = language === 'pt';
  const label: Record<HolidayBadge, string> = {
    gozado: 'Gozado',
    comprado: pt ? 'Comprado' : 'Bought',
    subsídio_pago: pt ? 'Subsídio pago' : 'Subsidy paid',
    registado: pt ? 'Registado' : 'Scheduled',
    pendente: 'Pendente',
  };

  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {badges.map((key) => {
        const outline = key === 'pendente' || key === 'registado';
        const className =
          key === 'gozado'
            ? 'bg-green-600'
            : key === 'comprado'
              ? 'bg-violet-600'
              : key === 'subsídio_pago'
                ? 'bg-blue-600'
                : key === 'registado'
                  ? 'text-amber-600 border-amber-600'
                  : 'text-amber-600 border-amber-600';
        const icon =
          key === 'gozado' ? (
            <CheckCircle className="h-3 w-3" />
          ) : key === 'comprado' ? (
            <Banknote className="h-3 w-3" />
          ) : key === 'subsídio_pago' ? (
            <Clock className="h-3 w-3" />
          ) : key === 'registado' ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          );
        return (
          <Badge key={key} variant={outline ? 'outline' : 'default'} className={`gap-1 ${className}`}>
            {icon}
            {label[key]}
          </Badge>
        );
      })}
    </div>
  );
}

export function HolidaysTab({ employeeId }: HolidaysTabProps) {
  const { language } = useLanguage();
  const { records, isLoaded, loadHolidays } = useHolidayStore();
  const { periods } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const currentHolidayYear = getCurrentHolidayYear();
  const [buyoutOpen, setBuyoutOpen] = useState(false);
  const [buyoutYear, setBuyoutYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!isLoaded) loadHolidays();
  }, [isLoaded, loadHolidays]);

  const employee = employees.find((e) => e.id === employeeId);

  const employeeRecords = useMemo(() => {
    return records.filter((r) => r.employeeId === employeeId).sort((a, b) => b.year - a.year);
  }, [records, employeeId]);

  const currentYear = currentHolidayYear;
  const hireDate = employee ? new Date(employee.hireDate) : new Date();
  const yearsWorked = Math.floor(
    (new Date().getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const yearEntries = useMemo(() => {
    const startYear = hireDate.getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= Math.max(startYear, currentYear - 5); y--) {
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
  }, [employeeRecords, currentYear, hireDate, employeeId, employee]);

  const totalDaysUsed = employeeRecords.reduce((sum, r) => sum + (r.daysUsed || 0), 0);
  const totalDaysBought = employeeRecords.reduce((sum, r) => sum + getTotalDaysBought(r), 0);
  const totalSubsidiesPaid = employeeRecords.filter((r) => r.subsidyPaidInMonth).length;
  const totalBuyout = employeeRecords.reduce((sum, r) => sum + getTotalBuyoutAmount(r), 0);

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString('pt-AO') : '-');
  const pt = language === 'pt';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{yearsWorked}</p>
            <p className="text-xs text-muted-foreground">{pt ? 'Anos de Serviço' : 'Years of Service'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{totalDaysUsed}</p>
            <p className="text-xs text-muted-foreground">{pt ? 'Dias Gozados' : 'Days Taken'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{totalDaysBought}</p>
            <p className="text-xs text-muted-foreground">{pt ? 'Dias Comprados' : 'Days Bought'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{totalBuyout.toLocaleString('pt-AO')}</p>
            <p className="text-xs text-muted-foreground">{pt ? 'Total Comprado (Kz)' : 'Total Bought (AOA)'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalSubsidiesPaid}</p>
            <p className="text-xs text-muted-foreground">{pt ? 'Subsídios Pagos' : 'Subsidies Paid'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5" />
            {pt ? 'Histórico de Férias' : 'Holiday History'}
          </CardTitle>
          {employee && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                setBuyoutYear(currentHolidayYear);
                setBuyoutOpen(true);
              }}
            >
              <Banknote className="h-4 w-4" />
              {pt ? `Comprar férias (${currentHolidayYear})` : `Buy vacation (${currentHolidayYear})`}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {yearEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {pt ? 'Sem registos de férias' : 'No holiday records'}
            </p>
          ) : (
            <Table stickyHeader scrollMaxHeight="min(70vh, 28rem)">
              <TableHeader>
                <TableRow>
                  <TableHead>{pt ? 'Ano' : 'Year'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Gozados' : 'Taken'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Comprados' : 'Bought'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Restantes' : 'Left'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Valor compra' : 'Buyout'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Período' : 'Period'}</TableHead>
                  <TableHead className="text-center">{pt ? 'Subsídio' : 'Subsidy'}</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">{pt ? 'Acções' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearEntries.map(
                  ({ year, record, badges, entitled, daysRemaining, daysBought, buyoutTotal }) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-center">{record?.daysUsed || 0}</TableCell>
                      <TableCell className="text-center">{daysBought}</TableCell>
                      <TableCell className="text-center">
                        {daysRemaining} / {entitled}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {buyoutTotal > 0 ? (
                          <>
                            <div>{buyoutTotal.toLocaleString('pt-AO')} Kz</div>
                            {record?.buyoutEntries?.map((be) => {
                              const p = be.payrollPeriodId
                                ? periods.find((x) => x.id === be.payrollPeriodId)
                                : undefined;
                              return p ? (
                                <div key={be.id} className="text-muted-foreground">
                                  {pt ? 'Folha' : 'Payroll'} {p.month}/{p.year}
                                </div>
                              ) : null;
                            })}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {formatDate(record?.startDate)} — {formatDate(record?.endDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {record?.subsidyPaidInMonth
                          ? `${record.subsidyPaidInMonth}/${record.subsidyPaidInYear}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadges badges={badges} language={language} />
                      </TableCell>
                      <TableCell className="text-right">
                        {daysRemaining > 0 && canBuyHolidayForYear(year) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => {
                              setBuyoutYear(year);
                              setBuyoutOpen(true);
                            }}
                          >
                            <Banknote className="h-3 w-3" />
                            {pt ? 'Comprar' : 'Buy'}
                          </Button>
                        ) : year < currentHolidayYear ? (
                          <span className="text-xs text-muted-foreground">{pt ? 'Ano fechado' : 'Past year'}</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {employee && (
        <HolidayBuyoutDialog
          open={buyoutOpen}
          onOpenChange={setBuyoutOpen}
          employee={employee}
          year={buyoutYear}
        />
      )}
    </div>
  );
}
