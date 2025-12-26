/**
 * Employee data types for PayrollAO
 */

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type ContractType = 'permanent' | 'fixed_term' | 'part_time' | 'probation';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'mobile_money';

export interface Employee {
  id: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  nationality: string;
  bilheteIdentidade: string; // BI - National ID
  nif: string; // NIF - Tax Identification Number
  inssNumber: string; // INSS registration number
  
  // Employment Details
  employeeNumber: string;
  department: string;
  position: string;
  contractType: ContractType;
  hireDate: string;
  contractEndDate?: string; // For fixed-term contracts
  status: EmployeeStatus;
  branchId?: string; // Link to branch
  
  // Compensation
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  
  // Family Allowance (Abono de Família)
  familyAllowance: number; // Fixed money value for family allowance
  
  // Banking
  paymentMethod: PaymentMethod;
  bankName?: string;
  bankAccountNumber?: string;
  iban?: string;
  
  // Additional Info
  isRetired: boolean; // For retired employees returning to work
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  nationality: string;
  bilheteIdentidade: string;
  nif: string;
  inssNumber: string;
  employeeNumber: string;
  department: string;
  position: string;
  contractType: ContractType;
  hireDate: string;
  contractEndDate?: string;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  familyAllowance?: number; // Fixed money value for family allowance
  branchId?: string;
  paymentMethod: PaymentMethod;
  bankName?: string;
  bankAccountNumber?: string;
  iban?: string;
  isRetired: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

// Department options
export const DEPARTMENTS = [
  'Administração',
  'Recursos Humanos',
  'Finanças',
  'Tecnologia',
  'Operações',
  'Vendas',
  'Marketing',
  'Jurídico',
  'Logística',
  'Produção',
] as const;

// Bank options in Angola
export const ANGOLA_BANKS = [
  'Banco Angolano de Investimentos (BAI)',
  'Banco de Fomento Angola (BFA)',
  'Banco BIC',
  'Banco Millennium Atlântico',
  'Banco de Poupança e Crédito (BPC)',
  'Banco Caixa Geral Angola',
  'Standard Bank Angola',
  'Banco Comercial do Huambo (BCH)',
  'Banco Keve',
  'Banco Sol',
  'Finibanco Angola',
  'Banco VTB África',
] as const;
