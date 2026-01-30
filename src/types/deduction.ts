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
  isApplied: boolean;
  isFullyPaid: boolean; // True when all installments are paid
  installments: number; // Total number of installments (1 = single payment)
  installmentsPaid: number; // Number of installments already paid
  remainingAmount: number; // Amount still to be deducted
  createdAt: string;
  updatedAt: string;
}

export interface DeductionFormData {
  employeeId: string;
  type: DeductionType;
  description: string;
  totalAmount: number; // Total amount to deduct
  date: string;
  installments: number; // Number of installments to spread over
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
