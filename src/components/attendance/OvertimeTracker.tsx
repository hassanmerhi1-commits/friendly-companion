import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Printer,
  Banknote,
  Trash2,
  Search,
  Timer,
  Receipt,
} from 'lucide-react';
import { useAttendanceStore } from '@/stores/attendance-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useOvertimePaymentStore } from '@/stores/overtime-payment-store';
import { useBranchStore } from '@/stores/branch-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { LABOR_LAW, formatAOA, calculateHourlyRate, calculateOvertime } from '@/lib/angola-labor-law';
import { format } from 'date-fns';
import { OvertimePaymentDialog } from './OvertimePaymentDialog';
import { generateOvertimePaymentHtml } from './PrintableOvertimePayment';
import { printHtml } from '@/lib/print';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

interface OvertimeTrackerProps {
  embedded?: boolean;
  branchFilter?: string;
  month?: number;
  year?: number;
}

export function OvertimeTracker({
  embedded: _embedded = false,
  branchFilter,
  month,
  year,
}: OvertimeTrackerProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [search, setSearch] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [activeView, setActiveView] = useState<'summary' | 'payments'>('summary');

  const { employees } = useEmployeeStore();
  const { getOvertimeSummary, loadAttendance, isLoaded: attendanceLoaded } = useAttendanceStore();
  const { payments, deletePayment, loadPayments, isLoaded: paymentsLoaded } = useOvertimePaymentStore();
  const { getBranch, getActiveBranches } = useBranchStore();
  const { settings } = useSettingsStore();
  const { currentUser, hasPermission } = useAuthStore();

  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const isBranchLocked = !!currentUser?.branchId && !isAdmin;
  const canManagePayments = isAdmin || hasPermission('attendance.create') || hasPermission('attendance.edit');
  const canDeletePayments = isAdmin || hasPermission('attendance.delete');

  const branches = getActiveBranches();
  const showBranchPicker = !isBranchLocked && !branchFilter;
  const effectiveBranchId =
    branchFilter ||
    (isBranchLocked ? currentUser?.branchId : selectedBranch !== 'all' ? selectedBranch : undefined);
  const showBranchColumn = !isBranchLocked && !effectiveBranchId;

  const periodMonth = month ?? new Date().getMonth() + 1;
  const periodYear = year ?? new Date().getFullYear();
  const periodKey = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  useEffect(() => {
    if (!attendanceLoaded) loadAttendance();
  }, [attendanceLoaded, loadAttendance]);

  useEffect(() => {
    if (!paymentsLoaded) loadPayments();
  }, [paymentsLoaded, loadPayments]);

  const t = {
    viewSummary: pt ? 'Resumo HE' : 'OT Summary',
    viewPayments: pt ? 'Pagamentos' : 'Payments',
    employee: pt ? 'Funcionário' : 'Employee',
    branch: pt ? 'Filial' : 'Branch',
    normalHours: pt ? 'Normais' : 'Normal',
    nightHours: pt ? 'Nocturnas' : 'Night',
    holidayHours: pt ? 'Feriado/FDS' : 'Holiday/Wknd',
    totalHours: pt ? 'Total' : 'Total',
    estimatedValue: pt ? 'Valor Est.' : 'Est. Value',
    limit: pt ? 'Limite' : 'Limit',
    search: pt ? 'Pesquisar...' : 'Search...',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    noData: pt ? 'Sem horas extra neste período' : 'No overtime this period',
    noPayments: pt ? 'Sem pagamentos neste período' : 'No payments this period',
    newPayment: pt ? 'Pagamento Diário' : 'Daily Payment',
    employees: pt ? 'funcionários' : 'employees',
    totalOt: pt ? 'total HE' : 'total OT',
    date: pt ? 'Data' : 'Date',
    paymentEmployees: pt ? 'Func.' : 'Emps',
    paymentTotal: pt ? 'Total' : 'Total',
    actions: pt ? 'Acções' : 'Actions',
    delete: pt ? 'Eliminar' : 'Delete',
    deletePaymentConfirm: pt
      ? 'Eliminar este registo de pagamento?'
      : 'Delete this payment record?',
    cancel: pt ? 'Cancelar' : 'Cancel',
    paymentDeleted: pt ? 'Pagamento eliminado' : 'Payment deleted',
    noPermission: pt ? 'Sem permissão' : 'No permission',
    legalShort: pt
      ? `Máx ${LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h/mês · +50% até ${LABOR_LAW.OVERTIME.THRESHOLD_HOURS}h · +75% acima · Nocturnas +75% · Feriado +100%`
      : `Max ${LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h/mo · +50% up to ${LABOR_LAW.OVERTIME.THRESHOLD_HOURS}h · +75% above · Night +75% · Holiday +100%`,
    records: pt ? 'registos' : 'records',
  };

  const overtimeData = useMemo(() => {
    const q = search.trim().toLowerCase();
    let activeEmployees = employees.filter((e) => e.status === 'active');
    if (effectiveBranchId) {
      activeEmployees = activeEmployees.filter((e) => e.branchId === effectiveBranchId);
    }

    return activeEmployees
      .map((employee) => {
        const summary = getOvertimeSummary(employee.id, periodMonth - 1, periodYear);
        const hourlyRate = calculateHourlyRate(employee.baseSalary);
        const normalValue = calculateOvertime(hourlyRate, summary.normalHours, 'normal', 0);
        const nightValue = calculateOvertime(hourlyRate, summary.nightHours, 'night');
        const holidayValue = calculateOvertime(hourlyRate, summary.holidayHours, 'holiday');
        const totalValue = normalValue + nightValue + holidayValue;
        const limitProgress = (summary.totalHours / LABOR_LAW.OVERTIME.MONTHLY_LIMIT) * 100;

        return {
          employee,
          summary,
          totalValue,
          limitProgress,
          exceedsLimit: summary.totalHours > LABOR_LAW.OVERTIME.MONTHLY_LIMIT,
          isNearLimit: summary.totalHours >= LABOR_LAW.OVERTIME.MONTHLY_LIMIT * 0.8,
          aboveThreshold: summary.normalHours > LABOR_LAW.OVERTIME.THRESHOLD_HOURS,
        };
      })
      .filter((d) => d.summary.totalHours > 0)
      .filter((d) => {
        if (!q) return true;
        const name = `${d.employee.firstName} ${d.employee.lastName}`.toLowerCase();
        const num = (d.employee.employeeNumber || '').toLowerCase();
        return name.includes(q) || num.includes(q);
      })
      .sort((a, b) =>
        `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
          `${b.employee.firstName} ${b.employee.lastName}`
        )
      );
  }, [employees, effectiveBranchId, getOvertimeSummary, periodMonth, periodYear, search]);

  const otStats = useMemo(() => {
    const totalHours = overtimeData.reduce((s, d) => s + d.summary.totalHours, 0);
    const totalValue = overtimeData.reduce((s, d) => s + d.totalValue, 0);
    return { count: overtimeData.length, totalHours, totalValue };
  }, [overtimeData]);

  const monthPayments = useMemo(() => {
    return payments
      .filter((p) => p.date.startsWith(periodKey))
      .filter((p) => !effectiveBranchId || p.branchId === effectiveBranchId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, periodKey, effectiveBranchId]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monthPayments;
    return monthPayments.filter(
      (p) =>
        p.branchName.toLowerCase().includes(q) ||
        p.date.includes(q) ||
        format(new Date(p.date), 'dd/MM/yyyy').includes(q)
    );
  }, [monthPayments, search]);

  const paymentTotal = useMemo(
    () => filteredPayments.reduce((s, p) => s + p.totalAmount, 0),
    [filteredPayments]
  );

  const handleReprintPayment = async (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const html = generateOvertimePaymentHtml({
      payment,
      companyName: settings.companyName,
      companyNif: settings.nif,
    });
    await printHtml(html);
  };

  const handleDeletePayment = async (paymentId: string) => {
    await deletePayment(paymentId);
    toast.success(t.paymentDeleted);
  };

  const sharedFilters = (
    <>
      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showBranchPicker && (
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
            <SelectValue placeholder={t.allBranches} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allBranches}</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );

  const summaryToolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      {sharedFilters}
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <span className="font-medium text-foreground">{otStats.count}</span> {t.employees}
        <span className="text-border">|</span>
        <span className="font-medium text-primary">{otStats.totalHours.toFixed(1)}h</span> {t.totalOt}
        <span className="text-border">|</span>
        <span className="font-medium text-emerald-600">{formatAOA(otStats.totalValue)}</span>
      </div>
      <span className="text-[10px] text-muted-foreground hidden lg:inline truncate max-w-[280px] ml-auto">
        {t.legalShort}
      </span>
    </div>
  );

  const paymentsToolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      {sharedFilters}
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <span className="font-medium text-foreground">{filteredPayments.length}</span> {t.records}
        {filteredPayments.length > 0 && (
          <>
            <span className="text-border">|</span>
            <span className="font-medium text-emerald-600">{formatAOA(paymentTotal)}</span>
          </>
        )}
      </div>
    </div>
  );

  const otColSpan = showBranchColumn ? 8 : 7;

  const summaryTable = (
    <table className="w-full min-w-[960px] text-sm">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{t.employee}</th>
          {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
          <th className={ATTENDANCE_TH_CENTER}>{t.normalHours}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.nightHours}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.holidayHours}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.totalHours}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{t.estimatedValue}</th>
          <th className={ATTENDANCE_TH}>{t.limit}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {overtimeData.length === 0 ? (
          <tr>
            <td colSpan={otColSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
              {t.noData}
            </td>
          </tr>
        ) : (
          overtimeData.map(
            ({
              employee,
              summary,
              totalValue,
              limitProgress,
              exceedsLimit,
              isNearLimit,
              aboveThreshold,
            }) => {
              const branchName = employee.branchId ? getBranch(employee.branchId)?.name : '—';
              return (
                <tr key={employee.id} className="hover:bg-muted/20">
                  <td className={ATTENDANCE_TD}>
                    <span className="font-medium text-sm">
                      {employee.firstName} {employee.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">{employee.position}</span>
                  </td>
                  {showBranchColumn && (
                    <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                  )}
                  <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                    <span className="font-mono">{summary.normalHours.toFixed(1)}h</span>
                    {aboveThreshold && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        +75%
                      </Badge>
                    )}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center font-mono text-xs`}>
                    {summary.nightHours.toFixed(1)}h
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center font-mono text-xs`}>
                    {summary.holidayHours.toFixed(1)}h
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center font-mono text-xs font-medium`}>
                    {summary.totalHours.toFixed(1)}h
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right text-xs font-medium`}>
                    {formatAOA(totalValue)}
                  </td>
                  <td className={ATTENDANCE_TD}>
                    <div className="space-y-1 min-w-[80px]">
                      <Progress
                        value={Math.min(limitProgress, 100)}
                        className={`h-1.5 ${
                          exceedsLimit
                            ? '[&>div]:bg-destructive'
                            : isNearLimit
                              ? '[&>div]:bg-orange-500'
                              : ''
                        }`}
                      />
                      <div className="flex items-center gap-1">
                        {exceedsLimit && (
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                        )}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {summary.totalHours.toFixed(0)}/{LABOR_LAW.OVERTIME.MONTHLY_LIMIT}h
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }
          )
        )}
      </tbody>
    </table>
  );

  const paymentsTable = (
    <table className="w-full min-w-[720px] text-sm">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{t.date}</th>
          <th className={ATTENDANCE_TH}>{t.branch}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.paymentEmployees}</th>
          <th className={ATTENDANCE_TH_RIGHT}>{t.paymentTotal}</th>
          <th className={`${ATTENDANCE_TH_CENTER} w-24`}>{t.actions}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {filteredPayments.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground text-sm">
              {t.noPayments}
            </td>
          </tr>
        ) : (
          filteredPayments.map((payment) => (
            <tr key={payment.id} className="hover:bg-muted/20">
              <td className={`${ATTENDANCE_TD} text-xs font-medium whitespace-nowrap`}>
                {format(new Date(payment.date), 'dd/MM/yyyy')}
              </td>
              <td className={`${ATTENDANCE_TD} text-xs`}>{payment.branchName}</td>
              <td className={`${ATTENDANCE_TD} text-center`}>
                <Badge variant="secondary" className="text-[10px]">
                  {payment.entries.length}
                </Badge>
              </td>
              <td className={`${ATTENDANCE_TD} text-right text-xs font-medium`}>
                {formatAOA(payment.totalAmount)}
              </td>
              <td className={ATTENDANCE_TD}>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleReprintPayment(payment.id)}
                    title={pt ? 'Imprimir' : 'Print'}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  {canDeletePayments ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.delete}</AlertDialogTitle>
                          <AlertDialogDescription>{t.deletePaymentConfirm}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            {t.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-30"
                      disabled
                      title={t.noPermission}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as 'summary' | 'payments')}
        className="flex flex-col flex-1 min-h-0 gap-1"
      >
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <TabsList className="h-8 bg-muted/40 p-0.5">
            <TabsTrigger value="summary" className="text-xs gap-1.5 h-7 px-3">
              <Timer className="h-3.5 w-3.5" />
              {t.viewSummary}
              {otStats.count > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {otStats.count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs gap-1.5 h-7 px-3">
              <Receipt className="h-3.5 w-3.5" />
              {t.viewPayments}
              {monthPayments.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {monthPayments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {canManagePayments && (
            <Button
              size="sm"
              className="h-8 text-xs shrink-0 ml-auto"
              onClick={() => setShowPaymentDialog(true)}
            >
              <Banknote className="h-3.5 w-3.5 mr-1" />
              {t.newPayment}
            </Button>
          )}
        </div>

        <div className="relative flex-1 min-h-0">
          <TabsContent
            value="summary"
            className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
          >
            <AttendanceTablePanel toolbar={summaryToolbar}>{summaryTable}</AttendanceTablePanel>
          </TabsContent>

          <TabsContent
            value="payments"
            className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
          >
            <AttendanceTablePanel toolbar={paymentsToolbar}>{paymentsTable}</AttendanceTablePanel>
          </TabsContent>
        </div>
      </Tabs>

      <OvertimePaymentDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} />
    </div>
  );
}
