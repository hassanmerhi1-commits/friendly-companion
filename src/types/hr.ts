/**
 * HR Management Types
 * Termination records and salary adjustments
 */

export type TerminationReason = 'voluntary' | 'dismissal' | 'contract_end' | 'retirement' | 'mutual_agreement';
export type AdjustmentType = 'raise' | 'promotion' | 'demotion' | 'correction' | 'annual_review';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TerminationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  
  // Termination details
  terminationDate: string;
  reason: TerminationReason;
  reasonDetails?: string;
  
  // Final calculations
  yearsOfService: number;
  finalBaseSalary: number;
  severancePay: number;
  proportionalLeave: number;
  proportional13th: number;
  proportionalHolidaySubsidy: number;
  noticePeriodDays: number;
  noticeCompensation: number;
  unusedLeaveDays: number;
  unusedLeaveCompensation: number;
  totalPackage: number;
  
  // Processing info
  processedBy: string;
  processedAt: string;
  letterGenerated: boolean;

  /** True when registered from Funcionários «Saída da empresa» (no severance package). */
  isLightExit?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  
  // Adjustment details
  type: AdjustmentType;
  effectiveDate: string;
  previousSalary: number;
  newSalary: number;
  changeAmount: number;
  changePercent: number;
  reason: string;
  
  // New position (for promotions)
  previousPosition?: string;
  newPosition?: string;
  
  // Approval workflow
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdjustmentFormData {
  employeeId: string;
  type: AdjustmentType;
  effectiveDate: string;
  newSalary: number;
  reason: string;
  newPosition?: string;
}

/** Formal transfer of an employee from one filial to another */
export interface BranchTransferRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  effectiveDate: string;
  reason?: string;
  transferredBy: string;
  transferredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchTransferFormData {
  employeeId: string;
  toBranchId: string;
  effectiveDate: string;
  reason?: string;
}
