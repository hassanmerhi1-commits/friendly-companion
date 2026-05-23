import { create } from 'zustand';
import type { Employee, EmployeeExitReason, EmployeeFormData } from '@/types/employee';
import { formatFormerEmployeeBlockMessage } from '@/lib/employee-exit';
import { usePayrollStore } from '@/stores/payroll-store';
import { useAuthStore } from '@/stores/auth-store';
import { liveGetAll, liveGetById, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';
import { logAudit } from '@/lib/audit-helper';

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
  backfillCategoryFromPosition: () => Promise<number>;
  
  // Database operations
  getEmployee: (id: string) => Employee | undefined;
  getActiveEmployees: () => Employee[];
  getPendingEmployees: () => Employee[];
  addEmployee: (data: EmployeeFormData) => Promise<{ success: boolean; employee?: Employee; error?: string }>;
  updateEmployee: (id: string, data: Partial<EmployeeFormData>) => Promise<{ success: boolean; error?: string }>;
  approveEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteEmployee: (id: string) => Promise<void>;
  offboardEmployee: (
    id: string,
    data: { exitDate: string; exitReason: EmployeeExitReason; exitNote: string; processedBy: string }
  ) => Promise<{ success: boolean; error?: string }>;
  rehireEmployee: (
    id: string,
    data: { note?: string; processedBy: string }
  ) => Promise<{ success: boolean; error?: string }>;
  findFormerEmployeeByIdentity: (data: {
    bilheteIdentidade?: string;
    nif?: string;
    employeeNumber?: string;
  }) => Employee | undefined;
  
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
    category: row.category || row.position || '',
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
    exitDate: row.exit_date || undefined,
    exitReason: row.exit_reason || undefined,
    exitNote: row.exit_note || undefined,
    exitProcessedBy: row.exit_processed_by || undefined,
    exitProcessedAt: row.exit_processed_at || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function normalizeIdentity(value: string): string {
  return value.replace(/\s/g, '').toLowerCase();
}

function formatIdentityConflict(employee: Employee, language = 'pt'): string {
  return formatFormerEmployeeBlockMessage(employee, language);
}

// Map Employee object to database row
function mapEmployeeToDbRow(emp: Employee): Record<string, any> {
  return {
    id: emp.id,
    employee_number: emp.employeeNumber,
    name: `${emp.firstName} ${emp.lastName}`.trim(),
    position: emp.position,
    department: emp.department,
    category: emp.category || emp.position || '',
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
    exit_date: emp.exitDate || null,
    exit_reason: emp.exitReason || null,
    exit_note: emp.exitNote || null,
    exit_processed_by: emp.exitProcessedBy || null,
    exit_processed_at: emp.exitProcessedAt || null,
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

  backfillCategoryFromPosition: async () => {
    const rows = await liveGetAll<any>('employees');
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const row of rows) {
      const position = (row.position || '').toString().trim();
      if (!position) continue;

      const currentCategory = (row.category || '').toString().trim();
      const normalizedCategory = currentCategory.toLowerCase();
      // Migrate when category missing or still default "other" while cargo/position is set
      const shouldMigrate = !currentCategory || normalizedCategory === 'other';

      if (shouldMigrate && currentCategory !== position) {
        const ok = await liveUpdate('employees', row.id, {
          category: position,
          updated_at: now,
        });
        if (ok) updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await get().loadEmployees();
      console.log(`[Employees] Migrated category from cargo for ${updatedCount} employee(s)`);
    }
    return updatedCount;
  },
  
  getEmployee: (id: string) => {
    return get().employees.find((emp) => emp.id === id);
  },
  
  getActiveEmployees: () => {
    return get().employees.filter((emp) => emp.status === 'active');
  },
  
  getPendingEmployees: () => {
    return get().employees.filter((emp) => emp.status === 'pending_approval');
  },
  
  findFormerEmployeeByIdentity: (data) => {
    const { employees } = get();
    const bi = data.bilheteIdentidade?.trim();
    const nif = data.nif?.trim();
    const num = data.employeeNumber?.trim();

    return employees.find((e) => {
      if (e.status !== 'terminated') return false;
      if (bi && e.bilheteIdentidade && normalizeIdentity(e.bilheteIdentidade) === normalizeIdentity(bi)) {
        return true;
      }
      if (nif && e.nif && normalizeIdentity(e.nif) === normalizeIdentity(nif)) return true;
      if (num && e.employeeNumber && e.employeeNumber.toLowerCase() === num.toLowerCase()) return true;
      return false;
    });
  },

  addEmployee: async (data: EmployeeFormData) => {
    const former = get().findFormerEmployeeByIdentity({
      bilheteIdentidade: data.bilheteIdentidade,
      nif: data.nif,
      employeeNumber: data.employeeNumber,
    });
    if (former) {
      return { success: false, error: formatIdentityConflict(former, 'pt') };
    }

    // Check for duplicate employee number (active or other non-terminated)
    if (data.employeeNumber) {
      const existingByNumber = get().employees.find(
        (e) =>
          e.employeeNumber.toLowerCase() === data.employeeNumber!.toLowerCase() &&
          e.status !== 'terminated'
      );
      if (existingByNumber) {
        return { success: false, error: 'Número de funcionário já existe / Employee number already exists' };
      }
    }
    
    // Check for duplicate name
    const fullName = `${data.firstName} ${data.lastName}`.toLowerCase().trim();
    const existingByName = get().employees.find(
      e => `${e.firstName} ${e.lastName}`.toLowerCase().trim() === fullName && e.status === 'active'
    );
    if (existingByName) {
      return { success: false, error: 'Funcionário com este nome já existe / Employee with this name already exists' };
    }
    
    // Check for duplicate bank account number (if provided)
    if (data.bankAccountNumber && data.bankAccountNumber.trim()) {
      const existingByAccount = get().employees.find(
        e => e.bankAccountNumber && 
             e.bankAccountNumber.replace(/\s/g, '') === data.bankAccountNumber!.replace(/\s/g, '') &&
             e.status === 'active'
      );
      if (existingByAccount) {
        return { 
          success: false, 
          error: `Conta bancária já registada para ${existingByAccount.firstName} ${existingByAccount.lastName} / Bank account already registered for ${existingByAccount.firstName} ${existingByAccount.lastName}` 
        };
      }
    }
    
    // Check for duplicate IBAN (if provided)
    if (data.iban && data.iban.trim()) {
      const existingByIban = get().employees.find(
        e => e.iban && 
             e.iban.replace(/\s/g, '').toLowerCase() === data.iban!.replace(/\s/g, '').toLowerCase() &&
             e.status === 'active'
      );
      if (existingByIban) {
        return { 
          success: false, 
          error: `IBAN já registado para ${existingByIban.firstName} ${existingByIban.lastName} / IBAN already registered for ${existingByIban.firstName} ${existingByIban.lastName}` 
        };
      }
    }
    
    // Check for duplicate BI (Bilhete de Identidade)
    if (data.bilheteIdentidade && data.bilheteIdentidade.trim()) {
      const existingByBI = get().employees.find(
        (e) =>
          e.bilheteIdentidade &&
          normalizeIdentity(e.bilheteIdentidade) === normalizeIdentity(data.bilheteIdentidade!) &&
          e.status !== 'terminated'
      );
      if (existingByBI) {
        return {
          success: false,
          error: `BI já registado para ${existingByBI.firstName} ${existingByBI.lastName} / ID already registered for ${existingByBI.firstName} ${existingByBI.lastName}`,
        };
      }
    }

    if (data.nif && data.nif.trim()) {
      const existingByNIF = get().employees.find(
        (e) =>
          e.nif &&
          normalizeIdentity(e.nif) === normalizeIdentity(data.nif!) &&
          e.status !== 'terminated'
      );
      if (existingByNIF) {
        return {
          success: false,
          error: `NIF já registado para ${existingByNIF.firstName} ${existingByNIF.lastName} / NIF already registered for ${existingByNIF.firstName} ${existingByNIF.lastName}`,
        };
      }
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
      category: data.category || data.position || '',
      position: data.position,
      contractType: data.contractType,
      hireDate: data.hireDate,
      contractEndDate: data.contractEndDate,
      status: (() => {
        const authState = useAuthStore.getState();
        const currentUser = authState.currentUser;
        const canAutoActivate = currentUser?.role === 'admin' || authState.hasPermission('users.edit');
        return canAutoActivate ? 'active' : 'pending_approval';
      })(),
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
    
    logAudit({
      action: 'employee_created',
      entityType: 'employee',
      entityId: newEmployee.id,
      employeeId: newEmployee.id,
      description: `Funcionário criado: ${newEmployee.firstName} ${newEmployee.lastName}`,
      newValue: { firstName: newEmployee.firstName, lastName: newEmployee.lastName, department: newEmployee.department, position: newEmployee.position, baseSalary: newEmployee.baseSalary },
    });
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
    
    return { success: true, employee: newEmployee };
  },
  
  updateEmployee: async (id: string, data: Partial<EmployeeFormData>) => {
    const currentEmployee = get().employees.find(e => e.id === id);
    
    // Check for duplicate employee number ONLY if it actually changed
    if (data.employeeNumber) {
      const trimmedNumber = data.employeeNumber.trim().toLowerCase();
      const currentNumber = currentEmployee?.employeeNumber?.trim().toLowerCase();
      
      // Skip check if number hasn't changed
      if (trimmedNumber !== currentNumber) {
        const existingByNumber = get().employees.find(
          e => e.employeeNumber?.trim().toLowerCase() === trimmedNumber && e.id !== id
        );
        if (existingByNumber) {
          console.warn('[Employee] Duplicate number detected:', trimmedNumber, 'belongs to', existingByNumber.id, 'editing id:', id);
          return { success: false, error: 'Número de funcionário já existe / Employee number already exists' };
        }
      }
    }
    
    // Check for duplicate name if being updated
    if (data.firstName || data.lastName) {
      if (currentEmployee) {
        const newFirstName = data.firstName || currentEmployee.firstName;
        const newLastName = data.lastName || currentEmployee.lastName;
        const fullName = `${newFirstName} ${newLastName}`.toLowerCase().trim();
        const existingByName = get().employees.find(
          e => `${e.firstName} ${e.lastName}`.toLowerCase().trim() === fullName && e.id !== id && e.status === 'active'
        );
        if (existingByName) {
          return { success: false, error: 'Funcionário com este nome já existe / Employee with this name already exists' };
        }
      }
    }
    
    // Check for duplicate bank account number if being updated
    if (data.bankAccountNumber && data.bankAccountNumber.trim()) {
      const existingByAccount = get().employees.find(
        e => e.bankAccountNumber && 
             e.bankAccountNumber.replace(/\s/g, '') === data.bankAccountNumber!.replace(/\s/g, '') &&
             e.id !== id &&
             e.status === 'active'
      );
      if (existingByAccount) {
        return { 
          success: false, 
          error: `Conta bancária já registada para ${existingByAccount.firstName} ${existingByAccount.lastName}` 
        };
      }
    }
    
    // Check for duplicate IBAN if being updated
    if (data.iban && data.iban.trim()) {
      const existingByIban = get().employees.find(
        e => e.iban && 
             e.iban.replace(/\s/g, '').toLowerCase() === data.iban!.replace(/\s/g, '').toLowerCase() &&
             e.id !== id &&
             e.status === 'active'
      );
      if (existingByIban) {
        return { 
          success: false, 
          error: `IBAN já registado para ${existingByIban.firstName} ${existingByIban.lastName}` 
        };
      }
    }
    
    // Check for duplicate BI if being updated
    if (data.bilheteIdentidade && data.bilheteIdentidade.trim()) {
      const existingByBI = get().employees.find(
        (e) =>
          e.bilheteIdentidade &&
          normalizeIdentity(e.bilheteIdentidade) === normalizeIdentity(data.bilheteIdentidade!) &&
          e.id !== id
      );
      if (existingByBI) {
        if (existingByBI.status === 'terminated') {
          return { success: false, error: formatIdentityConflict(existingByBI, 'pt') };
        }
        return {
          success: false,
          error: `BI já registado para ${existingByBI.firstName} ${existingByBI.lastName}`,
        };
      }
    }

    if (data.nif && data.nif.trim()) {
      const existingByNIF = get().employees.find(
        (e) =>
          e.nif &&
          normalizeIdentity(e.nif) === normalizeIdentity(data.nif!) &&
          e.id !== id
      );
      if (existingByNIF) {
        if (existingByNIF.status === 'terminated') {
          return { success: false, error: formatIdentityConflict(existingByNIF, 'pt') };
        }
        return {
          success: false,
          error: `NIF já registado para ${existingByNIF.firstName} ${existingByNIF.lastName}`,
        };
      }
    }
    
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
    
    logAudit({
      action: 'employee_updated',
      entityType: 'employee',
      entityId: id,
      employeeId: id,
      description: `Funcionário editado: ${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
      previousValue: currentEmployee as any,
      newValue: updatedEmployee as any,
    });
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
    
    return { success: true };
  },
  
  approveEmployee: async (id: string) => {
    const employee = get().employees.find(e => e.id === id);
    if (!employee) return { success: false, error: 'Funcionário não encontrado' };
    if (employee.status !== 'pending_approval') return { success: false, error: 'Funcionário não está pendente' };
    
    const success = await liveUpdate('employees', id, { 
      status: 'active', 
      updated_at: new Date().toISOString() 
    });
    if (!success) return { success: false, error: 'Erro ao aprovar no banco de dados' };
    
    logAudit({
      action: 'employee_approved',
      entityType: 'employee',
      entityId: id,
      employeeId: id,
      description: `Funcionário aprovado: ${employee.firstName} ${employee.lastName}`,
      previousValue: { status: 'pending_approval' },
      newValue: { status: 'active' },
    });
    
    await get().loadEmployees();
    return { success: true };
  },
  
  rejectEmployee: async (id: string) => {
    const employee = get().employees.find(e => e.id === id);
    if (!employee) return { success: false, error: 'Funcionário não encontrado' };
    
    await liveDelete('employees', id);
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
  
  offboardEmployee: async (id, data) => {
    const employee = get().employees.find((e) => e.id === id);
    if (!employee) return { success: false, error: 'Funcionário não encontrado' };
    if (employee.status === 'terminated') {
      return { success: false, error: 'Funcionário já está fora da empresa' };
    }
    if (employee.status === 'pending_approval') {
      return { success: false, error: 'Aprove ou rejeite o registo pendente antes de registar a saída' };
    }

    const note = data.exitNote.trim();
    if (!note) return { success: false, error: 'Indique o motivo da saída' };

    const now = new Date().toISOString();
    const terminationId = `exit-${crypto.randomUUID()}`;

    try {
      await liveInsert('terminations', {
        id: terminationId,
        employee_id: id,
        employee_name: `${employee.firstName} ${employee.lastName}`.trim(),
        termination_date: data.exitDate,
        reason: data.exitReason,
        reason_details: note,
        years_of_service: 0,
        final_base_salary: employee.baseSalary || 0,
        severance_pay: 0,
        proportional_leave: 0,
        proportional_13th: 0,
        proportional_holiday_subsidy: 0,
        notice_period_days: 0,
        notice_compensation: 0,
        unused_leave_days: 0,
        unused_leave_compensation: 0,
        total_package: 0,
        processed_by: data.processedBy,
        processed_at: now,
        letter_generated: 0,
        is_light_exit: 1,
        created_at: now,
        updated_at: now,
      });

      const updated: Employee = {
        ...employee,
        status: 'terminated',
        exitDate: data.exitDate,
        exitReason: data.exitReason,
        exitNote: note,
        exitProcessedBy: data.processedBy,
        exitProcessedAt: now,
        updatedAt: now,
      };

      const { id: _empId, ...updateRow } = mapEmployeeToDbRow(updated);
      const ok = await liveUpdate('employees', id, updateRow);
      if (!ok) return { success: false, error: 'Erro ao guardar saída no banco de dados' };

      try {
        const { useDeductionStore } = await import('@/stores/deduction-store');
        const deductionStore = useDeductionStore.getState();
        const pending = deductionStore.deductions.filter(
          (d) => d.employeeId === id && (d.isApplied || !d.isFullyPaid)
        );
        for (const d of pending) {
          await deductionStore.updateDeduction(d.id, {
            isApplied: false,
            payrollPeriodId: undefined,
          });
        }
      } catch (dedErr) {
        console.warn('[Employees] Could not release deductions on offboard:', dedErr);
      }

      logAudit({
        action: 'employee_offboarded',
        entityType: 'employee',
        entityId: id,
        employeeId: id,
        description: `Saída da empresa: ${updated.firstName} ${updated.lastName} — ${data.exitReason}`,
        previousValue: employee as any,
        newValue: updated as any,
      });

      await get().loadEmployees();
      return { success: true };
    } catch (error) {
      console.error('[Employees] offboard failed:', error);
      return { success: false, error: 'Erro ao registar saída da empresa' };
    }
  },

  rehireEmployee: async (id, data) => {
    const employee = get().employees.find((e) => e.id === id);
    if (!employee) return { success: false, error: 'Funcionário não encontrado' };
    if (employee.status !== 'terminated') {
      return { success: false, error: 'Funcionário não está arquivado' };
    }

    const now = new Date().toISOString();
    const rehireNote = data.note?.trim()
      ? `Recontratado em ${new Date(now).toLocaleDateString('pt-AO')} por ${data.processedBy}: ${data.note.trim()}`
      : `Recontratado em ${new Date(now).toLocaleDateString('pt-AO')} por ${data.processedBy}`;

    try {
      const termRows = await liveGetAll<any>('terminations');
      const lightTerm = termRows.find(
        (t) => t.employee_id === id && (t.is_light_exit === 1 || t.total_package === 0)
      );
      if (lightTerm) {
        await liveDelete('terminations', lightTerm.id);
      }

      const updated: Employee = {
        ...employee,
        status: 'active',
        exitDate: undefined,
        exitReason: undefined,
        exitNote: undefined,
        exitProcessedBy: undefined,
        exitProcessedAt: undefined,
        notes: employee.notes ? `${employee.notes}\n${rehireNote}` : rehireNote,
        updatedAt: now,
      };

      const { id: _empId, ...updateRow } = mapEmployeeToDbRow(updated);
      const ok = await liveUpdate('employees', id, updateRow);
      if (!ok) return { success: false, error: 'Erro ao reactivar funcionário' };

      logAudit({
        action: 'employee_rehired',
        entityType: 'employee',
        entityId: id,
        employeeId: id,
        description: `Recontratação: ${updated.firstName} ${updated.lastName}`,
        previousValue: employee as any,
        newValue: updated as any,
      });

      await get().loadEmployees();
      return { success: true };
    } catch (error) {
      console.error('[Employees] rehire failed:', error);
      return { success: false, error: 'Erro ao recontratar funcionário' };
    }
  },

  deleteEmployee: async (id: string) => {
    const employee = get().employees.find(e => e.id === id);
    
    // Clean up payroll entries for this employee
    const payrollStore = usePayrollStore.getState();
    await payrollStore.removeEntriesForEmployee(id);
    
    await liveDelete('employees', id);
    
    // Log audit for deletion
    if (employee) {
      logAudit({
        action: 'employee_deleted',
        entityType: 'employee',
        entityId: id,
        employeeId: id,
        description: `Funcionário eliminado: ${employee.firstName} ${employee.lastName}`,
        previousValue: { 
          firstName: employee.firstName, 
          lastName: employee.lastName, 
          department: employee.department, 
          position: employee.position, 
          baseSalary: employee.baseSalary,
          status: employee.status,
        },
      });
    }
    
    // Refresh from database to ensure consistency
    await get().loadEmployees();
  },
}));

// Subscribe to PUSH data from server (TRUE SYNC - no refetch)
let unsubscribe: (() => void) | null = null;

export function initEmployeeStoreSync() {
  if (unsubscribe) return;
  
  // PRIMARY: Receive full table data directly from server
  const unsubSync = onTableSync('employees', (table, rows) => {
    console.log('[Employees] ← PUSH received:', rows.length, 'employees');
    const employees = rows.map(mapDbRowToEmployee);
    useEmployeeStore.setState({ employees, isLoaded: true });
  });
  
  // FALLBACK: Legacy notification (triggers refetch if push fails)
  const unsubLegacy = onDataChange((table) => {
    if (table === 'employees') {
      console.log('[Employees] Legacy notification, refreshing...');
      useEmployeeStore.getState().loadEmployees();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupEmployeeStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Startup diagnostic: detect and log duplicate employee numbers in the database.
 */
export function detectDuplicateEmployeeNumbers() {
  const employees = useEmployeeStore.getState().employees;
  const numberMap = new Map<string, { id: string; name: string }[]>();
  
  for (const emp of employees) {
    if (!emp.employeeNumber) continue;
    const key = emp.employeeNumber.trim().toLowerCase();
    if (!numberMap.has(key)) numberMap.set(key, []);
    numberMap.get(key)!.push({ id: emp.id, name: `${emp.firstName} ${emp.lastName}` });
  }
  
  let duplicates = 0;
  for (const [number, entries] of numberMap) {
    if (entries.length > 1) {
      duplicates++;
      console.warn(`[Employee] ⚠️ DUPLICATE employee number "${number}":`, entries.map(e => `${e.name} (${e.id})`).join(', '));
    }
  }
  
  if (duplicates > 0) {
    console.warn(`[Employee] Found ${duplicates} duplicate employee number(s) — please correct them to avoid edit errors.`);
  } else {
    console.log('[Employee] ✓ No duplicate employee numbers found');
  }
}
