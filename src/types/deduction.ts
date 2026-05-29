/**
 * Deduction types for PayrollAO
 * Includes salary advances and warehouse losses
 */

export type DeductionType = 
  | 'salary_advance' // Adiantamento salarial
  | 'warehouse_loss' // Perda no armazém
  | 'unjustified_absence' // Falta injustificada
  | 'loan' // Empréstimo
  | 'disciplinary' // Desconto disciplinar
  | 'other'; // Outros

export interface Deduction {
  id: string;
  employeeId: string;
  type: DeductionType;
  description: string;
  totalAmount: number; // Total amount to be deducted
  amount: number; // Monthly installment amount (totalAmount / installments)
  date: string;
  payrollPeriodId?: string; // If already applied to a payroll
  /** Optional: first payroll period to start deducting (any type). */
  deductFromPeriodId?: string;
  isApplied: boolean;
  isFullyPaid: boolean; // True when all installments are paid
  installments: number; // Total number of installments (1 = single payment)
  installmentsPaid: number; // Number of installments already paid
  remainingAmount: number; // Amount still to be deducted
  /** When true (warehouse loss only), folha deducts full installment — not capped at 25%. */
  ignoreWarehouseCap?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionFormData {
  employeeId: string;
  type: DeductionType;
  description: string;
  totalAmount: number; // Total amount to deduct
  monthlyAmount?: number; // Optional explicit monthly installment amount
  date: string;
  installments: number; // Number of installments to spread over
  /** Optional: first folha month to start deducting (leave empty for default behaviour). */
  deductFromPeriodId?: string;
  ignoreWarehouseCap?: boolean;
}

// Salary advance specific
export interface SalaryAdvance extends Deduction {
  type: 'salary_advance';
  approvedBy?: string;
  reason?: string;
}

// Warehouse loss specific
export interface WarehouseLoss extends Deduction {
  type: 'warehouse_loss';
  warehouseId?: string;
  itemDescription?: string;
  incidentDate: string;
  investigationNotes?: string;
}
