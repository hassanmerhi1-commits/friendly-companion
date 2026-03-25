import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, Heart, Stethoscope, Palmtree, Calendar } from "lucide-react";
import { useAbsenceStore } from "@/stores/absence-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useLanguage } from "@/lib/i18n";
import { ABSENCE_TYPE_INFO } from "@/types/absence";

export function ActiveLeavesWidget() {
  const { language } = useLanguage();
  const { absences } = useAbsenceStore();
  const { employees } = useEmployeeStore();
  const { records: holidayRecords } = useHolidayStore();
  const pt = language === 'pt';

  const activeLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active absences (maternity, paternity, sick, other approved)
    const leaveAbsences = absences
      .filter(a => {
        const end = new Date(a.endDate);
        end.setHours(23, 59, 59, 999);
        const start = new Date(a.startDate);
        return start <= today && end >= today &&
          (a.status === 'approved' || a.status === 'justified') &&
          ['maternity', 'paternity', 'sick_leave', 'work_accident', 'marriage', 'bereavement'].includes(a.type);
      })
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
          category: a.type === 'maternity' ? 'maternity' :
                    a.type === 'paternity' ? 'paternity' :
                    a.type === 'sick_leave' || a.type === 'work_accident' ? 'sick' : 'other',
        };
      });

    // Active holidays (férias)
    const currentYear = today.getFullYear();
    const activeHolidays = holidayRecords
      .filter(h => {
        if (!h.startDate || !h.endDate) return false;
        const end = new Date(h.endDate);
        end.setHours(23, 59, 59, 999);
        const start = new Date(h.startDate);
        return start <= today && end >= today;
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
          category: 'holiday' as const,
        };
      });

    return [...leaveAbsences, ...activeHolidays].sort((a, b) =>
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
  }, [absences, employees, holidayRecords, pt]);

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
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
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
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
