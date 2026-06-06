import { useState, useMemo } from "react";
import { format } from "date-fns";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TodayPunchBoard } from "@/components/attendance/TodayPunchBoard";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { OvertimeTracker } from "@/components/attendance/OvertimeTracker";
import { AbsenceCalendar } from "@/components/attendance/AbsenceCalendar";
import { PrintableAttendanceMap } from "@/components/attendance/PrintableAttendanceMap";
import { BulkAttendanceEntry } from "@/components/attendance/BulkAttendanceEntry";
import { BranchAttendanceImport } from "@/components/attendance/BranchAttendanceImport";
import { DailyAttendanceMarking } from "@/components/attendance/DailyAttendanceMarking";
import { useLanguage } from "@/lib/i18n";
import { useAbsenceStore } from "@/stores/absence-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useBulkAttendanceStore } from "@/stores/bulk-attendance-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBranchStore } from "@/stores/branch-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { ATTENDANCE_PAGE } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import {
  Clock,
  List,
  Timer,
  Calendar as CalendarIcon,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  Lock,
  ClipboardCheck,
  FileText,
  LockOpen,
  MapPin,
  Users,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function Attendance() {
  const { language } = useLanguage();
  const pt = language === "pt";
  const { getPendingAbsences } = useAbsenceStore();
  const { records } = useAttendanceStore();
  const { entries: bulkEntries } = useBulkAttendanceStore();
  const { periods } = usePayrollStore();
  const { hasPermission, currentUser } = useAuthStore();
  const { branches } = useBranchStore();
  const { employees } = useEmployeeStore();

  const pendingAbsences = getPendingAbsences().length;
  const todayRecords = records.filter((r) => r.date === new Date().toISOString().split("T")[0]).length;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const normalizedRole = currentUser?.role?.trim().toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const isShopUser = normalizedRole !== "admin" && !!currentUser?.branchId;

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isShopUser && currentUser?.branchId ? currentUser.branchId : "all"
  );
  const [activeTab, setActiveTab] = useState(isShopUser ? "daily" : "bulk");

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const canEditPast = hasPermission("attendance.edit_past") || isAdmin;
  const isCurrentPeriod = selectedMonth === currentMonth && selectedYear === currentYear;

  const isPeriodArchived = useMemo(
    () =>
      periods.some(
        (p) => p.month === selectedMonth && p.year === selectedYear && p.status === "paid"
      ),
    [periods, selectedMonth, selectedYear]
  );

  const { isAttendanceClosed, closeAttendance, reopenAttendance, getAttendanceCutoff } =
    usePayrollStore();
  const attendanceClosed = isAttendanceClosed(selectedMonth, selectedYear);
  const attendanceCutoff = getAttendanceCutoff(selectedMonth, selectedYear);
  const canManageAttendanceClose =
    (isAdmin || hasPermission("attendance.close")) && !isPeriodArchived;

  const [cutoffPickerOpen, setCutoffPickerOpen] = useState(false);
  const [selectedCutoffDate, setSelectedCutoffDate] = useState<Date | undefined>(undefined);

  const branchOptions = useMemo(() => {
    const active = branches.filter((b) => b.isActive);
    return active.length > 0 ? active : branches;
  }, [branches]);

  const monthBulkEntries = useMemo(
    () => bulkEntries.filter((e) => e.month === selectedMonth && e.year === selectedYear),
    [bulkEntries, selectedMonth, selectedYear]
  );

  const branchFilteredBulk = useMemo(() => {
    if (selectedBranchId === "all") return monthBulkEntries;
    const branchEmployeeIds = new Set(
      employees.filter((e) => e.branchId === selectedBranchId).map((e) => e.id)
    );
    return monthBulkEntries.filter((e) => branchEmployeeIds.has(e.employeeId));
  }, [monthBulkEntries, selectedBranchId, employees]);

  const periodKpis = useMemo(() => {
    const withDeductions = branchFilteredBulk.filter((e) => e.totalDeduction > 0);
    return {
      employees: branchFilteredBulk.length,
      withDeductions: withDeductions.length,
      totalDeduction: branchFilteredBulk.reduce((s, e) => s + e.totalDeduction, 0),
      absenceDays: branchFilteredBulk.reduce((s, e) => s + e.absenceDays, 0),
    };
  }, [branchFilteredBulk]);

  const selectedMonthEntries = branchFilteredBulk.filter((e) => e.totalDeduction > 0).length;

  const monthNames = pt
    ? [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

  const handleCloseAttendance = async (cutoffDate?: string) => {
    try {
      await closeAttendance(selectedMonth, selectedYear, cutoffDate);
      setCutoffPickerOpen(false);
      setSelectedCutoffDate(undefined);
      toast.success(
        pt
          ? `Presenças fechadas para ${monthNames[selectedMonth - 1]} ${selectedYear}`
          : `Attendance closed for ${monthNames[selectedMonth - 1]} ${selectedYear}`
      );
    } catch {
      toast.error(pt ? "Erro ao fechar presenças" : "Error closing attendance");
    }
  };

  const handleReopenAttendance = async () => {
    try {
      await reopenAttendance(selectedMonth, selectedYear);
      toast.success(
        pt
          ? `Presenças reabertas para ${monthNames[selectedMonth - 1]} ${selectedYear}`
          : `Attendance reopened for ${monthNames[selectedMonth - 1]} ${selectedYear}`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      toast.error(
        msg.includes("approved")
          ? pt
            ? "Não pode reabrir — folha salarial já aprovada/paga"
            : "Cannot reopen — payroll already approved/paid"
          : pt
            ? "Erro ao reabrir presenças"
            : "Error reopening attendance"
      );
    }
  };

  const canGoBack = useMemo(() => {
    if (!canEditPast) return false;
    const minDate = new Date(currentYear, currentMonth - 1 - 3, 1);
    const selectedDate = new Date(selectedYear, selectedMonth - 2, 1);
    return selectedDate > minDate;
  }, [canEditPast, selectedMonth, selectedYear, currentMonth, currentYear]);

  const canGoForward = selectedMonth < currentMonth || selectedYear < currentYear;

  const navigateMonth = (direction: -1 | 1) => {
    if (direction === -1 && !canGoBack) {
      toast.warning(pt ? "Limite máximo de 3 meses anteriores" : "Maximum 3 months back limit");
      return;
    }
    if (direction === 1 && !canGoForward) return;

    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const branchFilter = isShopUser ? currentUser?.branchId : selectedBranchId !== "all" ? selectedBranchId : undefined;

  const t = {
    title: pt ? "Presenças" : "Attendance",
    dailyMarking: pt ? "Marcação Diária" : "Daily Marking",
    bulkEntry: pt ? "Ausências/Atrasos" : "Absences/Delays",
    clockInOut: pt ? "Registo de Ponto" : "Clock In/Out",
    records: pt ? "Registos" : "Records",
    overtime: pt ? "Horas Extra" : "Overtime",
    calendar: pt ? "Calendário" : "Calendar",
    effectivenessMap: pt ? "Mapa Efectividade" : "Effectiveness Map",
    closeAttendance: pt ? "Fechar" : "Close",
    reopenAttendance: pt ? "Reabrir" : "Reopen",
    archived: pt ? "Período Arquivado — Apenas Leitura" : "Archived Period — Read Only",
    attendanceClosedOn: pt ? "Presenças fechadas em" : "Attendance closed on",
    employees: pt ? "Funcionários" : "Employees",
    deductions: pt ? "Descontos" : "Deductions",
    absenceDays: pt ? "Dias Falta" : "Absence Days",
    pending: pt ? "Pendentes" : "Pending",
    status: pt ? "Estado" : "Status",
    open: pt ? "Aberto" : "Open",
    closed: pt ? "Fechado" : "Closed",
  };

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <ClipboardCheck className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{t.title}</span>

          {!isShopUser && (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{pt ? "Filial" : "Branch"}</span>
              </div>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder={pt ? "Seleccionar filial" : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{pt ? "Todas as filiais" : "All branches"}</SelectItem>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.code ? ` (${branch.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex items-center gap-0.5 shrink-0 bg-muted/50 rounded-md px-1">
            {canEditPast && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth(-1)}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-xs font-medium px-2 min-w-[110px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            {canEditPast && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth(1)}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!isShopUser && <BranchAttendanceImport compact />}

          {canManageAttendanceClose &&
            (attendanceClosed ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={handleReopenAttendance}
              >
                <LockOpen className="h-3.5 w-3.5 mr-1.5" />
                {t.reopenAttendance}
              </Button>
            ) : (
              <Popover open={cutoffPickerOpen} onOpenChange={setCutoffPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="default" size="sm" className="h-8 text-xs shrink-0">
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    {t.closeAttendance}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium">
                      {pt ? "Seleccionar data de corte" : "Select cutoff date"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pt
                        ? "Ausências após esta data serão transferidas para o próximo mês"
                        : "Absences after this date will carry to next month"}
                    </p>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedCutoffDate}
                    onSelect={setSelectedCutoffDate}
                    className={cn("p-3 pointer-events-auto")}
                    defaultMonth={new Date(selectedYear, selectedMonth - 1)}
                    disabled={(date) => {
                      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
                      const monthEnd = new Date(selectedYear, selectedMonth, 0);
                      return date < monthStart || date > monthEnd;
                    }}
                  />
                  <div className="p-3 border-t flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCutoffPickerOpen(false)}>
                      {pt ? "Cancelar" : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedCutoffDate}
                      onClick={() => {
                        if (selectedCutoffDate) {
                          handleCloseAttendance(format(selectedCutoffDate, "yyyy-MM-dd"));
                        }
                      }}
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      {pt ? "Confirmar" : "Confirm"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
        </div>

        {/* Status banners — only on non-table tabs to save vertical space */}
        {activeTab !== "daily" && activeTab !== "bulk" && activeTab !== "clock" && activeTab !== "calendar" && activeTab !== "overtime" && activeTab !== "records" && activeTab !== "effectiveness" && isPeriodArchived && !isCurrentPeriod && (
          <div className="shrink-0 flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            <Lock className="h-3.5 w-3.5" />
            {t.archived}
          </div>
        )}
        {activeTab !== "daily" && activeTab !== "bulk" && activeTab !== "clock" && activeTab !== "calendar" && activeTab !== "overtime" && activeTab !== "records" && activeTab !== "effectiveness" && attendanceClosed && !isPeriodArchived && (
          <div className="shrink-0 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Lock className="h-3.5 w-3.5" />
            {t.attendanceClosedOn} {attendanceCutoff} —{" "}
            {pt
              ? "novas marcações serão contabilizadas no próximo mês"
              : "new marks will count for next month"}
          </div>
        )}

        {/* KPIs — hidden on table tabs (daily / bulk / clock); totals live in each tab toolbar */}
        {!isShopUser &&
          activeTab !== "daily" &&
          activeTab !== "bulk" &&
          activeTab !== "clock" &&
          activeTab !== "overtime" &&
          activeTab !== "records" &&
          activeTab !== "calendar" &&
          activeTab !== "effectiveness" && (
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                icon: Users,
                label: t.employees,
                value: String(periodKpis.employees),
              },
              {
                icon: UserMinus,
                label: t.absenceDays,
                value: String(periodKpis.absenceDays),
              },
              {
                icon: TrendingDown,
                label: t.deductions,
                value: formatAOA(periodKpis.totalDeduction),
                highlight: periodKpis.totalDeduction > 0,
              },
              {
                icon: AlertCircle,
                label: t.pending,
                value: String(pendingAbsences),
                highlight: pendingAbsences > 0,
              },
              {
                icon: attendanceClosed ? Lock : LockOpen,
                label: t.status,
                value: attendanceClosed ? t.closed : t.open,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-border/50 bg-card px-3 py-2 flex items-center gap-2"
              >
                <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  <p
                    className={`text-sm font-bold truncate ${kpi.highlight ? "text-primary" : ""}`}
                  >
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mode tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0 basis-0 gap-1 overflow-hidden min-w-0"
        >
          <TabsList className="shrink-0 w-full justify-start overflow-x-auto flex-nowrap border-b border-border/40 bg-muted/20 rounded-none p-0 h-9 gap-0">
            <TabsTrigger value="daily" className="text-xs gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t.dailyMarking}
            </TabsTrigger>
            {!isShopUser && (
              <>
                <TabsTrigger value="bulk" className="text-xs gap-1.5">
                  <UserMinus className="h-3.5 w-3.5" />
                  {t.bulkEntry}
                  {selectedMonthEntries > 0 && (
                    <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[10px]">
                      {selectedMonthEntries}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="clock" className="text-xs gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t.clockInOut}
                  {todayRecords > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                      {todayRecords}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="records" className="text-xs gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  {t.records}
                </TabsTrigger>
                <TabsTrigger value="overtime" className="text-xs gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  {t.overtime}
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {t.calendar}
                  {pendingAbsences > 0 && (
                    <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[10px]">
                      {pendingAbsences}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="effectiveness" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t.effectivenessMap}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="relative flex-1 min-h-0 overflow-hidden">
            <TabsContent
              value="daily"
              className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
            >
              <DailyAttendanceMarking embedded branchFilter={branchFilter} />
            </TabsContent>

            {!isShopUser && (
              <>
                <TabsContent
                  value="bulk"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <BulkAttendanceEntry
                    month={selectedMonth}
                    year={selectedYear}
                    readOnly={isPeriodArchived && !isCurrentPeriod}
                    embedded
                    branchFilter={branchFilter}
                  />
                </TabsContent>

                <TabsContent
                  value="clock"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <TodayPunchBoard branchFilter={branchFilter} />
                </TabsContent>

                <TabsContent
                  value="records"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <AttendanceList
                    embedded
                    branchFilter={branchFilter}
                    month={selectedMonth}
                    year={selectedYear}
                  />
                </TabsContent>

                <TabsContent
                  value="overtime"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <OvertimeTracker
                    embedded
                    branchFilter={branchFilter}
                    month={selectedMonth}
                    year={selectedYear}
                  />
                </TabsContent>

                <TabsContent
                  value="calendar"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <AbsenceCalendar
                    embedded
                    branchFilter={branchFilter}
                    month={selectedMonth}
                    year={selectedYear}
                  />
                </TabsContent>

                <TabsContent
                  value="effectiveness"
                  className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
                >
                  <PrintableAttendanceMap
                    embedded
                    branchFilter={branchFilter}
                    month={selectedMonth}
                    year={selectedYear}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </TopNavLayout>
  );
}
