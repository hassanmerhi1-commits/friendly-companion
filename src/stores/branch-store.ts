import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch, BranchFormData } from '@/types/branch';

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

// Sample branches
const sampleBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Sede Principal - Luanda',
    code: 'LDA-01',
    province: 'Luanda',
    city: 'Luanda',
    address: 'Rua Rainha Ginga, 123, Ingombota',
    phone: '+244 222 123 456',
    email: 'sede@empresa.co.ao',
    isHeadquarters: true,
    isActive: true,
    createdAt: '2020-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'branch-2',
    name: 'Filial Viana',
    code: 'LDA-02',
    province: 'Luanda',
    city: 'Viana',
    address: 'Zona Industrial, Lote 45',
    phone: '+244 222 234 567',
    email: 'viana@empresa.co.ao',
    isHeadquarters: false,
    isActive: true,
    createdAt: '2021-06-15T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'branch-3',
    name: 'Filial Talatona',
    code: 'LDA-03',
    province: 'Luanda',
    city: 'Talatona',
    address: 'Av. Pedro de Castro Van-Dúnem Loy',
    phone: '+244 222 345 678',
    email: 'talatona@empresa.co.ao',
    isHeadquarters: false,
    isActive: true,
    createdAt: '2022-03-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'branch-4',
    name: 'Filial Benguela',
    code: 'BEN-01',
    province: 'Benguela',
    city: 'Benguela',
    address: 'Rua 4 de Fevereiro, 89',
    phone: '+244 272 123 456',
    email: 'benguela@empresa.co.ao',
    isHeadquarters: false,
    isActive: true,
    createdAt: '2023-01-15T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
];

function generateBranchCode(province: string, branches: Branch[]): string {
  const provinceCode = province.substring(0, 3).toUpperCase();
  const existingInProvince = branches.filter(b => b.province === province).length;
  return `${provinceCode}-${String(existingInProvince + 1).padStart(2, '0')}`;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: sampleBranches,

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
    }
  )
);
