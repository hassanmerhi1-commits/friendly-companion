import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Branch, BranchFormData } from '@/types/branch';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

interface BranchState {
  branches: Branch[];
  addBranch: (data: BranchFormData) => Branch;
  updateBranch: (id: string, data: Partial<BranchFormData>) => void;
  deleteBranch: (id: string) => void;
  getBranch: (id: string) => Branch | undefined;
  getActiveBranches: () => Branch[];
  getBranchesByCity: (city: string) => Branch[];
  getBranchesByProvince: (province: string) => Branch[];
}

function generateBranchCode(province: string, branches: Branch[]): string {
  const provinceCode = province.substring(0, 3).toUpperCase();
  const existingInProvince = branches.filter(b => b.province === province).length;
  return `${provinceCode}-${String(existingInProvince + 1).padStart(2, '0')}`;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],

      addBranch: (data: BranchFormData) => {
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

        set((state) => ({
          branches: [...state.branches, newBranch],
        }));

        return newBranch;
      },

      updateBranch: (id: string, data: Partial<BranchFormData>) => {
        set((state) => ({
          branches: state.branches.map((branch) =>
            branch.id === id
              ? { ...branch, ...data, updatedAt: new Date().toISOString() }
              : branch
          ),
        }));
      },

      deleteBranch: (id: string) => {
        set((state) => ({
          branches: state.branches.map((branch) =>
            branch.id === id
              ? { ...branch, isActive: false, updatedAt: new Date().toISOString() }
              : branch
          ),
        }));
      },

      getBranch: (id: string) => {
        return get().branches.find((branch) => branch.id === id);
      },

      getActiveBranches: () => {
        return get().branches.filter((branch) => branch.isActive);
      },

      getBranchesByCity: (city: string) => {
        return get().branches.filter((branch) => branch.city === city && branch.isActive);
      },

      getBranchesByProvince: (province: string) => {
        return get().branches.filter((branch) => branch.province === province && branch.isActive);
      },
    }),
    {
      name: 'payrollao-branches',
      storage: createJSONStorage(() => createElectronStorage('branches')),
    }
  )
);
