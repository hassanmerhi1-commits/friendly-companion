// Remote Storage Adapter for Zustand
// This storage adapter uses the server's database directly when in client mode
// No local persistence - all data comes from and goes to the server

import { isClientMode, remoteDb, getServerConnection } from './remote-database';
import { isElectron } from './electron-storage';

// Map table names to their state structure
const tableStateMap: Record<string, string> = {
  employees: 'employees',
  branches: 'branches',
  users: 'users',
  deductions: 'deductions',
  absences: 'absences',
  holidays: 'records',
  payroll_periods: 'periods',
  payroll_entries: 'entries',
  settings: 'settings',
};

// Convert SQLite row (snake_case) to JS object (camelCase)
function convertRowToJS(tableName: string, row: any): any {
  if (!row) return null;
  
  if (tableName === 'employees') {
    return {
      id: row.id,
      employeeNumber: row.employee_number || '',
      firstName: row.name?.split(' ')[0] || row.name || '',
      lastName: row.name?.split(' ').slice(1).join(' ') || '',
      name: row.name || '',
      position: row.position || '',
      department: row.department || '',
      branchId: row.branch_id || '',
      hireDate: row.hire_date || '',
      birthDate: row.birth_date || '',
      contractType: row.contract_type || 'permanent',
      contractEndDate: row.contract_end_date || '',
      baseSalary: row.base_salary || 0,
      paymentMethod: row.payment_method || 'bank_transfer',
      bankName: row.bank_name || '',
      bankAccount: row.bank_account || '',
      iban: row.iban || '',
      nif: row.nif || '',
      socialSecurity: row.social_security || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      emergencyContact: row.emergency_contact || '',
      emergencyPhone: row.emergency_phone || '',
      nationality: row.nationality || '',
      gender: row.gender || '',
      maritalStatus: row.marital_status || '',
      photo: row.photo || '',
      status: row.status || 'active',
      notes: row.notes || '',
      familyAllowance: row.family_allowance || 0,
      monthlyBonus: row.monthly_bonus || 0,
      holidaySubsidy: row.holiday_subsidy || 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  if (tableName === 'branches') {
    return {
      id: row.id,
      name: row.name || '',
      code: row.code || '',
      province: row.province || '',
      city: row.city || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      managerId: row.manager_id || '',
      isHeadquarters: row.is_headquarters === 1,
      isActive: row.is_active !== 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  if (tableName === 'users') {
    return {
      id: row.id,
      username: row.username || '',
      password: row.password || '',
      name: row.name || '',
      role: row.role || 'viewer',
      customPermissions: row.custom_permissions ? 
        (typeof row.custom_permissions === 'string' ? JSON.parse(row.custom_permissions) : row.custom_permissions) : 
        undefined,
      isActive: row.is_active !== 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  if (tableName === 'deductions') {
    return {
      id: row.id,
      employeeId: row.employee_id || '',
      type: row.type || 'other',
      description: row.description || '',
      amount: row.amount || 0,
      date: row.date || '',
      payrollPeriodId: row.payroll_period_id || undefined,
      isApplied: row.is_applied === 1,
      installments: row.installments || undefined,
      currentInstallment: row.current_installment || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  if (tableName === 'absences') {
    return {
      id: row.id,
      employeeId: row.employee_id || '',
      type: row.type || 'unjustified',
      status: row.status || 'pending',
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      days: row.days || 1,
      reason: row.reason || '',
      documentPath: row.document_path || undefined,
      justifiedAt: row.justified_at || undefined,
      justificationDocument: row.justification_document || undefined,
      justificationNotes: row.justification_notes || undefined,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  if (tableName === 'holidays') {
    return {
      id: row.id,
      employeeId: row.employee_id || '',
      year: row.year || new Date().getFullYear(),
      daysUsed: row.days_used || 0,
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
      subsidyPaid: row.subsidy_paid === 1,
      subsidyPaidMonth: row.subsidy_paid_month || undefined,
      subsidyPaidYear: row.subsidy_paid_year || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  
  // Default: return as-is
  return row;
}

// Convert JS object (camelCase) to SQLite row (snake_case)
function convertJSToRow(tableName: string, obj: any): any {
  if (!obj) return null;
  
  if (tableName === 'employees') {
    return {
      id: obj.id,
      employee_number: obj.employeeNumber || null,
      name: obj.name || `${obj.firstName || ''} ${obj.lastName || ''}`.trim(),
      position: obj.position || null,
      department: obj.department || null,
      branch_id: obj.branchId || null,
      hire_date: obj.hireDate || null,
      birth_date: obj.birthDate || null,
      contract_type: obj.contractType || 'permanent',
      contract_end_date: obj.contractEndDate || null,
      base_salary: obj.baseSalary || 0,
      payment_method: obj.paymentMethod || 'bank_transfer',
      bank_name: obj.bankName || null,
      bank_account: obj.bankAccount || null,
      iban: obj.iban || null,
      nif: obj.nif || null,
      social_security: obj.socialSecurity || null,
      address: obj.address || null,
      phone: obj.phone || null,
      email: obj.email || null,
      emergency_contact: obj.emergencyContact || null,
      emergency_phone: obj.emergencyPhone || null,
      nationality: obj.nationality || null,
      gender: obj.gender || null,
      marital_status: obj.maritalStatus || null,
      photo: obj.photo || null,
      status: obj.status || 'active',
      notes: obj.notes || null,
      family_allowance: obj.familyAllowance || 0,
      monthly_bonus: obj.monthlyBonus || 0,
      holiday_subsidy: obj.holidaySubsidy || 0,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  if (tableName === 'branches') {
    return {
      id: obj.id,
      name: obj.name || '',
      code: obj.code || null,
      province: obj.province || null,
      city: obj.city || null,
      address: obj.address || null,
      phone: obj.phone || null,
      email: obj.email || null,
      manager_id: obj.managerId || null,
      is_headquarters: obj.isHeadquarters ? 1 : 0,
      is_active: obj.isActive !== false ? 1 : 0,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  if (tableName === 'users') {
    return {
      id: obj.id,
      username: obj.username || '',
      password: obj.password || '',
      name: obj.name || null,
      role: obj.role || 'viewer',
      custom_permissions: obj.customPermissions ? JSON.stringify(obj.customPermissions) : null,
      is_active: obj.isActive !== false ? 1 : 0,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  if (tableName === 'deductions') {
    return {
      id: obj.id,
      employee_id: obj.employeeId || '',
      type: obj.type || 'other',
      description: obj.description || null,
      amount: obj.amount || 0,
      date: obj.date || null,
      payroll_period_id: obj.payrollPeriodId || null,
      is_applied: obj.isApplied ? 1 : 0,
      installments: obj.installments || null,
      current_installment: obj.currentInstallment || null,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  if (tableName === 'absences') {
    return {
      id: obj.id,
      employee_id: obj.employeeId || '',
      type: obj.type || 'unjustified',
      status: obj.status || 'pending',
      start_date: obj.startDate || '',
      end_date: obj.endDate || '',
      days: obj.days || 1,
      reason: obj.reason || null,
      document_path: obj.documentPath || null,
      justified_at: obj.justifiedAt || null,
      justification_document: obj.justificationDocument || null,
      justification_notes: obj.justificationNotes || null,
      approved_by: obj.approvedBy || null,
      approved_at: obj.approvedAt || null,
      rejection_reason: obj.rejectionReason || null,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  if (tableName === 'holidays') {
    return {
      id: obj.id || `${obj.employeeId}-${obj.year}`,
      employee_id: obj.employeeId || '',
      year: obj.year || new Date().getFullYear(),
      days_used: obj.daysUsed || 0,
      start_date: obj.startDate || null,
      end_date: obj.endDate || null,
      subsidy_paid: obj.subsidyPaid ? 1 : 0,
      subsidy_paid_month: obj.subsidyPaidMonth || null,
      subsidy_paid_year: obj.subsidyPaidYear || null,
      created_at: obj.createdAt || new Date().toISOString(),
      updated_at: obj.updatedAt || new Date().toISOString(),
    };
  }
  
  // Default: return as-is
  return obj;
}

// Create a Zustand storage adapter that uses remote database in client mode
export function createRemoteStorage<T>(tableName: string) {
  const stateKey = tableStateMap[tableName] || tableName;
  
  return {
    getItem: async (name: string): Promise<string | null> => {
      // In client mode, fetch from server
      if (isClientMode() && isElectron()) {
        try {
          const rows = await remoteDb.getAll(tableName);
          if (rows && rows.length > 0) {
            const converted = rows.map(row => convertRowToJS(tableName, row));
            
            // Build state object based on table type
            let state: any = {};
            if (tableName === 'users') {
              state = { users: converted, currentUser: null, isAuthenticated: false };
            } else {
              state = { [stateKey]: converted };
            }
            
            return JSON.stringify({ state, version: 0 });
          }
          // Return empty state
          if (tableName === 'users') {
            return JSON.stringify({ state: { users: [], currentUser: null, isAuthenticated: false }, version: 0 });
          }
          return JSON.stringify({ state: { [stateKey]: [] }, version: 0 });
        } catch (error) {
          console.error(`Error fetching remote data for ${tableName}:`, error);
          return null;
        }
      }
      
      // Not in client mode - return null (let local storage handle it)
      return null;
    },
    
    setItem: async (name: string, value: string): Promise<void> => {
      // In client mode, write to server
      if (isClientMode() && isElectron()) {
        try {
          const parsed = JSON.parse(value);
          const stateData = parsed.state;
          const items = stateData[stateKey] || [];
          
          // Get current server state to determine what to insert/update/delete
          const serverRows = await remoteDb.getAll(tableName);
          const serverIds = new Set(serverRows.map((r: any) => r.id));
          const localIds = new Set(items.map((i: any) => i.id));
          
          // Insert or update items
          for (const item of items) {
            const row = convertJSToRow(tableName, item);
            if (serverIds.has(item.id)) {
              await remoteDb.update(tableName, item.id, row);
            } else {
              await remoteDb.insert(tableName, row);
            }
          }
          
          // Delete items that were removed
          for (const row of serverRows) {
            if (!localIds.has(row.id)) {
              await remoteDb.delete(tableName, row.id);
            }
          }
        } catch (error) {
          console.error(`Error writing remote data for ${tableName}:`, error);
        }
      }
      // In standalone/server mode, do nothing (let local storage handle it)
    },
    
    removeItem: async (name: string): Promise<void> => {
      // Not implemented for remote storage
    },
  };
}

// Load data from server for a specific table
export async function loadFromServer(tableName: string): Promise<any[]> {
  if (!isClientMode()) return [];
  
  const rows = await remoteDb.getAll(tableName);
  return rows.map(row => convertRowToJS(tableName, row));
}

// Save single item to server
export async function saveToServer(tableName: string, item: any, isNew: boolean): Promise<boolean> {
  if (!isClientMode()) return false;
  
  const row = convertJSToRow(tableName, item);
  
  if (isNew) {
    const result = await remoteDb.insert(tableName, row);
    return result.success;
  } else {
    const result = await remoteDb.update(tableName, item.id, row);
    return result.success;
  }
}

// Delete item from server
export async function deleteFromServer(tableName: string, id: string): Promise<boolean> {
  if (!isClientMode()) return false;
  
  const result = await remoteDb.delete(tableName, id);
  return result.success;
}
