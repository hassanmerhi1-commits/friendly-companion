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
import { useBulkAttendanceStore, calculateBulkAttendanceDeduction, calculateFullMonthlySalary } from '@/stores/bulk-attendance-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { format, addDays, subDays, isToday, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';

interface LocalMark {
  employeeId: string;
  status: DailyStatus;
  delayHours: number;
}

export function DailyAttendanceMarking() {
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

      // Determine target month for aggregation (may carry forward if after cutoff)
      const target = getTargetMonth(selectedDate);
      const isCarriedForward = target.month !== (selectedDate.getMonth() + 1) || target.year !== selectedDate.getFullYear();
      
      // Get unique employee IDs that were marked
      const employeeIds = [...new Set(marksToSave.map(m => m.employeeId))];
      
      // For carried-forward entries, we need to aggregate only the post-cutoff daily records
      const bulkEntries = employeeIds.map(empId => {
        // Get the period's cutoff date if carrying forward
        const originalMonth = selectedDate.getMonth() + 1;
        const originalYear = selectedDate.getFullYear();
        const period = periods.find(
          p => p.month === originalMonth && p.year === originalYear && p.cutoffDate
        );
        
        let absenceDays = 0;
        let justifiedAbsenceDays = 0;
        let delayHours = 0;
        
        if (isCarriedForward && period?.cutoffDate) {
          // Only count daily records AFTER the cutoff date for the target month
          const allRecords = useDailyAttendanceStore.getState().getRecordsForEmployee(empId, originalMonth, originalYear);
          for (const r of allRecords) {
            if (r.date > period.cutoffDate) {
              if (r.status === 'absent') absenceDays++;
              else if (r.status === 'justified') justifiedAbsenceDays++;
              else if (r.status === 'late') delayHours += r.delayHours;
            }
          }
          
          // Also add any existing entries already in the target month
          const existingTargetAgg = useDailyAttendanceStore.getState().getMonthlyAggregation(empId, target.month, target.year);
          absenceDays += existingTargetAgg.absenceDays;
          justifiedAbsenceDays += existingTargetAgg.justifiedAbsenceDays;
          delayHours += existingTargetAgg.delayHours;
        } else {
          // Normal aggregation for current month
          const agg = useDailyAttendanceStore.getState().getMonthlyAggregation(empId, target.month, target.year);
          absenceDays = agg.absenceDays;
          justifiedAbsenceDays = agg.justifiedAbsenceDays;
          delayHours = agg.delayHours;
        }

        const employee = activeEmployees.find(e => e.id === empId);
        const fullSalary = employee ? calculateFullMonthlySalary({
          baseSalary: employee.baseSalary,
          mealAllowance: employee.mealAllowance,
          transportAllowance: employee.transportAllowance,
          familyAllowance: employee.familyAllowance,
          monthlyBonus: employee.monthlyBonus,
          holidaySubsidy: employee.holidaySubsidy,
          otherAllowances: employee.otherAllowances,
        }) : 0;

        const deduction = calculateBulkAttendanceDeduction(fullSalary, absenceDays, delayHours);

        return {
          employeeId: empId,
          month: target.month,
          year: target.year,
          absenceDays,
          justifiedAbsenceDays,
          delayHours,
          ...deduction,
          notes: isCarriedForward 
            ? `Auto-aggregated (carried from ${originalMonth}/${originalYear} post-cutoff)` 
            : `Auto-aggregated from daily marking`,
        };
      });

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
      ? `Folha salarial já calculada — estas marcações serão contabilizadas em` 
      : `Payroll already calculated — these marks will count for`,
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
          <div className="flex items-center gap-2">
            {/* Date navigator */}
            <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDay(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 font-medium">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, 'dd/MM/yyyy')}
                    {isToday(selectedDate) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
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
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => navigateDay(1)}
                disabled={isToday(selectedDate)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters + stats */}
        <div className="flex items-center gap-3 flex-wrap mt-3">
          {!isBranchLocked && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t.allBranches} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allBranches}</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto">
            <span className="text-emerald-600 font-medium">✓ {stats.present}</span>
            <span className="text-destructive font-medium">✗ {stats.absent}</span>
            <span className="text-amber-600 font-medium">◷ {stats.late}</span>
            <span className="text-blue-600 font-medium">📋 {stats.justified}</span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-3">
          {canEdit && !isFutureDate && (
            <>
              <Button variant="outline" size="sm" onClick={markAllPresent}>
                <Check className="h-4 w-4 mr-1" />
                {t.markAll}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {t.save}
              </Button>
            </>
          )}
          {!canEdit && !isFutureDate && (
            <p className="text-sm text-muted-foreground italic">{t.readOnlyMsg}</p>
          )}
          {isFutureDate && (
            <p className="text-sm text-destructive italic">{t.futureMsg}</p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t.employee}</TableHead>
                {!isBranchLocked && <TableHead>{t.branch}</TableHead>}
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
                  <TableRow key={emp.id} className={mark?.status === 'absent' ? 'bg-destructive/5' : ''}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{emp.employeeNumber}</span>
                      </div>
                    </TableCell>
                    {!isBranchLocked && <TableCell className="text-sm text-muted-foreground">{branchName}</TableCell>}
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
