import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Employee, EmployeeFormData } from '@/types/employee';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';
import { usePayrollStore } from '@/stores/payroll-store';
interface EmployeeState {
  employees: Employee[];
  addEmployee: (data: EmployeeFormData) => { success: boolean; employee?: Employee; error?: string };
  updateEmployee: (id: string, data: Partial<EmployeeFormData>) => { success: boolean; error?: string };
  deleteEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
  getActiveEmployees: () => Employee[];
  isEmployeeNumberTaken: (employeeNumber: string, excludeId?: string) => boolean;
  isEmployeeNameTaken: (firstName: string, lastName: string, excludeId?: string) => boolean;
}

// Generate a unique employee number
function generateEmployeeNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EMP-${year}-${random}`;
}

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set, get) => ({
      employees: [],
      
      addEmployee: (data: EmployeeFormData) => {
        // Check for duplicate employee number
        if (data.employeeNumber) {
          const existingByNumber = get().employees.find(
            e => e.employeeNumber.toLowerCase() === data.employeeNumber!.toLowerCase()
          );
          if (existingByNumber) {
            return { success: false, error: 'Número de funcionário já existe / Employee number already exists' };
          }
        }
        
        // Check for duplicate name (same full name - firstName + lastName)
        const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
        const existingByName = get().employees.find(
          e => `${e.firstName} ${e.lastName}`.toLowerCase() === fullName && e.status === 'active'
        );
        if (existingByName) {
          return { success: false, error: 'Funcionário com este nome já existe / Employee with this name already exists' };
        }
        
        const now = new Date().toISOString();
        const newEmployee: Employee = {
          ...data,
          id: crypto.randomUUID(),
          employeeNumber: data.employeeNumber || generateEmployeeNumber(),
          status: 'active',
          familyAllowance: data.familyAllowance || 0,
          monthlyBonus: data.monthlyBonus || 0,
          holidaySubsidy: data.holidaySubsidy || 0,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          employees: [...state.employees, newEmployee],
        }));
        
        return { success: true, employee: newEmployee };
      },
      
      updateEmployee: (id: string, data: Partial<EmployeeFormData>) => {
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
        
        set((state) => ({
          employees: state.employees.map((emp) =>
            emp.id === id
              ? { ...emp, ...data, updatedAt: new Date().toISOString() }
              : emp
          ),
        }));
        
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
      
      deleteEmployee: (id: string) => {
        // Clean up payroll entries for this employee
        const payrollStore = usePayrollStore.getState();
        payrollStore.removeEntriesForEmployee(id);
        
        set((state) => ({
          employees: state.employees.filter((emp) => emp.id !== id),
        }));
      },
      
      getEmployee: (id: string) => {
        return get().employees.find((emp) => emp.id === id);
      },
      
      getActiveEmployees: () => {
        return get().employees.filter((emp) => emp.status === 'active');
      },
    }),
    {
      name: 'payrollao-employees',
      storage: createJSONStorage(() => createElectronStorage('employees')),
    }
  )
);
