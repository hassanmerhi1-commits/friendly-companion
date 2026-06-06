import { create } from 'zustand';
import { useEmployeeStore } from './employee-store';
import { useAbsenceStore } from './absence-store';
import { useLoanStore } from './loan-store';
import { useBulkAttendanceStore } from './bulk-attendance-store';
import { useHolidayStore } from './holiday-store';
import { useDisciplinaryStore } from './disciplinary-store';
import { usePayrollStore } from './payroll-store';
import { useDeductionStore } from './deduction-store';
import {
  calculateHolidayEntitlement,
  getDaysRemaining,
  hasGozadoHoliday,
  hasHolidayScheduled,
} from '@/lib/holiday-utils';
import { DISCIPLINARY_TYPE_LABELS } from '@/types/disciplinary';
import type { Employee } from '@/types/employee';

export type AlertType =
  | 'contract_expiry'
  | 'birthday'
  | 'pending_approval'
  | 'loan_payment'
  | 'absence_pending'
  | 'excessive_absence'
  | 'payroll_pending'
  | 'budget_warning'
  | 'holiday_upcoming'
  | 'holiday_active'
  | 'holiday_unscheduled'
  | 'disciplinary_process'
  | 'disciplinary_warning'
  | 'deduction_outstanding';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertLanguage = 'pt' | 'en';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  dueDate?: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

interface AlertsState {
  alerts: Alert[];
  isLoaded: boolean;

  generateAlerts: (language?: AlertLanguage) => void;
  markAsRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  getUnreadCount: () => number;
  getAlertsByType: (type: AlertType) => Alert[];
  getCriticalAlerts: () => Alert[];
}

function L(pt: string, en: string, language: AlertLanguage) {
  return language === 'pt' ? pt : en;
}

function empName(emp: Employee) {
  return `${emp.firstName} ${emp.lastName}`;
}

