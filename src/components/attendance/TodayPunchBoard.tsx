import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  Clock,
  LogIn,
  LogOut,
  Search,
  Loader2,
  UserCheck,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useAuthStore } from '@/stores/auth-store';
import { useAttendanceStore } from '@/stores/attendance-store';
import { useDailyAttendanceStore } from '@/stores/daily-attendance-store';
import type { AttendanceStatus } from '@/types/attendance';
import { toast } from 'sonner';

interface TodayPunchBoardProps {
  branchFilter?: string;
}

export function TodayPunchBoard({ branchFilter }: TodayPunchBoardProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { employees } = useEmployeeStore();
  const { getBranch, getActiveBranches } = useBranchStore();
  const { currentUser, hasPermission } = useAuthStore();
  const {
    records,
    clockIn,
    clockOut,
    loadAttendance,
    isLoaded,
    isEmployeeClockedIn,
    getTodayAttendance,
    setManualClockTime,
    clearTodayPunch,
  } = useAttendanceStore();
  const { getRecordForEmployeeDate, isLoaded: dailyLoaded, loadRecords } = useDailyAttendanceStore();

  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState<{ employeeId: string; field: 'clockIn' | 'clockOut' } | null>(null);
  const [timeDraft, setTimeDraft] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(currentUser?.branchId || 'all');

  const branches = getActiveBranches();

  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const canPunch = isAdmin || hasPermission('attendance.create') || hasPermission('attendance.edit');
  const canEditTimes = isAdmin || hasPermission('attendance.edit');
  const canClearPunch =
    isAdmin || hasPermission('attendance.delete') || hasPermission('attendance.edit');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isBranchLocked = !!currentUser?.branchId && currentUser?.role !== 'admin';
  const showBranchPicker = !isBranchLocked && !branchFilter;
  const effectiveBranchId =
    branchFilter ||
    (isBranchLocked ? currentUser?.branchId : selectedBranch !== 'all' ? selectedBranch : undefined);
  const showBranchColumn = !isBranchLocked && !effectiveBranchId;

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded) loadAttendance();
  }, [isLoaded, loadAttendance]);

  useEffect(() => {
    if (!dailyLoaded) loadRecords();
  }, [dailyLoaded, loadRecords]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    let list = activeEmployees;
    if (effectiveBranchId) {
      list = list.filter((e) => e.branchId === effectiveBranchId);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.employeeNumber || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [activeEmployees, effectiveBranchId, search]);

  const todayRecords = useMemo(
    () => records.filter((r) => r.date === todayStr),
    [records, todayStr]
  );

  const stats = useMemo(() => {
    let working = 0;
    let completed = 0;
    let late = 0;
    let notClocked = 0;

    filteredEmployees.forEach((emp) => {
      const record = todayRecords.find((r) => r.employeeId === emp.id);
      if (record?.clockIn && !record.clockOut) {
        working++;
        if (record.lateMinutes > 0) late++;
      } else if (record?.clockIn && record.clockOut) {
        completed++;
        if (record.lateMinutes > 0) late++;
      } else {
        notClocked++;
      }
    });

    return { working, completed, late, notClocked, total: filteredEmployees.length };
  }, [filteredEmployees, todayRecords]);

  const t = {
    search: pt ? 'Pesquisar...' : 'Search...',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    employee: pt ? 'Funcionário' : 'Employee',
    branch: pt ? 'Filial' : 'Branch',
    dailyMark: pt ? 'Marcação' : 'Daily',
    clockIn: pt ? 'Entrada' : 'In',
    clockOut: pt ? 'Saída' : 'Out',
    worked: pt ? 'Trabalhado' : 'Worked',
    overtime: pt ? 'Extra' : 'OT',
    status: pt ? 'Estado' : 'Status',
    actions: pt ? 'Acções' : 'Actions',
    working: pt ? 'A trabalhar' : 'Working',
    completed: pt ? 'Concluído' : 'Done',
    notClocked: pt ? 'Sem ponto' : 'No punch',
    late: pt ? 'Atrasado' : 'Late',
    clockInOk: pt ? 'Entrada registada' : 'Clock in recorded',
    clockOutOk: pt ? 'Saída registada' : 'Clock out recorded',
    alreadyIn: pt ? 'Já registou entrada' : 'Already clocked in',
    notIn: pt ? 'Sem entrada registada' : 'Not clocked in',
    done: pt ? 'Dia concluído' : 'Day completed',
    noEmployees: pt ? 'Nenhum funcionário' : 'No employees',
    noPermission: pt ? 'Sem permissão para registar ponto' : 'No permission to punch',
    editTime: pt ? 'Editar hora' : 'Edit time',
    saveTime: pt ? 'Guardar' : 'Save',
    timeSaved: pt ? 'Hora actualizada' : 'Time updated',
    saveFailed: pt ? 'Erro ao guardar hora' : 'Error saving time',
    punchFailed: pt ? 'Erro ao registar ponto' : 'Error saving punch',
    clearPunch: pt ? 'Limpar ponto' : 'Clear punch',
    clearPunchTitle: pt ? 'Limpar registo de hoje?' : 'Clear today\'s punch?',
    clearPunchDesc: pt
      ? 'Remove entrada, saída e estado de ponto de hoje. O funcionário fica sem registo de ponto.'
      : 'Removes today\'s clock in, clock out and punch status. Employee will have no punch record.',
    clearPunchOk: pt ? 'Ponto limpo' : 'Punch cleared',
    clearPunchFailed: pt ? 'Erro ao limpar ponto' : 'Error clearing punch',
    cancel: pt ? 'Cancelar' : 'Cancel',
    confirm: pt ? 'Limpar' : 'Clear',
    noClearPermission: pt ? 'Sem permissão para limpar ponto' : 'No permission to clear punch',
    statusLabels: {
      clocked_in: pt ? 'A trabalhar' : 'Working',
      clocked_out: pt ? 'Concluído' : 'Completed',
      absent: pt ? 'Ausente' : 'Absent',
      late: pt ? 'Atrasado' : 'Late',
      early_leave: pt ? 'Saída cedo' : 'Early leave',
    } as Record<AttendanceStatus, string>,
    dailyStatus: {
      present: pt ? 'Presente' : 'Present',
      absent: pt ? 'Ausente' : 'Absent',
      late: pt ? 'Atrasado' : 'Late',
      justified: pt ? 'Justificado' : 'Justified',
    },
  };

  const formatDuration = (minutes: number) => {
    if (minutes <= 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatClock = (iso?: string) => {
    if (!iso) return '—';
    return format(new Date(iso), 'HH:mm');
  };

  const getStatusBadge = (record: ReturnType<typeof getTodayAttendance>) => {
    if (!record?.clockIn) {
      return <Badge variant="outline" className="text-[10px]">{t.notClocked}</Badge>;
    }
    if (record.clockIn && !record.clockOut) {
      return (
        <Badge className="bg-emerald-600 text-[10px]">
          <UserCheck className="h-3 w-3 mr-0.5" />
          {t.working}
        </Badge>
      );
    }
    return <Badge variant="secondary" className="text-[10px]">{t.completed}</Badge>;
  };

  const getDailyBadge = (employeeId: string) => {
    const mark = getRecordForEmployeeDate(employeeId, todayStr);
    if (!mark) return <span className="text-muted-foreground text-[10px]">—</span>;
    const colors: Record<string, string> = {
      present: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      absent: 'bg-destructive/15 text-destructive border-destructive/30',
      late: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      justified: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    };
    return (
      <Badge variant="outline" className={`text-[10px] ${colors[mark.status] || ''}`}>
        {t.dailyStatus[mark.status as keyof typeof t.dailyStatus] || mark.status}
      </Badge>
    );
  };

  const handleClockIn = async (employeeId: string) => {
    setBusyId(employeeId);
    try {
      const result = await clockIn(employeeId);
      if (result) {
        toast.success(t.clockInOk);
      } else {
        toast.error(t.alreadyIn);
      }
    } catch {
      toast.error(t.punchFailed);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveTime = async (employeeId: string, field: 'clockIn' | 'clockOut') => {
    if (!timeDraft) return;
    setBusyId(employeeId);
    try {
      const ok = await setManualClockTime(employeeId, field, timeDraft);
      if (ok) {
        await loadAttendance();
        toast.success(t.timeSaved);
        setEditTime(null);
        setTimeDraft('');
      } else {
        toast.error(t.saveFailed);
      }
    } catch {
      toast.error(t.saveFailed);
    } finally {
      setBusyId(null);
    }
  };

  const openTimeEditor = (employeeId: string, field: 'clockIn' | 'clockOut', current?: string) => {
    setEditTime({ employeeId, field });
    setTimeDraft(current && current !== '—' ? current : format(new Date(), 'HH:mm'));
  };

  const renderTimeCell = (
    employeeId: string,
    field: 'clockIn' | 'clockOut',
    display: string,
    extra?: React.ReactNode
  ) => {
    const isEditing = editTime?.employeeId === employeeId && editTime.field === field;

    if (!canEditTimes) {
      return (
        <div>
          <span>{display}</span>
          {extra}
        </div>
      );
    }

    return (
      <Popover
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) setEditTime(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary hover:underline cursor-pointer"
            onClick={() => openTimeEditor(employeeId, field, display)}
          >
            {display}
            <Pencil className="h-3 w-3 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2" align="center">
          <div className="space-y-2">
            <Input
              type="time"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              disabled={!timeDraft || busyId === employeeId}
              onClick={() => handleSaveTime(employeeId, field)}
            >
              {busyId === employeeId ? <Loader2 className="h-3 w-3 animate-spin" /> : t.saveTime}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const hasAnyTodayRecord = (employeeId: string) =>
    todayRecords.some((r) => r.employeeId === employeeId);

  const handleClearPunch = async (employeeId: string) => {
    setBusyId(employeeId);
    try {
      const ok = await clearTodayPunch(employeeId);
      if (ok) {
        toast.success(t.clearPunchOk);
      } else {
        toast.error(t.clearPunchFailed);
      }
    } catch {
      toast.error(t.clearPunchFailed);
    } finally {
      setBusyId(null);
    }
  };

  const handleClockOut = async (employeeId: string) => {
    setBusyId(employeeId);
    try {
      const result = await clockOut(employeeId);
      if (result) {
        toast.success(t.clockOutOk);
      } else {
        toast.error(t.notIn);
      }
    } catch {
      toast.error(t.punchFailed);
    } finally {
      setBusyId(null);
    }
  };

  const colSpan = showBranchColumn ? 10 : 9;

  return (
    <AttendanceTablePanel
      toolbar={
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md bg-muted/50 font-mono">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold tabular-nums">{format(currentTime, 'HH:mm:ss')}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {format(currentTime, 'dd/MM/yyyy')}
            </span>
          </div>

          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
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
              <SelectTrigger className="h-8 w-[140px] text-xs shrink-0">
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

          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-emerald-600 font-medium">● {stats.working} {t.working}</span>
            <span className="text-muted-foreground font-medium">✓ {stats.completed} {t.completed}</span>
            <span className="text-muted-foreground">○ {stats.notClocked}</span>
            {stats.late > 0 && (
              <span className="text-amber-600 font-medium flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" />
                {stats.late} {t.late}
              </span>
            )}
          </div>
        </div>
      }
    >
      <table className="w-full min-w-[960px] text-sm">
        <thead className={ATTENDANCE_THEAD}>
          <tr>
            <th className={`${ATTENDANCE_TH} w-10`}>#</th>
            <th className={`${ATTENDANCE_TH} min-w-[140px]`}>{t.employee}</th>
            {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
            <th className={ATTENDANCE_TH_CENTER}>{t.dailyMark}</th>
            <th className={ATTENDANCE_TH_CENTER}>{t.clockIn}</th>
            <th className={ATTENDANCE_TH_CENTER}>{t.clockOut}</th>
            <th className={ATTENDANCE_TH_CENTER}>{t.worked}</th>
            <th className={ATTENDANCE_TH_CENTER}>{t.overtime}</th>
            <th className={ATTENDANCE_TH_CENTER}>{t.status}</th>
            <th className={`${ATTENDANCE_TH_CENTER} w-36`}>{t.actions}</th>
          </tr>
        </thead>
        <tbody className={ATTENDANCE_TBODY}>
            {filteredEmployees.map((emp, idx) => {
              const record = getTodayAttendance(emp.id);
              const isWorking = isEmployeeClockedIn(emp.id);
              const isCompleted = !!(record?.clockIn && record?.clockOut);
              const canIn = canPunch && !isWorking && !isCompleted;
              const canOut = canPunch && isWorking;
              const canClear = canClearPunch && hasAnyTodayRecord(emp.id);
              const isBusy = busyId === emp.id;
              const branchName = emp.branchId ? getBranch(emp.branchId)?.name : '—';

              return (
                <tr key={emp.id} className="hover:bg-muted/20">
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{idx + 1}</td>
                  <td className={ATTENDANCE_TD}>
                    <span className="font-medium text-sm">{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{emp.employeeNumber}</span>
                  </td>
                  {showBranchColumn && (
                    <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                  )}
                  <td className={`${ATTENDANCE_TD} text-center`}>{getDailyBadge(emp.id)}</td>
                  <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                    {renderTimeCell(emp.id, 'clockIn', formatClock(record?.clockIn), record && record.lateMinutes > 0 ? (
                      <span className="block text-[10px] text-amber-600">+{record.lateMinutes}m</span>
                    ) : undefined)}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                    {renderTimeCell(emp.id, 'clockOut', formatClock(record?.clockOut))}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                    {formatDuration(record?.workedMinutes || 0)}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                    {record && record.overtimeMinutes > 0 ? (
                      <Badge variant="outline" className="text-[10px] text-primary">
                        {formatDuration(record.overtimeMinutes)}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center`}>{getStatusBadge(record)}</td>
                  <td className={ATTENDANCE_TD}>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon"
                        variant={canIn ? 'default' : 'outline'}
                        className={`h-7 w-7 ${canIn ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        disabled={!canIn || isBusy}
                        onClick={() => handleClockIn(emp.id)}
                        title={!canPunch ? t.noPermission : isCompleted ? t.done : t.clockIn}
                      >
                        {isBusy && canIn ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={!canOut || isBusy}
                        onClick={() => handleClockOut(emp.id)}
                        title={!canPunch ? t.noPermission : t.clockOut}
                      >
                        {isBusy && canOut ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={!canClear || isBusy}
                            title={!canClearPunch ? t.noClearPermission : t.clearPunch}
                          >
                            {isBusy && canClear ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.clearPunchTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{t.clearPunchDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleClearPunch(emp.id)}
                            >
                              {t.confirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  {t.noEmployees}
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </AttendanceTablePanel>
  );
}
