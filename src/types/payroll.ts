/**
 * Payroll data types for PayrollAO
 */

import type { Employee } from './employee';

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid';
export type PayrollPeriodType = 'monthly' | 'biweekly';

export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  periodType: PayrollPeriodType;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalEmployerCosts: number;
  employeeCount: number;
  createdAt: string;
  processedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollEntry {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employee?: Employee;
  
  // Earnings
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  familyAllowance: number; // Abono de Família
  monthlyBonus: number; // Bónus Mensal - user-defined
  overtimeNormal: number; // Calculated overtime value for normal hours
  overtimeNight: number; // Calculated overtime value for night hours
  overtimeHoliday: number; // Calculated overtime value for holiday hours
  thirteenthMonth: number;
  holidaySubsidy: number;
  grossSalary: number;
  
  // Deductions
  irt: number;
  inssEmployee: number;
  absenceDeduction: number; // Desconto por faltas - based on 22 working days
  loanDeduction: number; // Empréstimos
  advanceDeduction: number; // Adiantamentos
  otherDeductions: number; // Other misc deductions
  deductionDetails?: string; // JSON string with deduction breakdown
  totalDeductions: number;
  
  // Employer Costs
  inssEmployer: number;
  
  // Net
  netSalary: number;
  totalEmployerCost: number;
  
  // Status
  status: PayrollStatus;
  
  // Overtime hours input (for tracking and calculation)
  overtimeHoursNormal: number;
  overtimeHoursNight: number;
  overtimeHoursHoliday: number;
  
  // Absences
  daysAbsent: number; // Dias de falta
  
  // Dependents for family allowance (deprecated - using familyAllowance value)
  dependents?: number;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PayrollSummary {
  period: PayrollPeriod;
  entries: PayrollEntry[];
  
  // Aggregated totals
  totals: {
    baseSalary: number;
    allowances: number;
    overtime: number;
    subsidies: number;
    grossSalary: number;
    irt: number;
    inssEmployee: number;
    totalDeductions: number;
    netSalary: number;
    inssEmployer: number;
    totalEmployerCost: number;
  };
  
  // By department breakdown
  byDepartment: {
    department: string;
    employeeCount: number;
    totalGross: number;
    totalNet: number;
  }[];
}

// Month names in Portuguese
export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export function getPayrollPeriodLabel(year: number, month: number): string {
  return `${MONTH_NAMES_PT[month - 1]} ${year}`;
}
