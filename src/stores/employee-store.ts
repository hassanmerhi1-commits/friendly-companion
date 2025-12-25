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

// Sample employees data for demonstration
const sampleEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@empresa.co.ao',
    phone: '+244 923 456 789',
    address: 'Rua Rainha Ginga, 123, Luanda',
    dateOfBirth: '1985-03-15',
    nationality: 'Angolana',
    bilheteIdentidade: '000123456LA789',
    nif: '5000123456',
    inssNumber: 'INSS-2020-001234',
    employeeNumber: 'EMP-2020-0001',
    department: 'Tecnologia',
    position: 'Gestor de TI',
    contractType: 'permanent',
    hireDate: '2020-01-15',
    status: 'active',
    baseSalary: 450000,
    mealAllowance: 15000,
    transportAllowance: 25000,
    otherAllowances: 0,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco Angolano de Investimentos (BAI)',
    bankAccountNumber: '0051.0000.0012.3456.7890.1',
    isRetired: false,
    createdAt: '2020-01-15T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@empresa.co.ao',
    phone: '+244 912 345 678',
    address: 'Av. 4 de Fevereiro, 456, Luanda',
    dateOfBirth: '1990-07-22',
    nationality: 'Angolana',
    bilheteIdentidade: '000234567LA890',
    nif: '5000234567',
    inssNumber: 'INSS-2021-002345',
    employeeNumber: 'EMP-2021-0002',
    department: 'Recursos Humanos',
    position: 'Directora de RH',
    contractType: 'permanent',
    hireDate: '2021-03-01',
    status: 'active',
    baseSalary: 550000,
    mealAllowance: 15000,
    transportAllowance: 25000,
    otherAllowances: 50000,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco de Fomento Angola (BFA)',
    bankAccountNumber: '0002.0000.0034.5678.9012.3',
    isRetired: false,
    createdAt: '2021-03-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '3',
    firstName: 'António',
    lastName: 'Ferreira',
    email: 'antonio.ferreira@empresa.co.ao',
    phone: '+244 934 567 890',
    address: 'Bairro Ingombota, Luanda',
    dateOfBirth: '1988-11-10',
    nationality: 'Angolana',
    bilheteIdentidade: '000345678LA901',
    nif: '5000345678',
    inssNumber: 'INSS-2019-003456',
    employeeNumber: 'EMP-2019-0003',
    department: 'Finanças',
    position: 'Controller Financeiro',
    contractType: 'permanent',
    hireDate: '2019-06-15',
    status: 'active',
    baseSalary: 600000,
    mealAllowance: 15000,
    transportAllowance: 30000,
    otherAllowances: 75000,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco Millennium Atlântico',
    bankAccountNumber: '0018.0000.0045.6789.0123.4',
    isRetired: false,
    createdAt: '2019-06-15T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '4',
    firstName: 'Ana',
    lastName: 'Lourenço',
    email: 'ana.lourenco@empresa.co.ao',
    phone: '+244 945 678 901',
    address: 'Talatona, Luanda',
    dateOfBirth: '1992-04-28',
    nationality: 'Angolana',
    bilheteIdentidade: '000456789LA012',
    nif: '5000456789',
    inssNumber: 'INSS-2022-004567',
    employeeNumber: 'EMP-2022-0004',
    department: 'Vendas',
    position: 'Executiva de Vendas',
    contractType: 'permanent',
    hireDate: '2022-09-01',
    status: 'active',
    baseSalary: 280000,
    mealAllowance: 12000,
    transportAllowance: 20000,
    otherAllowances: 0,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco BIC',
    bankAccountNumber: '0005.0000.0056.7890.1234.5',
    isRetired: false,
    createdAt: '2022-09-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '5',
    firstName: 'Pedro',
    lastName: 'Mendes',
    email: 'pedro.mendes@empresa.co.ao',
    phone: '+244 956 789 012',
    address: 'Maianga, Luanda',
    dateOfBirth: '1980-12-05',
    nationality: 'Angolana',
    bilheteIdentidade: '000567890LA123',
    nif: '5000567890',
    inssNumber: 'INSS-2018-005678',
    employeeNumber: 'EMP-2018-0005',
    department: 'Operações',
    position: 'Director de Operações',
    contractType: 'permanent',
    hireDate: '2018-02-01',
    status: 'active',
    baseSalary: 750000,
    mealAllowance: 20000,
    transportAllowance: 40000,
    otherAllowances: 100000,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco de Fomento Angola (BFA)',
    bankAccountNumber: '0002.0000.0067.8901.2345.6',
    isRetired: false,
    createdAt: '2018-02-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '6',
    firstName: 'Carla',
    lastName: 'Domingos',
    email: 'carla.domingos@empresa.co.ao',
    phone: '+244 967 890 123',
    address: 'Viana, Luanda',
    dateOfBirth: '1995-08-18',
    nationality: 'Angolana',
    bilheteIdentidade: '000678901LA234',
    nif: '5000678901',
    inssNumber: 'INSS-2023-006789',
    employeeNumber: 'EMP-2023-0006',
    department: 'Administração',
    position: 'Assistente Administrativo',
    contractType: 'fixed_term',
    hireDate: '2023-04-15',
    contractEndDate: '2025-04-14',
    status: 'active',
    baseSalary: 180000,
    mealAllowance: 10000,
    transportAllowance: 15000,
    otherAllowances: 0,
    paymentMethod: 'bank_transfer',
    bankName: 'Banco Sol',
    bankAccountNumber: '0027.0000.0078.9012.3456.7',
    isRetired: false,
    createdAt: '2023-04-15T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
];

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set, get) => ({
      employees: sampleEmployees,
      
      addEmployee: (data: EmployeeFormData) => {
        const now = new Date().toISOString();
        const newEmployee: Employee = {
          ...data,
          id: crypto.randomUUID(),
          employeeNumber: data.employeeNumber || generateEmployeeNumber(),
          status: 'active',
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
