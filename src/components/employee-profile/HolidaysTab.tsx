import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Umbrella, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useHolidayStore } from '@/stores/holiday-store';
import { useEmployeeStore } from '@/stores/employee-store';

interface HolidaysTabProps {
  employeeId: string;
}

export function HolidaysTab({ employeeId }: HolidaysTabProps) {
  const { language } = useLanguage();
  const { records, isLoaded, loadHolidays, getHolidayStatus } = useHolidayStore();
  const { employees } = useEmployeeStore();

  useEffect(() => {
    if (!isLoaded) loadHolidays();
  }, [isLoaded, loadHolidays]);

  const employee = employees.find(e => e.id === employeeId);
  
  // Get all holiday records for this employee across all years
  const employeeRecords = useMemo(() => {
    return records
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => b.year - a.year);
  }, [records, employeeId]);

  // Calculate current year entitlement
  const currentYear = new Date().getFullYear();
  const hireDate = employee ? new Date(employee.hireDate) : new Date();
  const yearsWorked = Math.floor((new Date().getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // Generate year entries (including years without records)
  const yearEntries = useMemo(() => {
    const startYear = hireDate.getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= Math.max(startYear, currentYear - 5); y--) {
      years.push(y);
    }
    return years.map(year => {
      const record = employeeRecords.find(r => r.year === year);
      const status = getHolidayStatus(employeeId, year);
      return { year, record, status };
    });
  }, [employeeRecords, currentYear, hireDate, employeeId, getHolidayStatus]);

  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('pt-AO') : '-';

  const getStatusBadge = (status: 'pendente' | 'pago' | 'gozado') => {
    switch (status) {
      case 'gozado':
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle className="h-3 w-3" />
            Gozado
          </Badge>
        );
      case 'pago':
        return (
          <Badge variant="default" className="bg-blue-600 gap-1">
            <Clock className="h-3 w-3" />
            Pago
          </Badge>
        );
      case 'pendente':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const totalDaysUsed = employeeRecords.reduce((sum, r) => sum + (r.daysUsed || 0), 0);
  const totalSubsidiesPaid = employeeRecords.filter(r => r.subsidyPaidInMonth).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{yearsWorked}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'pt' ? 'Anos de Serviço' : 'Years of Service'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">22</p>
            <p className="text-xs text-muted-foreground">
              {language === 'pt' ? 'Dias de Direito/Ano' : 'Days Entitled/Year'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalDaysUsed}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'pt' ? 'Total Dias Gozados' : 'Total Days Taken'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalSubsidiesPaid}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'pt' ? 'Subsídios Pagos' : 'Subsidies Paid'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holiday History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5" />
            {language === 'pt' ? 'Histórico de Férias' : 'Holiday History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {yearEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {language === 'pt' ? 'Sem registos de férias' : 'No holiday records'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Ano' : 'Year'}</TableHead>
                  <TableHead className="text-center">{language === 'pt' ? 'Dias Gozados' : 'Days Used'}</TableHead>
                  <TableHead className="text-center">{language === 'pt' ? 'Início' : 'Start'}</TableHead>
                  <TableHead className="text-center">{language === 'pt' ? 'Fim' : 'End'}</TableHead>
                  <TableHead className="text-center">{language === 'pt' ? 'Subsídio' : 'Subsidy'}</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearEntries.map(({ year, record, status }) => (
                  <TableRow key={year}>
                    <TableCell className="font-medium">{year}</TableCell>
                    <TableCell className="text-center">{record?.daysUsed || 0} / 22</TableCell>
                    <TableCell className="text-center">{formatDate(record?.startDate)}</TableCell>
                    <TableCell className="text-center">{formatDate(record?.endDate)}</TableCell>
                    <TableCell className="text-center">
                      {record?.subsidyPaidInMonth 
                        ? `${record.subsidyPaidInMonth}/${record.subsidyPaidInYear}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
