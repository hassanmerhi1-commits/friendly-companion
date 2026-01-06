import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, User, AlertCircle } from "lucide-react";
import { useAbsenceStore } from "@/stores/absence-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useLanguage } from "@/lib/i18n";
import { ABSENCE_TYPE_INFO } from "@/types/absence";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, isSameDay } from "date-fns";
import { pt, enUS } from "date-fns/locale";

export function AbsenceCalendar() {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  const { employees } = useEmployeeStore();
  const { absences, getAbsencesByPeriod } = useAbsenceStore();
  const holidayStore = useHolidayStore();

  const locale = language === 'pt' ? pt : enUS;

  const t = {
    title: language === 'pt' ? 'Calendário de Ausências' : 'Absence Calendar',
    description: language === 'pt' ? 'Visualizar ausências e feriados' : 'View absences and holidays',
    allEmployees: language === 'pt' ? 'Todos os Funcionários' : 'All Employees',
    today: language === 'pt' ? 'Hoje' : 'Today',
    legend: language === 'pt' ? 'Legenda' : 'Legend',
    holiday: language === 'pt' ? 'Feriado' : 'Holiday',
    absence: language === 'pt' ? 'Ausência' : 'Absence',
    vacation: language === 'pt' ? 'Férias' : 'Vacation',
    sickLeave: language === 'pt' ? 'Doença' : 'Sick Leave',
    other: language === 'pt' ? 'Outro' : 'Other',
    unjustified: language === 'pt' ? 'Injustificada' : 'Unjustified',
    noAbsences: language === 'pt' ? 'Sem ausências neste período' : 'No absences in this period',
    weekDays: language === 'pt' 
      ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Get absences for the current month
  const monthAbsences = useMemo(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    return getAbsencesByPeriod(startStr, endStr)
      .filter(a => selectedEmployee === 'all' || a.employeeId === selectedEmployee);
  }, [absences, monthStart, monthEnd, selectedEmployee, getAbsencesByPeriod]);

  // Get holidays for the current month - use national holidays from labor law
  const monthHolidays = useMemo(() => {
    // Import national holidays from labor law
    const { NATIONAL_HOLIDAYS } = require('@/lib/angola-labor-law');
    return (NATIONAL_HOLIDAYS || []).filter((h: any) => {
      return h.date.startsWith(format(currentDate, 'MM'));
    });
  }, [currentDate]);

  const getAbsencesForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return monthAbsences.filter(a => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const check = new Date(dateStr);
      return check >= start && check <= end;
    });
  };

  const getHolidayForDay = (day: Date) => {
    const dateStr = format(day, 'MM-dd');
    return monthHolidays.find((h: any) => h.date === dateStr);
  };

  const getAbsenceColor = (type: string) => {
    switch (type) {
      case 'sick_leave':
        return 'bg-yellow-500';
      case 'maternity':
      case 'paternity':
        return 'bg-pink-500';
      case 'marriage':
      case 'bereavement':
        return 'bg-purple-500';
      case 'unjustified':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t.allEmployees} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allEmployees}</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {e.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Week days header */}
          <div className="grid grid-cols-7 bg-muted">
            {t.weekDays.map((day, i) => (
              <div key={i} className="p-2 text-center text-sm font-medium border-b">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] p-1 border-b border-r bg-muted/30" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map(day => {
              const dayAbsences = getAbsencesForDay(day);
              const holiday = getHolidayForDay(day);
              const isCurrentDay = isToday(day);
              const isWeekend = getDay(day) === 0; // Sunday

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1 border-b border-r relative ${
                    isWeekend ? 'bg-muted/50' : ''
                  } ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Holiday indicator */}
                  {holiday && (
                    <div className="absolute top-0 right-0 p-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" title={language === 'pt' ? holiday.name : holiday.nameEn} />
                    </div>
                  )}

                  {/* Absences */}
                  <div className="space-y-0.5">
                    {dayAbsences.slice(0, 3).map(absence => {
                      const employee = employees.find(e => e.id === absence.employeeId);
                      const typeInfo = ABSENCE_TYPE_INFO[absence.type];
                      const label = language === 'pt' ? typeInfo.labelPt : typeInfo.labelEn;
                      
                      return (
                        <div
                          key={absence.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${getAbsenceColor(absence.type)}`}
                          title={`${employee?.firstName} ${employee?.lastName}: ${label}`}
                        >
                          {selectedEmployee === 'all' 
                            ? employee?.firstName 
                            : label.substring(0, 10)}
                        </div>
                      );
                    })}
                    {dayAbsences.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayAbsences.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-2 border-t">
          <span className="text-sm font-medium">{t.legend}:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm">{t.holiday}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-sm">{t.sickLeave}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-sm">{t.vacation}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm">{t.unjustified}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-sm">{t.other}</span>
          </div>
        </div>

        {/* Absences List for Month */}
        {monthAbsences.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">
              {language === 'pt' ? 'Ausências do Mês' : 'Monthly Absences'} ({monthAbsences.length})
            </h4>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {monthAbsences.map(absence => {
                const employee = employees.find(e => e.id === absence.employeeId);
                const typeInfo = ABSENCE_TYPE_INFO[absence.type];
                const label = language === 'pt' ? typeInfo.labelPt : typeInfo.labelEn;
                
                return (
                  <div 
                    key={absence.id} 
                    className="flex items-center justify-between p-2 rounded border bg-card text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getAbsenceColor(absence.type)}`} />
                      <span className="font-medium">{employee?.firstName} {employee?.lastName}</span>
                      <span className="text-muted-foreground">- {label}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {format(new Date(absence.startDate), 'dd/MM')}
                      {absence.startDate !== absence.endDate && (
                        <> - {format(new Date(absence.endDate), 'dd/MM')}</>
                      )}
                      <Badge variant="outline" className="ml-2">
                        {absence.days}d
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
