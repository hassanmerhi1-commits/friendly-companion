/**
 * Deduction types for PayrollAO
 * Includes salary advances and warehouse losses
 */

export type DeductionType = 
  | 'salary_advance' // Adiantamento salarial
  | 'warehouse_loss' // Perda no armazém
  | 'loan' // Empréstimo
  | 'disciplinary' // Desconto disciplinar
  | 'other'; // Outros

export interface Deduction {
  id: string;
  employeeId: string;
  type: DeductionType;
  description: string;
  amount: number;
  date: string;
  payrollPeriodId?: string; // If already applied to a payroll
  isApplied: boolean;
  installments?: number; // For advances paid in installments
  currentInstallment?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionFormData {
  employeeId: string;
  type: DeductionType;
  description: string;
  amount: number;
  date: string;
  installments?: number;
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
