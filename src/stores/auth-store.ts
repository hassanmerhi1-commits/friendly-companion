import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createElectronStorage } from '@/lib/electron-sqlite-storage';

export type Permission = 
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'payroll.view'
  | 'payroll.calculate'
  | 'payroll.approve'
  | 'payroll.export'
  | 'deductions.view'
  | 'deductions.create'
  | 'deductions.edit'
  | 'deductions.delete'
  | 'branches.view'
  | 'branches.create'
  | 'branches.edit'
  | 'branches.delete'
  | 'reports.view'
  | 'reports.export'
  | 'documents.view'
  | 'documents.create'
  | 'laborlaw.view'
  | 'settings.view'
  | 'settings.edit'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete';

export type UserRole = 'admin' | 'manager' | 'hr' | 'accountant' | 'viewer';

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.export',
    'deductions.view', 'deductions.create', 'deductions.edit', 'deductions.delete',
    'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
    'reports.view', 'reports.export',
    'documents.view', 'documents.create',
    'laborlaw.view',
    'settings.view', 'settings.edit',
    'users.view', 'users.create', 'users.edit', 'users.delete',
  ],
  manager: [
    'employees.view', 'employees.create', 'employees.edit',
    'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.export',
    'deductions.view', 'deductions.create', 'deductions.edit',
    'branches.view',
    'reports.view', 'reports.export',
    'documents.view', 'documents.create',
    'laborlaw.view',
    'settings.view',
  ],
  hr: [
    'employees.view', 'employees.create', 'employees.edit',
    'payroll.view',
    'deductions.view', 'deductions.create',
    'branches.view',
    'reports.view',
    'documents.view', 'documents.create',
    'laborlaw.view',
  ],
  accountant: [
    'employees.view',
    'payroll.view', 'payroll.calculate', 'payroll.export',
    'deductions.view', 'deductions.create', 'deductions.edit',
    'reports.view', 'reports.export',
    'laborlaw.view',
  ],
  viewer: [
    'employees.view',
    'payroll.view',
    'deductions.view',
    'branches.view',
    'reports.view',
    'laborlaw.view',
  ],
};

export const roleLabels: Record<UserRole, { pt: string; en: string }> = {
  admin: { pt: 'Administrador', en: 'Administrator' },
  manager: { pt: 'Gestor', en: 'Manager' },
  hr: { pt: 'Recursos Humanos', en: 'Human Resources' },
  accountant: { pt: 'Contabilista', en: 'Accountant' },
  viewer: { pt: 'Visualizador', en: 'Viewer' },
};

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  customPermissions?: Permission[]; // Override role permissions
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  users: AppUser[];
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  
  // Auth actions
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  
  // Permission check
  hasPermission: (permission: Permission) => boolean;
  getUserPermissions: (userId?: string) => Permission[];
  
  // User management (admin only)
  addUser: (data: Omit<AppUser, 'id' | 'createdAt'>) => { success: boolean; user?: AppUser; error?: string };
  updateUser: (id: string, data: Partial<AppUser>) => { success: boolean; error?: string };
  deleteUser: (id: string) => void;
  getUsers: () => AppUser[];
  isUsernameTaken: (username: string, excludeId?: string) => boolean;
}

// Default admin user
const defaultAdmin: AppUser = {
  id: 'admin-1',
  username: 'sysadmin',
  password: 'P@yR0ll#2024!Sec',
  name: 'Administrador',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [defaultAdmin],
      currentUser: null,
      isAuthenticated: false,
      
      login: (username: string, password: string) => {
        const user = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && 
               u.password === password && 
               u.isActive
        );
        
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return { success: true };
        }
        
        return { success: false, error: 'Credenciais inválidas / Invalid credentials' };
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
      
      hasPermission: (permission: Permission) => {
        const user = get().currentUser;
        if (!user) return false;
        
        // Use custom permissions if defined, otherwise use role permissions
        const permissions = user.customPermissions || rolePermissions[user.role] || [];
        return permissions.includes(permission);
      },
      
      getUserPermissions: (userId?: string) => {
        const user = userId 
          ? get().users.find(u => u.id === userId)
          : get().currentUser;
        
        if (!user) return [];
        return user.customPermissions || rolePermissions[user.role] || [];
      },
      
      addUser: (data) => {
        // Check for duplicate username
        const existingUser = get().users.find(
          u => u.username.toLowerCase() === data.username.toLowerCase()
        );
        
        if (existingUser) {
          return { success: false, error: 'Nome de utilizador já existe / Username already exists' };
        }
        
        const newUser: AppUser = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          users: [...state.users, newUser],
        }));
        
        return { success: true, user: newUser };
      },
      
      updateUser: (id: string, data: Partial<AppUser>) => {
        // Check for duplicate username if username is being updated
        if (data.username) {
          const existingUser = get().users.find(
            u => u.username.toLowerCase() === data.username!.toLowerCase() && u.id !== id
          );
          
          if (existingUser) {
            return { success: false, error: 'Nome de utilizador já existe / Username already exists' };
          }
        }
        
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...data } : user
          ),
        }));
        
        return { success: true };
      },
      
      isUsernameTaken: (username: string, excludeId?: string) => {
        return get().users.some(
          u => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeId
        );
      },
      
      deleteUser: (id: string) => {
        // Don't delete the last admin
        const admins = get().users.filter(u => u.role === 'admin' && u.isActive);
        const userToDelete = get().users.find(u => u.id === id);
        
        if (userToDelete?.role === 'admin' && admins.length <= 1) {
          return;
        }
        
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        }));
      },
      
      getUsers: () => {
        return get().users;
      },
    }),
    {
      name: 'payrollao-auth',
      storage: createJSONStorage(() => createElectronStorage('users')),
      // Only persist users list, NOT the session state
      partialize: (state) => ({ 
        users: state.users,
        // Exclude currentUser and isAuthenticated - session always starts logged out
      }),
    }
  )
);
