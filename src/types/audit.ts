/**
 * Audit and History types for PayrollAO Enterprise
 * 
 * Tracks all changes for compliance, HR decisions, and historical analysis
 */

export type AuditAction = 
  | 'payroll_calculated'
  | 'payroll_approved'
  | 'payroll_reopened'
  | 'payroll_paid'
  | 'entry_updated'
  | 'overtime_added'
  | 'absence_recorded'
  | 'absence_justified'
  | 'absence_rejected'
  | 'absence_approved'
  | 'absence_deleted'
  | 'deduction_applied'
  | 'deduction_created'
  | 'deduction_updated'
  | 'deduction_deleted'
  | 'deduction_paid'
  | 'salary_changed'
  | 'salary_adjusted'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_hired'
  | 'employee_terminated'
  | 'employee_approved'
  | 'employee_deleted'
  | 'loan_created'
  | 'loan_updated'
  | 'loan_payment'
  | 'loan_deleted'
  | 'disciplinary_created'
  | 'disciplinary_updated'
  | 'disciplinary_deleted'
  | 'attendance_updated'
  | 'settings_updated'
  | 'correction_applied'
  | 'termination_reversed';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  userId?: string;
  userName?: string;
  
  // What was affected
  entityType: 'payroll_period' | 'payroll_entry' | 'employee' | 'deduction' | 'loan' | 'absence' | 'disciplinary' | 'attendance' | 'settings';
  entityId: string;
  
  // Context
  periodId?: string;
  employeeId?: string;
  
  // Change details
  previousValue?: string; // JSON stringified
  newValue?: string; // JSON stringified
  description: string;
  
  // For corrections
  correctionReason?: string;
  correctionReference?: string; // Reference to original period if this is a correction
}

export interface EmployeeSalaryHistory {
  employeeId: string;
  employeeName: string;
  hireDate: string;
  currentSalary: number;
  
  // All salary records across time
  records: SalaryRecord[];
  
  // Aggregated stats
  totalEarnings: number;
  totalDeductions: number;
  totalNetPaid: number;
  averageMonthlySalary: number;
  monthsWorked: number;
}

export interface SalaryRecord {
  periodId: string;
  year: number;
  month: number;
  periodStatus: string;
  
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  
  // Breakdown
  overtime: number;
  subsidies: number; // 13th + holiday
  absenceDeduction: number;
  irt: number;
  inss: number;
  
  // Timestamps
  calculatedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface SalaryComparison {
  employeeId: string;
  employeeName: string;
  
  // Year-over-year comparison
  years: {
    year: number;
    totalGross: number;
    totalNet: number;
    averageMonthly: number;
    monthsWorked: number;
  }[];
  
  // Growth metrics
  salaryGrowthPercent?: number;
  netGrowthPercent?: number;
}

export interface PayrollHistorySummary {
  // All-time stats
  totalPeriodsProcessed: number;
  totalEmployeesPaid: number;
  totalGrossPaid: number;
  totalNetPaid: number;
  totalDeductionsCollected: number;
  
  // By year breakdown
  byYear: {
    year: number;
    periodsCount: number;
    employeesCount: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
  }[];
  
  // Most recent periods
  recentPeriods: {
    id: string;
    year: number;
    month: number;
    status: string;
    totalGross: number;
    totalNet: number;
    employeeCount: number;
    approvedAt?: string;
  }[];
}
