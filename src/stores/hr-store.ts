import { create } from 'zustand';
import type { TerminationRecord, SalaryAdjustment, SalaryAdjustmentFormData, ApprovalStatus } from '@/types/hr';
import type { Employee } from '@/types/employee';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';
import { useEmployeeStore } from '@/stores/employee-store';
import { useAuditStore } from '@/stores/audit-store';

interface HRState {
  terminations: TerminationRecord[];
  salaryAdjustments: SalaryAdjustment[];
  isLoaded: boolean;
  
  // Load from database
  loadHRData: () => Promise<void>;
  
  // Termination operations
  processTermination: (
    employee: Employee,
    terminationData: Omit<TerminationRecord, 'id' | 'employeeName' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ success: boolean; record?: TerminationRecord; error?: string }>;
  getTerminationByEmployee: (employeeId: string) => TerminationRecord | undefined;
  
  // Salary adjustment operations
  requestSalaryAdjustment: (data: SalaryAdjustmentFormData, requestedBy: string) => Promise<{ success: boolean; error?: string }>;
  approveSalaryAdjustment: (id: string, approvedBy: string) => Promise<{ success: boolean; error?: string }>;
  rejectSalaryAdjustment: (id: string, rejectedBy: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getAdjustmentsByEmployee: (employeeId: string) => SalaryAdjustment[];
  getPendingAdjustments: () => SalaryAdjustment[];
}

// Map DB row to TerminationRecord
function mapDbRowToTermination(row: any): TerminationRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || '',
    terminationDate: row.termination_date,
    reason: row.reason || 'voluntary',
    reasonDetails: row.reason_details,
    yearsOfService: row.years_of_service || 0,
    finalBaseSalary: row.final_base_salary || 0,
    severancePay: row.severance_pay || 0,
    proportionalLeave: row.proportional_leave || 0,
    proportional13th: row.proportional_13th || 0,
    proportionalHolidaySubsidy: row.proportional_holiday_subsidy || 0,
    noticePeriodDays: row.notice_period_days || 0,
    noticeCompensation: row.notice_compensation || 0,
    unusedLeaveDays: row.unused_leave_days || 0,
    unusedLeaveCompensation: row.unused_leave_compensation || 0,
    totalPackage: row.total_package || 0,
    processedBy: row.processed_by || '',
    processedAt: row.processed_at || '',
    letterGenerated: row.letter_generated === 1,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapTerminationToDbRow(t: TerminationRecord): Record<string, any> {
  return {
    id: t.id,
    employee_id: t.employeeId,
    employee_name: t.employeeName,
    termination_date: t.terminationDate,
    reason: t.reason,
    reason_details: t.reasonDetails || null,
    years_of_service: t.yearsOfService,
    final_base_salary: t.finalBaseSalary,
    severance_pay: t.severancePay,
    proportional_leave: t.proportionalLeave,
    proportional_13th: t.proportional13th,
    proportional_holiday_subsidy: t.proportionalHolidaySubsidy,
    notice_period_days: t.noticePeriodDays,
    notice_compensation: t.noticeCompensation,
    unused_leave_days: t.unusedLeaveDays,
    unused_leave_compensation: t.unusedLeaveCompensation,
    total_package: t.totalPackage,
    processed_by: t.processedBy,
    processed_at: t.processedAt,
    letter_generated: t.letterGenerated ? 1 : 0,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

// Map DB row to SalaryAdjustment
function mapDbRowToAdjustment(row: any): SalaryAdjustment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || '',
    type: row.type || 'raise',
    effectiveDate: row.effective_date,
    previousSalary: row.previous_salary || 0,
    newSalary: row.new_salary || 0,
    changeAmount: row.change_amount || 0,
    changePercent: row.change_percent || 0,
    reason: row.reason || '',
    previousPosition: row.previous_position,
    newPosition: row.new_position,
    status: row.status || 'pending',
    requestedBy: row.requested_by || '',
    requestedAt: row.requested_at || '',
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapAdjustmentToDbRow(a: SalaryAdjustment): Record<string, any> {
  return {
    id: a.id,
    employee_id: a.employeeId,
    employee_name: a.employeeName,
    type: a.type,
    effective_date: a.effectiveDate,
    previous_salary: a.previousSalary,
    new_salary: a.newSalary,
    change_amount: a.changeAmount,
    change_percent: a.changePercent,
    reason: a.reason,
    previous_position: a.previousPosition || null,
    new_position: a.newPosition || null,
    status: a.status,
    requested_by: a.requestedBy,
    requested_at: a.requestedAt,
    approved_by: a.approvedBy || null,
    approved_at: a.approvedAt || null,
    rejected_by: a.rejectedBy || null,
    rejected_at: a.rejectedAt || null,
    rejection_reason: a.rejectionReason || null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export const useHRStore = create<HRState>()((set, get) => ({
  terminations: [],
  salaryAdjustments: [],
  isLoaded: false,
  
  loadHRData: async () => {
    try {
      // Try to load from database tables (they may not exist yet)
      let terminations: TerminationRecord[] = [];
      let salaryAdjustments: SalaryAdjustment[] = [];
      
      try {
        const terminationRows = await liveGetAll<any>('terminations');
        terminations = terminationRows.map(mapDbRowToTermination);
      } catch (e) {
        console.log('[HR] Terminations table not available yet');
      }
      
      try {
        const adjustmentRows = await liveGetAll<any>('salary_adjustments');
        salaryAdjustments = adjustmentRows.map(mapDbRowToAdjustment);
      } catch (e) {
        console.log('[HR] Salary adjustments table not available yet');
      }
      
      set({ terminations, salaryAdjustments, isLoaded: true });
      console.log('[HR] Loaded', terminations.length, 'terminations and', salaryAdjustments.length, 'adjustments');
    } catch (error) {
      console.error('[HR] Error loading:', error);
      set({ isLoaded: true });
    }
  },
  
  processTermination: async (employee, terminationData) => {
    const now = new Date().toISOString();
    
    const record: TerminationRecord = {
      id: `term-${crypto.randomUUID()}`,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      createdAt: now,
      updatedAt: now,
      ...terminationData,
    };
    
    try {
      // Save termination record
      const dbRow = mapTerminationToDbRow(record);
      await liveInsert('terminations', dbRow);
      
      // Update employee status to terminated
      const { updateEmployee } = useEmployeeStore.getState();
      await updateEmployee(employee.id, { status: 'terminated' } as any);
      
      // Log audit entry
      const { logAction } = useAuditStore.getState();
      logAction({
        action: 'employee_terminated',
        entityType: 'employee',
        entityId: employee.id,
        description: `Terminated ${record.employeeName} - ${record.reason} - Total: ${record.totalPackage}`,
      });
      
      // Update local state
      set(state => ({
        terminations: [...state.terminations, record],
      }));
      
      return { success: true, record };
    } catch (error) {
      console.error('[HR] Error processing termination:', error);
      
      // Fallback: just update employee and keep in memory
      const { updateEmployee } = useEmployeeStore.getState();
      await updateEmployee(employee.id, { status: 'terminated' } as any);
      
      set(state => ({
        terminations: [...state.terminations, record],
      }));
      
      return { success: true, record };
    }
  },
  
  getTerminationByEmployee: (employeeId) => {
    return get().terminations.find(t => t.employeeId === employeeId);
  },
  
  requestSalaryAdjustment: async (data, requestedBy) => {
    const { employees } = useEmployeeStore.getState();
    const employee = employees.find(e => e.id === data.employeeId);
    
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }
    
    const now = new Date().toISOString();
    const changeAmount = data.newSalary - employee.baseSalary;
    const changePercent = employee.baseSalary > 0 
      ? (changeAmount / employee.baseSalary) * 100 
      : 0;
    
    const adjustment: SalaryAdjustment = {
      id: `adj-${crypto.randomUUID()}`,
      employeeId: data.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      type: data.type,
      effectiveDate: data.effectiveDate,
      previousSalary: employee.baseSalary,
      newSalary: data.newSalary,
      changeAmount,
      changePercent,
      reason: data.reason,
      previousPosition: employee.position,
      newPosition: data.newPosition,
      status: 'pending',
      requestedBy,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      const dbRow = mapAdjustmentToDbRow(adjustment);
      await liveInsert('salary_adjustments', dbRow);
      
      set(state => ({
        salaryAdjustments: [...state.salaryAdjustments, adjustment],
      }));
      
      return { success: true };
    } catch (error) {
      console.error('[HR] Error creating salary adjustment:', error);
      
      // Fallback: keep in memory
      set(state => ({
        salaryAdjustments: [...state.salaryAdjustments, adjustment],
      }));
      
      return { success: true };
    }
  },
  
  approveSalaryAdjustment: async (id, approvedBy) => {
    const adjustment = get().salaryAdjustments.find(a => a.id === id);
    if (!adjustment) {
      return { success: false, error: 'Adjustment not found' };
    }
    
    if (adjustment.status !== 'pending') {
      return { success: false, error: 'Adjustment already processed' };
    }
    
    const now = new Date().toISOString();
    
    try {
      // Update adjustment status
      await liveUpdate('salary_adjustments', id, {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: now,
        updated_at: now,
      });
      
      // Apply the salary change to the employee
      const { updateEmployee } = useEmployeeStore.getState();
      const updateData: any = { baseSalary: adjustment.newSalary };
      
      if (adjustment.newPosition) {
        updateData.position = adjustment.newPosition;
      }
      
      await updateEmployee(adjustment.employeeId, updateData);
      
      // Log audit entry
      const { logAction } = useAuditStore.getState();
      logAction({
        action: 'salary_adjusted',
        entityType: 'employee',
        entityId: adjustment.employeeId,
        previousValue: JSON.stringify({ salary: adjustment.previousSalary }),
        newValue: JSON.stringify({ salary: adjustment.newSalary }),
        description: `Salary adjusted for ${adjustment.employeeName}: ${adjustment.previousSalary} → ${adjustment.newSalary} (${adjustment.changePercent.toFixed(1)}%)`,
      });
      
      // Update local state
      set(state => ({
        salaryAdjustments: state.salaryAdjustments.map(a =>
          a.id === id
            ? { ...a, status: 'approved' as ApprovalStatus, approvedBy, approvedAt: now, updatedAt: now }
            : a
        ),
      }));
      
      return { success: true };
    } catch (error) {
      console.error('[HR] Error approving adjustment:', error);
      
      // Fallback: just update employee
      const { updateEmployee } = useEmployeeStore.getState();
      await updateEmployee(adjustment.employeeId, { baseSalary: adjustment.newSalary });
      
      set(state => ({
        salaryAdjustments: state.salaryAdjustments.map(a =>
          a.id === id
            ? { ...a, status: 'approved' as ApprovalStatus, approvedBy, approvedAt: now, updatedAt: now }
            : a
        ),
      }));
      
      return { success: true };
    }
  },
  
  rejectSalaryAdjustment: async (id, rejectedBy, reason) => {
    const adjustment = get().salaryAdjustments.find(a => a.id === id);
    if (!adjustment) {
      return { success: false, error: 'Adjustment not found' };
    }
    
    const now = new Date().toISOString();
    
    try {
      await liveUpdate('salary_adjustments', id, {
        status: 'rejected',
        rejected_by: rejectedBy,
        rejected_at: now,
        rejection_reason: reason,
        updated_at: now,
      });
    } catch (e) {
      // Ignore DB errors, just update local state
    }
    
    set(state => ({
      salaryAdjustments: state.salaryAdjustments.map(a =>
        a.id === id
          ? { ...a, status: 'rejected' as ApprovalStatus, rejectedBy, rejectedAt: now, rejectionReason: reason, updatedAt: now }
          : a
      ),
    }));
    
    return { success: true };
  },
  
  getAdjustmentsByEmployee: (employeeId) => {
    return get().salaryAdjustments
      .filter(a => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  },
  
  getPendingAdjustments: () => {
    return get().salaryAdjustments.filter(a => a.status === 'pending');
  },
}));

// Initialize sync listener
let unsubscribe: (() => void) | null = null;

export function initHRStoreSync() {
  if (unsubscribe) return;
  
  const unsubTerminations = onTableSync('terminations', (table, rows) => {
    console.log('[HR] Terminations PUSH:', rows.length);
    const terminations = rows.map(mapDbRowToTermination);
    useHRStore.setState(state => ({ ...state, terminations }));
  });
  
  const unsubAdjustments = onTableSync('salary_adjustments', (table, rows) => {
    console.log('[HR] Adjustments PUSH:', rows.length);
    const salaryAdjustments = rows.map(mapDbRowToAdjustment);
    useHRStore.setState(state => ({ ...state, salaryAdjustments }));
  });
  
  unsubscribe = () => {
    unsubTerminations();
    unsubAdjustments();
  };
}
