import { useState, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Trash2 } from 'lucide-react';
import { useAttendanceStore } from '@/stores/attendance-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { AttendanceStatus } from '@/types/attendance';
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

interface AttendanceListProps {
  embedded?: boolean;
  branchFilter?: string;
  month?: number;
  year?: number;
}

export function AttendanceList({
  embedded = false,
  branchFilter,
  month,
  year,
}: AttendanceListProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { employees, getActiveEmployees } = useEmployeeStore();
  const { getBranch, getActiveBranches } = useBranchStore();
  const { currentUser, hasPermission } = useAuthStore();
  const { records, deleteAttendance, loadAttendance, isLoaded } = useAttendanceStore();

  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(currentUser?.branchId || 'all');

  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const isBranchLocked = !!currentUser?.branchId && !isAdmin;
  const canDelete = isAdmin || hasPermission('attendance.delete');
  const branches = getActiveBranches();

  const showBranchPicker = !isBranchLocked && !branchFilter;
  const effectiveBranchId =
    branchFilter ||
    (isBranchLocked ? currentUser?.branchId : selectedBranch !== 'all' ? selectedBranch : undefined);
  const showBranchColumn = !isBranchLocked && !effectiveBranchId;

  const periodMonth = month ?? new Date().getMonth() + 1;
  const periodYear = year ?? new Date().getFullYear();
  const monthStart = startOfMonth(new Date(periodYear, periodMonth - 1));
  const monthEnd = endOfMonth(new Date(periodYear, periodMonth - 1));
  const periodKey = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  useEffect(() => {
    if (!isLoaded) loadAttendance();
  }, [isLoaded, loadAttendance]);

  const branchEmployees = useMemo(() => {
    let list = getActiveEmployees();
    if (effectiveBranchId) {
      list = list.filter((e) => e.branchId === effectiveBranchId);
    }
    return list.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [getActiveEmployees, effectiveBranchId]);

  const employeeIdsInBranch = useMemo(
    () => new Set(branchEmployees.map((e) => e.id)),
    [branchEmployees]
  );

  const t = {
    allEmployees: pt ? 'Todos os funcionários' : 'All employees',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    date: pt ? 'Data' : 'Date',
    employee: pt ? 'Funcionário' : 'Employee',
    branch: pt ? 'Filial' : 'Branch',
    clockIn: pt ? 'Entrada' : 'In',
    clockOut: pt ? 'Saída' : 'Out',
    worked: pt ? 'Trabalhado' : 'Worked',
    overtime: pt ? 'Extra' : 'OT',
    status: pt ? 'Estado' : 'Status',
    actions: pt ? 'Acções' : 'Actions',
    search: pt ? 'Pesquisar...' : 'Search...',
    export: pt ? 'Exportar' : 'Export',
    noRecords: pt ? 'Sem registos neste período' : 'No records for this period',
    delete: pt ? 'Eliminar' : 'Delete',
    deleteConfirm: pt
      ? 'Eliminar este registo de ponto? Esta acção não pode ser desfeita.'
      : 'Delete this punch record? This cannot be undone.',
    cancel: pt ? 'Cancelar' : 'Cancel',
    noDeletePermission: pt ? 'Sem permissão para eliminar' : 'No permission to delete',
    records: pt ? 'registos' : 'records',
    withPunch: pt ? 'com ponto' : 'with punch',
    statusLabels: {
      clocked_in: pt ? 'A trabalhar' : 'Working',
      clocked_out: pt ? 'Concluído' : 'Completed',
      absent: pt ? 'Ausente' : 'Absent',
      late: pt ? 'Atrasado' : 'Late',
      early_leave: pt ? 'Saída cedo' : 'Early leave',
    } as Record<AttendanceStatus, string>,
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const colors: Record<AttendanceStatus, string> = {
      clocked_in: 'bg-primary/15 text-primary border-primary/30',
      clocked_out: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      absent: 'bg-destructive/15 text-destructive border-destructive/30',
      late: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      early_leave: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
    };
    return (
      <Badge variant="outline" className={`text-[10px] ${colors[status] || ''}`}>
        {t.statusLabels[status]}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records
      .filter((r) => {
        const recordDate = new Date(r.date);
        if (recordDate < monthStart || recordDate > monthEnd) return false;
        if (!employeeIdsInBranch.has(r.employeeId)) return false;
        if (selectedEmployee !== 'all' && r.employeeId !== selectedEmployee) return false;
        if (q) {
          const employee = employees.find((e) => e.id === r.employeeId);
          const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.toLowerCase();
          const num = (employee?.employeeNumber || '').toLowerCase();
          if (!name.includes(q) && !num.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        const empA = employees.find((e) => e.id === a.employeeId);
        const empB = employees.find((e) => e.id === b.employeeId);
        return `${empA?.firstName || ''} ${empA?.lastName || ''}`.localeCompare(
          `${empB?.firstName || ''} ${empB?.lastName || ''}`
        );
      });
  }, [
    records,
    monthStart,
    monthEnd,
    employeeIdsInBranch,
    selectedEmployee,
    searchTerm,
    employees,
  ]);

  const stats = useMemo(() => {
    const withPunch = filteredRecords.filter((r) => r.clockIn || r.clockOut).length;
    return { total: filteredRecords.length, withPunch };
  }, [filteredRecords]);

  const handleExport = () => {
    const header = pt
      ? ['Data', 'Funcionário', 'Filial', 'Entrada', 'Saída', 'Trabalhado', 'Extra', 'Estado']
      : ['Date', 'Employee', 'Branch', 'Clock In', 'Clock Out', 'Worked', 'Overtime', 'Status'];
    const csvContent = [
      header.join(','),
      ...filteredRecords.map((r) => {
        const employee = employees.find((e) => e.id === r.employeeId);
        const branchName = employee?.branchId ? getBranch(employee.branchId)?.name || '' : '';
        return [
          r.date,
          employee ? `"${employee.firstName} ${employee.lastName}"` : '',
          `"${branchName}"`,
          r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '-',
          r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '-',
          formatDuration(r.workedMinutes),
          formatDuration(r.overtimeMinutes),
          t.statusLabels[r.status],
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${periodKey}.csv`;
    link.click();
  };

  const colSpan = showBranchColumn ? 9 : 8;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="relative flex-1 min-w-[120px] max-w-[200px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.search}
          className="pl-8 h-8 text-xs"
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <span className="font-medium text-foreground">{stats.total}</span> {t.records}
        <span className="text-border">|</span>
        <span className="font-medium text-emerald-600">{stats.withPunch}</span> {t.withPunch}
      </div>

      <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 ml-auto" onClick={handleExport}>
        <Download className="h-3.5 w-3.5 mr-1" />
        {t.export}
      </Button>
    </div>
  );

  const table = (
    <table className="w-full min-w-[900px] text-sm">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={ATTENDANCE_TH}>{t.date}</th>
          <th className={ATTENDANCE_TH}>{t.employee}</th>
          {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
          <th className={ATTENDANCE_TH_CENTER}>{t.clockIn}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.clockOut}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.worked}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.overtime}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.status}</th>
          <th className={`${ATTENDANCE_TH_CENTER} w-12`}>{t.actions}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {filteredRecords.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
              {t.noRecords}
            </td>
          </tr>
        ) : (
          filteredRecords.map((record) => {
            const employee = employees.find((e) => e.id === record.employeeId);
            const branchName = employee?.branchId ? getBranch(employee.branchId)?.name : '—';

            return (
              <tr key={record.id} className="hover:bg-muted/20">
                <td className={`${ATTENDANCE_TD} text-xs font-medium whitespace-nowrap`}>
                  {format(new Date(record.date), 'dd/MM/yyyy')}
                </td>
                <td className={ATTENDANCE_TD}>
                  <span className="font-medium text-sm">
                    {employee ? `${employee.firstName} ${employee.lastName}` : '—'}
                  </span>
                  {employee?.employeeNumber && (
                    <span className="text-xs text-muted-foreground ml-1.5">{employee.employeeNumber}</span>
                  )}
                </td>
                {showBranchColumn && (
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{branchName}</td>
                )}
                <td className={`${ATTENDANCE_TD} text-center font-mono text-xs`}>
                  {record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : '—'}
                </td>
                <td className={`${ATTENDANCE_TD} text-center font-mono text-xs`}>
                  {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '—'}
                </td>
                <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                  {formatDuration(record.workedMinutes)}
                </td>
                <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                  {record.overtimeMinutes > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-primary">
                      +{formatDuration(record.overtimeMinutes)}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${ATTENDANCE_TD} text-center`}>{getStatusBadge(record.status)}</td>
                <td className={ATTENDANCE_TD}>
                  <div className="flex justify-center">
                    {canDelete ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
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
                              onClick={() => deleteAttendance(record.id)}
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
                        title={t.noDeletePermission}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <AttendanceTablePanel toolbar={toolbar}>
      {table}
    </AttendanceTablePanel>
  );
}
