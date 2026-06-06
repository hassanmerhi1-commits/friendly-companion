import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Save, Search, CalendarIcon, Check, X, Clock, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDailyAttendanceStore, type DailyStatus } from '@/stores/daily-attendance-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { buildBulkEntriesFromDailyMarks } from '@/lib/daily-attendance-aggregate';
import { usePayrollStore } from '@/stores/payroll-store';
import { format, addDays, subDays, isToday, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

interface LocalMark {
  employeeId: string;
  status: DailyStatus;
  delayHours: number;
}

interface DailyAttendanceMarkingProps {
  embedded?: boolean;
  branchFilter?: string;
}

export function DailyAttendanceMarking({ embedded = false, branchFilter }: DailyAttendanceMarkingProps) {
  const { language } = useLanguage();
  const employees = useEmployeeStore((state) => state.employees);
  const { getActiveBranches, getBranch } = useBranchStore();
  const { currentUser } = useAuthStore();
  const { markAttendance, getRecordForEmployeeDate, getMonthlyAggregation, isLoaded, loadRecords } = useDailyAttendanceStore();
  const { saveBulkEntries } = useBulkAttendanceStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>(currentUser?.branchId || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [localMarks, setLocalMarks] = useState<Record<string, LocalMark>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const branches = getActiveBranches();
  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.status === 'active'),
    [employees]
  );
  const isBranchLocked = !!currentUser?.branchId && currentUser?.role !== 'admin';
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Can only edit today and yesterday (unless admin)
  // Daily marking has its own date logic — ignore parent readOnly
  // Admin can edit any day; others can edit today and yesterday
  const canEdit = useMemo(() => {
    if (currentUser?.role === 'admin') return true;
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(today, 1));
    const sel = startOfDay(selectedDate);
    // Any authenticated user (including shop users) can mark today/yesterday
    return sel >= yesterday && sel <= today;
  }, [selectedDate, currentUser]);

  // Prevent selecting future dates
  const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

  useEffect(() => {
    if (!isLoaded) loadRecords();
  }, [isLoaded, loadRecords]);

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  // Load existing marks for selected date
  useEffect(() => {
    const marks: Record<string, LocalMark> = {};
    activeEmployees.forEach(emp => {
      const record = getRecordForEmployeeDate(emp.id, dateStr);
      if (record) {
        marks[emp.id] = {
          employeeId: emp.id,
          status: record.status,
          delayHours: record.delayHours,
        };
      }
    });
    setLocalMarks(marks);
    setHasChanges(false);
  }, [dateStr, activeEmployees, getRecordForEmployeeDate]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    let emps = activeEmployees;
    const branchFilter = isBranchLocked ? currentUser?.branchId : selectedBranch;
    if (branchFilter && branchFilter !== 'all') {
      emps = emps.filter(e => e.branchId === branchFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      emps = emps.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
        e.employeeNumber?.toLowerCase().includes(term)
      );
    }
    return emps.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [activeEmployees, selectedBranch, searchTerm, isBranchLocked, currentUser]);

  const setMark = (employeeId: string, status: DailyStatus) => {
    setLocalMarks(prev => ({
      ...prev,
      [employeeId]: {
        employeeId,
        status,
        delayHours: status === 'late' ? (prev[employeeId]?.delayHours || 1) : 0,
      },
    }));
    setHasChanges(true);
  };

  const setDelayHours = (employeeId: string, hours: number) => {
    setLocalMarks(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        delayHours: Math.max(0, Math.min(8, hours)),
      },
    }));
    setHasChanges(true);
  };

  // Mark all visible employees as present
  const markAllPresent = () => {
    const marks: Record<string, LocalMark> = { ...localMarks };
    filteredEmployees.forEach(emp => {
      if (!marks[emp.id]) {
        marks[emp.id] = { employeeId: emp.id, status: 'present', delayHours: 0 };
      }
    });
    setLocalMarks(marks);
    setHasChanges(true);
  };

  // Check if this date's month has a cutoff date (from manual close OR payroll calculation)
  const { periods } = usePayrollStore();
  
  const getTargetMonth = (date: Date): { month: number; year: number } => {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if there's ANY period for this month with a cutoff date (regardless of status)
    const period = periods.find(
      p => p.month === month && p.year === year && p.cutoffDate
    );
    
    // If period exists and has a cutoff, and this date is AFTER the cutoff → carry to next month
    if (period && period.cutoffDate && dateStr > period.cutoffDate) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return { month: nextMonth, year: nextYear };
    }
    
    return { month, year };
  };

  // Save daily marks and auto-aggregate into monthly totals
  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    setIsSaving(true);

    try {
      const marksToSave = Object.values(localMarks);
      
      // Save each daily mark (always stored with actual date)
      for (const mark of marksToSave) {
        await markAttendance({
          employeeId: mark.employeeId,
          date: dateStr,
          status: mark.status,
          delayHours: mark.delayHours,
          markedBy: currentUser?.id || '',
          branchId: currentUser?.branchId || undefined,
        });
      }

      const target = getTargetMonth(selectedDate);
      const isCarriedForward =
        target.month !== selectedDate.getMonth() + 1 || target.year !== selectedDate.getFullYear();
      const employeeIds = [...new Set(marksToSave.map((m) => m.employeeId))];
      const bulkEntries = buildBulkEntriesFromDailyMarks(
        employeeIds,
        selectedDate,
        activeEmployees,
        periods
      );

      if (bulkEntries.length > 0) {
        await saveBulkEntries(bulkEntries);
      }

      setHasChanges(false);
      
      if (isCarriedForward) {
        toast.success(
          language === 'pt'
            ? `${marksToSave.length} presenças registadas — contabilizadas para ${target.month}/${target.year} (após fecho do mês)`
            : `${marksToSave.length} marks saved — counted for ${target.month}/${target.year} (after payroll cutoff)`
        );
      } else {
        toast.success(
          language === 'pt'
            ? `${marksToSave.length} presenças registadas com sucesso`
            : `${marksToSave.length} attendance marks saved successfully`
        );
      }
    } catch (error) {
      console.error('[DailyAttendance] Save error:', error);
      toast.error(language === 'pt' ? 'Erro ao guardar presenças' : 'Error saving attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateDay = (dir: -1 | 1) => {
    const newDate = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1);
    if (!isAfter(startOfDay(newDate), startOfDay(new Date()))) {
      setSelectedDate(newDate);
    }
  };

  // Count stats for today
  const stats = useMemo(() => {
    const marks = Object.values(localMarks);
    return {
      present: marks.filter(m => m.status === 'present' || m.status === 'late').length,
      absent: marks.filter(m => m.status === 'absent').length,
      justified: marks.filter(m => m.status === 'justified').length,
      late: marks.filter(m => m.status === 'late').length,
      unmarked: filteredEmployees.length - marks.filter(m => filteredEmployees.some(e => e.id === m.employeeId)).length,
    };
  }, [localMarks, filteredEmployees]);

  // Check if current date is after cutoff
  const isAfterCutoff = useMemo(() => {
    const target = getTargetMonth(selectedDate);
    return target.month !== (selectedDate.getMonth() + 1) || target.year !== selectedDate.getFullYear();
  }, [selectedDate, periods]);

  const carriedTargetLabel = useMemo(() => {
    if (!isAfterCutoff) return '';
    const target = getTargetMonth(selectedDate);
    const monthNames = language === 'pt' 
      ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[target.month - 1]} ${target.year}`;
  }, [isAfterCutoff, selectedDate, periods, language]);

  const t = {
    title: language === 'pt' ? 'Marcação Diária de Presenças' : 'Daily Attendance Marking',
    desc: language === 'pt' ? 'Marque a presença de cada funcionário para o dia selecionado' : 'Mark each employee\'s attendance for the selected day',
    present: language === 'pt' ? 'Presente' : 'Present',
    absent: language === 'pt' ? 'Ausente' : 'Absent',
    late: language === 'pt' ? 'Atrasado' : 'Late',
    justified: language === 'pt' ? 'Justificada' : 'Justified',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    branch: language === 'pt' ? 'Filial' : 'Branch',
    status: language === 'pt' ? 'Estado' : 'Status',
    delay: language === 'pt' ? 'Horas Atraso' : 'Delay Hours',
    save: language === 'pt' ? 'Guardar Presenças' : 'Save Attendance',
    markAll: language === 'pt' ? 'Marcar Todos Presente' : 'Mark All Present',
    allBranches: language === 'pt' ? 'Todas as Filiais' : 'All Branches',
    search: language === 'pt' ? 'Pesquisar...' : 'Search...',
    readOnlyMsg: language === 'pt' ? 'Apenas pode editar hoje e ontem' : 'Can only edit today and yesterday',
    futureMsg: language === 'pt' ? 'Não pode marcar presença em datas futuras' : 'Cannot mark attendance for future dates',
    unmarked: language === 'pt' ? 'Não marcado' : 'Unmarked',
    summary: language === 'pt' ? 'Resumo' : 'Summary',
    carryForward: language === 'pt' 
      ? `Presenças fechadas — estas marcações serão contabilizadas em` 
      : `Attendance closed — these marks will count for`,
  };

  const getStatusBadge = (status?: DailyStatus) => {
    switch (status) {
      case 'present': return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">{t.present}</Badge>;
      case 'absent': return <Badge variant="destructive">{t.absent}</Badge>;
      case 'late': return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">{t.late}</Badge>;
      case 'justified': return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">{t.justified}</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">{t.unmarked}</Badge>;
    }
  };

  const dateNavigator = (
    <div className="flex items-center gap-0.5 bg-muted/50 rounded-md px-1 shrink-0">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-medium px-2">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(selectedDate, 'dd/MM/yyyy')}
            {isToday(selectedDate) && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                {language === 'pt' ? 'Hoje' : 'Today'}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { if (date) { setSelectedDate(date); setCalendarOpen(false); } }}
            disabled={(date) => isAfter(startOfDay(date), startOfDay(new Date()))}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => navigateDay(1)}
        disabled={isToday(selectedDate)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const showBranchPicker = !isBranchLocked && !branchFilter;

  const actionButtons = canEdit && !isFutureDate ? (
    <>
      <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={markAllPresent}>
        <Check className="h-3.5 w-3.5 mr-1" />
        {t.markAll}
      </Button>
      <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleSave} disabled={!hasChanges || isSaving}>
        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
        {t.save}
      </Button>
    </>
  ) : !isFutureDate ? (
    <p className="text-xs text-muted-foreground italic shrink-0">{t.readOnlyMsg}</p>
  ) : (
    <p className="text-xs text-destructive italic shrink-0">{t.futureMsg}</p>
  );

  const statsRow = (
    <div className="flex items-center gap-2 text-xs shrink-0">
      <span className="text-emerald-600 font-medium">✓ {stats.present}</span>
      <span className="text-destructive font-medium">✗ {stats.absent}</span>
      <span className="text-amber-600 font-medium">◷ {stats.late}</span>
      <span className="text-blue-600 font-medium">📋 {stats.justified}</span>
    </div>
  );

  const showBranchColumn = showBranchPicker || (!isBranchLocked && !embedded);
  const tableColSpan = showBranchColumn ? 5 : 4;

  if (embedded) {
    return (
      <AttendanceTablePanel
        toolbar={
          <div className="flex flex-col gap-1.5 px-3 py-2">
            {isAfterCutoff && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                <Clock className="h-3 w-3 shrink-0" />
                {t.carryForward} <strong>{carriedTargetLabel}</strong>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {dateNavigator}
              <div className="relative flex-1 min-w-[120px] max-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              {statsRow}
              {showBranchPicker && (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
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
              {actionButtons}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead className={ATTENDANCE_THEAD}>
            <tr>
              <th className={`${ATTENDANCE_TH} w-10`}>#</th>
              <th className={ATTENDANCE_TH}>{t.employee}</th>
              {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
              <th className={ATTENDANCE_TH_CENTER}>{t.status}</th>
              <th className={`${ATTENDANCE_TH_CENTER} w-24`}>{t.delay}</th>
            </tr>
          </thead>
          <tbody className={ATTENDANCE_TBODY}>
            {filteredEmployees.map((emp, idx) => {
              const mark = localMarks[emp.id];
              const isLate = mark?.status === 'late';
              const branchName = emp.branchId ? getBranch(emp.branchId)?.name : '—';

              return (
                <tr key={emp.id} className={mark?.status === 'absent' ? 'bg-destructive/5' : 'hover:bg-muted/20'}>
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{idx + 1}</td>
                  <td className={ATTENDANCE_TD}>
                    <span className="font-medium text-sm">{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{emp.employeeNumber}</span>
                  </td>
                  {showBranchColumn && (
                    <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                  )}
                  <td className={`${ATTENDANCE_TD} text-center`}>
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && !isFutureDate ? (
                        <>
                          <Button
                            size="icon"
                            variant={mark?.status === 'present' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${mark?.status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                            onClick={() => setMark(emp.id, 'present')}
                            title={t.present}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={mark?.status === 'absent' ? 'destructive' : 'outline'}
                            className="h-8 w-8"
                            onClick={() => setMark(emp.id, 'absent')}
                            title={t.absent}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={mark?.status === 'late' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${mark?.status === 'late' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                            onClick={() => setMark(emp.id, 'late')}
                            title={t.late}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={mark?.status === 'justified' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${mark?.status === 'justified' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            onClick={() => setMark(emp.id, 'justified')}
                            title={t.justified}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        getStatusBadge(mark?.status)
                      )}
                    </div>
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center`}>
                    {isLate && canEdit && !isFutureDate ? (
                      <Input
                        type="number"
                        min={0}
                        max={8}
                        step={0.5}
                        value={mark.delayHours}
                        onChange={(e) => setDelayHours(emp.id, parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-center mx-auto"
                      />
                    ) : isLate ? (
                      <span className="text-amber-600 font-medium text-sm">{mark.delayHours}h</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={tableColSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  {language === 'pt' ? 'Nenhum funcionário encontrado' : 'No employees found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AttendanceTablePanel>
    );
  }

  return (
    <Card>
      <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
              {isAfterCutoff && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-700 dark:text-amber-400 font-medium">
                  <Clock className="h-4 w-4 shrink-0" />
                  {t.carryForward} <strong>{carriedTargetLabel}</strong>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">{dateNavigator}</div>
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-3">
            {showBranchPicker && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px]">
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
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {statsRow}
          </div>

          <div className="flex items-center gap-2 mt-3">{actionButtons}</div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table embedded stickyHeader>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t.employee}</TableHead>
                {showBranchColumn ? <TableHead>{t.branch}</TableHead> : null}
                <TableHead className="text-center">{t.status}</TableHead>
                <TableHead className="text-center w-[100px]">{t.delay}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp, idx) => {
                const mark = localMarks[emp.id];
                const isLate = mark?.status === 'late';
                const branchName = emp.branchId ? getBranch(emp.branchId)?.name : '—';

                return (
                  <TableRow
                    key={emp.id}
                    className={mark?.status === 'absent' ? 'bg-destructive/5' : ''}
                  >
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{emp.employeeNumber}</span>
                      </div>
                    </TableCell>
                    {showBranchColumn && (
                      <TableCell className="text-sm text-muted-foreground">{branchName}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && !isFutureDate ? (
                          <>
                            <Button
                              size="icon"
                              variant={mark?.status === 'present' ? 'default' : 'outline'}
                              className={`h-8 w-8 ${mark?.status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                              onClick={() => setMark(emp.id, 'present')}
                              title={t.present}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={mark?.status === 'absent' ? 'destructive' : 'outline'}
                              className="h-8 w-8"
                              onClick={() => setMark(emp.id, 'absent')}
                              title={t.absent}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={mark?.status === 'late' ? 'default' : 'outline'}
                              className={`h-8 w-8 ${mark?.status === 'late' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                              onClick={() => setMark(emp.id, 'late')}
                              title={t.late}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={mark?.status === 'justified' ? 'default' : 'outline'}
                              className={`h-8 w-8 ${mark?.status === 'justified' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                              onClick={() => setMark(emp.id, 'justified')}
                              title={t.justified}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          getStatusBadge(mark?.status)
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isLate && canEdit && !isFutureDate ? (
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          step={0.5}
                          value={mark.delayHours}
                          onChange={e => setDelayHours(emp.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-center mx-auto"
                        />
                      ) : isLate ? (
                        <span className="text-amber-600 font-medium">{mark.delayHours}h</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="text-center py-8 text-muted-foreground">
                    {language === 'pt' ? 'Nenhum funcionário encontrado' : 'No employees found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
