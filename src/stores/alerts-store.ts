import { create } from 'zustand';
import { useEmployeeStore } from './employee-store';
import { useAbsenceStore } from './absence-store';
import { useLoanStore } from './loan-store';

/**
 * Alerts Store - System notifications and warnings
 */

export type AlertType = 
  | 'contract_expiry' 
  | 'birthday' 
  | 'pending_approval' 
  | 'loan_payment' 
  | 'absence_pending'
  | 'payroll_pending'
  | 'budget_warning';

export type AlertSeverity = 'info' | 'warning' | 'critical';

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
  
  generateAlerts: () => void;
  markAsRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  getUnreadCount: () => number;
  getAlertsByType: (type: AlertType) => Alert[];
  getCriticalAlerts: () => Alert[];
}

export const useAlertsStore = create<AlertsState>()((set, get) => ({
  alerts: [],
  isLoaded: false,
  
  generateAlerts: () => {
    const alerts: Alert[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    try {
      // Get employees for contract expiry and birthday alerts
      const { employees } = useEmployeeStore.getState();
      
      employees.filter(e => e.status === 'active').forEach(emp => {
        // Contract expiry alerts
        if (emp.contractEndDate) {
          const endDate = new Date(emp.contractEndDate);
          if (endDate <= thirtyDaysFromNow && endDate >= now) {
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            alerts.push({
              id: `contract-${emp.id}`,
              type: 'contract_expiry',
              severity: daysLeft <= 7 ? 'critical' : 'warning',
              title: daysLeft <= 7 ? 'Contrato Expira em Breve!' : 'Contrato a Expirar',
              message: `O contrato de ${emp.firstName} ${emp.lastName} expira em ${daysLeft} dias.`,
              entityType: 'employee',
              entityId: emp.id,
              entityName: `${emp.firstName} ${emp.lastName}`,
              dueDate: emp.contractEndDate,
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }
        
        // Birthday alerts (within next 7 days)
        if (emp.dateOfBirth) {
          const birth = new Date(emp.dateOfBirth);
          const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
          
          // Check if birthday is within next 7 days
          if (thisYearBirthday >= now && thisYearBirthday <= sevenDaysFromNow) {
            const daysUntil = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            alerts.push({
              id: `birthday-${emp.id}`,
              type: 'birthday',
              severity: 'info',
              title: daysUntil === 0 ? '🎂 Aniversário Hoje!' : '🎂 Aniversário Próximo',
              message: daysUntil === 0 
                ? `Hoje é o aniversário de ${emp.firstName} ${emp.lastName}!`
                : `${emp.firstName} ${emp.lastName} faz anos em ${daysUntil} dias.`,
              entityType: 'employee',
              entityId: emp.id,
              entityName: `${emp.firstName} ${emp.lastName}`,
              dueDate: thisYearBirthday.toISOString(),
              createdAt: now.toISOString(),
              isRead: false,
              isDismissed: false,
            });
          }
        }
      });
      
      // Pending absence approvals
      const { absences } = useAbsenceStore.getState();
      const pendingAbsences = absences.filter(a => a.status === 'pending');
      if (pendingAbsences.length > 0) {
        alerts.push({
          id: 'pending-absences',
          type: 'absence_pending',
          severity: pendingAbsences.length > 5 ? 'warning' : 'info',
          title: 'Ausências Pendentes',
          message: `Existem ${pendingAbsences.length} ausências aguardando aprovação.`,
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }
      
      // Active loans requiring deduction
      const { loans } = useLoanStore.getState();
      const activeLoans = loans.filter(l => l.status === 'active');
      if (activeLoans.length > 0) {
        const totalDeductions = activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0);
        alerts.push({
          id: 'active-loans',
          type: 'loan_payment',
          severity: 'info',
          title: 'Empréstimos Ativos',
          message: `${activeLoans.length} empréstimos ativos com dedução mensal total de ${totalDeductions.toLocaleString('pt-AO')} AOA.`,
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }
      
      // Pending employee approvals
      const pendingEmployees = employees.filter(e => e.status === 'pending_approval');
      if (pendingEmployees.length > 0) {
        alerts.push({
          id: 'pending-employees',
          type: 'pending_approval',
          severity: pendingEmployees.length > 3 ? 'warning' : 'info',
          title: 'Funcionários Pendentes de Aprovação',
          message: `${pendingEmployees.length} funcionário(s) aguardando autorização do administrador.`,
          createdAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
        });
      }
      
      set({ alerts, isLoaded: true });
    } catch (error) {
      console.error('[Alerts] Error generating alerts:', error);
      set({ isLoaded: true });
    }
  },
  
  markAsRead: (id) => {
    set(state => ({
      alerts: state.alerts.map(a => a.id === id ? { ...a, isRead: true } : a),
    }));
  },
  
  dismissAlert: (id) => {
    set(state => ({
      alerts: state.alerts.map(a => a.id === id ? { ...a, isDismissed: true } : a),
    }));
  },
  
  getUnreadCount: () => {
    return get().alerts.filter(a => !a.isRead && !a.isDismissed).length;
  },
  
  getAlertsByType: (type) => {
    return get().alerts.filter(a => a.type === type && !a.isDismissed);
  },
  
  getCriticalAlerts: () => {
    return get().alerts.filter(a => a.severity === 'critical' && !a.isDismissed);
  },
}));
