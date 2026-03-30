import { useState, useMemo } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClockInOut } from "@/components/attendance/ClockInOut";
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
import { Clock, List, Timer, Calendar, UserMinus, ChevronLeft, ChevronRight, Lock, ClipboardCheck, FileText, LockOpen } from "lucide-react";
import { toast } from "sonner";

export default function Attendance() {
  const { language } = useLanguage();
  const { getPendingAbsences } = useAbsenceStore();
  const { records } = useAttendanceStore();
  const { entries: bulkEntries } = useBulkAttendanceStore();
  const { periods } = usePayrollStore();
  const { hasPermission, currentUser } = useAuthStore();

  const pendingAbsences = getPendingAbsences().length;
  const todayRecords = records.filter(r => 
    r.date === new Date().toISOString().split('T')[0]
  ).length;

  // Period navigation state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const canEditPast = hasPermission('attendance.edit_past') || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const isShopUser = currentUser?.role !== 'admin' && !!currentUser?.branchId;
  const isCurrentPeriod = selectedMonth === currentMonth && selectedYear === currentYear;

  // Check if selected period's payroll is archived (paid)
  const isPeriodArchived = useMemo(() => {
    return periods.some(
      p => p.month === selectedMonth && p.year === selectedYear && p.status === 'paid'
    );
  }, [periods, selectedMonth, selectedYear]);

  // Check if attendance is closed for this month
  const { isAttendanceClosed, closeAttendance, reopenAttendance, getAttendanceCutoff } = usePayrollStore();
  const attendanceClosed = isAttendanceClosed(selectedMonth, selectedYear);
  const attendanceCutoff = getAttendanceCutoff(selectedMonth, selectedYear);

  const handleCloseAttendance = async () => {
    try {
      await closeAttendance(selectedMonth, selectedYear);
      toast.success(
        language === 'pt'
          ? `Presenças fechadas para ${monthNames[selectedMonth - 1]} ${selectedYear}`
          : `Attendance closed for ${monthNames[selectedMonth - 1]} ${selectedYear}`
      );
    } catch (error) {
      toast.error(language === 'pt' ? 'Erro ao fechar presenças' : 'Error closing attendance');
    }
  };

  const handleReopenAttendance = async () => {
    try {
      await reopenAttendance(selectedMonth, selectedYear);
      toast.success(
        language === 'pt'
          ? `Presenças reabertas para ${monthNames[selectedMonth - 1]} ${selectedYear}`
          : `Attendance reopened for ${monthNames[selectedMonth - 1]} ${selectedYear}`
      );
    } catch (error: any) {
      toast.error(
        error?.message?.includes('approved') 
          ? (language === 'pt' ? 'Não pode reabrir — folha salarial já aprovada/paga' : 'Cannot reopen — payroll already approved/paid')
          : (language === 'pt' ? 'Erro ao reabrir presenças' : 'Error reopening attendance')
      );
    }
  };

  // Calculate min allowed month (3 months back)
  const canGoBack = useMemo(() => {
    if (!canEditPast) return false;
    const minDate = new Date(currentYear, currentMonth - 1 - 3, 1); // 3 months back
    const selectedDate = new Date(selectedYear, selectedMonth - 2, 1);
    return selectedDate > minDate;
  }, [canEditPast, selectedMonth, selectedYear, currentMonth, currentYear]);

  const canGoForward = selectedMonth < currentMonth || selectedYear < currentYear;

  const navigateMonth = (direction: -1 | 1) => {
    if (direction === -1 && !canGoBack) {
      toast.warning(
        language === 'pt'
          ? 'Limite máximo de 3 meses anteriores'
          : 'Maximum 3 months back limit'
      );
      return;
    }
    if (direction === 1 && !canGoForward) return;

    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Count entries with deductions for the selected month
  const selectedMonthEntries = bulkEntries.filter(
    e => e.month === selectedMonth && e.year === selectedYear && e.totalDeduction > 0
  ).length;

  const monthNames = language === 'pt' 
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const t = {
    title: language === 'pt' ? 'Gestão de Presenças' : 'Attendance Management',
    subtitle: language === 'pt' 
      ? 'Registo de ponto, horas extra e calendário de ausências' 
      : 'Clock in/out, overtime and absence calendar',
    clockInOut: language === 'pt' ? 'Registo de Ponto' : 'Clock In/Out',
    records: language === 'pt' ? 'Registos' : 'Records',
    overtime: language === 'pt' ? 'Horas Extra' : 'Overtime',
    calendar: language === 'pt' ? 'Calendário' : 'Calendar',
    bulkEntry: language === 'pt' ? 'Ausências/Atrasos' : 'Absences/Delays',
    dailyMarking: language === 'pt' ? 'Marcação Diária' : 'Daily Marking',
    archived: language === 'pt' ? 'Período Arquivado — Apenas Leitura' : 'Archived Period — Read Only',
    effectivenessMap: language === 'pt' ? 'Mapa de Efectividade' : 'Effectiveness Map',
    closeAttendance: language === 'pt' ? 'Fechar Presenças' : 'Close Attendance',
    reopenAttendance: language === 'pt' ? 'Reabrir Presenças' : 'Reopen Attendance',
    attendanceClosedOn: language === 'pt' ? 'Presenças fechadas em' : 'Attendance closed on',
  };

  return (
    <TopNavLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Navigator */}
            <div className="flex items-center gap-1 bg-card border rounded-lg px-2 py-1">
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
              <span className="text-sm font-medium px-2 min-w-[140px] text-center">
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
            {/* Close/Reopen Attendance Button */}
            {isAdmin && !isPeriodArchived && (
              attendanceClosed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopenAttendance}
                  className="gap-2"
                >
                  <LockOpen className="h-4 w-4" />
                  {t.reopenAttendance}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCloseAttendance}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {t.closeAttendance}
                </Button>
              )
            )}
            <BranchAttendanceImport />
          </div>
        </div>

        {/* Archived warning */}
        {isPeriodArchived && !isCurrentPeriod && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium">
            <Lock className="h-4 w-4" />
            {t.archived}
          </div>
        )}

        <Tabs defaultValue={isShopUser ? "daily" : "bulk"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {t.dailyMarking}
            </TabsTrigger>
            {!isShopUser && (
              <>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4" />
                  {t.bulkEntry}
                  {selectedMonthEntries > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {selectedMonthEntries}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="clock" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t.clockInOut}
                  {todayRecords > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {todayRecords}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="records" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  {t.records}
                </TabsTrigger>
                <TabsTrigger value="overtime" className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  {t.overtime}
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t.calendar}
                  {pendingAbsences > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {pendingAbsences}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="effectiveness" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t.effectivenessMap}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <DailyAttendanceMarking />
          </TabsContent>

          {!isShopUser && (
            <>
              <TabsContent value="bulk" className="space-y-4">
                <BulkAttendanceEntry 
                  month={selectedMonth} 
                  year={selectedYear} 
                  readOnly={isPeriodArchived && !isCurrentPeriod}
                />
              </TabsContent>

              <TabsContent value="clock" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ClockInOut />
                  <div className="space-y-4">
                    <AttendanceList />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="records">
                <AttendanceList />
              </TabsContent>

              <TabsContent value="overtime">
                <OvertimeTracker />
              </TabsContent>

              <TabsContent value="calendar">
                <AbsenceCalendar />
              </TabsContent>

              <TabsContent value="effectiveness">
                <PrintableAttendanceMap month={selectedMonth} year={selectedYear} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </TopNavLayout>
  );
}