const severityRank: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const sev = severityRank[a.severity] - severityRank[b.severity];
    if (sev !== 0) return sev;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export const useAlertsStore = create<AlertsState>()((set, get) => ({
  alerts: [],
  isLoaded: false,

  generateAlerts: (language: AlertLanguage = 'pt') => {
    const previous = get().alerts;
    const dismissedIds = new Set(previous.filter((a) => a.isDismissed).map((a) => a.id));
    const readIds = new Set(previous.filter((a) => a.isRead).map((a) => a.id));

    const alerts: Alert[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const year = now.getFullYear();

    try {
      const { employees } = useEmployeeStore.getState();
      const activeEmployees = employees.filter((e) => e.status === 'active');

      // —— Payroll pending ——
      const { periods } = usePayrollStore.getState();
      const currentPeriod = periods.find((p) => p.year === year && p.month === now.getMonth() + 1);
      if (currentPeriod && currentPeriod.status !== 'paid') {
        const statusMessages: Record<string, { pt: string; en: string; severity: AlertSeverity }> = {
          draft: {
            pt: `A folha de ${currentPeriod.month}/${currentPeriod.year} está em preparação.`,
            en: `Payroll for ${currentPeriod.month}/${currentPeriod.year} is still in draft.`,
            severity: 'info',
          },
          calculated: {
            pt: `A folha de ${currentPeriod.month}/${currentPeriod.year} foi calculada e aguarda aprovação.`,
            en: `Payroll for ${currentPeriod.month}/${currentPeriod.year} is calculated and awaiting approval.`,
            severity: 'warning',
          },
          approved: {
            pt: `A folha de ${currentPeriod.month}/${currentPeriod.year} está aprovada e aguarda pagamento.`,
            en: `Payroll for ${currentPeriod.month}/${currentPeriod.year} is approved and awaiting payment.`,
            severity: 'warning',
          },
        };
        const info = statusMessages[currentPeriod.status];
        if (info) {
          alerts.push({
            id: `payroll-pending-${currentPeriod.id}`,
            type: 'payroll_pending',
            severity: info.severity,
            title: L('Folha Pendente', 'Payroll Pending', language),
            message: L(info.pt, info.en, language),
            entityType: 'payroll_period',
            entityId: currentPeriod.id,
            dueDate: new Date(currentPeriod.year, currentPeriod.month, 0).toISOString(),
            createdAt: now.toISOString(),
            isRead: false,
            isDismissed: false,
          });
        }
      }

      activeEmployees.forEach((emp) => {
        // Contract expiry
        if (emp.contractEndDate) {
          const endDate = new Date(emp.contractEndDate);
          if (endDate <= thirtyDaysFromNow && endDate >= now) {
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            alerts.push({
              id: `contract-${emp.id}`,
              type: 'contract_expiry',
              severity: daysLeft <= 7 ? 'critical' : 'warning',
              title: L(
                daysLeft <= 7 ? 'Contrato Expira em Breve!' : 'Contrato a Expirar',
                daysLeft <= 7 ? 'Contract Expiring Soon!' : 'Contract Expiring',
                language
              ),
              message: L(
                `O contrato de ${empName(emp)} expira em ${daysLeft} dias.`,
                `${empName(emp)}'s contract expires in ${daysLeft} days.`,
                language
              ),
              entityType: 'employee',
              entityId: emp.id,
              entityName: empName(emp),
              dueDate: emp.contractEndDate,
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }

        // Birthday
        if (emp.dateOfBirth) {
          const birth = new Date(emp.dateOfBirth);
          const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
          if (thisYearBirthday >= now && thisYearBirthday <= sevenDaysFromNow) {
            const daysUntil = Math.ceil(
              (thisYearBirthday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );
            alerts.push({
              id: `birthday-${emp.id}`,
              type: 'birthday',
              severity: 'info',
              title: L(
                daysUntil === 0 ? 'Aniversário Hoje!' : 'Aniversário Próximo',
                daysUntil === 0 ? 'Birthday Today!' : 'Upcoming Birthday',
                language
              ),
              message: L(
                daysUntil === 0
                  ? `Hoje é o aniversário de ${empName(emp)}!`
                  : `${empName(emp)} faz anos em ${daysUntil} dias.`,
                daysUntil === 0
                  ? `Today is ${empName(emp)}'s birthday!`
                  : `${empName(emp)}'s birthday is in ${daysUntil} days.`,
                language
              ),
              entityType: 'employee',
              entityId: emp.id,
              entityName: empName(emp),
              dueDate: thisYearBirthday.toISOString(),
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }
      });

      // —— Holidays ——
      const { records: holidayRecords } = useHolidayStore.getState();
      const midYear = new Date(year, 6, 1);

      activeEmployees.forEach((emp) => {
        const record = holidayRecords.find((r) => r.employeeId === emp.id && r.year === year);
        const { daysEntitled } = calculateHolidayEntitlement(emp, year);
        const name = empName(emp);

        if (record?.startDate) {
          const start = new Date(record.startDate);
          const end = record.endDate ? new Date(record.endDate) : start;
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          const today = new Date(now);
          today.setHours(12, 0, 0, 0);

          if (start <= today && end >= today) {
            alerts.push({
              id: `holiday-active-${emp.id}-${year}`,
              type: 'holiday_active',
              severity: 'info',
              title: L('Funcionário de Férias', 'Employee on Leave', language),
              message: L(
                `${name} está de férias até ${end.toLocaleDateString('pt-AO')}.`,
                `${name} is on holiday until ${end.toLocaleDateString('en-US')}.`,
                language
              ),
              entityType: 'employee',
              entityId: emp.id,
              entityName: name,
              dueDate: record.endDate || record.startDate,
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          } else if (start > today && start <= fourteenDaysFromNow) {
            const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            alerts.push({
              id: `holiday-upcoming-${emp.id}-${year}`,
              type: 'holiday_upcoming',
              severity: daysUntil <= 7 ? 'warning' : 'info',
              title: L('Férias a Iniciar', 'Holiday Starting Soon', language),
              message: L(
                `${name} inicia férias em ${daysUntil} dias (${start.toLocaleDateString('pt-AO')}).`,
                `${name} starts holiday in ${daysUntil} days (${start.toLocaleDateString('en-US')}).`,
                language
              ),
              entityType: 'employee',
              entityId: emp.id,
              entityName: name,
              dueDate: record.startDate,
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }

        if (now >= midYear && daysEntitled > 0) {
          const daysRemaining = getDaysRemaining(record, daysEntitled);
          if (daysRemaining > 0 && !hasHolidayScheduled(record) && !hasGozadoHoliday(record)) {
            alerts.push({
              id: `holiday-unscheduled-${emp.id}-${year}`,
              type: 'holiday_unscheduled',
              severity: daysRemaining >= 10 ? 'warning' : 'info',
              title: L('Férias Não Planificadas', 'Holiday Not Scheduled', language),
              message: L(
                `${name} tem ${daysRemaining} dias de férias por planificar em ${year}.`,
                `${name} has ${daysRemaining} holiday days still to schedule in ${year}.`,
                language
              ),
              entityType: 'employee',
              entityId: emp.id,
              entityName: name,
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }
      });

      // —— Disciplinary ——
      const { records: disciplinaryRecords } = useDisciplinaryStore.getState();
      disciplinaryRecords
        .filter((r) => r.status === 'pendente' || r.status === 'escalado')
        .forEach((rec) => {
          const emp = employees.find((e) => e.id === rec.employeeId);
          const name = emp ? empName(emp) : L('Funcionário', 'Employee', language);
          const typeLabel = DISCIPLINARY_TYPE_LABELS[rec.type];
          const isProcess = rec.type === 'processo_disciplinar';
          const isEscalated = rec.status === 'escalado';

          alerts.push({
            id: `disciplinary-${rec.id}`,
            type: isProcess ? 'disciplinary_process' : 'disciplinary_warning',
            severity: isProcess || isEscalated ? 'critical' : 'warning',
            title: isProcess
              ? L('Processo Disciplinar Aberto', 'Open Disciplinary Process', language)
              : L('Registo Disciplinar Pendente', 'Pending Disciplinary Record', language),
            message: L(
              `${name}: ${typeLabel} — ${rec.description}${isEscalated ? ' (escalado)' : ''}`,
              `${name}: ${typeLabel} — ${rec.description}${isEscalated ? ' (escalated)' : ''}`,
              language
            ),
            entityType: 'disciplinary',
            entityId: rec.id,
            entityName: name,
            dueDate: rec.date,
            createdAt: now.toISOString(),
            isRead: false,
            isDismissed: false,
          });
        });

      // —— Pending absences ——
      const { absences } = useAbsenceStore.getState();
      const pendingAbsences = absences.filter((a) => a.status === 'pending');
      if (pendingAbsences.length > 0) {
        alerts.push({
          id: 'pending-absences',
          type: 'absence_pending',
          severity: pendingAbsences.length > 5 ? 'warning' : 'info',
          title: L('Ausências Pendentes', 'Pending Absences', language),
          message: L(
            `Existem ${pendingAbsences.length} ausências aguardando aprovação.`,
            `${pendingAbsences.length} absence(s) awaiting approval.`,
            language
          ),
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }

      // —— Active loans ——
      const { loans } = useLoanStore.getState();
      const activeLoans = loans.filter((l) => l.status === 'active');
      if (activeLoans.length > 0) {
        const totalDeductions = activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0);
        alerts.push({
          id: 'active-loans',
          type: 'loan_payment',
          severity: 'info',
          title: L('Empréstimos Ativos', 'Active Loans', language),
          message: L(
            `${activeLoans.length} empréstimos ativos com dedução mensal total de ${totalDeductions.toLocaleString('pt-AO')} AOA.`,
            `${activeLoans.length} active loan(s) with total monthly deduction of ${totalDeductions.toLocaleString('en-US')} AOA.`,
            language
          ),
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }

      // —— Outstanding deductions ——
      const { deductions } = useDeductionStore.getState();
      const outstanding = deductions.filter((d) => !d.isFullyPaid && d.remainingAmount > 0);
      const disciplinaryDeductions = outstanding.filter((d) => d.type === 'disciplinary');
      disciplinaryDeductions.forEach((d) => {
        const emp = employees.find((e) => e.id === d.employeeId);
        const name = emp ? empName(emp) : L('Funcionário', 'Employee', language);
        alerts.push({
          id: `deduction-disciplinary-${d.id}`,
          type: 'deduction_outstanding',
          severity: 'warning',
          title: L('Desconto Disciplinar em Curso', 'Disciplinary Deduction Active', language),
          message: L(
            `${name}: restam ${d.remainingAmount.toLocaleString('pt-AO')} AOA por descontar (${d.description}).`,
            `${name}: ${d.remainingAmount.toLocaleString('en-US')} AOA remaining to deduct (${d.description}).`,
            language
          ),
          entityType: 'deduction',
          entityId: d.id,
          entityName: name,
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      });

      const largeAdvances = outstanding.filter(
        (d) => d.type === 'salary_advance' && d.remainingAmount >= 50000
      );
      if (largeAdvances.length > 0) {
        alerts.push({
          id: 'salary-advances-outstanding',
          type: 'deduction_outstanding',
          severity: 'info',
          title: L('Adiantamentos por Liquidar', 'Outstanding Salary Advances', language),
          message: L(
            `${largeAdvances.length} adiantamento(s) salarial(is) com saldo em aberto.`,
            `${largeAdvances.length} salary advance(s) with outstanding balance.`,
            language
          ),
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }

      // —— Pending employee approvals ——
      const pendingEmployees = employees.filter((e) => e.status === 'pending_approval');
      if (pendingEmployees.length > 0) {
        alerts.push({
          id: 'pending-employees',
          type: 'pending_approval',
          severity: pendingEmployees.length > 3 ? 'warning' : 'info',
          title: L('Funcionários Pendentes de Aprovação', 'Employees Pending Approval', language),
          message: L(
            `${pendingEmployees.length} funcionário(s) aguardando autorização do administrador.`,
            `${pendingEmployees.length} employee(s) awaiting administrator approval.`,
            language
          ),
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }

      // —— Excessive absences ——
      const { entries: bulkEntries } = useBulkAttendanceStore.getState();
      const currentMonthEntries = bulkEntries.filter(
        (e) => e.month === now.getMonth() + 1 && e.year === year && e.absenceDays >= 3
      );
      currentMonthEntries.forEach((entry) => {
        const emp = employees.find((e) => e.id === entry.employeeId);
        if (emp && emp.status === 'active') {
          alerts.push({
            id: `excessive-absence-${emp.id}`,
            type: 'excessive_absence',
            severity: entry.absenceDays >= 5 ? 'critical' : 'warning',
            title: L(
              entry.absenceDays >= 5 ? 'Faltas Excessivas!' : 'Alerta de Faltas',
              entry.absenceDays >= 5 ? 'Excessive Absences!' : 'Absence Alert',
              language
            ),
            message: L(
              `${empName(emp)} tem ${entry.absenceDays} faltas injustificadas este mês.`,
              `${empName(emp)} has ${entry.absenceDays} unjustified absences this month.`,
              language
            ),
            entityType: 'employee',
            entityId: emp.id,
            entityName: empName(emp),
            createdAt: now.toISOString(),
            isRead: false,
            isDismissed: false,
          });
        }
      });

      const merged = sortAlerts(
        alerts.map((a) => ({
          ...a,
          isDismissed: dismissedIds.has(a.id),
          isRead: readIds.has(a.id),
        }))
      );

      set({ alerts: merged, isLoaded: true });
    } catch (error) {
      console.error('[Alerts] Error generating alerts:', error);
      set({ isLoaded: true });
    }
  },

  markAsRead: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    }));
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, isDismissed: true } : a)),
    }));
  },

  getUnreadCount: () => {
    return get().alerts.filter((a) => !a.isRead && !a.isDismissed).length;
  },

  getAlertsByType: (type) => {
    return get().alerts.filter((a) => a.type === type && !a.isDismissed);
  },

  getCriticalAlerts: () => {
    return get().alerts.filter((a) => a.severity === 'critical' && !a.isDismissed);
  },
}));
