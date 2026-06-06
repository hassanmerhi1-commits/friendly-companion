import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
  Trash2,
  Search,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAbsenceStore } from '@/stores/absence-store';
import { useHolidayStore } from '@/stores/holiday-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { ABSENCE_TYPE_INFO } from '@/types/absence';
import type { AbsenceType } from '@/types/absence';
import { AbsenceDialog } from '@/components/payroll/AbsenceDialog';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { NATIONAL_HOLIDAYS } from '@/lib/angola-labor-law';
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
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

/** How far back the calendar can be browsed (view-only history). */
const CALENDAR_HISTORY_YEARS = 10;

interface AbsenceCalendarProps {
  embedded?: boolean;
  branchFilter?: string;
  month?: number;
  year?: number;
}

export function AbsenceCalendar({
  embedded: _embedded = false,
  branchFilter,
  month,
  year,
}: AbsenceCalendarProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const locale = pt ? pt : enUS;

  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');

  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();
  const initialMonth = month ?? todayMonth;
  const initialYear = year ?? todayYear;
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);

  const { employees, getActiveEmployees } = useEmployeeStore();
  const { absences, getAbsencesByPeriod, deleteAbsence } = useAbsenceStore();
  const { records: holidayRecords, loadHolidays, isLoaded: holidaysLoaded, getHolidayStatus } =
    useHolidayStore();
  const { getBranch, getActiveBranches } = useBranchStore();
  const { currentUser, hasPermission } = useAuthStore();

  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const isBranchLocked = !!currentUser?.branchId && !isAdmin;
  const canCreate = isAdmin || hasPermission('hr.create');
  const canDelete = isAdmin || hasPermission('hr.delete');
  const canEditPast = isAdmin || hasPermission('attendance.edit_past');

  const branches = getActiveBranches();
  const showBranchPicker = !isBranchLocked && !branchFilter;
  const effectiveBranchId =
    branchFilter ||
    (isBranchLocked ? currentUser?.branchId : selectedBranch !== 'all' ? selectedBranch : undefined);
  const showBranchColumn = !isBranchLocked && !effectiveBranchId;

  const currentDate = useMemo(() => new Date(viewYear, viewMonth - 1, 1), [viewYear, viewMonth]);

  useEffect(() => {
    if (month != null) setViewMonth(month);
    if (year != null) setViewYear(year);
  }, [month, year]);

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  const isFuturePeriod =
    viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth);
  const isCurrentPeriod = viewYear === todayYear && viewMonth === todayMonth;

  const todayPeriod = new Date(todayYear, todayMonth - 1, 1);
  const minViewPeriod = new Date(todayYear - CALENDAR_HISTORY_YEARS, 0, 1);
  const minEditPeriod = new Date(todayYear, todayMonth - 1 - 3, 1);

  const viewPeriodDate = useMemo(
    () => new Date(viewYear, viewMonth - 1, 1),
    [viewYear, viewMonth]
  );

  /** Browsing old months — up to 10 years back. Data stays in DB; this is view-only. */
  const canGoBack = viewPeriodDate > minViewPeriod;

  const canGoForward = viewPeriodDate < todayPeriod;

  /** Registering new absences — tied to payroll edit rules (3 months with edit_past). */
  const canRegisterInPeriod = useMemo(() => {
    if (viewPeriodDate > todayPeriod) return false;
    if (!canEditPast) return isCurrentPeriod;
    return viewPeriodDate >= minEditPeriod;
  }, [viewPeriodDate, todayPeriod, minEditPeriod, canEditPast, isCurrentPeriod]);

  const applyViewPeriod = (m: number, y: number) => {
    const target = new Date(y, m - 1, 1);

    if (target > todayPeriod) {
      setViewMonth(m);
      setViewYear(y);
      return;
    }

    if (target < minViewPeriod) {
      toast.warning(
        pt
          ? `Histórico limitado a ${CALENDAR_HISTORY_YEARS} anos`
          : `History limited to ${CALENDAR_HISTORY_YEARS} years`
      );
      return;
    }

    setViewMonth(m);
    setViewYear(y);
  };

  const navigateMonth = (direction: -1 | 1) => {
    if (direction === -1 && !canGoBack) {
      toast.warning(
        pt
          ? `Histórico limitado a ${CALENDAR_HISTORY_YEARS} anos`
          : `History limited to ${CALENDAR_HISTORY_YEARS} years`
      );
      return;
    }
    if (direction === 1 && !canGoForward) return;

    let newMonth = viewMonth + direction;
    let newYear = viewYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    applyViewPeriod(newMonth, newYear);
  };

  const goToToday = () => {
    applyViewPeriod(todayMonth, todayYear);
  };

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = todayYear; y >= todayYear - CALENDAR_HISTORY_YEARS; y--) years.push(y);
    return years;
  }, [todayYear]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const target = new Date(viewYear, m - 1, 1);
      const disabled = target > todayPeriod;
      return {
        value: m,
        label: format(new Date(viewYear, i, 1), 'MMMM', { locale }),
        disabled,
      };
    }).filter((opt) => !opt.disabled || opt.value === viewMonth);
  }, [viewYear, locale, todayPeriod, viewMonth]);

  useEffect(() => {
    if (!holidaysLoaded) loadHolidays();
  }, [holidaysLoaded, loadHolidays]);

  const branchEmployeeIds = useMemo(() => {
    let list = getActiveEmployees();
    if (effectiveBranchId) {
      list = list.filter((e) => e.branchId === effectiveBranchId);
    }
    return new Set(list.map((e) => e.id));
  }, [getActiveEmployees, effectiveBranchId]);

  const branchEmployees = useMemo(() => {
    return getActiveEmployees()
      .filter((e) => branchEmployeeIds.has(e.id))
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
  }, [getActiveEmployees, branchEmployeeIds]);

  const t = {
    viewCalendar: pt ? 'Calendário' : 'Calendar',
    viewList: pt ? 'Lista' : 'List',
    allEmployees: pt ? 'Todos os funcionários' : 'All employees',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    search: pt ? 'Pesquisar...' : 'Search...',
    addAbsence: pt ? 'Registar Ausência' : 'Record Absence',
    legend: pt ? 'Legenda' : 'Legend',
    holiday: pt ? 'Feriado' : 'Holiday',
    sickLeave: pt ? 'Doença' : 'Sick',
    vacation: pt ? 'Licença' : 'Leave',
    employeeVacation: pt ? 'Férias' : 'Vacation',
    unjustified: pt ? 'Injustificada' : 'Unjustified',
    other: pt ? 'Outro' : 'Other',
    noAbsences: pt ? 'Sem ausências neste período' : 'No absences this period',
    weekDays: pt
      ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    delete: pt ? 'Eliminar' : 'Delete',
    deleteConfirm: pt ? 'Eliminar esta ausência?' : 'Delete this absence?',
    cancel: pt ? 'Cancelar' : 'Cancel',
    deleted: pt ? 'Ausência eliminada' : 'Absence deleted',
    noPermission: pt ? 'Sem permissão' : 'No permission',
    employee: pt ? 'Funcionário' : 'Employee',
    branch: pt ? 'Filial' : 'Branch',
    type: pt ? 'Tipo' : 'Type',
    period: pt ? 'Período' : 'Period',
    days: pt ? 'Dias' : 'Days',
    status: pt ? 'Estado' : 'Status',
    actions: pt ? 'Acções' : 'Actions',
    absences: pt ? 'ausências' : 'absences',
    vacations: pt ? 'férias' : 'vacations',
    pending: pt ? 'pendentes' : 'pending',
    nationalHoliday: pt ? 'Feriado nacional' : 'National holiday',
    managedInHolidays: pt ? 'Gerido em Férias' : 'Managed in Holidays',
    today: pt ? 'Hoje' : 'Today',
    prevMonth: pt ? 'Mês anterior' : 'Previous month',
    nextMonth: pt ? 'Mês seguinte' : 'Next month',
    viewOnlyPeriod: pt
      ? 'Consulta — registo de ausências só nos últimos 3 meses (ou mês actual)'
      : 'View only — absence entry limited to last 3 months (or current month)',
    registerBlocked: pt
      ? 'Só pode registar ausências no mês actual ou últimos 3 meses'
      : 'Can only register absences in current month or last 3 months',
  };

  const dateInRange = (day: Date, startStr: string, endStr: string) => {
    const check = format(day, 'yyyy-MM-dd');
    return check >= startStr && check <= endStr;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const weekRows = Math.ceil((startDayOfWeek + daysInMonth.length) / 7);

  const monthAbsences = useMemo(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    const q = search.trim().toLowerCase();

    return getAbsencesByPeriod(startStr, endStr)
      .filter((a) => branchEmployeeIds.has(a.employeeId))
      .filter((a) => selectedEmployee === 'all' || a.employeeId === selectedEmployee)
      .filter((a) => {
        if (!q) return true;
        const employee = employees.find((e) => e.id === a.employeeId);
        const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.toLowerCase();
        const typeInfo = ABSENCE_TYPE_INFO[a.type];
        const label = pt ? typeInfo.labelPt : typeInfo.labelEn;
        return name.includes(q) || label.toLowerCase().includes(q);
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [
    absences,
    monthStart,
    monthEnd,
    selectedEmployee,
    branchEmployeeIds,
    search,
    employees,
    getAbsencesByPeriod,
    pt,
  ]);

  const monthVacations = useMemo(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    const q = search.trim().toLowerCase();
    const vacationTerms = ['férias', 'ferias', 'vacation', 'holiday'];

    return holidayRecords
      .filter((r) => r.startDate && r.endDate)
      .filter((r) => r.startDate! <= endStr && r.endDate! >= startStr)
      .filter((r) => branchEmployeeIds.has(r.employeeId))
      .filter((r) => selectedEmployee === 'all' || r.employeeId === selectedEmployee)
      .filter((r) => {
        if (!q) return true;
        const employee = employees.find((e) => e.id === r.employeeId);
        const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.toLowerCase();
        return name.includes(q) || vacationTerms.some((term) => term.includes(q) || q.includes(term));
      })
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [
    holidayRecords,
    monthStart,
    monthEnd,
    branchEmployeeIds,
    selectedEmployee,
    search,
    employees,
  ]);

  const pendingCount = useMemo(
    () => monthAbsences.filter((a) => a.status === 'pending').length,
    [monthAbsences]
  );

  const getVacationsForDay = (day: Date) =>
    monthVacations.filter((r) => dateInRange(day, r.startDate!, r.endDate!));

  const monthHolidays = useMemo(() => {
    return (NATIONAL_HOLIDAYS || []).filter((h: { date: string }) =>
      h.date.startsWith(format(currentDate, 'MM'))
    );
  }, [currentDate]);

  const getAbsencesForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return monthAbsences.filter((a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      const check = new Date(dateStr);
      return check >= start && check <= end;
    });
  };

  const getHolidayForDay = (day: Date) => {
    const dateStr = format(day, 'MM-dd');
    return monthHolidays.find((h: { date: string }) => h.date === dateStr);
  };

  const getAbsenceColor = (type: string) => {
    switch (type) {
      case 'sick_leave':
        return 'bg-amber-500';
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      justified: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      approved: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
      unjustified: 'bg-destructive/15 text-destructive border-destructive/30',
      rejected: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge variant="outline" className={`text-[10px] ${colors[status] || ''}`}>
        {status}
      </Badge>
    );
  };

  const handleDeleteAbsence = async (id: string) => {
    await deleteAbsence(id);
    toast.success(t.deleted);
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

      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
        <SelectTrigger className="h-8 w-[160px] text-xs shrink-0">
          <SelectValue placeholder={t.allEmployees} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.allEmployees}</SelectItem>
          {branchEmployees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

  const toolbarExtras = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
      <span className="font-medium text-foreground">{monthAbsences.length}</span> {t.absences}
      {monthVacations.length > 0 && (
        <>
          <span className="text-border">|</span>
          <span className="font-medium text-teal-600">{monthVacations.length}</span> {t.vacations}
        </>
      )}
      {pendingCount > 0 && (
        <>
          <span className="text-border">|</span>
          <span className="font-medium text-amber-600">{pendingCount}</span> {t.pending}
        </>
      )}
    </div>
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground shrink-0">
      <span className="font-medium">{t.legend}:</span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t.nationalHoliday}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded bg-teal-500" /> {t.employeeVacation}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded bg-amber-500" /> {t.sickLeave}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded bg-blue-500" /> {t.vacation}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded bg-red-500" /> {t.unjustified}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded bg-purple-500" /> {t.other}
      </span>
    </div>
  );

  const calendarToolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      {sharedFilters}
      {toolbarExtras}
      <div className="hidden md:flex ml-auto">{legend}</div>
    </div>
  );

  const listToolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      {sharedFilters}
      {toolbarExtras}
    </div>
  );

  const calendarGrid = (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="shrink-0 grid grid-cols-7 border-b border-border/50 bg-muted/60">
        {t.weekDays.map((day, i) => (
          <div
            key={i}
            className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 flex-1 min-h-0 gap-px bg-border/40"
        style={{ gridTemplateRows: `repeat(${weekRows}, 1fr)` }}
      >
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-muted/20 min-h-[48px]" />
        ))}

        {daysInMonth.map((day) => {
          const dayAbsences = getAbsencesForDay(day);
          const dayVacations = getVacationsForDay(day);
          const nationalHoliday = getHolidayForDay(day);
          const isCurrentDay = isToday(day);
          const isSunday = getDay(day) === 0;
          const maxChips = 4;
          const visibleVacations = dayVacations.slice(0, Math.max(0, maxChips - Math.min(dayAbsences.length, maxChips)));
          const visibleAbsences = dayAbsences.slice(0, maxChips - visibleVacations.length);
          const hiddenCount =
            dayAbsences.length - visibleAbsences.length + dayVacations.length - visibleVacations.length;

          return (
            <div
              key={day.toISOString()}
              className={`bg-card p-1 min-h-[48px] flex flex-col overflow-hidden ${
                isSunday ? 'bg-muted/30' : ''
              } ${nationalHoliday ? 'bg-emerald-500/5' : ''} ${
                isCurrentDay ? 'ring-2 ring-inset ring-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between shrink-0 mb-0.5 gap-0.5">
                <span
                  className={`text-xs font-semibold ${
                    isCurrentDay ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {nationalHoliday && (
                  <span
                    className="text-[8px] px-1 py-0 rounded bg-emerald-500/20 text-emerald-700 truncate max-w-[72px]"
                    title={pt ? (nationalHoliday as { name: string }).name : (nationalHoliday as { nameEn: string }).nameEn}
                  >
                    {pt ? (nationalHoliday as { name: string }).name.split(' ')[0] : 'Holiday'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
                {visibleVacations.map((vacation) => {
                  const employee = employees.find((e) => e.id === vacation.employeeId);
                  return (
                    <div
                      key={`vac-${vacation.employeeId}-${vacation.year}`}
                      className="text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white bg-teal-600"
                      title={`${employee?.firstName} ${employee?.lastName}: ${t.employeeVacation}`}
                    >
                      {selectedEmployee === 'all'
                        ? `${employee?.firstName} (${t.employeeVacation})`
                        : t.employeeVacation}
                    </div>
                  );
                })}
                {visibleAbsences.map((absence) => {
                  const employee = employees.find((e) => e.id === absence.employeeId);
                  const typeInfo = ABSENCE_TYPE_INFO[absence.type as AbsenceType];
                  const label = pt ? typeInfo.labelPt : typeInfo.labelEn;

                  return (
                    <div
                      key={absence.id}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white ${getAbsenceColor(absence.type)}`}
                      title={`${employee?.firstName} ${employee?.lastName}: ${label}`}
                    >
                      {selectedEmployee === 'all' ? employee?.firstName : label.substring(0, 12)}
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <div className="text-[9px] text-muted-foreground px-0.5">+{hiddenCount}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 md:hidden border-t border-border/50 px-3 py-1.5">{legend}</div>
    </div>
  );

  const listColSpan = showBranchColumn ? 7 : 6;

  const listTable = (
    <table className="w-full min-w-[800px] text-sm">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{t.employee}</th>
          {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
          <th className={ATTENDANCE_TH}>{t.type}</th>
          <th className={ATTENDANCE_TH}>{t.period}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.days}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.status}</th>
          <th className={`${ATTENDANCE_TH_CENTER} w-12`}>{t.actions}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {monthAbsences.length === 0 && monthVacations.length === 0 ? (
          <tr>
            <td colSpan={listColSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
              {t.noAbsences}
            </td>
          </tr>
        ) : (
          <>
          {monthVacations.map((vacation) => {
            const employee = employees.find((e) => e.id === vacation.employeeId);
            const branchName = employee?.branchId ? getBranch(employee.branchId)?.name : '—';
            const status = getHolidayStatus(vacation.employeeId, vacation.year);

            return (
              <tr key={`vac-${vacation.employeeId}-${vacation.year}`} className="hover:bg-muted/20 bg-teal-500/5">
                <td className={ATTENDANCE_TD}>
                  <span className="font-medium text-sm">
                    {employee ? `${employee.firstName} ${employee.lastName}` : '—'}
                  </span>
                </td>
                {showBranchColumn && (
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                )}
                <td className={ATTENDANCE_TD}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-teal-500" />
                    <span className="text-xs">{t.employeeVacation}</span>
                  </div>
                </td>
                <td className={`${ATTENDANCE_TD} text-xs whitespace-nowrap`}>
                  {format(new Date(vacation.startDate!), 'dd/MM/yyyy')}
                  {vacation.startDate !== vacation.endDate && (
                    <> — {format(new Date(vacation.endDate!), 'dd/MM/yyyy')}</>
                  )}
                </td>
                <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                  <Badge variant="outline" className="text-[10px]">
                    {vacation.daysUsed}d
                  </Badge>
                </td>
                <td className={`${ATTENDANCE_TD} text-center`}>
                  <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-500/30">
                    {status}
                  </Badge>
                </td>
                <td className={ATTENDANCE_TD}>
                  <span className="text-[10px] text-muted-foreground">{t.managedInHolidays}</span>
                </td>
              </tr>
            );
          })}
          {monthAbsences.map((absence) => {
            const employee = employees.find((e) => e.id === absence.employeeId);
            const typeInfo = ABSENCE_TYPE_INFO[absence.type as AbsenceType];
            const label = pt ? typeInfo.labelPt : typeInfo.labelEn;
            const branchName = employee?.branchId ? getBranch(employee.branchId)?.name : '—';

            return (
              <tr key={absence.id} className="hover:bg-muted/20">
                <td className={ATTENDANCE_TD}>
                  <span className="font-medium text-sm">
                    {employee ? `${employee.firstName} ${employee.lastName}` : '—'}
                  </span>
                </td>
                {showBranchColumn && (
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                )}
                <td className={ATTENDANCE_TD}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getAbsenceColor(absence.type)}`} />
                    <span className="text-xs">{label}</span>
                  </div>
                </td>
                <td className={`${ATTENDANCE_TD} text-xs whitespace-nowrap`}>
                  {format(new Date(absence.startDate), 'dd/MM/yyyy')}
                  {absence.startDate !== absence.endDate && (
                    <> — {format(new Date(absence.endDate), 'dd/MM/yyyy')}</>
                  )}
                </td>
                <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                  <Badge variant="outline" className="text-[10px]">
                    {absence.days}d
                  </Badge>
                </td>
                <td className={`${ATTENDANCE_TD} text-center`}>{getStatusBadge(absence.status)}</td>
                <td className={ATTENDANCE_TD}>
                  <div className="flex justify-center">
                    {canDelete ? (
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
                            <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteAbsence(absence.id)}
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
            );
          })}
          </>
        )}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 h-full w-full">
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as 'calendar' | 'list')}
          className="flex flex-col flex-1 min-h-0 gap-1"
        >
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <TabsList className="h-8 bg-muted/40 p-0.5">
              <TabsTrigger value="calendar" className="text-xs gap-1.5 h-7 px-3">
                <CalendarIcon className="h-3.5 w-3.5" />
                {t.viewCalendar}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs gap-1.5 h-7 px-3">
                <List className="h-3.5 w-3.5" />
                {t.viewList}
                {(monthAbsences.length > 0 || monthVacations.length > 0) && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {monthAbsences.length + monthVacations.length}
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1 shrink-0 bg-muted/50 rounded-md px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth(-1)}
                disabled={!canGoBack}
                title={t.prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select
                value={String(viewMonth)}
                onValueChange={(v) => applyViewPeriod(Number(v), viewYear)}
              >
                <SelectTrigger className="h-7 w-[110px] text-xs border-0 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} disabled={opt.disabled}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(viewYear)}
                onValueChange={(v) => applyViewPeriod(viewMonth, Number(v))}
              >
                <SelectTrigger className="h-7 w-[72px] text-xs border-0 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth(1)}
                disabled={!canGoForward}
                title={t.nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isCurrentPeriod && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={goToToday}
                >
                  {t.today}
                </Button>
              )}
            </div>

            {!canRegisterInPeriod && !isCurrentPeriod && (
              <span className="text-[10px] text-muted-foreground hidden lg:inline max-w-[220px] truncate ml-auto">
                {t.viewOnlyPeriod}
              </span>
            )}

            {canCreate && (
              <Button
                size="sm"
                className="h-8 text-xs shrink-0 ml-auto"
                disabled={!canRegisterInPeriod}
                title={!canRegisterInPeriod ? t.registerBlocked : undefined}
                onClick={() => setAbsenceDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t.addAbsence}
              </Button>
            )}
          </div>

          <div className="relative flex-1 min-h-0">
            <TabsContent
              value="calendar"
              className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
            >
              <div className="flex flex-col flex-1 min-h-0 h-full rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="shrink-0 border-b border-border/50">{calendarToolbar}</div>
                <div className="flex-1 min-h-0 overflow-hidden">{calendarGrid}</div>
              </div>
            </TabsContent>

            <TabsContent
              value="list"
              className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden outline-none"
            >
              <AttendanceTablePanel toolbar={listToolbar}>{listTable}</AttendanceTablePanel>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <AbsenceDialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen} />
    </>
  );
}
