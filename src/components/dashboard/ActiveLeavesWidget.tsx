import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Baby, Heart, Stethoscope, Palmtree, Calendar } from "lucide-react";
import { useAbsenceStore } from "@/stores/absence-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useLanguage } from "@/lib/i18n";
import { ABSENCE_TYPE_INFO } from "@/types/absence";
import { isAbsenceActiveToday, isDashboardLeaveAbsence, parseDateOnly } from "@/lib/absence-utils";
import { toast } from "sonner";

export function ActiveLeavesWidget() {
  const { language } = useLanguage();
  const { absences, endLeaveEarly } = useAbsenceStore();
  const { employees } = useEmployeeStore();
  const { records: holidayRecords } = useHolidayStore();
  const pt = language === 'pt';

  const [endingId, setEndingId] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [endingBusy, setEndingBusy] = useState(false);

  const activeLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active absences (maternity, paternity, sick, other approved)
    const leaveAbsences = absences
      .filter(a => isDashboardLeaveAbsence(a) && isAbsenceActiveToday(a))
      .map(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        const info = ABSENCE_TYPE_INFO[a.type];
        return {
          id: a.id,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          type: a.type,
          label: pt ? info.labelPt : info.labelEn,
          startDate: a.startDate,
          endDate: a.endDate,
          canEndEarly: true,
          category: a.type === 'maternity' ? 'maternity' :
                    a.type === 'paternity' ? 'paternity' :
                    a.type === 'sick_leave' || a.type === 'work_accident' ? 'sick' : 'other',
        };
      });

    // Active holidays (férias)
    const activeHolidays = holidayRecords
      .filter(h => {
        if (!h.startDate || !h.endDate) return false;
        return isAbsenceActiveToday({ startDate: h.startDate, endDate: h.endDate });
      })
      .map(h => {
        const emp = employees.find(e => e.id === h.employeeId);
        return {
          id: `hol_${h.employeeId}_${h.year}`,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          type: 'holiday' as const,
          label: pt ? 'Férias' : 'Holiday',
          startDate: h.startDate!,
          endDate: h.endDate!,
          canEndEarly: false,
          category: 'holiday' as const,
        };
      });

    return [...leaveAbsences, ...activeHolidays].sort((a, b) =>
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
  }, [absences, employees, holidayRecords, pt]);

  const endingLeave = endingId ? activeLeaves.find((l) => l.id === endingId) : undefined;

  const getIcon = (category: string) => {
    switch (category) {
      case 'maternity': return <Baby className="h-4 w-4 text-pink-500" />;
      case 'paternity': return <Heart className="h-4 w-4 text-blue-500" />;
      case 'sick': return <Stethoscope className="h-4 w-4 text-amber-500" />;
      case 'holiday': return <Palmtree className="h-4 w-4 text-emerald-500" />;
      default: return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'maternity': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      case 'paternity': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'sick': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'holiday': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(pt ? 'pt-AO' : 'en', { day: '2-digit', month: 'short' });
  };

  const daysUntilReturn = (endDate: string) => {
    const end = parseDateOnly(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openEndDialog = (leaveId: string, startDate: string, endDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    let initial = today;
    if (initial < startDate) initial = startDate;
    if (initial > endDate) initial = endDate;
    setReturnDate(initial);
    setEndingId(leaveId);
  };

  const confirmEndLeave = async () => {
    if (!endingId) return;
    setEndingBusy(true);
    try {
      const result = await endLeaveEarly(endingId, {
        returnDate,
        note: pt ? 'A pedido do trabalhador' : 'At employee request',
      });
      if (!result.success) {
        toast.error(result.error || (pt ? 'Não foi possível terminar a licença' : 'Could not end leave'));
        return;
      }
      toast.success(pt ? 'Licença terminada — funcionário pode regressar ao trabalho' : 'Leave ended — employee can return to work');
      setEndingId(null);
    } finally {
      setEndingBusy(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-primary" />
            {pt ? 'Funcionários em Licença / Férias' : 'Employees on Leave / Holiday'}
            {activeLeaves.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeLeaves.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {pt ? 'Nenhum funcionário em licença ou férias actualmente' : 'No employees currently on leave or holiday'}
            </p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {activeLeaves.map((leave) => {
                const days = daysUntilReturn(leave.endDate);
                return (
                  <div key={leave.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5">
                    {getIcon(leave.category)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{leave.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBadgeVariant(leave.category)}`}>
                        {leave.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {days <= 0
                          ? (pt ? 'Regressa hoje' : 'Returns today')
                          : `${days}d ${pt ? 'restantes' : 'remaining'}`}
                      </span>
                      {leave.canEndEarly && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] mt-0.5"
                          onClick={() => openEndDialog(leave.id, leave.startDate, leave.endDate)}
                        >
                          {pt ? 'Terminar licença' : 'End leave'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(endingId)} onOpenChange={(open) => !open && setEndingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pt ? 'Terminar licença antecipadamente' : 'End leave early'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {endingLeave
                ? `${endingLeave.employeeName} — ${endingLeave.label}`
                : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {pt
                ? 'A pedido do trabalhador. A data de fim da licença passa a ser a data de regresso.'
                : 'At employee request. Leave end date becomes the return-to-work date.'}
            </p>
            <div className="space-y-2">
              <Label>{pt ? 'Data de regresso' : 'Return date'}</Label>
              <Input
                type="date"
                value={returnDate}
                min={endingLeave?.startDate}
                max={endingLeave?.endDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEndingId(null)} disabled={endingBusy}>
              {pt ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="button" onClick={() => void confirmEndLeave()} disabled={endingBusy}>
              {pt ? 'Confirmar regresso' : 'Confirm return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
