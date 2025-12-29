// Electron SQLite Storage Utility
// This provides a custom Zustand storage that uses SQLite when running in Electron
// Each province has its own separate data storage

// Import type from electron-storage (types are defined there)
import { isElectron } from './electron-storage';
import { getProvinceStoragePrefix, isProvinceSelected } from './province-storage';

// Get province-specific storage name
function getProvinceStorageKey(baseName: string): string {
  const prefix = getProvinceStoragePrefix();
  return `${baseName}-${prefix}`;
}

// Create a Zustand storage adapter that uses SQLite in Electron
export function createElectronStorage<T>(tableName: string) {
  return {
    getItem: async (name: string): Promise<string | null> => {
      // Use province-specific storage key
      const storageKey = getProvinceStorageKey(name);

      // Prefer localStorage first (it is always written as the source of truth)
      const localValue = localStorage.getItem(storageKey);
      if (localValue) return localValue;

      // Fallback to SQLite (when available) for recovery
      if (isElectron() && isProvinceSelected() && window.electronAPI?.db) {
        try {
          const rows = await window.electronAPI.db.getAll(tableName);
          if (rows && rows.length > 0) {
            // Convert SQLite rows back to the state format
            const state = convertRowsToState(tableName, rows);
            return JSON.stringify({ state, version: 0 });
          }
        } catch (error) {
          console.error(`Error reading from SQLite table ${tableName}:`, error);
        }
      }

      return null;
    },

    setItem: async (name: string, value: string): Promise<void> => {
      // Use province-specific storage key
      const storageKey = getProvinceStorageKey(name);

      // Always save to localStorage as backup with province prefix
      localStorage.setItem(storageKey, value);

      // Only sync to SQLite when we are in Electron AND a province is selected
      if (isElectron() && isProvinceSelected() && window.electronAPI?.db) {
        try {
          const parsed = JSON.parse(value);
          const state = parsed.state;
          await syncStateToSQLite(tableName, state);
        } catch (error) {
          console.error(`Error writing to SQLite table ${tableName}:`, error);
        }
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      const storageKey = getProvinceStorageKey(name);
      localStorage.removeItem(storageKey);
      // SQLite data persists - clearing would need explicit action
    },
  };
}

// ==================== CONVERT SQLITE ROWS TO STATE ====================
// This maps SQLite column names (snake_case) to JS property names (camelCase)

function convertRowsToState(tableName: string, rows: any[]): any {
  // Parse JSON fields that were stringified
  const parsed = rows.map(row => {
    const result: any = { ...row };
    // Parse any stringified JSON fields
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'string') {
        try {
          // Try to parse if it looks like JSON
          if (result[key].startsWith('{') || result[key].startsWith('[')) {
            result[key] = JSON.parse(result[key]);
          }
        } catch {
          // Keep as string if not valid JSON
        }
      }
    }
    return result;
  });

  // ===== EMPLOYEES =====
  if (tableName === 'employees') {
    const employees = parsed.map((row: any) => ({
      id: row.id,
      employeeNumber: row.employee_number || '',
      name: row.name || '',
      position: row.position || '',
      department: row.department || '',
      branchId: row.branch_id || '',
      hireDate: row.hire_date || '',
      birthDate: row.birth_date || '',
      contractType: row.contract_type || 'permanent',
      contractEndDate: row.contract_end_date || '',
      baseSalary: row.base_salary || row.salary || 0,
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
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
    return { employees };
  }

  // ===== BRANCHES =====
  if (tableName === 'branches') {
    const branches = parsed.map((row: any) => ({
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
    }));
    return { branches };
  }

  // ===== USERS =====
  if (tableName === 'users') {
    const users = parsed.map((row: any) => ({
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
    }));
    return { 
      users,
      currentUser: null,
      isAuthenticated: false,
    };
  }

  // ===== DEDUCTIONS =====
  if (tableName === 'deductions') {
    const deductions = parsed.map((row: any) => ({
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
    }));
    return { deductions };
  }

  // ===== ABSENCES =====
  if (tableName === 'absences') {
    const absences = parsed.map((row: any) => ({
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
    }));
    return { absences };
  }

  // ===== HOLIDAYS =====
  if (tableName === 'holidays') {
    const records = parsed.map((row: any) => ({
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
    }));
    return { records };
  }

  // ===== SETTINGS =====
  if (tableName === 'settings') {
    // Settings is stored as key-value pairs, reconstruct object
    const settingsObj: any = {};
    for (const row of parsed) {
      if (row.key && row.value !== undefined) {
        try {
          settingsObj[row.key] = JSON.parse(row.value);
        } catch {
          settingsObj[row.key] = row.value;
        }
      }
    }
    return { settings: settingsObj };
  }

  // ===== PAYROLL (periods and entries from separate tables) =====
  if (tableName === 'payroll_records') {
    // Legacy format - try to parse
    const periods = parsed.filter((r: any) => r.recordType === 'period');
    const entries = parsed.filter((r: any) => r.recordType === 'entry');
    return { periods, entries };
  }

  // Default: just wrap in the table name
  return { [tableName]: parsed };
}

// ==================== SYNC STATE TO SQLITE ====================
// This maps JS property names (camelCase) to SQLite column names (snake_case)

async function syncStateToSQLite(tableName: string, state: any): Promise<void> {
  if (!window.electronAPI?.db) return;

  try {
    // Get current data from SQLite
    const existingRows = await window.electronAPI.db.getAll(tableName);
    const existingIds = new Set(existingRows.map((r: any) => r.id));

    // Determine which array to sync based on table
    let itemsToSync: any[] = [];
    
    // ===== EMPLOYEES =====
    if (tableName === 'employees' && state.employees) {
      itemsToSync = state.employees.map((e: any) => ({
        id: e.id,
        employee_number: e.employeeNumber || null,
        name: e.name || '',
        position: e.position || null,
        department: e.department || null,
        branch_id: e.branchId || null,
        hire_date: e.hireDate || null,
        birth_date: e.birthDate || null,
        contract_type: e.contractType || 'permanent',
        contract_end_date: e.contractEndDate || null,
        base_salary: e.baseSalary || 0,
        payment_method: e.paymentMethod || 'bank_transfer',
        bank_name: e.bankName || null,
        bank_account: e.bankAccount || null,
        iban: e.iban || null,
        nif: e.nif || null,
        social_security: e.socialSecurity || null,
        address: e.address || null,
        phone: e.phone || null,
        email: e.email || null,
        emergency_contact: e.emergencyContact || null,
        emergency_phone: e.emergencyPhone || null,
        nationality: e.nationality || null,
        gender: e.gender || null,
        marital_status: e.maritalStatus || null,
        photo: e.photo || null,
        status: e.status || 'active',
        notes: e.notes || null,
        created_at: e.createdAt || new Date().toISOString(),
        updated_at: e.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== BRANCHES =====
    else if (tableName === 'branches' && state.branches) {
      itemsToSync = state.branches.map((b: any) => ({
        id: b.id,
        name: b.name || '',
        code: b.code || null,
        province: b.province || null,
        city: b.city || null,
        address: b.address || null,
        phone: b.phone || null,
        email: b.email || null,
        manager_id: b.managerId || null,
        is_headquarters: b.isHeadquarters ? 1 : 0,
        is_active: b.isActive !== false ? 1 : 0,
        created_at: b.createdAt || new Date().toISOString(),
        updated_at: b.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== USERS =====
    else if (tableName === 'users' && state.users) {
      itemsToSync = state.users.map((u: any) => ({
        id: u.id,
        username: u.username || '',
        password: u.password || '',
        name: u.name || null,
        role: u.role || 'viewer',
        custom_permissions: u.customPermissions ? JSON.stringify(u.customPermissions) : null,
        is_active: u.isActive !== false ? 1 : 0,
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== DEDUCTIONS =====
    else if (tableName === 'deductions' && state.deductions) {
      itemsToSync = state.deductions.map((d: any) => ({
        id: d.id,
        employee_id: d.employeeId || '',
        type: d.type || 'other',
        description: d.description || null,
        amount: d.amount || 0,
        date: d.date || null,
        payroll_period_id: d.payrollPeriodId || null,
        is_applied: d.isApplied ? 1 : 0,
        installments: d.installments || null,
        current_installment: d.currentInstallment || null,
        created_at: d.createdAt || new Date().toISOString(),
        updated_at: d.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== ABSENCES =====
    else if (tableName === 'absences' && state.absences) {
      itemsToSync = state.absences.map((a: any) => ({
        id: a.id,
        employee_id: a.employeeId || '',
        type: a.type || 'unjustified',
        status: a.status || 'pending',
        start_date: a.startDate || '',
        end_date: a.endDate || '',
        days: a.days || 1,
        reason: a.reason || null,
        document_path: a.documentPath || null,
        justified_at: a.justifiedAt || null,
        justification_document: a.justificationDocument || null,
        justification_notes: a.justificationNotes || null,
        approved_by: a.approvedBy || null,
        approved_at: a.approvedAt || null,
        rejection_reason: a.rejectionReason || null,
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== HOLIDAYS =====
    else if (tableName === 'holidays' && state.records) {
      itemsToSync = state.records.map((r: any) => ({
        id: r.id || `${r.employeeId}-${r.year}`,
        employee_id: r.employeeId || '',
        year: r.year || new Date().getFullYear(),
        days_used: r.daysUsed || 0,
        start_date: r.startDate || null,
        end_date: r.endDate || null,
        subsidy_paid: r.subsidyPaid ? 1 : 0,
        subsidy_paid_month: r.subsidyPaidMonth || null,
        subsidy_paid_year: r.subsidyPaidYear || null,
        created_at: r.createdAt || new Date().toISOString(),
        updated_at: r.updatedAt || new Date().toISOString(),
      }));
    }
    
    // ===== SETTINGS =====
    else if (tableName === 'settings' && state.settings) {
      // Settings is a single object - store as key-value pairs
      const settings = state.settings;
      for (const [key, value] of Object.entries(settings)) {
        const settingsData = {
          key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        };
        // Use key as id for settings
        if (existingIds.has(key)) {
          await window.electronAPI.db.update(tableName, key, settingsData);
        } else {
          await window.electronAPI.db.insert(tableName, { ...settingsData, id: key });
        }
      }
      return; // Early return for settings
    }
    
    // ===== PAYROLL (legacy format) =====
    else if (tableName === 'payroll_records') {
      // Handle both periods and entries
      const periods = (state.periods || []).map((p: any) => ({
        ...p,
        recordType: 'period',
        data: JSON.stringify(p),
      }));
      const entries = (state.entries || []).map((e: any) => ({
        ...e,
        recordType: 'entry',
        employee: JSON.stringify(e.employee),
        data: JSON.stringify(e),
      }));
      itemsToSync = [...periods, ...entries];
    }

    // Sync items
    for (const item of itemsToSync) {
      // Prepare data for SQLite (stringify complex objects)
      const preparedItem = prepareForSQLite(item);
      
      if (existingIds.has(item.id)) {
        await window.electronAPI.db.update(tableName, item.id, preparedItem);
        existingIds.delete(item.id);
      } else {
        await window.electronAPI.db.insert(tableName, preparedItem);
      }
    }

    // Delete items that were removed from state
    const itemIds = new Set(itemsToSync.map((i: any) => i.id));
    for (const id of existingIds) {
      if (!itemIds.has(id)) {
        await window.electronAPI.db.delete(tableName, id);
      }
    }
  } catch (error) {
    console.error(`Error syncing to SQLite table ${tableName}:`, error);
  }
}

// Prepare object for SQLite by stringifying nested objects
function prepareForSQLite(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Initialize data from SQLite on app start
export async function initializeFromSQLite(): Promise<void> {
  if (!isElectron()) return;
  
  console.log('Initializing data from SQLite...');
  // The stores will automatically load from SQLite via the storage adapter
}
