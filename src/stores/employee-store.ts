import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, EmployeeFormData } from '@/types/employee';

interface EmployeeState {
  employees: Employee[];
  addEmployee: (data: EmployeeFormData) => Employee;
  updateEmployee: (id: string, data: Partial<EmployeeFormData>) => void;
  deleteEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
  getActiveEmployees: () => Employee[];
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
        const now = new Date().toISOString();
        const newEmployee: Employee = {
          ...data,
          id: crypto.randomUUID(),
          employeeNumber: data.employeeNumber || generateEmployeeNumber(),
          status: 'active',
          familyAllowance: data.familyAllowance || 0,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          employees: [...state.employees, newEmployee],
        }));
        
        return newEmployee;
      },
      
      updateEmployee: (id: string, data: Partial<EmployeeFormData>) => {
        set((state) => ({
          employees: state.employees.map((emp) =>
            emp.id === id
              ? { ...emp, ...data, updatedAt: new Date().toISOString() }
              : emp
          ),
        }));
      },
      
      deleteEmployee: (id: string) => {
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
    }
  )
);
