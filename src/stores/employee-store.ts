import { create } from 'zustand';
import type { Employee, EmployeeFormData } from '@/types/employee';
import { usePayrollStore } from '@/stores/payroll-store';
import { liveGetAll, liveGetById, liveInsert, liveUpdate, liveDelete, onDataChange } from '@/lib/db-live';

/**
 * Employee Store - Database-Centric Architecture
 * 
 * This store uses LIVE database reads - the local `employees` array is 
 * automatically refreshed when any data change is detected (local or remote).
 * This ensures all clients on the network see the same data instantly.
 */

interface EmployeeState {
  employees: Employee[];
  isLoaded: boolean;
  
  // Load/refresh from database
  loadEmployees: () => Promise<void>;
  
  // Database operations
  getEmployee: (id: string) => Employee | undefined;
  getActiveEmployees: () => Employee[];
  addEmployee: (data: EmployeeFormData) => Promise<{ success: boolean; employee?: Employee; error?: string }>;
  updateEmployee: (id: string, data: Partial<EmployeeFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Validation helpers
  isEmployeeNumberTaken: (employeeNumber: string, excludeId?: string) => boolean;
  isEmployeeNameTaken: (firstName: string, lastName: string, excludeId?: string) => boolean;
}

// Generate a unique employee number
function generateEmployeeNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EMP-${year}-${random}`;
}

// Map database row to Employee object
function mapDbRowToEmployee(row: any): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number || '',
    firstName: row.name?.split(' ')[0] || '',
    lastName: row.name?.split(' ').slice(1).join(' ') || '',
    position: row.position || '',
    department: row.department || '',
    branchId: row.branch_id || '',
    hireDate: row.hire_date || '',
    dateOfBirth: row.birth_date || '',
    contractType: row.contract_type || 'permanent',
    contractEndDate: row.contract_end_date || '',
    baseSalary: row.base_salary || 0,
    paymentMethod: row.payment_method || 'bank_transfer',
    bankName: row.bank_name || '',
    bankAccountNumber: row.bank_account || '',
    iban: row.iban || '',
    nif: row.nif || '',
    inssNumber: row.social_security || '',
    bilheteIdentidade: row.bi || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    emergencyContactName: row.emergency_contact || '',
    emergencyContactPhone: row.emergency_phone || '',
    nationality: row.nationality || '',
    photoUrl: row.photo || '',
    status: row.status || 'active',
    notes: row.notes || '',
    familyAllowance: row.family_allowance || 0,
    monthlyBonus: row.monthly_bonus || 0,
    holidaySubsidy: row.holiday_subsidy || 0,
    mealAllowance: row.meal_allowance || 0,
    transportAllowance: row.transport_allowance || 0,
    otherAllowances: row.other_allowances || 0,
    isRetired: row.is_retired === 1,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// Map Employee object to database row
function mapEmployeeToDbRow(emp: Employee): Record<string, any> {
  return {
    id: emp.id,
    employee_number: emp.employeeNumber,
    name: `${emp.firstName} ${emp.lastName}`.trim(),
    position: emp.position,
    department: emp.department,
    branch_id: emp.branchId,
    hire_date: emp.hireDate,
    birth_date: emp.dateOfBirth,
    contract_type: emp.contractType,
    contract_end_date: emp.contractEndDate,
    base_salary: emp.baseSalary,
    payment_method: emp.paymentMethod,
    bank_name: emp.bankName,
    bank_account: emp.bankAccountNumber,
    iban: emp.iban,
    nif: emp.nif,
    social_security: emp.inssNumber,
    bi: emp.bilheteIdentidade,
    address: emp.address,
    phone: emp.phone,
    email: emp.email,
    emergency_contact: emp.emergencyContactName,
    emergency_phone: emp.emergencyContactPhone,
    nationality: emp.nationality,
    photo: emp.photoUrl,
    status: emp.status,
    notes: emp.notes,
    family_allowance: emp.familyAllowance,
    monthly_bonus: emp.monthlyBonus,
    holiday_subsidy: emp.holidaySubsidy,
    meal_allowance: emp.mealAllowance,
    transport_allowance: emp.transportAllowance,
    other_allowances: emp.otherAllowances,
    is_retired: emp.isRetired ? 1 : 0,
    created_at: emp.createdAt,
    updated_at: emp.updatedAt,
  };
}

export const useEmployeeStore = create<EmployeeState>()((set, get) => ({
  employees: [],
  isLoaded: false,
  
  // LIVE LOAD: Fetches fresh data from database
  loadEmployees: async () => {
    try {
      const rows = await liveGetAll<any>('employees');
      const employees = rows.map(mapDbRowToEmployee);
      set({ employees, isLoaded: true });
      console.log('[Employees] Loaded', employees.length, 'employees from database');
    } catch (error) {
      console.error('[Employees] Error loading:', error);
      set({ isLoaded: true });
    }
  },
  
  getEmployee: (id: string) => {
    return get().employees.find((emp) => emp.id === id);
  },
  
  getActiveEmployees: () => {
    return get().employees.filter((emp) => emp.status === 'active');
  },
  
  addEmployee: async (data: EmployeeFormData) => {
    // Check for duplicate employee number
    if (data.employeeNumber) {
      const existingByNumber = get().employees.find(
        e => e.employeeNumber.toLowerCase() === data.employeeNumber!.toLowerCase()
      );
      if (existingByNumber) {
        return { success: false, error: 'Número de funcionário já existe / Employee number already exists' };
      }
    }
    
    // Check for duplicate name
    const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
    const existingByName = get().employees.find(
      e => `${e.firstName} ${e.lastName}`.toLowerCase() === fullName && e.status === 'active'
    );
    if (existingByName) {
      return { success: false, error: 'Funcionário com este nome já existe / Employee with this name already exists' };
    }
    
    const now = new Date().toISOString();
    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      employeeNumber: data.employeeNumber || generateEmployeeNumber(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      bilheteIdentidade: data.bilheteIdentidade,
      nif: data.nif,
      inssNumber: data.inssNumber,
      department: data.department,
      position: data.position,
      contractType: data.contractType,
      hireDate: data.hireDate,
      contractEndDate: data.contractEndDate,
      status: 'active',
      branchId: data.branchId,
      baseSalary: data.baseSalary,
      mealAllowance: data.mealAllowance,
      transportAllowance: data.transportAllowance,
      otherAllowances: data.otherAllowances,
      familyAllowance: data.familyAllowance || 0,
      monthlyBonus: data.monthlyBonus || 0,
      holidaySubsidy: data.holidaySubsidy || 0,
      paymentMethod: data.paymentMethod,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      iban: data.iban,
      isRetired: data.isRetired,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      notes: data.notes,
      photoUrl: data.photoUrl,
      createdAt: now,
      updatedAt: now,
    };
    
    const dbRow = mapEmployeeToDbRow(newEmployee);
    const success = await liveInsert('employees', dbRow);
    if (!success) {
      return { success: false, error: 'Erro ao guardar no banco de dados' };
    }
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
    
    return { success: true, employee: newEmployee };
  },
  
  updateEmployee: async (id: string, data: Partial<EmployeeFormData>) => {
    // Check for duplicate employee number if being updated
    if (data.employeeNumber) {
      const existingByNumber = get().employees.find(
        e => e.employeeNumber.toLowerCase() === data.employeeNumber!.toLowerCase() && e.id !== id
      );
      if (existingByNumber) {
        return { success: false, error: 'Número de funcionário já existe / Employee number already exists' };
      }
    }
    
    // Check for duplicate name if being updated
    if (data.firstName || data.lastName) {
      const currentEmployee = get().employees.find(e => e.id === id);
      if (currentEmployee) {
        const newFirstName = data.firstName || currentEmployee.firstName;
        const newLastName = data.lastName || currentEmployee.lastName;
        const fullName = `${newFirstName} ${newLastName}`.toLowerCase();
        const existingByName = get().employees.find(
          e => `${e.firstName} ${e.lastName}`.toLowerCase() === fullName && e.id !== id && e.status === 'active'
        );
        if (existingByName) {
          return { success: false, error: 'Funcionário com este nome já existe / Employee with this name already exists' };
        }
      }
    }
    
    const currentEmployee = get().employees.find(e => e.id === id);
    if (!currentEmployee) {
      return { success: false, error: 'Funcionário não encontrado' };
    }
    
    const updatedEmployee: Employee = {
      ...currentEmployee,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const dbRow = mapEmployeeToDbRow(updatedEmployee);
    // Remove id from update data (it's used in WHERE clause)
    const { id: _, ...updateData } = dbRow;
    const success = await liveUpdate('employees', id, updateData);
    if (!success) {
      return { success: false, error: 'Erro ao actualizar no banco de dados' };
    }
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
    
    return { success: true };
  },
  
  isEmployeeNumberTaken: (employeeNumber: string, excludeId?: string) => {
    return get().employees.some(
      e => e.employeeNumber.toLowerCase() === employeeNumber.toLowerCase() && e.id !== excludeId
    );
  },
  
  isEmployeeNameTaken: (firstName: string, lastName: string, excludeId?: string) => {
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return get().employees.some(
      e => `${e.firstName} ${e.lastName}`.toLowerCase() === fullName && e.id !== excludeId && e.status === 'active'
    );
  },
  
  deleteEmployee: async (id: string) => {
    // Clean up payroll entries for this employee
    const payrollStore = usePayrollStore.getState();
    await payrollStore.removeEntriesForEmployee(id);
    
    await liveDelete('employees', id);
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
  },
}));

// Subscribe to data changes for auto-refresh
let unsubscribe: (() => void) | null = null;

export function initEmployeeStoreSync() {
  if (unsubscribe) return;
  
  unsubscribe = onDataChange((table) => {
    if (table === 'employees') {
      console.log('[Employees] Data change detected, refreshing from database...');
      useEmployeeStore.getState().loadEmployees();
    }
  });
}

export function cleanupEmployeeStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
