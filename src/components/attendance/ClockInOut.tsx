import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, UserCheck, AlertCircle } from "lucide-react";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useLanguage } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ClockInOut() {
  const { language } = useLanguage();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const { employees } = useEmployeeStore();
  const { clockIn, clockOut, getTodayAttendance, isEmployeeClockedIn } = useAttendanceStore();

  // Update current time every second
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  const activeEmployees = employees.filter(e => e.status === 'active');
  const selectedEmployeeData = activeEmployees.find(e => e.id === selectedEmployee);
  const isClockedIn = selectedEmployee ? isEmployeeClockedIn(selectedEmployee) : false;
  const todayRecord = selectedEmployee ? getTodayAttendance(selectedEmployee) : undefined;

  const t = {
    title: language === 'pt' ? 'Registo de Ponto' : 'Clock In/Out',
    description: language === 'pt' ? 'Registar entrada e saída dos funcionários' : 'Record employee attendance',
    selectEmployee: language === 'pt' ? 'Seleccionar Funcionário' : 'Select Employee',
    clockIn: language === 'pt' ? 'Registar Entrada' : 'Clock In',
    clockOut: language === 'pt' ? 'Registar Saída' : 'Clock Out',
    notes: language === 'pt' ? 'Notas (opcional)' : 'Notes (optional)',
    currentTime: language === 'pt' ? 'Hora Actual' : 'Current Time',
    status: language === 'pt' ? 'Estado' : 'Status',
    working: language === 'pt' ? 'A trabalhar' : 'Working',
    notClockedIn: language === 'pt' ? 'Não registado' : 'Not clocked in',
    clockedInAt: language === 'pt' ? 'Entrada às' : 'Clocked in at',
    success: language === 'pt' ? 'Sucesso' : 'Success',
    clockInSuccess: language === 'pt' ? 'Entrada registada com sucesso' : 'Clock in recorded successfully',
    clockOutSuccess: language === 'pt' ? 'Saída registada com sucesso' : 'Clock out recorded successfully',
    error: language === 'pt' ? 'Erro' : 'Error',
    alreadyClockedIn: language === 'pt' ? 'Funcionário já registou entrada hoje' : 'Employee already clocked in today',
    notClockedInError: language === 'pt' ? 'Funcionário não registou entrada' : 'Employee not clocked in',
    late: language === 'pt' ? 'Atrasado' : 'Late',
    onTime: language === 'pt' ? 'No horário' : 'On time',
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) return;
    
    const result = await clockIn(selectedEmployee, notes || undefined);
    if (result) {
      toast({
        title: t.success,
        description: t.clockInSuccess,
      });
      setNotes("");
    } else {
      toast({
        title: t.error,
        description: t.alreadyClockedIn,
        variant: "destructive",
      });
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmployee) return;
    
    const result = await clockOut(selectedEmployee, notes || undefined);
    if (result) {
      toast({
        title: t.success,
        description: t.clockOutSuccess,
      });
      setNotes("");
    } else {
      toast({
        title: t.error,
        description: t.notClockedInError,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Display */}
        <div className="text-center p-6 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">{t.currentTime}</p>
          <p className="text-4xl font-mono font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, dd/MM/yyyy')}
          </p>
        </div>

        {/* Employee Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.selectEmployee}</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder={t.selectEmployee} />
            </SelectTrigger>
            <SelectContent>
              {activeEmployees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  <div className="flex items-center gap-2">
                    <span>{employee.firstName} {employee.lastName}</span>
                    {isEmployeeClockedIn(employee.id) && (
                      <Badge variant="outline" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        {t.working}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Display */}
        {selectedEmployee && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedEmployeeData?.firstName} {selectedEmployeeData?.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployeeData?.position}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t.status}</p>
                {isClockedIn ? (
                  <Badge className="bg-green-500">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {t.working}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t.notClockedIn}
                  </Badge>
                )}
              </div>
            </div>
            
            {todayRecord && todayRecord.clockIn && (
              <div className="mt-3 pt-3 border-t text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t.clockedInAt}:</span>
                  <span className="font-mono">
                    {format(new Date(todayRecord.clockIn), 'HH:mm')}
                  </span>
                </div>
                {todayRecord.lateMinutes > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-orange-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>{t.late} ({todayRecord.lateMinutes} min)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.notes}</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notes}
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleClockIn}
            disabled={!selectedEmployee || isClockedIn}
            className="flex-1"
            variant="default"
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t.clockIn}
          </Button>
          <Button
            onClick={handleClockOut}
            disabled={!selectedEmployee || !isClockedIn}
            className="flex-1"
            variant="outline"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.clockOut}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
