import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfDay, isAfter, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useAuthStore } from '@/stores/auth-store';
import { useOvertimeRegisterStore } from '@/stores/overtime-register-store';
import { LABOR_LAW, calculateHourlyRate, calculateOvertime, formatAOA } from '@/lib/angola-labor-law';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

interface LocalOt {
  hoursNormal: string;
  hoursNight: string;
  hoursHoliday: string;
}

interface Props {
  embedded?: boolean;
  branchFilter?: string;
  readOnly?: boolean;
}

function emptyLocalOt(): LocalOt {
  return { hoursNormal: '', hoursNight: '', hoursHoliday: '' };
}

function buildLocalFromStore(
  employees: { id: string; status: string }[],
  dateStr: string,
  getEntryForEmployeeDate: (
    employeeId: string,
    date: string
  ) => { hoursNormal: number; hoursNight: number; hoursHoliday: number } | undefined
): Record<string, LocalOt> {
  const next: Record<string, LocalOt> = {};
  const fmt = (n: number | undefined) => {
    const v = Number(n) || 0;
    return v > 0 ? String(v) : '';
  };
  for (const emp of employees.filter((e) => e.status === 'active')) {
    const row = getEntryForEmployeeDate(emp.id, dateStr);
    next[emp.id] = row
      ? {
          hoursNormal: fmt(row.hoursNormal),
          hoursNight: fmt(row.hoursNight),
          hoursHoliday: fmt(row.hoursHoliday),
        }
      : emptyLocalOt();
  }
  return next;
}

