import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Search, Download, Trash2 } from "lucide-react";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useLanguage } from "@/lib/i18n";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { AttendanceStatus } from "@/types/attendance";
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
} from "@/components/ui/alert-dialog";

export function AttendanceList() {
  const { language } = useLanguage();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState("");

  const { employees } = useEmployeeStore();
  const { records, deleteAttendance } = useAttendanceStore();

  const t = {
    title: language === 'pt' ? 'Registos de Presença' : 'Attendance Records',
    description: language === 'pt' ? 'Histórico de entradas e saídas' : 'Clock in/out history',
    allEmployees: language === 'pt' ? 'Todos os Funcionários' : 'All Employees',
    date: language === 'pt' ? 'Data' : 'Date',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    clockIn: language === 'pt' ? 'Entrada' : 'Clock In',
    clockOut: language === 'pt' ? 'Saída' : 'Clock Out',
    worked: language === 'pt' ? 'Trabalhado' : 'Worked',
    overtime: language === 'pt' ? 'Extra' : 'Overtime',
    status: language === 'pt' ? 'Estado' : 'Status',
    actions: language === 'pt' ? 'Acções' : 'Actions',
    search: language === 'pt' ? 'Pesquisar...' : 'Search...',
    export: language === 'pt' ? 'Exportar' : 'Export',
    noRecords: language === 'pt' ? 'Sem registos para este período' : 'No records for this period',
    delete: language === 'pt' ? 'Eliminar' : 'Delete',
    deleteConfirm: language === 'pt' ? 'Tem certeza que deseja eliminar este registo?' : 'Are you sure you want to delete this record?',
    cancel: language === 'pt' ? 'Cancelar' : 'Cancel',
    statusLabels: {
      clocked_in: language === 'pt' ? 'A trabalhar' : 'Working',
      clocked_out: language === 'pt' ? 'Concluído' : 'Completed',
      absent: language === 'pt' ? 'Ausente' : 'Absent',
      late: language === 'pt' ? 'Atrasado' : 'Late',
      early_leave: language === 'pt' ? 'Saída antecipada' : 'Early Leave',
    } as Record<AttendanceStatus, string>,
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants: Record<AttendanceStatus, "default" | "secondary" | "destructive" | "outline"> = {
      clocked_in: "default",
      clocked_out: "secondary",
      absent: "destructive",
      late: "outline",
      early_leave: "outline",
    };
    return (
      <Badge variant={variants[status]}>
        {t.statusLabels[status]}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Filter records
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const filteredRecords = records.filter(r => {
    const recordDate = new Date(r.date);
    if (recordDate < monthStart || recordDate > monthEnd) return false;
    if (selectedEmployee !== 'all' && r.employeeId !== selectedEmployee) return false;
    
    if (searchTerm) {
      const employee = employees.find(e => e.id === r.employeeId);
      if (!`${employee?.firstName} ${employee?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExport = () => {
    const csvContent = [
      ['Data', 'Funcionário', 'Entrada', 'Saída', 'Trabalhado', 'Extra', 'Estado'].join(','),
      ...filteredRecords.map(r => {
        const employee = employees.find(e => e.id === r.employeeId);
        return [
          r.date,
          employee ? `${employee.firstName} ${employee.lastName}` : '',
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
    link.download = `attendance-${selectedMonth}.csv`;
    link.click();
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

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
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t.export}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t.allEmployees} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allEmployees}</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.employee}</TableHead>
                <TableHead>{t.clockIn}</TableHead>
                <TableHead>{t.clockOut}</TableHead>
                <TableHead>{t.worked}</TableHead>
                <TableHead>{t.overtime}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="w-[50px]">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t.noRecords}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map(record => {
                  const employee = employees.find(e => e.id === record.employeeId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{employee ? `${employee.firstName} ${employee.lastName}` : '-'}</TableCell>
                      <TableCell className="font-mono">
                        {record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>{formatDuration(record.workedMinutes)}</TableCell>
                      <TableCell>
                        {record.overtimeMinutes > 0 ? (
                          <Badge variant="outline" className="text-green-600">
                            +{formatDuration(record.overtimeMinutes)}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.delete}</AlertDialogTitle>
                              <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAttendance(record.id)}>
                                {t.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
