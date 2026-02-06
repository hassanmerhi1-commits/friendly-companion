import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClockInOut } from "@/components/attendance/ClockInOut";
import { AttendanceList } from "@/components/attendance/AttendanceList";
import { OvertimeTracker } from "@/components/attendance/OvertimeTracker";
import { AbsenceCalendar } from "@/components/attendance/AbsenceCalendar";
import { BulkAttendanceEntry } from "@/components/attendance/BulkAttendanceEntry";
import { useLanguage } from "@/lib/i18n";
import { useAbsenceStore } from "@/stores/absence-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useBulkAttendanceStore } from "@/stores/bulk-attendance-store";
import { Clock, List, Timer, Calendar, UserMinus } from "lucide-react";

export default function Attendance() {
  const { language } = useLanguage();
  const { getPendingAbsences } = useAbsenceStore();
  const { records } = useAttendanceStore();
  const { entries: bulkEntries } = useBulkAttendanceStore();

  const pendingAbsences = getPendingAbsences().length;
  const todayRecords = records.filter(r => 
    r.date === new Date().toISOString().split('T')[0]
  ).length;

  // Get current month and year for bulk attendance
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Count entries with deductions for the current month
  const currentMonthEntries = bulkEntries.filter(
    e => e.month === currentMonth && e.year === currentYear && e.totalDeduction > 0
  ).length;

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
  };

  return (
    <TopNavLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Tabs defaultValue="bulk" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <UserMinus className="h-4 w-4" />
              {t.bulkEntry}
              {currentMonthEntries > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {currentMonthEntries}
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
          </TabsList>

          <TabsContent value="bulk" className="space-y-4">
            <BulkAttendanceEntry month={currentMonth} year={currentYear} />
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