export function OvertimeRegister({ embedded: _embedded = false, branchFilter, readOnly = false }: Props) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { employees } = useEmployeeStore();
  const { getActiveBranches, getBranch } = useBranchStore();
  const { currentUser } = useAuthStore();
  const {
    entries,
    isLoaded,
    loadEntries,
    saveEntry,
    getEntryForEmployeeDate,
    getHoursForEmployeePeriod,
  } = useOvertimeRegisterStore();

  // Default to yesterday — typical "register next day" workflow
  const [selectedDate, setSelectedDate] = useState<Date>(() => subDays(new Date(), 1));
  const [selectedBranch, setSelectedBranch] = useState<string>(
    currentUser?.branchId && currentUser?.role !== 'admin' ? currentUser.branchId : 'all'
  );
  const [search, setSearch] = useState('');
  const [local, setLocal] = useState<Record<string, LocalOt>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const branches = getActiveBranches();
  const isBranchLocked = !!currentUser?.branchId && currentUser?.role !== 'admin';
  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const canEdit = useMemo(() => {
    if (readOnly) return false;
    if (isAdmin) return true;
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(today, 1));
    const sel = startOfDay(selectedDate);
    return sel >= yesterday && sel <= today;
  }, [selectedDate, isAdmin, readOnly]);

  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

  useEffect(() => {
    if (!isLoaded) loadEntries();
  }, [isLoaded, loadEntries]);

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  // Date change: always reload from DB (new day form)
  useEffect(() => {
    setLocal(buildLocalFromStore(employees, dateStr, getEntryForEmployeeDate));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // Store sync: only when form is clean (never wipe typed rows mid-edit / mid-save)
  useEffect(() => {
    if (dirty || saving) return;
    setLocal(buildLocalFromStore(employees, dateStr, getEntryForEmployeeDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, employees, dirty, saving, dateStr]);

  const effectiveBranch = branchFilter || (selectedBranch !== 'all' ? selectedBranch : undefined);

  const branchEmployees = useMemo(() => {
    return employees
      .filter((e) => e.status === 'active')
      .filter((e) => !effectiveBranch || e.branchId === effectiveBranch);
  }, [employees, effectiveBranch]);

  const visibleEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchEmployees
      .filter((e) => {
        if (!q) return true;
        const name = `${e.firstName} ${e.lastName}`.toLowerCase();
        return name.includes(q) || (e.employeeNumber || '').toLowerCase().includes(q);
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt'));
  }, [branchEmployees, search]);

  const dayTotals = useMemo(() => {
    let n = 0;
    let night = 0;
    let h = 0;
    let people = 0;
    // Totals for the whole branch day (not only search-filtered rows)
    for (const emp of branchEmployees) {
      const row = local[emp.id];
      if (!row) continue;
      const hn = parseFloat(row.hoursNormal) || 0;
      const hy = parseFloat(row.hoursNight) || 0;
      const hh = parseFloat(row.hoursHoliday) || 0;
      if (hn + hy + hh > 0) {
        people += 1;
        n += hn;
        night += hy;
        h += hh;
      }
    }
    return { n, night, h, people, total: n + night + h };
  }, [branchEmployees, local]);

  const updateLocal = (empId: string, field: keyof LocalOt, value: string) => {
    setLocal((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] || emptyLocalOt()), [field]: value },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error(pt ? 'Não pode editar esta data' : 'Cannot edit this date');
      return;
    }
    // Snapshot BEFORE any await — store updates must not erase typed hours
    const snapshot: Record<string, LocalOt> = {};
    for (const [id, row] of Object.entries(local)) {
      snapshot[id] = { ...row };
    }

    setSaving(true);
    try {
      let saved = 0;
      // Save ALL branch employees with hours — ignore search filter
      for (const emp of branchEmployees) {
        const row = snapshot[emp.id];
        if (!row) continue;
        const hoursNormal = parseFloat(row.hoursNormal) || 0;
        const hoursNight = parseFloat(row.hoursNight) || 0;
        const hoursHoliday = parseFloat(row.hoursHoliday) || 0;
        const existing = getEntryForEmployeeDate(emp.id, dateStr);
        const had = !!(existing && existing.hoursNormal + existing.hoursNight + existing.hoursHoliday > 0);
        const has = hoursNormal + hoursNight + hoursHoliday > 0;
        if (!had && !has) continue;
        await saveEntry({
          employeeId: emp.id,
          date: dateStr,
          hoursNormal,
          hoursNight,
          hoursHoliday,
        });
        saved += 1;
      }
      setDirty(false);
      toast.success(
        pt
          ? `Registo HE guardado (${saved} funcionário(s)) — entra na folha ao Calcular`
          : `OT register saved (${saved} employee(s)) — added on payroll Calculate`
      );
    } catch (e: any) {
      toast.error(e?.message || (pt ? 'Erro ao guardar' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (delta: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      if (isAfter(startOfDay(next), startOfDay(new Date()))) return d;
      return next;
    });
  };

  const t = {
    title: pt ? 'Registo de Horas Extra' : 'Overtime Register',
    hint: pt
      ? 'Registe HE do dia (ex.: ontem). Ao Calcular a folha do mês, estas horas entram no salário automaticamente. Não é o pagamento diário em dinheiro.'
      : 'Register OT for the day (e.g. yesterday). On payroll Calculate, these hours are added to salary. Not the daily cash payment.',
    date: pt ? 'Data' : 'Date',
    branch: pt ? 'Filial' : 'Branch',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    search: pt ? 'Pesquisar...' : 'Search...',
    employee: pt ? 'Funcionário' : 'Employee',
    normal: pt ? 'Normais' : 'Normal',
    night: pt ? 'Nocturnas' : 'Night',
    holiday: pt ? 'Feriado/FDS' : 'Holiday/Rest',
    monthTotal: pt ? 'Mês' : 'Month',
    est: pt ? 'Est. dia' : 'Day est.',
    save: pt ? 'Guardar registo' : 'Save register',
    readOnly: pt ? 'Só leitura' : 'Read-only',
    future: pt ? 'Data futura não permitida' : 'Future date not allowed',
    rates: pt
      ? `Taxas: ${LABOR_LAW.OVERTIME.NORMAL_RATE_FIRST_30}x ≤${LABOR_LAW.OVERTIME.THRESHOLD_HOURS}h · ${LABOR_LAW.OVERTIME.NORMAL_RATE_OVER_30}x acima · Noite ${LABOR_LAW.OVERTIME.NIGHT_RATE}x · Feriado ${LABOR_LAW.OVERTIME.HOLIDAY_RATE}x`
      : `Rates: ${LABOR_LAW.OVERTIME.NORMAL_RATE_FIRST_30}x ≤${LABOR_LAW.OVERTIME.THRESHOLD_HOURS}h · ${LABOR_LAW.OVERTIME.NORMAL_RATE_OVER_30}x above · Night ${LABOR_LAW.OVERTIME.NIGHT_RATE}x · Holiday ${LABOR_LAW.OVERTIME.HOLIDAY_RATE}x`,
    people: pt ? 'com HE' : 'with OT',
    hours: pt ? 'horas' : 'hours',
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="shrink-0 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {t.hint}
        <div className="mt-1 text-[10px] opacity-80">{t.rates}</div>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 min-w-[140px]">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(selectedDate, 'dd/MM/yyyy')}
                {isToday(selectedDate) ? (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {pt ? 'Hoje' : 'Today'}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (!d) return;
                  if (isAfter(startOfDay(d), startOfDay(new Date()))) return;
                  setSelectedDate(d);
                  setCalendarOpen(false);
                }}
                disabled={(d) => isAfter(startOfDay(d), startOfDay(new Date()))}
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => shiftDate(1)}
            disabled={isFuture || isToday(selectedDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isBranchLocked && !branchFilter && (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder={t.branch} />
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

        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="h-8 pl-7 text-xs"
          />
        </div>

        <Badge variant="outline" className="h-7 text-[10px]">
          {dayTotals.people} {t.people} · {dayTotals.total.toFixed(1)} {t.hours}
        </Badge>

        <Button
          size="sm"
          className="h-8 ml-auto"
          onClick={handleSave}
          disabled={!canEdit || !dirty || saving || isFuture}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {t.save}
        </Button>
      </div>

      {!canEdit && (
        <div className="shrink-0 text-[11px] text-amber-700 dark:text-amber-300">
          {isFuture ? t.future : t.readOnly}
        </div>
      )}

      <AttendanceTablePanel className="flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead className={ATTENDANCE_THEAD}>
            <tr>
              <th className={ATTENDANCE_TH}>{t.employee}</th>
              <th className={ATTENDANCE_TH_CENTER}>{t.normal}</th>
              <th className={ATTENDANCE_TH_CENTER}>{t.night}</th>
              <th className={ATTENDANCE_TH_CENTER}>{t.holiday}</th>
              <th className={ATTENDANCE_TH_CENTER}>{t.monthTotal}</th>
              <th className={ATTENDANCE_TH_RIGHT}>{t.est}</th>
            </tr>
          </thead>
          <tbody className={ATTENDANCE_TBODY}>
            {visibleEmployees.map((emp) => {
              const row = local[emp.id] || { hoursNormal: '', hoursNight: '', hoursHoliday: '' };
              const hn = parseFloat(row.hoursNormal) || 0;
              const hy = parseFloat(row.hoursNight) || 0;
              const hh = parseFloat(row.hoursHoliday) || 0;
              const monthSum = getHoursForEmployeePeriod(emp.id, month, year);
              // Month total display should reflect unsaved edits for selected day
              const existingDay = getEntryForEmployeeDate(emp.id, dateStr);
              const oldDay =
                (existingDay?.hoursNormal || 0) +
                (existingDay?.hoursNight || 0) +
                (existingDay?.hoursHoliday || 0);
              const newDay = hn + hy + hh;
              const monthDisplay = monthSum.totalHours - oldDay + newDay;

              const hourly = calculateHourlyRate(emp.baseSalary || 0);
              const est =
                calculateOvertime(hourly, hn, 'normal', 0) +
                calculateOvertime(hourly, hy, 'night') +
                calculateOvertime(hourly, hh, 'holiday');

              const branchName = emp.branchId ? getBranch(emp.branchId)?.name : '';

              return (
                <tr key={emp.id}>
                  <td className={ATTENDANCE_TD}>
                    <div className="font-medium truncate max-w-[220px]">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {emp.employeeNumber || ''}
                      {branchName ? ` · ${branchName}` : ''}
                    </div>
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center`}>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.hoursNormal}
                      onChange={(e) => updateLocal(emp.id, 'hoursNormal', e.target.value)}
                      disabled={!canEdit}
                      className="h-7 w-16 mx-auto text-center text-xs"
                    />
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center`}>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.hoursNight}
                      onChange={(e) => updateLocal(emp.id, 'hoursNight', e.target.value)}
                      disabled={!canEdit}
                      className="h-7 w-16 mx-auto text-center text-xs"
                    />
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center`}>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.hoursHoliday}
                      onChange={(e) => updateLocal(emp.id, 'hoursHoliday', e.target.value)}
                      disabled={!canEdit}
                      className="h-7 w-16 mx-auto text-center text-xs"
                    />
                  </td>
                  <td className={`${ATTENDANCE_TD} text-center text-xs tabular-nums`}>
                    {monthDisplay > 0 ? monthDisplay.toFixed(1) + 'h' : '—'}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right text-xs tabular-nums`}>
                    {est > 0 ? formatAOA(est) : '—'}
                  </td>
                </tr>
              );
            })}
            {visibleEmployees.length === 0 && (
              <tr>
                <td colSpan={6} className={`${ATTENDANCE_TD} text-center text-muted-foreground py-8`}>
                  {pt ? 'Sem funcionários' : 'No employees'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AttendanceTablePanel>
    </div>
  );
}
