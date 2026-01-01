import { create } from 'zustand';
import type { Branch, BranchFormData } from '@/types/branch';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { dbGetAll, dbInsert, dbUpdate } from '@/lib/db-sync';


interface BranchState {
  branches: Branch[];
  isLoaded: boolean;

  loadBranches: () => Promise<void>;
  addBranch: (data: BranchFormData) => Promise<{ success: boolean; branch?: Branch; error?: string }>;
  updateBranch: (id: string, data: Partial<BranchFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteBranch: (id: string) => Promise<void>; // soft-delete (isActive=false)

  getBranch: (id: string) => Branch | undefined;
  getActiveBranches: () => Branch[];
  getBranchesByCity: (city: string) => Branch[];
  getBranchesByProvince: (province: string) => Branch[];
}

function generateBranchCode(province: string, branches: Branch[]): string {
  const provinceCode = province.substring(0, 3).toUpperCase();
  const existingInProvince = branches.filter((b) => b.province === province).length;
  return `${provinceCode}-${String(existingInProvince + 1).padStart(2, '0')}`;
}

function mapDbRowToBranch(row: any): Branch {
  return {
    id: row.id,
    name: row.name || '',
    code: row.code || '',
    province: row.province || '',
    city: row.city || '',
    address: row.address || '',
    phone: row.phone || undefined,
    email: row.email || undefined,
    managerId: row.manager_id || undefined,
    isHeadquarters: row.is_headquarters === 1,
    isActive: row.is_active !== 0,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapBranchToDbRow(branch: Branch): Record<string, any> {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    province: branch.province,
    city: branch.city,
    address: branch.address,
    phone: branch.phone || null,
    email: branch.email || null,
    manager_id: branch.managerId || null,
    is_headquarters: branch.isHeadquarters ? 1 : 0,
    is_active: branch.isActive ? 1 : 0,
    created_at: branch.createdAt,
    updated_at: branch.updatedAt,
  };
}

export const useBranchStore = create<BranchState>()((set, get) => ({
  branches: [],
  isLoaded: false,

  loadBranches: async () => {
    try {
      const rows = await dbGetAll<any>('branches');
      const branches = rows.map(mapDbRowToBranch);
      set({ branches, isLoaded: true });
      console.log('[Branches] Loaded', branches.length, 'branches from database');
    } catch (error) {
      console.error('[Branches] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  addBranch: async (data: BranchFormData) => {
    const now = new Date().toISOString();
    const code = data.code || generateBranchCode(data.province, get().branches);

    const newBranch: Branch = {
      ...data,
      id: crypto.randomUUID(),
      code,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const dbRow = mapBranchToDbRow(newBranch);
    const success = await dbInsert('branches', dbRow);
    if (!success) {
      return { success: false, error: 'Error saving branch to database' };
    }

    set((state) => ({ branches: [...state.branches, newBranch] }));
    return { success: true, branch: newBranch };
  },

  updateBranch: async (id: string, data: Partial<BranchFormData>) => {
    const current = get().branches.find((b) => b.id === id);
    if (!current) return { success: false, error: 'Branch not found' };

    const updated: Branch = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const dbRow = mapBranchToDbRow(updated);
    const { id: _, ...updateData } = dbRow;
    const success = await dbUpdate('branches', id, updateData);
    if (!success) {
      return { success: false, error: 'Error updating branch in database' };
    }

    set((state) => ({
      branches: state.branches.map((b) => (b.id === id ? updated : b)),
    }));

    return { success: true };
  },

  deleteBranch: async (id: string) => {
    // Clean up payroll entries for employees in this branch
    const employeeStore = useEmployeeStore.getState();
    const payrollStore = usePayrollStore.getState();

    const branchEmployees = employeeStore.employees.filter((emp) => emp.branchId === id);
    branchEmployees.forEach((emp) => payrollStore.removeEntriesForEmployee(emp.id));

    const current = get().branches.find((b) => b.id === id);
    if (!current) return;

    const updated: Branch = { ...current, isActive: false, updatedAt: new Date().toISOString() };

    const success = await dbUpdate('branches', id, { is_active: 0, updated_at: updated.updatedAt });
    if (!success) {
      console.error('[Branches] Failed to deactivate branch in database');
    }

    set((state) => ({
      branches: state.branches.map((b) => (b.id === id ? updated : b)),
    }));
  },

  getBranch: (id: string) => get().branches.find((branch) => branch.id === id),

  getActiveBranches: () => get().branches.filter((branch) => branch.isActive),

  getBranchesByCity: (city: string) => get().branches.filter((branch) => branch.city === city && branch.isActive),

  getBranchesByProvince: (province: string) =>
    get().branches.filter((branch) => branch.province === province && branch.isActive),
}));
