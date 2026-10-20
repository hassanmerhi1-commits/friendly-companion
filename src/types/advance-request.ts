/**
 * Employee salary-advance REQUEST workflow (pedido → admin approve → deduction).
 * Separate from Deduction until approved (Option A: approve creates salary_advance immediately).
 */

export type AdvanceRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AdvanceRequest {
  id: string;
  employeeId: string;
  /** Snapshot at request time — printable paper stays stable even if employee moves filial */
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  position: string;
  hireDate: string;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  /** Open debt at request time: all unpaid deductions + active loans */
  amountOwed: number;
  requestedAmount: number;
  reason: string;
  installments: number;
  monthlyAmount: number;
  deductFromPeriodId?: string;
  status: AdvanceRequestStatus;
  requestedByUserId?: string;
  requestedByName?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  /** Set when approved — links to created salary_advance deduction */
  deductionId?: string;
  requestDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceRequestFormData {
  employeeId: string;
  requestedAmount: number;
  reason: string;
  installments: number;
  monthlyAmount?: number;
  deductFromPeriodId?: string;
  requestDate: string;
}
